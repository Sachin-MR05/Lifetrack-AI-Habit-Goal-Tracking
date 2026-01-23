import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Plus, Calendar, TrendingUp, Target, Folder } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, isSameDay, parseISO } from 'date-fns';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [greeting, setGreeting] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    streak: 0,
  });
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) setGreeting('Good morning');
      else if (hour < 18) setGreeting('Good afternoon');
      else setGreeting('Good evening');
    };

    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }));
    };

    updateGreeting();
    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('streak_count')
        .eq('id', user.id)
        .single();

      if (tasksData) {
        setTasks(tasksData);
        setStats({
          totalTasks: tasksData.length,
          completedTasks: tasksData.filter(t => t.status === 'completed').length,
          pendingTasks: tasksData.filter(t => t.status === 'pending').length,
          streak: profile?.streak_count || 0,
        });
      }
    };

    fetchStats();
  }, [user]);

  const getTasksForDate = (date: Date) => {
    return tasks.filter(task => {
      if (!task.due_date) return false;
      return isSameDay(parseISO(task.due_date), date);
    });
  };

  const getDayClassName = (date: Date) => {
    const dayTasks = getTasksForDate(date);
    if (dayTasks.length === 0) return '';
    
    const allCompleted = dayTasks.every(t => t.status === 'completed');
    const hasPending = dayTasks.some(t => t.status === 'pending');
    
    if (allCompleted) return 'bg-success/20 text-success-foreground hover:bg-success/30';
    if (hasPending) return 'bg-warning/20 text-warning-foreground hover:bg-warning/30';
    return '';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between p-8 rounded-2xl bg-gradient-to-br from-primary/5 via-primary/3 to-transparent border border-primary/10 shadow-lg">
        <div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {greeting}, {user?.user_metadata?.full_name?.split(' ')[0] || 'there'}!
          </h1>
          <p className="text-muted-foreground mt-2 flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" />
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })} • {currentTime}
          </p>
        </div>
        <Button onClick={() => navigate('/folders')} size="lg" className="gap-2 shadow-md hover:shadow-lg transition-shadow">
          <Plus className="h-5 w-5" />
          New Task
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Total Tasks</p>
              <p className="text-3xl font-bold text-foreground mt-1">{stats.totalTasks}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Target className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Completed</p>
              <p className="text-3xl font-bold text-success mt-1">{stats.completedTasks}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-success" />
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Pending</p>
              <p className="text-3xl font-bold text-warning mt-1">{stats.pendingTasks}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-warning" />
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Streak</p>
              <p className="text-3xl font-bold text-accent mt-1">{stats.streak} days</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
              <span className="text-2xl">🔥</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button 
            variant="outline" 
            className="h-24 flex-col gap-2"
            onClick={() => navigate('/folders')}
          >
            <Folder className="h-6 w-6" />
            <span>Create Folder</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-24 flex-col gap-2"
            onClick={() => navigate('/upcoming')}
          >
            <Calendar className="h-6 w-6" />
            <span>View Schedule</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-24 flex-col gap-2"
            onClick={() => navigate('/completed')}
          >
            <TrendingUp className="h-6 w-6" />
            <span>View Progress</span>
          </Button>
        </div>
      </Card>

      {/* Calendar */}
      <Card className="p-8 shadow-xl border-primary/10 overflow-hidden">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center ring-2 ring-primary/20">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Task Calendar</h2>
            <p className="text-sm text-muted-foreground mt-1">Track your progress</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calendar Column */}
          <div className="lg:col-span-2">
            <div className="calendar-container p-6 flex justify-center">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                modifiers={{
                  completed: (date) => {
                    const dayTasks = getTasksForDate(date);
                    return dayTasks.length > 0 && dayTasks.every(t => t.status === 'completed');
                  },
                  pending: (date) => {
                    const dayTasks = getTasksForDate(date);
                    return dayTasks.length > 0 && dayTasks.some(t => t.status === 'pending');
                  },
                }}
                modifiersClassNames={{
                  completed: 'bg-gradient-to-br from-success/30 to-success/20 text-success-foreground hover:from-success/40 hover:to-success/30 ring-1 ring-success/30 font-semibold',
                  pending: 'bg-gradient-to-br from-warning/30 to-warning/20 text-warning-foreground hover:from-warning/40 hover:to-warning/30 ring-1 ring-warning/30 font-semibold',
                }}
              />
            </div>

            {/* Legend */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-success/10 border border-success/20 hover:bg-success/15 transition-colors">
                <div className="w-3 h-3 rounded-full bg-gradient-to-br from-success to-success/70 shadow-sm"></div>
                <span className="text-sm font-medium text-foreground">All completed</span>
              </div>
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-warning/10 border border-warning/20 hover:bg-warning/15 transition-colors">
                <div className="w-3 h-3 rounded-full bg-gradient-to-br from-warning to-warning/70 shadow-sm"></div>
                <span className="text-sm font-medium text-foreground">Pending</span>
              </div>
            </div>
          </div>

          {/* Sidebar - Today & Stats */}
          <div className="lg:col-span-1 space-y-4">
            {/* Today's Date Card */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 shadow-sm">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Today</p>
              <p className="text-2xl font-bold text-foreground">{format(new Date(), 'd')}</p>
              <p className="text-sm text-muted-foreground mt-1">{format(new Date(), 'EEEE')}</p>
              <p className="text-xs text-muted-foreground mt-1">{format(new Date(), 'MMMM yyyy')}</p>
            </div>

            {/* Today's Tasks Stats */}
            {getTasksForDate(new Date()).length > 0 ? (
              <div className="p-4 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20 shadow-sm">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Today's Tasks</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="font-semibold text-foreground">{getTasksForDate(new Date()).length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Completed</span>
                    <span className="font-semibold text-success">{getTasksForDate(new Date()).filter(t => t.status === 'completed').length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Pending</span>
                    <span className="font-semibold text-warning">{getTasksForDate(new Date()).filter(t => t.status === 'pending').length}</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-accent/20">
                    <div className="w-full bg-accent/10 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-success to-success/70 h-full transition-all duration-500"
                        style={{ width: `${(getTasksForDate(new Date()).filter(t => t.status === 'completed').length / getTasksForDate(new Date()).length) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      {Math.round((getTasksForDate(new Date()).filter(t => t.status === 'completed').length / getTasksForDate(new Date()).length) * 100)}% Complete
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50 shadow-sm">
                <p className="text-sm text-muted-foreground text-center">No tasks for today</p>
              </div>
            )}

            {/* Overall Stats */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-secondary/10 to-secondary/5 border border-secondary/20 shadow-sm">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Overall</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">This Month</span>
                  <span className="font-semibold text-foreground">{stats.totalTasks}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Done</span>
                  <span className="font-semibold text-success">{stats.completedTasks}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Selected date details - Full Width */}
        {selectedDate && getTasksForDate(selectedDate).length > 0 && (
          <div className="mt-8 p-6 rounded-xl bg-gradient-to-br from-primary/5 via-transparent to-primary/5 border border-primary/10 animate-in fade-in-50 slide-in-from-bottom-2">
            <h3 className="font-bold text-lg mb-4 text-foreground flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Tasks for {format(selectedDate, 'MMM dd, yyyy')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {getTasksForDate(selectedDate).map((task, index) => (
                <div
                  key={task.id}
                  className="p-4 rounded-lg border bg-card/70 backdrop-blur-sm hover:bg-card hover:shadow-md transition-all duration-200 hover:translate-x-1 animate-in fade-in-50 slide-in-from-left-2"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl flex-shrink-0 mt-0.5">{task.status === 'completed' ? '✅' : '⬜'}</span>
                    <div className="min-w-0 flex-1">
                      <span className={task.status === 'completed' ? 'line-through text-muted-foreground text-sm' : 'font-medium text-sm block'}>
                        {task.title}
                      </span>
                      {task.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {task.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Dashboard;