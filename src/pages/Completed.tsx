import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, RotateCcw } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  completed_at: string;
  folder_id: string | null;
}

const Completed = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);

  const fetchCompletedTasks = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false });

    if (!error && data) {
      setTasks(data);
    }
  };

  useEffect(() => {
    fetchCompletedTasks();
  }, [user]);

  const handleRestoreTask = async (taskId: string) => {
    await supabase
      .from('tasks')
      .update({ 
        status: 'pending',
        completed_at: null 
      })
      .eq('id', taskId);

    fetchCompletedTasks();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Completed Tasks</h1>
        <p className="text-muted-foreground mt-1">
          View your accomplishments and track your progress
        </p>
      </div>

      {tasks.length > 0 ? (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Card key={task.id} className="p-4 hover:shadow-md transition-shadow bg-success/5">
              <div className="flex items-start gap-4">
                <CheckCircle2 className="h-5 w-5 text-success mt-1 flex-shrink-0" />
                
                <div className="flex-1">
                  <h3 className="font-medium line-through text-muted-foreground">
                    {task.title}
                  </h3>
                  {task.description && (
                    <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Completed {new Date(task.completed_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRestoreTask(task.id)}
                  title="Restore task"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 flex flex-col items-center justify-center text-center">
          <CheckCircle2 className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">
            No completed tasks yet
          </h3>
          <p className="text-sm text-muted-foreground">
            Completed tasks will appear here for your review
          </p>
        </Card>
      )}
    </div>
  );
};

export default Completed;