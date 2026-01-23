import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Chatbot } from '@/components/Chatbot';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';

const DashboardLayout = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="h-20 border-b border-border/50 bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 backdrop-blur-lg flex items-center justify-between px-8 shadow-md">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div className="flex items-center gap-3 select-none">
                <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent shadow-sm ring-2 ring-primary/20 overflow-hidden">
                  <div className="absolute inset-0 opacity-20 blur-2xl bg-white" />
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary-foreground absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <path d="M12 2l2.5 5.1L20 8l-4 3.9L17 18l-5-2.9L7 18l1-6.1L4 8l5.5-.9L12 2z" fill="currentColor" />
                  </svg>
                </div>
                <div>
                  <div className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                    LifeTrack AI
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground/80">
                    Focus. Plan. Achieve.
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-primary/5 border border-primary/10">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <span className="font-semibold text-foreground">
                  {user?.user_metadata?.full_name || 'User'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={signOut}
                title="Sign out"
                className="hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>

          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-7xl mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
        <Chatbot />
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;