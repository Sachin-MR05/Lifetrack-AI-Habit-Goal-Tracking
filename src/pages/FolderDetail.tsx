import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, CheckCircle2, Circle, Trash2, Repeat, StopCircle, CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { TaskStepCard } from '@/components/TaskStepCard';

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  created_at: string;
  is_recurring?: boolean;
  recurrence_frequency?: string;
  recurrence_end_date?: string | null;
  is_recurrence_active?: boolean;
}

const FolderDetail = () => {
  const { folderId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [folderName, setFolderName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
    is_recurring: false,
    recurrence_end_type: 'never' as 'never' | 'date',
    recurrence_end_date: undefined as Date | undefined,
  });

  const fetchTasks = async () => {
    if (!user || !folderId) return;

    const { data: folder } = await supabase
      .from('folders')
      .select('name')
      .eq('id', folderId)
      .single();

    if (folder) setFolderName(folder.name);

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('folder_id', folderId)
      .order('created_at', { ascending: false });

    if (!error) {
      setTasks(data || []);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [user, folderId]);

  const handleCreateTask = async () => {
    if (!newTask.title.trim() || !user || !folderId) return;

    const { error } = await supabase
      .from('tasks')
      .insert([
        {
          user_id: user.id,
          folder_id: folderId,
          title: newTask.title,
          description: newTask.description,
          priority: newTask.priority,
          due_date: newTask.due_date || null,
          is_recurring: newTask.is_recurring,
          recurrence_frequency: newTask.is_recurring ? 'daily' : null,
          recurrence_end_date: newTask.is_recurring && newTask.recurrence_end_type === 'date' && newTask.recurrence_end_date
            ? newTask.recurrence_end_date.toISOString()
            : null,
          is_recurrence_active: newTask.is_recurring,
        }
      ]);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Task created successfully",
      });
      setNewTask({ 
        title: '', 
        description: '', 
        priority: 'medium', 
        due_date: '',
        is_recurring: false,
        recurrence_end_type: 'never',
        recurrence_end_date: undefined,
      });
      setDialogOpen(false);
      fetchTasks();
    }
  };

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    
    const { error } = await supabase
      .from('tasks')
      .update({ 
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : null 
      })
      .eq('id', taskId);

    if (!error) {
      fetchTasks();
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (!error) {
      toast({
        title: "Success",
        description: "Task deleted",
      });
      fetchTasks();
    }
  };

  const handleStopRecurrence = async (taskId: string) => {
    const { error } = await supabase
      .from('tasks')
      .update({ is_recurrence_active: false })
      .eq('id', taskId);

    if (!error) {
      toast({
        title: "Success",
        description: "Recurring task stopped",
      });
      fetchTasks();
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-destructive';
      case 'medium': return 'text-warning';
      case 'low': return 'text-success';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/folders')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{folderName}</h1>
            <p className="text-muted-foreground mt-1">{tasks.length} tasks</p>
          </div>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Task
        </Button>
      </div>

      <div className="space-y-3">
        {tasks.map((task) => (
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
                <div className="flex items-center gap-2">
                  <h3 className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                    {task.title}
                  </h3>
                  {task.is_recurring && task.is_recurrence_active && (
                    <Repeat className="h-4 w-4 text-primary" />
                  )}
                </div>
                {task.description && (
                  <TaskStepCard description={task.description} />
                )}
                <div className="flex items-center gap-3 mt-2">
                  <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>
                    {task.priority.toUpperCase()}
                  </span>
                  {task.due_date && (
                    <span className="text-xs text-muted-foreground">
                      Due: {new Date(task.due_date).toLocaleDateString()}
                    </span>
                  )}
                  {task.is_recurring && task.is_recurrence_active && (
                    <span className="text-xs text-primary font-medium">
                      Repeats Daily{task.recurrence_end_date ? ` until ${new Date(task.recurrence_end_date).toLocaleDateString()}` : ''}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {task.is_recurring && task.is_recurrence_active && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleStopRecurrence(task.id)}
                  >
                    <StopCircle className="h-4 w-4 text-warning" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteTask(task.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {tasks.length === 0 && (
          <Card className="p-12 flex flex-col items-center justify-center text-center">
            <Circle className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              No tasks yet
            </h3>
            <p className="text-sm text-muted-foreground">
              Add your first task to get started
            </p>
          </Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Task title"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            />
            <Textarea
              placeholder="Description (optional)"
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            />
            <Select
              value={newTask.priority}
              onValueChange={(value) => setNewTask({ ...newTask, priority: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low Priority</SelectItem>
                <SelectItem value="medium">Medium Priority</SelectItem>
                <SelectItem value="high">High Priority</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={newTask.due_date}
              onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
            />
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="recurring"
                checked={newTask.is_recurring}
                onCheckedChange={(checked) => 
                  setNewTask({ 
                    ...newTask, 
                    is_recurring: checked as boolean,
                    recurrence_end_type: 'never',
                    recurrence_end_date: undefined,
                  })
                }
              />
              <Label htmlFor="recurring" className="text-sm font-medium">
                This is a recurring task (repeats daily)
              </Label>
            </div>

            {newTask.is_recurring && (
              <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                <RadioGroup
                  value={newTask.recurrence_end_type}
                  onValueChange={(value: 'never' | 'date') => 
                    setNewTask({ 
                      ...newTask, 
                      recurrence_end_type: value,
                      recurrence_end_date: value === 'never' ? undefined : newTask.recurrence_end_date,
                    })
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="never" id="never" />
                    <Label htmlFor="never" className="text-sm">Until I stop it</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="date" id="date" />
                    <Label htmlFor="date" className="text-sm">Until specific date</Label>
                  </div>
                </RadioGroup>

                {newTask.recurrence_end_type === 'date' && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !newTask.recurrence_end_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newTask.recurrence_end_date ? (
                          format(newTask.recurrence_end_date, "PPP")
                        ) : (
                          <span>Pick end date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={newTask.recurrence_end_date}
                        onSelect={(date) => setNewTask({ ...newTask, recurrence_end_date: date })}
                        initialFocus
                        className="pointer-events-auto"
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            )}
            
            <Button onClick={handleCreateTask} className="w-full">
              Create Task
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FolderDetail;