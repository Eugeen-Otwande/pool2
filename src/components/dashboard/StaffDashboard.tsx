import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  Calendar, 
  Package, 
  Clock,
  CheckCircle,
  AlertTriangle,
  Wrench,
  BarChart3
} from "lucide-react";
import TimetableManagement from "./TimetableManagement";
import MessagingTab from "./MessagingTab";
import CreateUserDialog from "./CreateUserDialog";
import ResidenceTab from "./ResidenceTab";
import CheckInWidget from "./CheckInWidget";
import { User } from "@supabase/supabase-js";

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
  subscription_type?: string | null;
  subscription_expires_at?: string | null;
  created_at: string;
  updated_at: string;
}

interface StaffDashboardProps {
  user: User;
  profile: UserProfile;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const StaffDashboard = ({ user, profile, activeTab, onTabChange }: StaffDashboardProps) => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeCheckIns: 0,
    equipmentItems: 0,
    residenceMembers: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
    
    // Set up real-time subscription for updates
    const channel = supabase
      .channel('staff-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'check_ins'
        },
        () => {
          fetchDashboardData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          fetchDashboardData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'residence_members'
        },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch all stats in parallel
      const [
        { count: userCount },
        { count: checkInCount },
        { count: equipmentCount },
        { count: residenceCount }
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("check_ins").select("*", { count: "exact", head: true }).eq("status", "checked_in"),
        supabase.from("equipment").select("*", { count: "exact", head: true }),
        supabase.from("residence_members").select("*", { count: "exact", head: true })
      ]);

      setStats({
        totalUsers: userCount || 0,
        activeCheckIns: checkInCount || 0,
        equipmentItems: equipmentCount || 0,
        residenceMembers: residenceCount || 0,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshStats = () => {
    fetchDashboardData();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Users</p>
                      <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{stats.totalUsers}</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-emerald-200 dark:border-emerald-800">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Active Check-ins</p>
                      <p className="text-3xl font-bold text-emerald-900 dark:text-emerald-100">{stats.activeCheckIns}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Equipment Items</p>
                      <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">{stats.equipmentItems}</p>
                    </div>
                    <Package className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-950 dark:to-teal-900 border-teal-200 dark:border-teal-800">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-teal-600 dark:text-teal-400">Residence Members</p>
                      <p className="text-3xl font-bold text-teal-900 dark:text-teal-100">{stats.residenceMembers}</p>
                    </div>
                    <Users className="w-8 h-8 text-teal-600 dark:text-teal-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <CreateUserDialog onUserCreated={refreshStats} />
                    <Button 
                      variant="outline" 
                      onClick={() => onTabChange("residence")}
                      className="h-16 flex-col gap-2"
                    >
                      <Users className="h-5 w-5" />
                      Manage Residence
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => onTabChange("schedules")}
                      className="h-16 flex-col gap-2"
                    >
                      <Calendar className="h-5 w-5" />
                      Pool Schedules
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => onTabChange("equipment")}
                      className="h-16 flex-col gap-2"
                    >
                      <Wrench className="h-5 w-5" />
                      Equipment
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <CheckInWidget user={user} profile={profile} />
            </div>
          </div>
        );

      case "users":
        return <CreateUserDialog onUserCreated={refreshStats} />;

      case "residence":
        return <ResidenceTab onRefreshStats={refreshStats} />;

      case "schedules":
        return <TimetableManagement onRefreshStats={refreshStats} />;

      case "messaging":
        return <MessagingTab onRefreshStats={refreshStats} />;

      case "equipment":
        return (
          <div className="space-y-6">
            <div className="text-center py-12">
              <Wrench className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Equipment Management</h3>
              <p className="text-muted-foreground">Equipment management features coming soon.</p>
            </div>
          </div>
        );

      case "checkins":
        return <CheckInWidget user={user} profile={profile} />;

      default:
        return (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Select a tab to view content</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {renderTabContent()}
    </div>
  );
};

export default StaffDashboard;