import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Home,
  Calendar,
  TrendingUp,
  Edit,
  Trash2,
  Plus,
  UserCheck,
  UserX,
  Mail,
  FileText,
  ClipboardList,
  Dumbbell,
  Info,
  Settings
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ResidentsTab from "./ResidentsTab";
import MessagingTab from "./MessagingTab";
import ReportsTab from "./ReportsTab";
import TimetableManagement from "./TimetableManagement";
import UserApprovalTab from "./UserApprovalTab";
import SystemInfoTab from "./SystemInfoTab";
import InquiriesTab from "./InquiriesTab";
import VisitorManagementTab from "./VisitorManagementTab";
import CreateUserDialog from "./CreateUserDialog";
import ApprovalsTab from "./ApprovalsTab";
import PoolLogsReadOnlyTab from "./PoolLogsReadOnlyTab";
import PaymentsTab from "./PaymentsTab";
import VisitorsTab from "./VisitorsTab";
import EnhancedCheckInsTab from "./EnhancedCheckInsTab";
import OverviewStatsWidget from "./OverviewStatsWidget";
import { User } from "@supabase/supabase-js";
import RecentActivitiesWidget from "./RecentActivitiesWidget";
import UserManagementTab from "./UserManagementTab";

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
  check_in_status: string | null;
  check_in_at: string | null;
  check_out_at: string | null;
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

interface StaffDashboardProps {
  user: User;
  profile: UserProfile;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const StaffDashboard = ({ user, profile, activeTab: externalActiveTab, onTabChange }: StaffDashboardProps) => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeCheckIns: 0,
    equipmentItems: 0,
    pendingApprovals: 0,
  });
  const [currentCapacity, setCurrentCapacity] = useState(0);
  const [activeCheckIns, setActiveCheckIns] = useState<any[]>([]);
  const [availableEquipment, setAvailableEquipment] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<CheckIn[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [internalActiveTab, setInternalActiveTab] = useState("overview");
  const [showCreateUserDialog, setShowCreateUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [pendingVisitorsCount, setPendingVisitorsCount] = useState(0);
  const [newInquiriesCount, setNewInquiriesCount] = useState(0);
  const { toast } = useToast();

  // Use external tab if provided, otherwise use internal
  const activeTab = externalActiveTab !== undefined ? externalActiveTab : internalActiveTab;
  const setActiveTab = onTabChange || setInternalActiveTab;

  useEffect(() => {
    fetchDashboardData();
    fetchNotificationCounts();
    
    // Set up real-time subscription for check-ins and notifications
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
          fetchUsers();
          fetchDashboardData();
          fetchNotificationCounts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'visitors'
        },
        () => {
          fetchNotificationCounts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inquiries'
        },
        () => {
          fetchNotificationCounts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        () => {
          fetchNotificationCounts();
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
      
      // Also call existing functions for compatibility
      await Promise.all([
        fetchActiveCheckIns(),
        fetchAvailableEquipment(),
        fetchRecentActivities(),
        fetchUnreadCount()
      ]);
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

  const fetchUnreadCount = async () => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("id", { count: 'exact' })
        .or(`recipient_id.eq.${user.id},recipient_role.eq.staff`)
        .is("read_at", null);
      
      if (error) throw error;
      setUnreadCount(data?.length || 0);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  const fetchNotificationCounts = async () => {
    try {
      // Fetch pending approvals count
      const { count: approvalsCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      
      setPendingApprovalsCount(approvalsCount || 0);

      // Fetch today's pending visitors count
      const today = new Date().toISOString().split('T')[0];
      const { count: visitorsCount } = await supabase
        .from("visitors")
        .select("*", { count: "exact", head: true })
        .eq("date_of_visit", today)
        .eq("check_in_status", "Not Checked In");
      
      setPendingVisitorsCount(visitorsCount || 0);

      // Fetch new inquiries count
      const { count: inquiriesCount } = await supabase
        .from("inquiries")
        .select("*", { count: "exact", head: true })
        .eq("status", "new");
      
      setNewInquiriesCount(inquiriesCount || 0);

      // Fetch unread messages count
      const { data: messagesData } = await supabase
        .from("messages")
        .select("id")
        .or(`recipient_id.eq.${user.id},recipient_role.eq.staff`)
        .is("read_at", null);
      
      setUnreadCount(messagesData?.length || 0);
    } catch (error) {
      console.error("Error fetching notification counts:", error);
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

  const fetchUsers = async () => {
    try {
      console.log("StaffDashboard: Fetching users...");
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching users:", error);
        throw error;
      }
      console.log("StaffDashboard: Fetched users:", data?.length || 0);
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
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
      toast({
        title: "Error",
        description: "Failed to load equipment",
        variant: "destructive",
      });
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
      toast({
        title: "Error",
        description: "Failed to load schedules",
        variant: "destructive",
      });
    }
  };

  const fetchCheckIns = async () => {
    try {
      console.log("StaffDashboard: Fetching check-ins...");
      const { data: checkInsData, error } = await supabase
        .from("check_ins")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("StaffDashboard: Error fetching check-ins:", error);
        throw error;
      }
      console.log("StaffDashboard: Fetched check-ins:", checkInsData?.length || 0);

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
      toast({
        title: "Error",
        description: "Failed to load check-ins",
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
          status: "checked_out",
          notes: "Manual check-out by staff"
        })
        .eq("id", checkInId);

      if (error) throw error;

      toast({
        title: "Check-out Successful",
        description: `${userName} has been checked out manually`,
      });

      // Refresh data to show updated activities
      fetchActiveCheckIns();
      fetchRecentActivities();
      fetchDashboardData();
    } catch (error: any) {
      toast({
        title: "Check-out Failed",
        description: error.message || "Check-out failed",
        variant: "destructive",
      });
    }
  };

  const handleResidenceCheckIn = async (memberId: string, memberName: string, isActive: boolean = true) => {
    try {
      // Staff can perform check-in even if member is not found or inactive
      const { data, error } = await supabase.rpc('residence_member_checkin', {
        member_id: memberId,
        schedule_id: null
      });

      if (error) throw error;

      const logMessage = isActive 
        ? `${memberName} checked in via residence management`
        : `${memberName} checked in (inactive member) via staff override`;

      toast({
        title: "Check-in Successful",
        description: logMessage,
      });

      // Refresh data to show updated activities
      fetchActiveCheckIns();
      fetchRecentActivities();
      fetchDashboardData();
    } catch (error: any) {
      toast({
        title: "Check-in Failed",
        description: error.message || "Check-in failed",
        variant: "destructive",
      });
    }
  };

  const updateUserStatus = async (userId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status })
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "✅ Success",
        description: `User status updated to ${status}`,
      });
      
      // Refresh all data to reflect status changes
      await Promise.all([
        fetchUsers(),
        fetchDashboardData()
      ]);
    } catch (error) {
      console.error("Error updating user status:", error);
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      });
    }
  };

  const updateUserRole = async (userId: string, role: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Use the secure role update function
      const { data, error } = await supabase.rpc('update_user_role', {
        _user_id: userId,
        _new_role: role,
        _updated_by: user.id
      });

      if (error) throw error;

      const result = data as { success: boolean; message: string; old_role?: string; new_role?: string };
      
      if (!result.success) {
        throw new Error(result.message);
      }

      toast({
        title: "✅ Success",
        description: result.message,
      });

      // Refresh all data to reflect role changes
      await Promise.all([
        fetchUsers(),
        fetchDashboardData(),
        fetchActiveCheckIns()
      ]);
    } catch (error) {
      console.error("Error updating user role:", error);
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Failed to update user role",
        variant: "destructive",
      });
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
      
      toast({
        title: "Success",
        description: "User has been deleted successfully",
      });
      fetchUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  const onUserCreated = () => {
    fetchUsers();
    setEditingUser(null);
  };

  const formatDuration = (checkInTime: string, checkOutTime?: string) => {
    const start = new Date(checkInTime);
    const end = checkOutTime ? new Date(checkOutTime) : new Date();
    const diff = Math.floor((end.getTime() - start.getTime()) / 60000); // minutes
    
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
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <TabsList className="inline-flex h-auto w-full flex-wrap gap-1 bg-transparent p-2">
            <TabsTrigger value="overview" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Overview</TabsTrigger>
            <TabsTrigger value="approvals" className="data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center gap-1">
              Approvals
              {pendingApprovalsCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 flex items-center justify-center p-0 text-xs rounded-full">
                  {pendingApprovalsCount > 9 ? '9+' : pendingApprovalsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Users</TabsTrigger>
            <TabsTrigger value="visitors" className="data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center gap-1">
              Visitors
              {pendingVisitorsCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 flex items-center justify-center p-0 text-xs rounded-full">
                  {pendingVisitorsCount > 9 ? '9+' : pendingVisitorsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="inquiries" className="data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center gap-1">
              Inquiries
              {newInquiriesCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 flex items-center justify-center p-0 text-xs rounded-full">
                  {newInquiriesCount > 9 ? '9+' : newInquiriesCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="residents" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Residents</TabsTrigger>
            <TabsTrigger value="schedules" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Schedules</TabsTrigger>
            <TabsTrigger value="messaging" className="data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center gap-1">
              Messages
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 flex items-center justify-center p-0 text-xs rounded-full">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Reports</TabsTrigger>
            <TabsTrigger value="payments" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Payments</TabsTrigger>
            <TabsTrigger value="equipment" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Equipment</TabsTrigger>
            <TabsTrigger value="checkins" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Check-ins</TabsTrigger>
            <TabsTrigger value="poollogs" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Pool Logs</TabsTrigger>
            <TabsTrigger value="system" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">System</TabsTrigger>
          </TabsList>
        </div>

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

          {/* Quick Stats (Additional) */}
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
          <ApprovalsTab userProfile={profile} />
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <UserManagementTab onRefreshStats={fetchDashboardData} />
        </TabsContent>

        {/* Visitors Tab */}
        <TabsContent value="visitors">
          <VisitorsTab />
        </TabsContent>

        {/* Inquiries Tab */}
        <TabsContent value="inquiries">
          <InquiriesTab />
        </TabsContent>

        {/* Residents Tab */}
        <TabsContent value="residents" className="space-y-6">
          <ResidentsTab onRefreshStats={() => fetchDashboardData()} />
        </TabsContent>

        {/* Schedules Tab */}
        <TabsContent value="schedules" className="space-y-6">
          <TimetableManagement onRefreshStats={() => fetchDashboardData()} />
        </TabsContent>

        {/* Messaging Tab */}
        <TabsContent value="messaging" className="space-y-6">
          <MessagingTab onRefreshStats={() => { fetchDashboardData(); fetchUnreadCount(); }} />
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <ReportsTab onRefreshStats={fetchDashboardData} />
        </TabsContent>

        {/* Equipment Tab */}
        <TabsContent value="equipment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Equipment Management
                </span>
                <Button onClick={fetchEquipment}>
                  Refresh
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Barcode</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {equipment.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={item.status === 'available' ? 'default' : 
                                 item.status === 'maintenance' ? 'secondary' : 'destructive'}
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.barcode || 'N/A'}</TableCell>
                      <TableCell>
                        {item.replacement_cost ? `$${item.replacement_cost}` : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {new Date(item.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Check-ins Tab */}
        <TabsContent value="checkins" className="space-y-6">
          <EnhancedCheckInsTab />
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-6">
          <PaymentsTab />
        </TabsContent>

        {/* Pool Logs Tab */}
        <TabsContent value="poollogs">
          <PoolLogsReadOnlyTab />
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

export default StaffDashboard;