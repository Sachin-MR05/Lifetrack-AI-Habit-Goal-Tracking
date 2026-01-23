import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Folder as FolderIcon, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface Folder {
  id: string;
  name: string;
  color: string;
  icon: string;
  created_at: string;
}

const Folders = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchFolders = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load folders",
        variant: "destructive",
      });
      return;
    }

    setFolders(data || []);
  };

  useEffect(() => {
    fetchFolders();
  }, [user]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !user) return;

    setLoading(true);
    const { error } = await supabase
      .from('folders')
      .insert([
        { 
          user_id: user.id, 
          name: newFolderName,
          color: '#6366f1',
          icon: 'folder'
        }
      ]);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create folder",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Folder created successfully",
      });
      setNewFolderName('');
      setDialogOpen(false);
      fetchFolders();
    }
    setLoading(false);
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!window.confirm('Are you sure you want to delete this folder?')) return;

    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', folderId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete folder",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Folder deleted successfully",
      });
      fetchFolders();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Folders</h1>
          <p className="text-muted-foreground mt-1">
            Organize your tasks into folders
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Folder
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Folder</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              />
              <Button 
                onClick={handleCreateFolder} 
                className="w-full"
                disabled={loading || !newFolderName.trim()}
              >
                Create Folder
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {folders.map((folder) => (
          <Card 
            key={folder.id} 
            className="p-6 cursor-pointer hover:shadow-lg transition-all group"
            onClick={() => navigate(`/folders/${folder.id}`)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FolderIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{folder.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(folder.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteFolder(folder.id);
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </Card>
        ))}

        {folders.length === 0 && (
          <Card className="p-12 col-span-full flex flex-col items-center justify-center text-center">
            <FolderIcon className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              No folders yet
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first folder to start organizing tasks
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Folders;