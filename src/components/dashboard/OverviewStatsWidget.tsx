import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserCheck, Clock, DollarSign, CreditCard, Droplet, TestTube, Package, AlertTriangle, Mail, MessageSquare, UserPlus, UserX, TrendingUp, Activity } from "lucide-react";
interface OverviewStats {
  // Attendance
  totalCheckInsToday: number;
  checkInsByRole: {
    students: number;
    staff: number;
    residents: number;
    members: number;
    visitors: number;
    rcmrd_team: number;
    rcmrd_official: number;
  };
  activeUsersCheckedIn: number;
  averageStayDuration: number;

  // Financial
  totalRevenueToday: number;
  pendingPayments: number;
  paidPayments: number;
  failedPayments: number;

  // Pool Operations
  latestChlorine: number | null;
  latestPh: number | null;
  latestWaterClarity: string | null;
  activeLoans: number;
  availableEquipment: number;
  recentIncidents: number;

  // Communication
  unreadInquiries: number;
  messagesLast24h: number;

  // System
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  pendingApprovals: number;
}
export default function OverviewStatsWidget() {
  const [stats, setStats] = useState<OverviewStats>({
    totalCheckInsToday: 0,
    checkInsByRole: {
      students: 0,
      staff: 0,
      residents: 0,
      members: 0,
      visitors: 0,
      rcmrd_team: 0,
      rcmrd_official: 0
    },
    activeUsersCheckedIn: 0,
    averageStayDuration: 0,
    totalRevenueToday: 0,
    pendingPayments: 0,
    paidPayments: 0,
    failedPayments: 0,
    latestChlorine: null,
    latestPh: null,
    latestWaterClarity: null,
    activeLoans: 0,
    availableEquipment: 0,
    recentIncidents: 0,
    unreadInquiries: 0,
    messagesLast24h: 0,
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    pendingApprovals: 0
  });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchAllStats();

    // Real-time subscriptions
    const channel = supabase.channel('overview-stats-realtime').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'check_ins'
    }, fetchAllStats).on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'payments'
    }, fetchAllStats).on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'pool_logs'
    }, fetchAllStats).on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'inquiries'
    }, fetchAllStats).on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'profiles'
    }, fetchAllStats).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  const fetchAllStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Attendance Stats
      const {
        data: checkInsToday
      } = await supabase.from('check_ins').select('id, user_id, check_in_time, check_out_time, status').gte('check_in_time', `${today}T00:00:00`).lte('check_in_time', `${today}T23:59:59`);
      const {
        count: activeCount
      } = await supabase.from('check_ins').select('*', {
        count: 'exact',
        head: true
      }).eq('status', 'checked_in');

      // Calculate check-ins by role - fetch profile data separately
      const roleBreakdown = {
        students: 0,
        staff: 0,
        residents: 0,
        members: 0,
        visitors: 0,
        rcmrd_team: 0,
        rcmrd_official: 0
      };
      if (checkInsToday && checkInsToday.length > 0) {
        for (const checkIn of checkInsToday) {
          const {
            data: profile
          } = await supabase.from('profiles').select('role').eq('user_id', checkIn.user_id).single();
          if (profile) {
            const role = profile.role.toLowerCase();
            if (role === 'student') roleBreakdown.students++;else if (role === 'staff') roleBreakdown.staff++;else if (role === 'resident') roleBreakdown.residents++;else if (role === 'member') roleBreakdown.members++;else if (role === 'visitor') roleBreakdown.visitors++;else if (role === 'rcmrd_team') roleBreakdown.rcmrd_team++;else if (role === 'rcmrd_official') roleBreakdown.rcmrd_official++;
          }
        }
      }

      // Average stay duration (in minutes)
      const completedCheckIns = checkInsToday?.filter(c => c.check_out_time);
      let avgDuration = 0;
      if (completedCheckIns && completedCheckIns.length > 0) {
        const totalDuration = completedCheckIns.reduce((acc, c) => {
          const inTime = new Date(c.check_in_time).getTime();
          const outTime = new Date(c.check_out_time!).getTime();
          return acc + (outTime - inTime);
        }, 0);
        avgDuration = Math.round(totalDuration / completedCheckIns.length / 60000); // Convert to minutes
      }

      // Financial Stats
      const {
        data: paymentsToday
      } = await supabase.from('payments').select('amount, payment_status').gte('created_at', `${today}T00:00:00`);
      const revenueToday = paymentsToday?.reduce((acc, p) => p.payment_status === 'Paid' ? acc + Number(p.amount) : acc, 0) || 0;
      const {
        count: pendingCount
      } = await supabase.from('payments').select('*', {
        count: 'exact',
        head: true
      }).eq('payment_status', 'Pending');
      const {
        count: paidCount
      } = await supabase.from('payments').select('*', {
        count: 'exact',
        head: true
      }).eq('payment_status', 'Paid');
      const {
        count: failedCount
      } = await supabase.from('payments').select('*', {
        count: 'exact',
        head: true
      }).eq('payment_status', 'Failed');

      // Pool Operations Stats
      const {
        data: latestLog
      } = await supabase.from('pool_logs').select('chlorine_ppm, ph_level, water_clarity, occurrence_reported').order('date', {
        ascending: false
      }).limit(1).maybeSingle();
      const {
        count: activeLoansCount
      } = await supabase.from('equipment_loans').select('*', {
        count: 'exact',
        head: true
      }).eq('status', 'active').is('returned_at', null);
      const {
        count: availableEquipCount
      } = await supabase.from('equipment').select('*', {
        count: 'exact',
        head: true
      }).eq('status', 'available');
      const {
        count: incidentsCount
      } = await supabase.from('pool_logs').select('*', {
        count: 'exact',
        head: true
      }).eq('occurrence_reported', true).gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      // Communication Stats
      const {
        count: unreadInquiriesCount
      } = await supabase.from('inquiries').select('*', {
        count: 'exact',
        head: true
      }).eq('status', 'new');
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const {
        count: messagesCount
      } = await supabase.from('messages').select('*', {
        count: 'exact',
        head: true
      }).gte('created_at', yesterday);

      // System Stats
      const {
        count: totalUsersCount
      } = await supabase.from('profiles').select('*', {
        count: 'exact',
        head: true
      });
      const {
        count: activeUsersCount
      } = await supabase.from('profiles').select('*', {
        count: 'exact',
        head: true
      }).eq('status', 'active');
      const {
        count: inactiveUsersCount
      } = await supabase.from('profiles').select('*', {
        count: 'exact',
        head: true
      }).eq('status', 'inactive');
      const {
        count: pendingApprovalsCount
      } = await supabase.from('profiles').select('*', {
        count: 'exact',
        head: true
      }).eq('status', 'pending');
      setStats({
        totalCheckInsToday: checkInsToday?.length || 0,
        checkInsByRole: roleBreakdown,
        activeUsersCheckedIn: activeCount || 0,
        averageStayDuration: avgDuration,
        totalRevenueToday: revenueToday,
        pendingPayments: pendingCount || 0,
        paidPayments: paidCount || 0,
        failedPayments: failedCount || 0,
        latestChlorine: latestLog?.chlorine_ppm || null,
        latestPh: latestLog?.ph_level || null,
        latestWaterClarity: latestLog?.water_clarity || null,
        activeLoans: activeLoansCount || 0,
        availableEquipment: availableEquipCount || 0,
        recentIncidents: incidentsCount || 0,
        unreadInquiries: unreadInquiriesCount || 0,
        messagesLast24h: messagesCount || 0,
        totalUsers: totalUsersCount || 0,
        activeUsers: activeUsersCount || 0,
        inactiveUsers: inactiveUsersCount || 0,
        pendingApprovals: pendingApprovalsCount || 0
      });
    } catch (error) {
      console.error('Error fetching overview stats:', error);
    } finally {
      setLoading(false);
    }
  };
  const getStatusColor = (value: number, thresholds: {
    good: number;
    warning: number;
  }) => {
    if (value >= thresholds.good) return 'text-emerald-600 dark:text-emerald-400';
    if (value >= thresholds.warning) return 'text-amber-600 dark:text-amber-400';
    return 'text-destructive';
  };
  const getWaterQualityStatus = () => {
    const chlorineOk = stats.latestChlorine && stats.latestChlorine >= 1 && stats.latestChlorine <= 3;
    const phOk = stats.latestPh && stats.latestPh >= 7.2 && stats.latestPh <= 7.8;
    if (chlorineOk && phOk) return {
      color: 'text-emerald-600 dark:text-emerald-400',
      text: 'Good'
    };
    if (!chlorineOk || !phOk) return {
      color: 'text-amber-600 dark:text-amber-400',
      text: 'Check'
    };
    return {
      color: 'text-muted-foreground',
      text: 'N/A'
    };
  };
  if (loading) {
    return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(16)].map((_, i) => <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-muted rounded"></div>
            </CardContent>
          </Card>)}
      </div>;
  }
  const waterQuality = getWaterQualityStatus();
  return <div className="space-y-6">
      {/* Attendance Section */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Attendance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Check-ins Today</p>
                  <p className="text-2xl font-bold">{stats.totalCheckInsToday}</p>
                </div>
                <Activity className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 bg-gray-900">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Currently Checked In</p>
                  <p className="text-2xl font-bold">{stats.activeUsersCheckedIn}</p>
                </div>
                <UserCheck className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Avg Stay (min)</p>
                  <p className="text-2xl font-bold">{stats.averageStayDuration}</p>
                </div>
                <Clock className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">By Role</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Students:</span>
                  <span className="font-semibold">{stats.checkInsByRole.students}</span>
                </div>
                <div className="flex justify-between">
                  <span>Staff:</span>
                  <span className="font-semibold">{stats.checkInsByRole.staff}</span>
                </div>
                <div className="flex justify-between">
                  <span>Residents:</span>
                  <span className="font-semibold">{stats.checkInsByRole.residents}</span>
                </div>
                <div className="flex justify-between">
                  <span>Members:</span>
                  <span className="font-semibold">{stats.checkInsByRole.members}</span>
                </div>
                <div className="flex justify-between">
                  <span>RCMRD Team:</span>
                  <span className="font-semibold">{stats.checkInsByRole.rcmrd_team}</span>
                </div>
                <div className="flex justify-between">
                  <span>RCMRD Official:</span>
                  <span className="font-semibold">{stats.checkInsByRole.rcmrd_official}</span>
                </div>
                <div className="flex justify-between">
                  <span>Visitors:</span>
                  <span className="font-semibold">{stats.checkInsByRole.visitors}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Financial Section */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Financial</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Revenue Today</p>
                  <p className="text-2xl font-bold">Ksh {stats.totalRevenueToday.toFixed(2)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Paid Payments</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.paidPayments}</p>
                </div>
                <CreditCard className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Pending Payments</p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.pendingPayments}</p>
                </div>
                <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Failed Payments</p>
                  <p className="text-2xl font-bold text-destructive">{stats.failedPayments}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Pool Operations Section */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Pool Operations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Water Quality</p>
                  <p className={`text-2xl font-bold ${waterQuality.color}`}>{waterQuality.text}</p>
                  {stats.latestChlorine && <p className="text-xs text-muted-foreground mt-1">Cl: {stats.latestChlorine} ppm</p>}
                  {stats.latestPh && <p className="text-xs text-muted-foreground">pH: {stats.latestPh}</p>}
                </div>
                <Droplet className={`w-8 h-8 ${waterQuality.color}`} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-950 dark:to-cyan-900">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Active Loans</p>
                  <p className="text-2xl font-bold">{stats.activeLoans}</p>
                </div>
                <Package className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950 dark:to-indigo-900">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Available Equipment</p>
                  <p className="text-2xl font-bold">{stats.availableEquipment}</p>
                </div>
                <Package className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              </div>
            </CardContent>
          </Card>

          <Card className={stats.recentIncidents > 0 ? "bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Incidents (7 days)</p>
                  <p className={`text-2xl font-bold ${stats.recentIncidents > 0 ? 'text-destructive' : ''}`}>
                    {stats.recentIncidents}
                  </p>
                </div>
                <AlertTriangle className={`w-8 h-8 ${stats.recentIncidents > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Communication & System Section */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Communication & System</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className={stats.unreadInquiries > 0 ? "bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Unread Inquiries</p>
                  <p className={`text-2xl font-bold ${stats.unreadInquiries > 0 ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                    {stats.unreadInquiries}
                  </p>
                </div>
                <Mail className={`w-8 h-8 ${stats.unreadInquiries > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-950 dark:to-violet-900">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Messages (24h)</p>
                  <p className="text-2xl font-bold">{stats.messagesLast24h}</p>
                </div>
                <MessageSquare className="w-8 h-8 text-violet-600 dark:text-violet-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Active: {stats.activeUsers} | Inactive: {stats.inactiveUsers}
                  </p>
                </div>
                <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className={stats.pendingApprovals > 0 ? "bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Pending Approvals</p>
                  <p className={`text-2xl font-bold ${stats.pendingApprovals > 0 ? 'text-orange-600 dark:text-orange-400' : ''}`}>
                    {stats.pendingApprovals}
                  </p>
                </div>
                <UserPlus className={`w-8 h-8 ${stats.pendingApprovals > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'}`} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>;
}