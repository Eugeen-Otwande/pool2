import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  Clock, 
  Package, 
  QrCode,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Home
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ResidenceTab from "./ResidenceTab";
import MessagingTab from "./MessagingTab";
import ReportsTab from "./ReportsTab";
import TimetableManagement from "./TimetableManagement";
import UserApprovalTab from "./UserApprovalTab";
import SystemInfoTab from "./SystemInfoTab";
import ProfileTab from "./ProfileTab";
import InquiriesTab from "./InquiriesTab";
import VisitorsTab from "./VisitorsTab";
import PaymentsTab from "./PaymentsTab";
import ResidentsTab from "./ResidentsTab";
import VisitorManagementTab from "./VisitorManagementTab";
import { User } from "@supabase/supabase-js";
import RecentActivitiesWidget from "./RecentActivitiesWidget";

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  status: string;
  phone: string | null;
  emergency_contact: string | null;
  emergency_phone: string | null;
  subscription_type: string | null;
  subscription_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

interface StaffDashboardProps {
  user: User;
  profile: UserProfile;
}

const StaffDashboard = ({ user, profile }: StaffDashboardProps) => {
  const [currentCapacity, setCurrentCapacity] = useState(0);
  const [activeCheckIns, setActiveCheckIns] = useState<any[]>([]);
  const [availableEquipment, setAvailableEquipment] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
    
    // Set up real-time subscription for check-ins
    const channel = supabase
      .channel('staff-dashboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'check_ins'
        },
        () => fetchActiveCheckIns()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDashboardData = async () => {
    await Promise.all([
      fetchActiveCheckIns(),
      fetchAvailableEquipment(),
      fetchRecentActivities()
    ]);
    setLoading(false);
  };

  const fetchActiveCheckIns = async () => {
    try {
      const { data, error } = await supabase
        .from("check_ins")
        .select(`
          *,
          profiles!inner(first_name, last_name, role)
        `)
        .eq("status", "checked_in")
        .order("check_in_time", { ascending: false });

      if (error) throw error;
      
      setActiveCheckIns(data || []);
      setCurrentCapacity(data?.length || 0);
    } catch (error) {
      console.error("Error fetching check-ins:", error);
    }
  };

  const fetchAvailableEquipment = async () => {
    try {
      const { data, error } = await supabase
        .from("equipment")
        .select("*")
        .eq("status", "available")
        .order("category", { ascending: true });

      if (error) throw error;
      setAvailableEquipment(data || []);
    } catch (error) {
      console.error("Error fetching equipment:", error);
    }
  };

  const fetchRecentActivities = async () => {
    try {
      const { data, error } = await supabase
        .from("check_ins")
        .select(`
          *,
          profiles!inner(first_name, last_name, role),
          pool_schedules(title)
        `)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setRecentActivities(data || []);
    } catch (error) {
      console.error("Error fetching recent activities:", error);
    }
  };

  const handleUserSearch = async () => {
    if (!searchEmail.trim()) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          *,
          check_ins!inner(*)
        `)
        .eq("email", searchEmail.trim())
        .eq("check_ins.status", "checked_in")
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setSearchResult(data);
      } else {
        // Try to find user without active check-in
        const { data: userData, error: userError } = await supabase
          .from("profiles")
          .select("*")
          .eq("email", searchEmail.trim())
          .maybeSingle();

        if (userError) throw userError;
        
        setSearchResult(userData);
        
        if (!userData) {
          toast({
            title: "User Not Found",
            description: "No user found with that email address",
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Search Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleManualCheckOut = async (checkInId: string, userName: string) => {
    try {
      const { error } = await supabase
        .from("check_ins")
        .update({
          check_out_time: new Date().toISOString(),
          status: "checked_out"
        })
        .eq("id", checkInId);

      if (error) throw error;

      toast({
        title: "Check-out Successful",
        description: `${userName} has been checked out`,
      });

      fetchActiveCheckIns();
    } catch (error: any) {
      toast({
        title: "Check-out Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatDuration = (checkInTime: string) => {
    const start = new Date(checkInTime);
    const now = new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / 60000); // minutes
    
    if (diff < 60) return `${diff}m`;
    return `${Math.floor(diff / 60)}h ${diff % 60}m`;
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-24 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Staff Dashboard
        </h1>
        <p className="text-muted-foreground">
          Monitor pool access and manage equipment
        </p>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="residence">Residence</TabsTrigger>
          <TabsTrigger value="schedules">Schedules</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Current Capacity</p>
                    <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{currentCapacity}</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">people in pool</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-emerald-200 dark:border-emerald-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Available Equipment</p>
                    <p className="text-3xl font-bold text-emerald-900 dark:text-emerald-100">{availableEquipment.length}</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">items ready</p>
                  </div>
                  <Package className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Avg. Session</p>
                    <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">1.2h</p>
                    <p className="text-xs text-purple-600 dark:text-purple-400">duration today</p>
                  </div>
                  <Clock className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Search & Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  User Search
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter user email..."
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleUserSearch()}
                  />
                  <Button onClick={handleUserSearch}>
                    <Search className="w-4 h-4" />
                  </Button>
                </div>

                {searchResult && (
                  <div className="p-4 rounded-lg border bg-muted/50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">
                          {searchResult.first_name} {searchResult.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">{searchResult.email}</p>
                        <Badge variant="secondary">{searchResult.role}</Badge>
                      </div>
                      <Badge 
                        variant={searchResult.check_ins?.length > 0 ? "default" : "secondary"}
                      >
                        {searchResult.check_ins?.length > 0 ? "Checked In" : "Not In Pool"}
                      </Badge>
                    </div>
                    
                    {searchResult.check_ins?.length > 0 && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleManualCheckOut(
                          searchResult.check_ins[0].id,
                          `${searchResult.first_name} ${searchResult.last_name}`
                        )}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Check Out User
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Equipment Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Equipment Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {availableEquipment.length > 0 ? (
                    availableEquipment.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                          <p className="text-sm font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.category}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-emerald-600 border-emerald-600">
                            Available
                          </Badge>
                          <Button size="sm" variant="ghost">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      No equipment available
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Check-ins */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Currently in Pool ({currentCapacity})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeCheckIns.length > 0 ? (
                  activeCheckIns.map((checkIn) => (
                    <div key={checkIn.id} className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                        <div>
                          <p className="font-medium">
                            {checkIn.profiles.first_name} {checkIn.profiles.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Duration: {formatDuration(checkIn.check_in_time)} • 
                            Checked in: {new Date(checkIn.check_in_time).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">
                          {checkIn.profiles.role}
                        </Badge>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleManualCheckOut(
                            checkIn.id,
                            `${checkIn.profiles.first_name} ${checkIn.profiles.last_name}`
                          )}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Check Out
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No one is currently checked into the pool
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Recent Activities Section */}
          <RecentActivitiesWidget 
            activities={recentActivities} 
            title="Recent Pool Activities"
            showUserInfo={true}
            limit={10}
          />
        </TabsContent>

        {/* Approvals Tab */}
        <TabsContent value="approvals" className="space-y-6">
          <UserApprovalTab onRefreshStats={() => fetchDashboardData()} />
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">Manage user accounts and permissions</p>
              <Button>Add New User</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Residence Tab */}
        <TabsContent value="residence" className="space-y-6">
          <ResidenceTab onRefreshStats={() => fetchDashboardData()} />
        </TabsContent>

        {/* Schedules Tab */}
        <TabsContent value="schedules" className="space-y-6">
          <TimetableManagement onRefreshStats={() => fetchDashboardData()} />
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-6">
          <MessagingTab onRefreshStats={() => {}} />
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <ReportsTab />
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-6">
          <SystemInfoTab user={user} profile={profile} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StaffDashboard;