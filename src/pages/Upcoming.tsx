import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Calendar, CheckCircle2, Circle } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string;
  folder_id: string | null;
}

const Upcoming = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    const fetchUpcomingTasks = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true });

      if (!error && data) {
        setTasks(data);
      }
    };

    fetchUpcomingTasks();
  }, [user]);

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    
    await supabase
      .from('tasks')
      .update({ 
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : null 
      })
      .eq('id', taskId);

    setTasks(tasks.filter(t => t.id !== taskId));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-destructive';
      case 'medium': return 'text-warning';
      case 'low': return 'text-success';
      default: return 'text-muted-foreground';
    }
  };

  const groupTasksByDate = () => {
    const groups: Record<string, Task[]> = {};
    
    tasks.forEach(task => {
      const date = new Date(task.due_date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(task);
    });

    return groups;
  };

  const groupedTasks = groupTasksByDate();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Upcoming Tasks</h1>
        <p className="text-muted-foreground mt-1">
          Your scheduled tasks organized by date
        </p>
      </div>

      {Object.keys(groupedTasks).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedTasks).map(([date, dateTasks]) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">{date}</h2>
                <span className="text-sm text-muted-foreground">
                  ({dateTasks.length} tasks)
                </span>
              </div>
              
              <div className="space-y-3">
                {dateTasks.map((task) => (
                  <Card key={task.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                      <button
                        onClick={() => handleToggleTask(task.id, task.status)}
                        className="mt-1"
                      >
                        {task.status === 'completed' ? (
                          <CheckCircle2 className="h-5 w-5 text-success" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
                        )}
                      </button>
                      
                      <div className="flex-1">
                        <h3 className="font-medium">{task.title}</h3>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                        )}
                        <span className={`text-xs font-medium mt-2 inline-block ${getPriorityColor(task.priority)}`}>
                          {task.priority.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card className="p-12 flex flex-col items-center justify-center text-center">
          <Calendar className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">
            No upcoming tasks
          </h3>
          <p className="text-sm text-muted-foreground">
            Tasks with due dates will appear here
          </p>
        </Card>
      )}
    </div>
  );
};

export default Upcoming;