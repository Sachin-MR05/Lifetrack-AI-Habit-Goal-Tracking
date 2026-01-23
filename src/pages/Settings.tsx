import { Card } from '@/components/ui/card';
import { Settings as SettingsIcon } from 'lucide-react';

const Settings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and preferences
        </p>
      </div>

      <Card className="p-12 flex flex-col items-center justify-center text-center">
        <SettingsIcon className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">
          Settings Coming Soon
        </h3>
        <p className="text-sm text-muted-foreground">
          Customize your experience in future updates
        </p>
      </Card>
    </div>
  );
};

export default Settings;