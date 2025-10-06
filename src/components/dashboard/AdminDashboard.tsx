import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReportsTab from "./ReportsTab";
import { 
  Users, 
  Calendar, 
  Package, 
  TrendingUp, 
  Clock,
  CheckCircle,
  AlertTriangle,
  Settings,
  Edit,
  Trash2,
  Plus,
  Eye,
  UserCheck,
  UserX,
  Mail,
  FileText,
  ClipboardList,
  Dumbbell,
  Info
} from "lucide-react";
import UserApprovalTab from "./UserApprovalTab";
import TimetableManagement from "./TimetableManagement";
import MessagingTab from "./MessagingTab";
import ResidentsTab from "./ResidentsTab";
import CreateUserDialog from "./CreateUserDialog";
import SystemInfoTab from "./SystemInfoTab";
import VisitorManagementTab from './VisitorManagementTab';
import InquiriesTab from './InquiriesTab';
import PoolLogsTab from './PoolLogsTab';
import OverviewStatsWidget from './OverviewStatsWidget';
import { EquipmentManagementTab } from './EquipmentManagementTab';
import { User } from "@supabase/supabase-js";

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

interface Equipment {
  id: string;
  name: string;
  category: string;
  description?: string;
  status: string;
  barcode?: string;
  replacement_cost?: number;
  created_at: string;
  updated_at: string;
}

interface Schedule {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  capacity_limit: number;
  allowed_roles: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CheckIn {
  id: string;
  user_id: string;
  check_in_time: string;
  check_out_time?: string;
  status: string;
  notes?: string;
  profiles: {
    first_name: string;
    last_name: string;
    role: string;
    email: string;
  };
}

interface AdminDashboardProps {
  user: User;
  profile: UserProfile;
}

const AdminDashboard = ({ user, profile }: AdminDashboardProps) => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeCheckIns: 0,
    equipmentItems: 0,
    pendingApprovals: 0,
  });
  const [recentActivity, setRecentActivity] = useState<CheckIn[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [showCreateUserDialog, setShowCreateUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  useEffect(() => {
    fetchDashboardData();
    
    // Set up real-time subscription for check-ins
    const channel = supabase
      .channel('admin-realtime')
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
          fetchUsers();
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
      // Fetch user count
      const { count: userCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Fetch active check-ins
      const { count: checkInCount } = await supabase
        .from("check_ins")
        .select("*", { count: "exact", head: true })
        .eq("status", "checked_in");

      // Fetch equipment count
      const { count: equipmentCount } = await supabase
        .from("equipment")
        .select("*", { count: "exact", head: true });

      // Fetch pending approvals
      const { count: pendingCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // Fetch recent check-ins
      const { data: recentCheckIns } = await supabase
        .from("check_ins")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      // Fetch user details for recent check-ins
      const recentActivity = [];
      if (recentCheckIns && recentCheckIns.length > 0) {
        for (const checkIn of recentCheckIns) {
          const { data: userProfile } = await supabase
            .from("profiles")
            .select("first_name, last_name, role, email")
            .eq("user_id", checkIn.user_id)
            .single();

          if (userProfile) {
            recentActivity.push({
              ...checkIn,
              profiles: userProfile
            });
          }
        }
      }

      setStats({
        totalUsers: userCount || 0,
        activeCheckIns: checkInCount || 0,
        equipmentItems: equipmentCount || 0,
        pendingApprovals: pendingCount || 0,
      });

      setRecentActivity(recentActivity);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      console.log("AdminDashboard: Fetching users...");
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching users:", error);
        throw error;
      }
      console.log("AdminDashboard: Fetched users:", data?.length || 0);
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    }
  };

  const fetchEquipment = async () => {
    try {
      const { data, error } = await supabase
        .from("equipment")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEquipment(data || []);
    } catch (error) {
      console.error("Error fetching equipment:", error);
      toast.error("Failed to load equipment");
    }
  };

  const fetchSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from("pool_schedules")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      toast.error("Failed to load schedules");
    }
  };

  const fetchCheckIns = async () => {
    try {
      console.log("AdminDashboard: Fetching check-ins...");
      const { data: checkInsData, error } = await supabase
        .from("check_ins")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("AdminDashboard: Error fetching check-ins:", error);
        throw error;
      }
      console.log("AdminDashboard: Fetched check-ins:", checkInsData?.length || 0);

      // Fetch user details for each check-in
      const checkInsWithProfiles = [];
      if (checkInsData && checkInsData.length > 0) {
        for (const checkIn of checkInsData) {
          const { data: userProfile } = await supabase
            .from("profiles")
            .select("first_name, last_name, role, email")
            .eq("user_id", checkIn.user_id)
            .single();

          if (userProfile) {
            checkInsWithProfiles.push({
              ...checkIn,
              profiles: userProfile
            });
          }
        }
      }

      setCheckIns(checkInsWithProfiles);
    } catch (error) {
      console.error("Error fetching check-ins:", error);
      toast.error("Failed to load check-ins");
    }
  };

  const formatDuration = (checkInTime: string, checkOutTime?: string) => {
    const start = new Date(checkInTime);
    const end = checkOutTime ? new Date(checkOutTime) : new Date();
    const diff = Math.floor((end.getTime() - start.getTime()) / 60000); // minutes
    
    if (diff < 60) return `${diff}m`;
    return `${Math.floor(diff / 60)}h ${diff % 60}m`;
  };

  const updateUserStatus = async (userId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status })
        .eq("id", userId);

      if (error) throw error;

      toast.success(`User status updated to ${status}`);
      fetchUsers();
      fetchDashboardData();
    } catch (error) {
      console.error("Error updating user status:", error);
      toast.error("Failed to update user status");
    }
  };

  const updateUserRole = async (userId: string, role: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role })
        .eq("id", userId);

      if (error) throw error;

      toast.success(`User role updated to ${role}`);
      fetchUsers();
      fetchDashboardData();
    } catch (error) {
      console.error("Error updating user role:", error);
      toast.error("Failed to update user role");
    }
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setShowCreateUserDialog(true);
  };

  const handleDeleteUser = async (user: any) => {
    if (!confirm(`Are you sure you want to delete ${user.first_name} ${user.last_name}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", user.id);

      if (error) throw error;
      
      toast.success("User has been deleted successfully");
      fetchUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error(error.message || "Failed to delete user");
    }
  };

  const onUserCreated = () => {
    fetchUsers();
    setEditingUser(null);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
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

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage all aspects of the pool facility
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={(tab) => {
        setActiveTab(tab);
        // Load data when switching tabs
        switch(tab) {
          case "users":
            fetchUsers();
            break;
          case "equipment":
            fetchEquipment();
            break;
          case "schedules":
            fetchSchedules();
            break;
          case "checkins":
            fetchCheckIns();
            break;
        }
      }} className="w-full">
        <TabsList className="grid w-full grid-cols-6 lg:grid-cols-13">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="visitors">Visitors</TabsTrigger>
          <TabsTrigger value="inquiries">Inquiries</TabsTrigger>
          <TabsTrigger value="residents">Residents</TabsTrigger>
          <TabsTrigger value="schedules">Schedules</TabsTrigger>
          <TabsTrigger value="messaging">Messages</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
          <TabsTrigger value="checkins">Check-ins</TabsTrigger>
          <TabsTrigger value="poollogs">Pool Logs</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <OverviewStatsWidget />

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.length > 0 ? (
                    recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                          <div>
                            <p className="text-sm font-medium">
                              {activity.profiles.first_name} {activity.profiles.last_name} checked in
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(activity.check_in_time).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary">
                          {activity.profiles.role}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No recent activity</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => {
                    setActiveTab("users");
                    fetchUsers();
                  }}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Manage Users
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => {
                    setActiveTab("schedules");
                    fetchSchedules();
                  }}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Pool Schedule
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => {
                    setActiveTab("equipment");
                    fetchEquipment();
                  }}
                >
                  <Package className="w-4 h-4 mr-2" />
                  Equipment Management
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => {
                    setActiveTab("checkins");
                    fetchCheckIns();
                  }}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  View Check-ins
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* User Approvals Tab */}
        <TabsContent value="approvals" className="space-y-6">
          <UserApprovalTab onRefreshStats={fetchDashboardData} />
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  User Management
                </span>
                <Button onClick={fetchUsers}>
                  Refresh
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        {user.first_name} {user.last_name}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={user.status === 'active' ? 'default' : 
                                 user.status === 'pending' ? 'secondary' : 'destructive'}
                        >
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Select onValueChange={(value) => updateUserRole(user.id, value)}>
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="Change Role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="staff">Staff</SelectItem>
                              <SelectItem value="student">Student</SelectItem>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="resident">Resident</SelectItem>
                            </SelectContent>
                          </Select>
                          {user.status === 'pending' && (
                            <Button 
                              size="sm" 
                              onClick={() => updateUserStatus(user.id, 'active')}
                            >
                              <UserCheck className="w-4 h-4" />
                            </Button>
                          )}
                          {user.status === 'active' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => updateUserStatus(user.id, 'suspended')}
                            >
                              <UserX className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Visitors Tab */}
        <TabsContent value="visitors">
          <VisitorManagementTab />
        </TabsContent>

        {/* Inquiries Tab */}
        <TabsContent value="inquiries">
          <InquiriesTab />
        </TabsContent>

        {/* Residents Tab */}
        <TabsContent value="residents" className="space-y-6">
          <ResidentsTab onRefreshStats={fetchDashboardData} />
        </TabsContent>

        {/* Schedules Tab */}
        <TabsContent value="schedules" className="space-y-6">
          <TimetableManagement onRefreshStats={fetchDashboardData} />
        </TabsContent>

        {/* Messaging Tab */}
        <TabsContent value="messaging" className="space-y-6">
          <MessagingTab onRefreshStats={fetchDashboardData} />
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <ReportsTab onRefreshStats={fetchDashboardData} />
        </TabsContent>

        {/* Equipment Tab */}
        <TabsContent value="equipment" className="space-y-6">
          <EquipmentManagementTab userRole={profile.role} />
        </TabsContent>

        {/* Check-ins Tab */}
        <TabsContent value="checkins" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Real-time Check-in History
                </span>
                <Button 
                  onClick={fetchCheckIns}
                  onFocus={() => {
                    if (activeTab === "checkins" && checkIns.length === 0) {
                      fetchCheckIns();
                    }
                  }}
                >
                  Refresh
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Check-in Time</TableHead>
                    <TableHead>Check-out Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checkIns.map((checkIn) => (
                    <TableRow key={checkIn.id}>
                      <TableCell>
                        {checkIn.profiles.first_name} {checkIn.profiles.last_name}
                      </TableCell>
                      <TableCell>{checkIn.profiles.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{checkIn.profiles.role}</Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(checkIn.check_in_time).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {checkIn.check_out_time 
                          ? new Date(checkIn.check_out_time).toLocaleString()
                          : 'Still checked in'
                        }
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatDuration(checkIn.check_in_time, checkIn.check_out_time)}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={checkIn.status === 'checked_in' ? 'default' : 'secondary'}
                        >
                          {checkIn.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{checkIn.notes || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pool Logs Tab */}
        <TabsContent value="poollogs">
          <PoolLogsTab user={user} />
        </TabsContent>

        {/* System Info Tab */}
        <TabsContent value="system">
          <SystemInfoTab user={user} profile={profile} />
        </TabsContent>
      </Tabs>

      <CreateUserDialog
        open={showCreateUserDialog}
        onOpenChange={setShowCreateUserDialog}
        onUserCreated={onUserCreated}
        editingUser={editingUser}
      />
    </div>
  );
};

export default AdminDashboard;