import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Accept either legacy { message, conversationHistory } or new { messages }
    const payload = await req.json();
    const legacyMessage: string | undefined = payload?.message;
    const legacyHistory: any[] = Array.isArray(payload?.conversationHistory) ? payload.conversationHistory : [];
    const incomingMessages: Array<{ role: string; content: string }>|undefined = Array.isArray(payload?.messages)
      ? payload.messages
      : undefined;
    console.log('Incoming messages (count):', incomingMessages?.length ?? (legacyHistory.length + (legacyMessage ? 1 : 0)));

    // Define tools using OpenAI-compatible schema
    const tools = [
      {
        type: "function",
        function: {
          name: "get_tasks",
          description:
            "Get the user's tasks. Optionally filter by status, due date (today/tomorrow/overdue/upcoming or a specific date), and folder.",
          parameters: {
            type: "object",
            properties: {
              status: {
                type: "string",
                enum: ["pending", "completed", "all"],
                description: "Filter by status (default: all)",
              },
              due_when: {
                type: "string",
                enum: ["today", "tomorrow", "overdue", "upcoming", "date"],
                description:
                  "Filter by time window. Use 'date' together with date_iso for a specific date.",
              },
              date_iso: {
                type: "string",
                description:
                  "ISO date (YYYY-MM-DD) to use when due_when is 'date'. If provided without due_when, assume specific date.",
              },
              folder_id: {
                type: "string",
                description: "Optional folder to filter by",
              },
            },
            additionalProperties: false,
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_folders",
          description: "Get all folders for the current user",
          parameters: { type: "object", properties: {}, additionalProperties: false },
        },
      },
      {
        type: "function",
        function: {
          name: "create_folder",
          description: "Create a new folder for organizing tasks",
          parameters: {
            type: "object",
            properties: {
              name: { type: "string", description: "Name of the folder" },
            },
            required: ["name"],
            additionalProperties: false,
          },
        },
      },
      {
        type: "function",
        function: {
          name: "create_task",
          description: "Create a new task, optionally with recurring settings",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string", description: "Title of the task" },
              description: {
                type: "string",
                description: "Description of the task",
              },
              folder_id: {
                type: "string",
                description: "ID of the folder to add the task to (optional)",
              },
              priority: {
                type: "string",
                enum: ["low", "medium", "high"],
                description: "Priority level",
              },
              due_date: {
                type: "string",
                description: "Due date in ISO format (optional)",
              },
              is_recurring: {
                type: "boolean",
                description: "Whether this task repeats daily (optional)",
              },
              recurrence_end_date: {
                type: "string",
                description:
                  "End date for recurring task in ISO format (optional, if not provided task repeats until stopped)",
              },
            },
            required: ["title"],
            additionalProperties: false,
          },
        },
      },
      {
        type: "function",
        function: {
          name: "mark_task_complete",
          description: "Mark a task as completed",
          parameters: {
            type: "object",
            properties: {
              task_id: { type: "string", description: "Task ID" },
            },
            required: ["task_id"],
            additionalProperties: false,
          },
        },
      },
      {
        type: "function",
        function: {
          name: "delete_task",
          description: "Delete a task",
          parameters: {
            type: "object",
            properties: {
              task_id: { type: "string", description: "Task ID" },
            },
            required: ["task_id"],
            additionalProperties: false,
          },
        },
      },
      {
        type: "function",
        function: {
          name: "create_skill_workflow",
          description: "Create a skill learning workflow with a folder and daily tasks. Use this when user wants to learn or master a skill (e.g., 'create workflow for mastering Python in 4 days')",
          parameters: {
            type: "object",
            properties: {
              skill_name: { type: "string", description: "Name of the skill to learn (e.g., Python, React, Guitar)" },
              days: { type: "number", description: "Number of days for the learning plan (default: 4)" },
              start_date: { type: "string", description: "Start date in ISO format (optional, defaults to today)" },
            },
            required: ["skill_name"],
            additionalProperties: false,
          },
        },
      },
    ];

    // Build messages for OpenAI-compatible API
    const systemMsg = {
      role: 'system',
      content:
        `You are LifeTrack AI assistant for task and routine management.\n` +
        `Rules:\n` +
        `- Be helpful and proactive. Provide suggestions, ideas, and advice when asked.\n` +
        `- Keep replies concise and friendly.\n` +
        `- Understand confirmations like "yes", "confirm", "go ahead" in context.\n` +
        `- Parse dates in natural language: "today", "tomorrow", "yesterday", and DD/MM/YYYY or YYYY-MM-DD.\n` +
        `- When showing tasks, format them naturally:\n` +
        `  * Use emoji for status: ⬜ pending, ✅ completed\n` +
        `  * Show priority with color emojis: 🔴 high, 🟡 medium, 🟢 low\n` +
        `  * Format dates as readable text (e.g., "Nov 24, 2025" or "Tomorrow")\n` +
        `  * Include description when relevant\n` +
        `  Example: "🔴 ⬜ Call mom - Tomorrow at 3pm\\nReminder: Discuss vacation plans"\n` +
        `- Use tools to fetch or mutate data instead of guessing.\n` +
        `- When users ask for suggestions or ideas, provide thoughtful, actionable advice.`,
    } as const;

    const builtMessages: Array<{ role: string; content: string }> = (() => {
      if (incomingMessages && incomingMessages.length > 0) {
        return [systemMsg, ...incomingMessages.slice(-20)];
      }
      // Legacy shape fallback
      const history = legacyHistory
        .map((m) => {
          // Accept { role, content } or Gemini parts
          if (m?.content && m?.role) return { role: m.role, content: String(m.content) };
          const text = Array.isArray(m?.parts) && m.parts[0]?.text ? String(m.parts[0].text) : '';
          let role = m?.role === 'user' ? 'user' : 'assistant';
          return { role, content: text };
        })
        .slice(-20);
      const last = legacyMessage ? [{ role: 'user', content: legacyMessage }] : [];
      return [systemMsg, ...history, ...last];
    })();

    // Call Lovable AI Gateway (non-streaming)
    const aiResponse = await fetch(
      'https://ai.gateway.lovable.dev/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: builtMessages,
          tools,
          tool_choice: 'auto'
        }),
      }
    );

    let aiData: any = null;
    try { aiData = await aiResponse.json(); } catch (_) {}
    if (!aiResponse.ok || (aiData && aiData.error)) {
      const code = aiData?.error?.code || aiResponse.status;
      const messageText = aiData?.error?.message || 'AI API error';
      const status = code === 429 ? 429 : code === 402 ? 402 : 500;
      console.error('AI API error:', code, messageText);
      return new Response(JSON.stringify({ error: messageText }), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if AI wants to call a function (OpenAI tool calls)
    const functionCalls = aiData.choices?.[0]?.message?.tool_calls;

    if (functionCalls && functionCalls.length > 0) {
      // Execute function calls
      const functionResponses = [];
      
      for (const call of functionCalls) {
        const functionName = call.function.name;
        const args = JSON.parse(call.function.arguments || '{}');
        console.log(`Executing function: ${functionName}`, args);

        let result;
        try {
          switch (functionName) {
            case "get_tasks": {
              // Build query with optional filters
              let query = supabase
                .from('tasks')
                .select('*')
                .eq('user_id', user.id);

              // Status filter
              if (args.status && args.status !== 'all') {
                query = query.eq('status', args.status);
              }

              // Date filters
              const now = new Date();
              const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
              const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

              const toIso = (d: Date) => d.toISOString();

              if (args.folder_id) {
                query = query.eq('folder_id', args.folder_id);
              }

              if (args.due_when === 'today') {
                const s = startOfDay(now); const e = endOfDay(now);
                query = query.gte('due_date', toIso(s)).lte('due_date', toIso(e));
              } else if (args.due_when === 'tomorrow') {
                const t = new Date(now); t.setDate(now.getDate() + 1);
                const s = startOfDay(t); const e = endOfDay(t);
                query = query.gte('due_date', toIso(s)).lte('due_date', toIso(e));
              } else if (args.due_when === 'overdue') {
                query = query.lt('due_date', toIso(now)).eq('status', 'pending');
              } else if (args.due_when === 'upcoming') {
                const eToday = endOfDay(now);
                query = query.gte('due_date', toIso(eToday));
              } else if (args.due_when === 'date' || args.date_iso) {
                // Specific date
                const d = args.date_iso ? new Date(args.date_iso) : now;
                const s = startOfDay(d); const e = endOfDay(d);
                query = query.gte('due_date', toIso(s)).lte('due_date', toIso(e));
              }

              const { data, error } = await query.order('due_date', { ascending: true });
              result = error ? { error: error.message } : { tasks: data };
              break;
            }
            case "get_folders": {
              const { data, error } = await supabase
                .from('folders')
                .select('*')
                .eq('user_id', user.id);
              result = error ? { error: error.message } : { folders: data };
              break;
            }
            case "create_folder": {
              const { data, error } = await supabase
                .from('folders')
                .insert([{
                  user_id: user.id,
                  name: args.name,
                  color: '#6366f1',
                  icon: 'folder'
                }])
                .select()
                .single();
              result = error ? { error: error.message } : { folder: data };
              break;
            }
            case "create_task": {
              const { data, error } = await supabase
                .from('tasks')
                .insert([{
                  user_id: user.id,
                  title: args.title,
                  description: args.description || '',
                  folder_id: args.folder_id || null,
                  priority: args.priority || 'medium',
                  due_date: args.due_date || null,
                  status: 'pending',
                  is_recurring: args.is_recurring || false,
                  recurrence_frequency: args.is_recurring ? 'daily' : null,
                  recurrence_end_date: args.recurrence_end_date || null,
                  is_recurrence_active: args.is_recurring || false,
                }])
                .select()
                .single();
              result = error ? { error: error.message } : { task: data };
              break;
            }
            case "mark_task_complete": {
              const { data, error } = await supabase
                .from('tasks')
                .update({
                  status: 'completed',
                  completed_at: new Date().toISOString()
                })
                .eq('id', args.task_id)
                .eq('user_id', user.id)
                .select()
                .single();
              result = error ? { error: error.message } : { task: data };
              break;
            }
            case "delete_task": {
              const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', args.task_id)
                .eq('user_id', user.id);
              result = error ? { error: error.message } : { success: true };
              break;
            }
            case "create_skill_workflow": {
              const skillName = args.skill_name;
              const days = args.days || 4;
              const startDate = args.start_date ? new Date(args.start_date) : new Date();
              
              // Create folder for the skill
              const { data: folder, error: folderError } = await supabase
                .from('folders')
                .insert([{
                  user_id: user.id,
                  name: `Learning ${skillName}`,
                  color: '#8B5CF6',
                  icon: 'book'
                }])
                .select()
                .single();
              
              if (folderError) {
                result = { error: folderError.message };
                break;
              }
              
              // Create daily tasks based on the skill learning workflow
              const tasks = [];
              
              // Skill-specific YouTube video recommendations
              const skillVideos: Record<string, { day1: string; day2: string }> = {
                'python': {
                  day1: 'https://www.youtube.com/watch?v=rfscVS0vtbw',
                  day2: 'https://www.youtube.com/watch?v=8ext9G7xspg'
                },
                'javascript': {
                  day1: 'https://www.youtube.com/watch?v=W6NZfCO5SIk',
                  day2: 'https://www.youtube.com/watch?v=PkZNo7MFNFg'
                },
                'react': {
                  day1: 'https://www.youtube.com/watch?v=Ke90Tje7VS0',
                  day2: 'https://www.youtube.com/watch?v=w7ejDZ8SWv8'
                },
                'java': {
                  day1: 'https://www.youtube.com/watch?v=eIrMbAQSU34',
                  day2: 'https://www.youtube.com/watch?v=xk4_1vDrzzo'
                },
                'typescript': {
                  day1: 'https://www.youtube.com/watch?v=BwuLxPH8IDs',
                  day2: 'https://www.youtube.com/watch?v=30LWjhZzg50'
                },
                'default': {
                  day1: 'https://www.youtube.com/results?search_query=' + encodeURIComponent(skillName + ' tutorial for beginners'),
                  day2: 'https://www.youtube.com/results?search_query=' + encodeURIComponent(skillName + ' projects tutorial')
                }
              };
              
              const videos = skillVideos[skillName.toLowerCase()] || skillVideos['default'];
              const skillLower = skillName.toLowerCase();
              
              const taskTemplates = [
                {
                  title: `Day 1: Watch introductory ${skillName} tutorial`,
                  description: `📺 Watch complete ${skillName} beginner tutorial\n${videos.day1}\n📝 Take notes on key concepts\n💾 Push your notes to GitHub https://github.com`,
                  priority: 'high'
                },
                {
                  title: `Day 2: Practice ${skillName} fundamentals`,
                  description: `📺 Watch hands-on ${skillName} project tutorial\n${videos.day2}\n💻 Complete the coding exercises\n💾 Update your GitHub repository https://github.com`,
                  priority: 'high'
                },
                {
                  title: `Day 3: Build a mini project & share`,
                  description: `🛠️ Build a small ${skillName} project\n📝 Document your learning journey\n📱 Create a LinkedIn post about your progress\nhttps://www.linkedin.com/feed/\n💾 Share your project on GitHub`,
                  priority: 'medium'
                },
                {
                  title: `Day 4: Apply for opportunities`,
                  description: `📄 Update your resume with ${skillName} skills\n📧 Apply for ${skillName} internships:\nhttps://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(skillName + ' internship')}\nhttps://www.indeed.com/jobs?q=${encodeURIComponent(skillName + ' intern')}\nhttps://internshala.com/internships/${skillLower.replace(/\s+/g, '-')}-internship`,
                  priority: 'high'
                }
              ];
              
              for (let i = 0; i < Math.min(days, taskTemplates.length); i++) {
                const taskDate = new Date(startDate);
                taskDate.setDate(startDate.getDate() + i);
                taskDate.setHours(23, 59, 59, 999);
                
                const { data: task, error: taskError } = await supabase
                  .from('tasks')
                  .insert([{
                    user_id: user.id,
                    folder_id: folder.id,
                    title: taskTemplates[i].title,
                    description: taskTemplates[i].description,
                    priority: taskTemplates[i].priority,
                    due_date: taskDate.toISOString(),
                    status: 'pending'
                  }])
                  .select()
                  .single();
                
                if (!taskError && task) {
                  tasks.push(task);
                }
              }
              
              // If more days than templates, add generic tasks
              for (let i = taskTemplates.length; i < days; i++) {
                const taskDate = new Date(startDate);
                taskDate.setDate(startDate.getDate() + i);
                taskDate.setHours(23, 59, 59, 999);
                
                const { data: task, error: taskError } = await supabase
                  .from('tasks')
                  .insert([{
                    user_id: user.id,
                    folder_id: folder.id,
                    title: `Day ${i + 1}: Continue ${skillName} practice`,
                    description: `📚 Review previous concepts\n💻 Work on projects\n📝 Document progress`,
                    priority: 'medium',
                    due_date: taskDate.toISOString(),
                    status: 'pending'
                  }])
                  .select()
                  .single();
                
                if (!taskError && task) {
                  tasks.push(task);
                }
              }
              
              result = { 
                folder: folder, 
                tasks: tasks,
                message: `Created "${folder.name}" folder with ${tasks.length} daily tasks`
              };
              break;
            }
            default:
              result = { error: "Unknown function" };
          }
        } catch (error) {
          console.error(`Error executing ${functionName}:`, error);
          result = { error: error instanceof Error ? error.message : String(error) };
        }

        functionResponses.push({
          role: 'tool',
          tool_call_id: call.id,
          name: functionName,
          content: JSON.stringify(result)
        });
      }

      // Call AI again with function results
      const followUpResponse = await fetch(
        'https://ai.gateway.lovable.dev/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              systemMsg,
              ...builtMessages.filter(m => m.role !== 'system'),
              aiData.choices[0].message,
              ...functionResponses,
            ],
            tools,
            tool_choice: 'auto'
          }),
        }
      );

      const followUpData = await followUpResponse.json();
      const responseText = followUpData.choices?.[0]?.message?.content || "I encountered an issue processing your request.";

      return new Response(JSON.stringify({ response: responseText }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // No function call, just return the text response
    const responseText = aiData.choices?.[0]?.message?.content || "I'm not sure how to help with that. Ask about tasks or folders (e.g., 'show today's tasks').";

    return new Response(JSON.stringify({ response: responseText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in chat function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
