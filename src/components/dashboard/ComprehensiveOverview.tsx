import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, DollarSign, Droplets, MessageSquare, Activity, 
  Search, Clock, TrendingUp, AlertCircle, Package,
  UserPlus, Calendar, ListChecks, Wrench
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AttendanceMetrics {
  checkInsToday: number;
  currentlyCheckedIn: number;
  avgStayMinutes: number;
  byRole: {
    student: number;
    staff: number;
    resident: number;
    member: number;
    rcmrd_team: number;
    rcmrd_official: number;
    visitor: number;
  };
}

interface FinancialMetrics {
  revenueToday: number;
  paidPayments: number;
  pendingPayments: number;
  failedPayments: number;
}

interface PoolMetrics {
  chlorine: number | null;
  ph: number | null;
  activeLoans: number;
  availableEquipment: number;
  incidents7Days: number;
}

interface SystemMetrics {
  unreadInquiries: number;
  messages24h: number;
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  pendingApprovals: number;
}

interface RecentActivity {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  check_in_time: string;
}

interface CheckedInUser {
  id: string;
  user_id: string;
  check_in_time: string;
  profiles: {
    first_name: string;
    last_name: string;
    role: string;
    email: string;
  };
}

interface Equipment {
  id: string;
  name: string;
  category: string;
  quantity_available: number;
  quantity_total: number;
  status: string;
}

export default function ComprehensiveOverview() {
  const [attendance, setAttendance] = useState<AttendanceMetrics>({
    checkInsToday: 0,
    currentlyCheckedIn: 0,
    avgStayMinutes: 0,
    byRole: {
      student: 0,
      staff: 0,
      resident: 0,
      member: 0,
      rcmrd_team: 0,
      rcmrd_official: 0,
      visitor: 0,
    },
  });
  const [financial, setFinancial] = useState<FinancialMetrics>({
    revenueToday: 0,
    paidPayments: 0,
    pendingPayments: 0,
    failedPayments: 0,
  });
  const [pool, setPool] = useState<PoolMetrics>({
    chlorine: null,
    ph: null,
    activeLoans: 0,
    availableEquipment: 0,
    incidents7Days: 0,
  });
  const [system, setSystem] = useState<SystemMetrics>({
    unreadInquiries: 0,
    messages24h: 0,
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    pendingApprovals: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [checkedInUsers, setCheckedInUsers] = useState<CheckedInUser[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [searchEmail, setSearchEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAllMetrics();
    
    // Auto-refresh intervals
    const attendanceInterval = setInterval(fetchAttendanceMetrics, 30000); // 30 seconds
    const financialInterval = setInterval(fetchFinancialMetrics, 60000); // 60 seconds
    const activityInterval = setInterval(fetchRecentActivity, 30000); // 30 seconds
    
    return () => {
      clearInterval(attendanceInterval);
      clearInterval(financialInterval);
      clearInterval(activityInterval);
    };
  }, []);

  const fetchAllMetrics = async () => {
    setLoading(true);
    await Promise.all([
      fetchAttendanceMetrics(),
      fetchFinancialMetrics(),
      fetchPoolMetrics(),
      fetchSystemMetrics(),
      fetchRecentActivity(),
      fetchCheckedInUsers(),
      fetchEquipment(),
    ]);
    setLoading(false);
  };

  const fetchAttendanceMetrics = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check-ins today
      const { count: checkInsToday } = await supabase
        .from('check_ins')
        .select('*', { count: 'exact', head: true })
        .gte('check_in_time', today.toISOString());

      // Currently checked in
      const { count: currentlyCheckedIn } = await supabase
        .from('check_ins')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'checked_in');

      // Average stay time for today
      const { data: completedCheckIns } = await supabase
        .from('check_ins')
        .select('check_in_time, check_out_time')
        .eq('status', 'checked_out')
        .gte('check_in_time', today.toISOString())
        .not('check_out_time', 'is', null);

      let avgStayMinutes = 0;
      if (completedCheckIns && completedCheckIns.length > 0) {
        const totalMinutes = completedCheckIns.reduce((sum, record) => {
          const checkIn = new Date(record.check_in_time);
          const checkOut = new Date(record.check_out_time!);
          const minutes = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60);
          return sum + minutes;
        }, 0);
        avgStayMinutes = Math.round(totalMinutes / completedCheckIns.length);
      }

      // By role breakdown - fetch check-ins and profiles separately
      const { data: checkedInData } = await supabase
        .from('check_ins')
        .select('user_id')
        .eq('status', 'checked_in');

      const byRole: any = {
        student: 0,
        staff: 0,
        resident: 0,
        member: 0,
        rcmrd_team: 0,
        rcmrd_official: 0,
        visitor: 0,
      };

      if (checkedInData && checkedInData.length > 0) {
        const userIds = checkedInData.map(ci => ci.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, role')
          .in('user_id', userIds);

        if (profilesData) {
          for (const profile of profilesData) {
            const role = profile.role?.toLowerCase();
            if (role && byRole.hasOwnProperty(role)) {
              byRole[role]++;
            }
          }
        }
      }

      setAttendance({
        checkInsToday: checkInsToday || 0,
        currentlyCheckedIn: currentlyCheckedIn || 0,
        avgStayMinutes,
        byRole,
      });
    } catch (error: any) {
      console.error("Error fetching attendance metrics:", error);
    }
  };

  const fetchFinancialMetrics = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Revenue today
      const { data: paidToday } = await supabase
        .from('payments')
        .select('amount')
        .eq('payment_status', 'Paid')
        .gte('created_at', today.toISOString());

      const revenueToday = paidToday?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      // Payment counts
      const { count: paidPayments } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('payment_status', 'Paid');

      const { count: pendingPayments } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('payment_status', 'Pending');

      const { count: failedPayments } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('payment_status', 'Failed');

      setFinancial({
        revenueToday,
        paidPayments: paidPayments || 0,
        pendingPayments: pendingPayments || 0,
        failedPayments: failedPayments || 0,
      });
    } catch (error: any) {
      console.error("Error fetching financial metrics:", error);
    }
  };

  const fetchPoolMetrics = async () => {
    try {
      // Latest pool log
      const { data: latestLog } = await supabase
        .from('pool_logs')
        .select('chlorine_ppm, ph_level')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Active loans
      const { count: activeLoans } = await supabase
        .from('equipment_loans')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Available equipment
      const { data: equipmentData } = await supabase
        .from('equipment')
        .select('quantity_available')
        .eq('status', 'available');

      const availableEquipment = equipmentData?.reduce((sum, e) => sum + (e.quantity_available || 0), 0) || 0;

      // Incidents in last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { count: incidents7Days } = await supabase
        .from('pool_logs')
        .select('*', { count: 'exact', head: true })
        .eq('occurrence_reported', true)
        .gte('created_at', sevenDaysAgo.toISOString());

      setPool({
        chlorine: latestLog?.chlorine_ppm || null,
        ph: latestLog?.ph_level || null,
        activeLoans: activeLoans || 0,
        availableEquipment,
        incidents7Days: incidents7Days || 0,
      });
    } catch (error: any) {
      console.error("Error fetching pool metrics:", error);
    }
  };

  const fetchSystemMetrics = async () => {
    try {
      // Unread inquiries
      const { count: unreadInquiries } = await supabase
        .from('inquiries')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'new');

      // Messages in last 24 hours
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const { count: messages24h } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', twentyFourHoursAgo.toISOString());

      // Total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Active/Inactive users
      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      const { count: inactiveUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'inactive');

      // Pending approvals
      const { count: pendingApprovals } = await supabase
        .from('user_approvals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      setSystem({
        unreadInquiries: unreadInquiries || 0,
        messages24h: messages24h || 0,
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        inactiveUsers: inactiveUsers || 0,
        pendingApprovals: pendingApprovals || 0,
      });
    } catch (error: any) {
      console.error("Error fetching system metrics:", error);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      // Fetch check-ins
      const { data: checkInsData, error: checkInsError } = await supabase
        .from('check_ins')
        .select('id, user_id, check_in_time')
        .order('check_in_time', { ascending: false })
        .limit(10);

      if (checkInsError) throw checkInsError;

      // Fetch profiles for these users
      const userIds = checkInsData?.map(ci => ci.user_id) || [];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, role')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Create a map of user_id to profile
      const profilesMap = new Map(
        profilesData?.map(p => [p.user_id, p]) || []
      );

      // Combine the data
      const activities = checkInsData
        ?.filter(ci => profilesMap.has(ci.user_id))
        .map(ci => {
          const profile = profilesMap.get(ci.user_id)!;
          return {
            id: ci.id,
            first_name: profile.first_name || '',
            last_name: profile.last_name || '',
            role: profile.role,
            check_in_time: ci.check_in_time,
          };
        }) || [];

      setRecentActivity(activities);
    } catch (error: any) {
      console.error("Error fetching recent activity:", error);
    }
  };

  const fetchCheckedInUsers = async () => {
    try {
      // Fetch checked-in users
      const { data: checkInsData, error: checkInsError } = await supabase
        .from('check_ins')
        .select('id, user_id, check_in_time')
        .eq('status', 'checked_in')
        .order('check_in_time', { ascending: false });

      if (checkInsError) throw checkInsError;

      // Fetch profiles for these users
      const userIds = checkInsData?.map(ci => ci.user_id) || [];
      if (userIds.length === 0) {
        setCheckedInUsers([]);
        return;
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, role, email')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Create a map of user_id to profile
      const profilesMap = new Map(
        profilesData?.map(p => [p.user_id, p]) || []
      );

      // Combine the data
      const users = checkInsData
        ?.filter(ci => profilesMap.has(ci.user_id))
        .map(ci => {
          const profile = profilesMap.get(ci.user_id)!;
          return {
            id: ci.id,
            user_id: ci.user_id,
            check_in_time: ci.check_in_time,
            profiles: {
              first_name: profile.first_name || '',
              last_name: profile.last_name || '',
              role: profile.role,
              email: profile.email,
            },
          };
        }) || [];

      setCheckedInUsers(users);
    } catch (error: any) {
      console.error("Error fetching checked-in users:", error);
    }
  };

  const fetchEquipment = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .order('name');

      if (error) throw error;
      setEquipment(data || []);
    } catch (error: any) {
      console.error("Error fetching equipment:", error);
    }
  };

  const handleUserSearch = async () => {
    if (!searchEmail) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', `%${searchEmail}%`)
        .single();

      if (error) throw error;

      if (data) {
        toast({
          title: "User Found",
          description: `${data.first_name} ${data.last_name} - ${data.role}`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "User not found",
        variant: "destructive",
      });
    }
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      student: "bg-blue-100 text-blue-800",
      staff: "bg-purple-100 text-purple-800",
      resident: "bg-green-100 text-green-800",
      member: "bg-orange-100 text-orange-800",
      rcmrd_team: "bg-pink-100 text-pink-800",
      rcmrd_official: "bg-red-100 text-red-800",
      visitor: "bg-yellow-100 text-yellow-800",
    };

    return (
      <Badge variant="secondary" className={colors[role] || "bg-gray-100 text-gray-800"}>
        {role}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Comprehensive Overview</h1>
        <p className="text-muted-foreground">Real-time facility management dashboard</p>
      </div>

      {/* Attendance Overview */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Attendance</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Check-ins Today</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{attendance.checkInsToday}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Currently Checked In</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{attendance.currentlyCheckedIn}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Stay (min)</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{attendance.avgStayMinutes}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">By Role</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Students:</span>
                  <span className="font-bold">{attendance.byRole.student}</span>
                </div>
                <div className="flex justify-between">
                  <span>Staff:</span>
                  <span className="font-bold">{attendance.byRole.staff}</span>
                </div>
                <div className="flex justify-between">
                  <span>Residents:</span>
                  <span className="font-bold">{attendance.byRole.resident}</span>
                </div>
                <div className="flex justify-between">
                  <span>Members:</span>
                  <span className="font-bold">{attendance.byRole.member}</span>
                </div>
                <div className="flex justify-between">
                  <span>RCMRD Team:</span>
                  <span className="font-bold">{attendance.byRole.rcmrd_team}</span>
                </div>
                <div className="flex justify-between">
                  <span>Officials:</span>
                  <span className="font-bold">{attendance.byRole.rcmrd_official}</span>
                </div>
                <div className="flex justify-between">
                  <span>Visitors:</span>
                  <span className="font-bold">{attendance.byRole.visitor}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Financial Summary */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Financial</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue Today</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">KSh {financial.revenueToday.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid Payments</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{financial.paidPayments}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{financial.pendingPayments}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed Payments</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{financial.failedPayments}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Pool Operations */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Pool Operations</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chlorine</CardTitle>
              <Droplets className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pool.chlorine ? `${pool.chlorine} ppm` : 'N/A'}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">pH Level</CardTitle>
              <Droplets className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pool.ph || 'N/A'}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pool.activeLoans}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Equipment</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pool.availableEquipment}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Incidents (7d)</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{pool.incidents7Days}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Communication & System */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Communication & System</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unread Inquiries</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{system.unreadInquiries}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Messages (24h)</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{system.messages24h}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{system.totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{system.activeUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactive Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{system.inactiveUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{system.pendingApprovals}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Button 
            onClick={() => navigate('/dashboard')} 
            className="h-20 flex flex-col gap-2"
            variant="outline"
          >
            <Users className="h-6 w-6" />
            Manage Users
          </Button>
          <Button 
            onClick={() => navigate('/dashboard')} 
            className="h-20 flex flex-col gap-2"
            variant="outline"
          >
            <Calendar className="h-6 w-6" />
            Pool Schedule
          </Button>
          <Button 
            onClick={() => navigate('/dashboard')} 
            className="h-20 flex flex-col gap-2"
            variant="outline"
          >
            <Wrench className="h-6 w-6" />
            Equipment Management
          </Button>
          <Button 
            onClick={() => navigate('/dashboard')} 
            className="h-20 flex flex-col gap-2"
            variant="outline"
          >
            <ListChecks className="h-6 w-6" />
            View Check-ins
          </Button>
        </div>
      </div>

      {/* Recent Activity & Currently in Pool - Side by Side */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest check-ins (auto-refreshes every 30s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    {getRoleBadge(activity.role)}
                    <span className="font-medium">
                      {activity.first_name} {activity.last_name}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(activity.check_in_time).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Currently in Pool */}
        <Card>
          <CardHeader>
            <CardTitle>Currently in Pool</CardTitle>
            <CardDescription>{checkedInUsers.length} users checked in</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {checkedInUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    {getRoleBadge(user.profiles.role)}
                    <div>
                      <div className="font-medium">
                        {user.profiles.first_name} {user.profiles.last_name}
                      </div>
                      <div className="text-xs text-muted-foreground">{user.profiles.email}</div>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(user.check_in_time).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Search & Equipment Status */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* User Search */}
        <Card>
          <CardHeader>
            <CardTitle>User Search</CardTitle>
            <CardDescription>Search by email</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Enter email address..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUserSearch()}
              />
              <Button onClick={handleUserSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Current Capacity Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Current Capacity</CardTitle>
            <CardDescription>Live facility metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Currently Checked In:</span>
                <span className="font-bold">{attendance.currentlyCheckedIn}</span>
              </div>
              <div className="flex justify-between">
                <span>Available Equipment:</span>
                <span className="font-bold">{pool.availableEquipment}</span>
              </div>
              <div className="flex justify-between">
                <span>Avg Session Duration:</span>
                <span className="font-bold">{attendance.avgStayMinutes} min</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Equipment Status Table */}
      <Card>
        <CardHeader>
          <CardTitle>Equipment Status</CardTitle>
          <CardDescription>Current equipment availability</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipment Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipment.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{item.quantity_available}</TableCell>
                  <TableCell>{item.quantity_total}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={item.status === 'available' ? 'secondary' : 'outline'}
                      className={item.status === 'available' ? 'bg-green-100 text-green-800' : ''}
                    >
                      {item.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
