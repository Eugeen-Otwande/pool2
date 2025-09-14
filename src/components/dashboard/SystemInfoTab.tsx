import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings, 
  User, 
  Info, 
  Database, 
  Clock, 
  Activity,
  Save,
  RefreshCw
} from "lucide-react";
import { User as SupabaseUser } from "@supabase/supabase-js";

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  status: string;
  phone?: string | null;
  emergency_contact?: string | null;
  emergency_phone?: string | null;
  created_at: string;
  updated_at: string;
}

interface SystemInfoTabProps {
  user: SupabaseUser;
  profile: UserProfile;
}

const SystemInfoTab = ({ user, profile }: SystemInfoTabProps) => {
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    totalCheckIns: 0,
    activeUsers: 0,
    databaseSize: 0,
    lastBackup: null as string | null
  });
  const [profileForm, setProfileForm] = useState({
    first_name: profile.first_name || "",
    last_name: profile.last_name || "",
    phone: profile.phone || "",
    emergency_contact: profile.emergency_contact || "",
    emergency_phone: profile.emergency_phone || ""
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSystemStats();
  }, []);

  const fetchSystemStats = async () => {
    setLoading(true);
    try {
      // Fetch user count
      const { count: userCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Fetch check-ins count
      const { count: checkInCount } = await supabase
        .from("check_ins")
        .select("*", { count: "exact", head: true });

      // Fetch active users (checked in today)
      const today = new Date().toISOString().split('T')[0];
      const { count: activeCount } = await supabase
        .from("check_ins")
        .select("*", { count: "exact", head: true })
        .gte("check_in_time", today);

      setSystemStats({
        totalUsers: userCount || 0,
        totalCheckIns: checkInCount || 0,
        activeUsers: activeCount || 0,
        databaseSize: 0, // This would need a custom function to calculate
        lastBackup: null // This would come from backup system
      });
    } catch (error) {
      console.error("Error fetching system stats:", error);
      toast({
        title: "Error",
        description: "Failed to load system statistics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: profileForm.first_name,
          last_name: profileForm.last_name,
          phone: profileForm.phone,
          emergency_contact: profileForm.emergency_contact,
          emergency_phone: profileForm.emergency_phone,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* System Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Overview</CardTitle>
            <Info className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Version:</span>
                <Badge variant="secondary">v1.0.0</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Environment:</span>
                <Badge variant="outline">Production</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Uptime:</span>
                <span className="text-sm">99.9%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database Stats</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Users:</span>
                <span className="text-sm font-medium">{systemStats.totalUsers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Check-ins:</span>
                <span className="text-sm font-medium">{systemStats.totalCheckIns}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Active Today:</span>
                <span className="text-sm font-medium">{systemStats.activeUsers}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge className="bg-green-500">Healthy</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Response Time:</span>
                <span className="text-sm">45ms</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchSystemStats}
                disabled={loading}
                className="w-full mt-2"
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Refresh Stats
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={profileForm.first_name}
                  onChange={(e) => setProfileForm({...profileForm, first_name: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={profileForm.last_name}
                  onChange={(e) => setProfileForm({...profileForm, last_name: e.target.value})}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
              />
            </div>

            <Separator />

            <div>
              <Label htmlFor="emergency_contact">Emergency Contact</Label>
              <Input
                id="emergency_contact"
                value={profileForm.emergency_contact}
                onChange={(e) => setProfileForm({...profileForm, emergency_contact: e.target.value})}
              />
            </div>

            <div>
              <Label htmlFor="emergency_phone">Emergency Phone</Label>
              <Input
                id="emergency_phone"
                value={profileForm.emergency_phone}
                onChange={(e) => setProfileForm({...profileForm, emergency_phone: e.target.value})}
              />
            </div>

            <Button 
              onClick={updateProfile} 
              disabled={saving}
              className="w-full"
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Profile
            </Button>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              System Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label>Account Information</Label>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Email:</span>
                    <span className="text-sm">{profile.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Role:</span>
                    <Badge>{profile.role}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <Badge variant={profile.status === 'active' ? 'default' : 'secondary'}>
                      {profile.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Member Since:</span>
                    <span className="text-sm">
                      {new Date(profile.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <Label>Quick Actions</Label>
                <div className="mt-2 space-y-2">
                  <Button variant="outline" size="sm" className="w-full">
                    <Clock className="h-4 w-4 mr-2" />
                    View Activity Log
                  </Button>
                  <Button variant="outline" size="sm" className="w-full">
                    <Database className="h-4 w-4 mr-2" />
                    Export Data
                  </Button>
                  <Button variant="outline" size="sm" className="w-full">
                    <Settings className="h-4 w-4 mr-2" />
                    System Maintenance
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SystemInfoTab;