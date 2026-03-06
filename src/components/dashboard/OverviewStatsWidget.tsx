import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, UserCheck, Clock, DollarSign, CreditCard, Droplet, TestTube,
  Package, AlertTriangle, Mail, MessageSquare, UserPlus, UserX,
  TrendingUp, TrendingDown, Activity, CalendarDays, Building2,
  Ticket, Home, ShieldCheck, BarChart3, Waves
} from "lucide-react";

interface OverviewStats {
  // Attendance
  totalCheckInsToday: number;
  checkInsYesterday: number;
  checkInsByRole: Record<string, number>;
  activeUsersCheckedIn: number;
  averageStayDuration: number;
  peakHour: string | null;

  // Financial
  totalRevenueToday: number;
  revenueThisWeek: number;
  pendingPayments: number;
  paidPayments: number;
  failedPayments: number;
  pendingBookingPayments: number;

  // Pool Operations
  latestChlorine: number | null;
  latestPh: number | null;
  latestWaterClarity: string | null;
  latestCleaningStatus: string | null;
  activeLoans: number;
  overdueLoans: number;
  availableEquipment: number;
  totalEquipment: number;
  recentIncidents: number;

  // Bookings & Visitors
  bookingsToday: number;
  confirmedBookings: number;
  pendingBookings: number;
  visitorsToday: number;
  visitorsCheckedIn: number;
  totalGuestsToday: number;

  // Groups
  totalGroups: number;
  activeGroups: number;
  totalGroupMembers: number;

  // Residence
  totalResidents: number;
  activeResidenceMembers: number;

  // Communication
  unreadInquiries: number;
  messagesLast24h: number;

  // System
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  pendingApprovals: number;
  newUsersThisWeek: number;
}

const CARD_CLASS = "bg-gradient-stat-card border-stat-card-border transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:border-stat-card-hover";

const StatCard = ({
  label, value, icon: Icon, subtext, highlight, ringColor
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  subtext?: string;
  highlight?: 'warning' | 'danger' | 'success';
  ringColor?: string;
}) => {
  const highlightColors = {
    warning: 'text-amber-400',
    danger: 'text-red-400',
    success: 'text-emerald-400',
  };
  const valueColor = highlight ? highlightColors[highlight] : 'text-stat-card-text';
  const iconColor = highlight ? highlightColors[highlight] : 'text-stat-card-text opacity-80';
  const ring = ringColor || (highlight === 'warning' ? 'ring-2 ring-amber-500/50' : highlight === 'danger' ? 'ring-2 ring-red-500/50' : '');

  return (
    <Card className={`${CARD_CLASS} ${ring}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-stat-card-muted truncate">{label}</p>
            <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
            {subtext && <p className="text-xs text-stat-card-muted mt-1">{subtext}</p>}
          </div>
          <Icon className={`w-8 h-8 flex-shrink-0 ${iconColor}`} />
        </div>
      </CardContent>
    </Card>
  );
};

const TrendIndicator = ({ current, previous, label }: { current: number; previous: number; label: string }) => {
  if (previous === 0 && current === 0) return null;
  const diff = current - previous;
  const pct = previous > 0 ? Math.round((diff / previous) * 100) : current > 0 ? 100 : 0;
  const isUp = diff >= 0;

  return (
    <div className="flex items-center gap-1 text-xs">
      {isUp ? (
        <TrendingUp className="w-3 h-3 text-emerald-400" />
      ) : (
        <TrendingDown className="w-3 h-3 text-red-400" />
      )}
      <span className={isUp ? 'text-emerald-400' : 'text-red-400'}>
        {isUp ? '+' : ''}{pct}%
      </span>
      <span className="text-stat-card-muted">vs {label}</span>
    </div>
  );
};

export default function OverviewStatsWidget() {
  const [stats, setStats] = useState<OverviewStats>({
    totalCheckInsToday: 0, checkInsYesterday: 0,
    checkInsByRole: {}, activeUsersCheckedIn: 0,
    averageStayDuration: 0, peakHour: null,
    totalRevenueToday: 0, revenueThisWeek: 0,
    pendingPayments: 0, paidPayments: 0, failedPayments: 0, pendingBookingPayments: 0,
    latestChlorine: null, latestPh: null, latestWaterClarity: null, latestCleaningStatus: null,
    activeLoans: 0, overdueLoans: 0, availableEquipment: 0, totalEquipment: 0, recentIncidents: 0,
    bookingsToday: 0, confirmedBookings: 0, pendingBookings: 0,
    visitorsToday: 0, visitorsCheckedIn: 0, totalGuestsToday: 0,
    totalGroups: 0, activeGroups: 0, totalGroupMembers: 0,
    totalResidents: 0, activeResidenceMembers: 0,
    unreadInquiries: 0, messagesLast24h: 0,
    totalUsers: 0, activeUsers: 0, inactiveUsers: 0, pendingApprovals: 0, newUsersThisWeek: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllStats();
    const channel = supabase.channel('overview-stats-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'check_ins' }, fetchAllStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, fetchAllStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pool_logs' }, fetchAllStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inquiries' }, fetchAllStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchAllStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, fetchAllStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitors' }, fetchAllStats)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchAllStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const twentyFourAgo = new Date(Date.now() - 86400000).toISOString();

      // Run all queries in parallel
      const [
        checkInsTodayRes, checkInsYesterdayRes, activeCountRes, completedTodayRes,
        paymentsTodayRes, paymentsWeekRes, pendingPayRes, paidPayRes, failedPayRes,
        latestLogRes, activeLoansRes, overdueLoansRes, equipRes,
        incidentsRes, unreadInqRes, messagesRes,
        totalUsersRes, activeUsersRes, inactiveUsersRes, pendingApprovalsRes, newUsersRes,
        bookingsTodayRes, confirmedBookingsRes, pendingBookingsRes, pendingBookingPayRes,
        visitorsTodayRes, visitorsCheckedInRes,
        totalGroupsRes, activeGroupsRes, groupMembersRes,
        residentsRes, residenceMembersRes,
      ] = await Promise.all([
        // Attendance
        supabase.from('check_ins').select('id, user_id, check_in_time', { count: 'exact' })
          .gte('check_in_time', `${today}T00:00:00`).lte('check_in_time', `${today}T23:59:59`),
        supabase.from('check_ins').select('*', { count: 'exact', head: true })
          .gte('check_in_time', `${yesterday}T00:00:00`).lte('check_in_time', `${yesterday}T23:59:59`),
        supabase.from('check_ins').select('*', { count: 'exact', head: true }).eq('status', 'checked_in'),
        supabase.from('check_ins').select('check_in_time, check_out_time')
          .eq('status', 'checked_out').gte('check_in_time', `${today}T00:00:00`).not('check_out_time', 'is', null),

        // Financial
        supabase.from('payments').select('amount, payment_status').gte('created_at', `${today}T00:00:00`),
        supabase.from('payments').select('amount').eq('payment_status', 'Paid').gte('created_at', weekAgo),
        supabase.from('payments').select('*', { count: 'exact', head: true }).eq('payment_status', 'Pending'),
        supabase.from('payments').select('*', { count: 'exact', head: true }).eq('payment_status', 'Paid'),
        supabase.from('payments').select('*', { count: 'exact', head: true }).eq('payment_status', 'Failed'),

        // Pool
        supabase.from('pool_logs').select('chlorine_ppm, ph_level, water_clarity, cleaning_status')
          .order('date', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('equipment_loans').select('*', { count: 'exact', head: true }).eq('status', 'active').is('returned_at', null),
        supabase.from('equipment_loans').select('*', { count: 'exact', head: true }).eq('status', 'active')
          .lt('due_back_at', new Date().toISOString()),
        supabase.from('equipment').select('quantity_available, quantity_total, status'),
        supabase.from('pool_logs').select('*', { count: 'exact', head: true }).eq('occurrence_reported', true)
          .gte('date', new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]),

        // Communication
        supabase.from('inquiries').select('*', { count: 'exact', head: true }).eq('status', 'new'),
        supabase.from('messages').select('*', { count: 'exact', head: true }).gte('created_at', twentyFourAgo),

        // System
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'inactive'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),

        // Bookings
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('booking_date', today),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('booking_date', today).eq('status', 'confirmed'),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending_payment'),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('payment_status', 'pending'),

        // Visitors
        supabase.from('visitors').select('num_guests, check_in_status').eq('date_of_visit', today),
        supabase.from('visitors').select('*', { count: 'exact', head: true })
          .eq('date_of_visit', today).eq('check_in_status', 'Checked In'),

        // Groups
        supabase.from('groups').select('*', { count: 'exact', head: true }),
        supabase.from('groups').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('group_members').select('*', { count: 'exact', head: true }).eq('status', 'active'),

        // Residence
        supabase.from('residents').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('residence_members').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      ]);

      // Process check-ins by role
      const roleBreakdown: Record<string, number> = {};
      const hourCounts: Record<number, number> = {};
      if (checkInsTodayRes.data && checkInsTodayRes.data.length > 0) {
        // Compute peak hour
        for (const ci of checkInsTodayRes.data) {
          const hour = new Date(ci.check_in_time).getHours();
          hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        }

        const userIds = [...new Set(checkInsTodayRes.data.map(ci => ci.user_id))];
        const { data: profilesData } = await supabase.from('profiles').select('user_id, role').in('user_id', userIds);
        if (profilesData) {
          const roleMap = new Map(profilesData.map(p => [p.user_id, p.role]));
          for (const ci of checkInsTodayRes.data) {
            const role = roleMap.get(ci.user_id) || 'unknown';
            roleBreakdown[role] = (roleBreakdown[role] || 0) + 1;
          }
        }
      }

      // Peak hour
      let peakHour: string | null = null;
      const hourEntries = Object.entries(hourCounts);
      if (hourEntries.length > 0) {
        const [maxHour] = hourEntries.sort((a, b) => b[1] - a[1])[0];
        const h = parseInt(maxHour);
        peakHour = `${h.toString().padStart(2, '0')}:00 - ${(h + 1).toString().padStart(2, '0')}:00`;
      }

      // Average stay
      let avgDuration = 0;
      if (completedTodayRes.data && completedTodayRes.data.length > 0) {
        const total = completedTodayRes.data.reduce((sum, c) => {
          return sum + (new Date(c.check_out_time!).getTime() - new Date(c.check_in_time).getTime());
        }, 0);
        avgDuration = Math.round(total / completedTodayRes.data.length / 60000);
      }

      // Revenue
      const revenueToday = paymentsTodayRes.data?.reduce((a, p) => p.payment_status === 'Paid' ? a + Number(p.amount) : a, 0) || 0;
      const revenueWeek = paymentsWeekRes.data?.reduce((a, p) => a + Number(p.amount), 0) || 0;

      // Equipment totals
      const availableEquipment = equipRes.data?.reduce((s, e) => s + (e.quantity_available || 0), 0) || 0;
      const totalEquipment = equipRes.data?.reduce((s, e) => s + (e.quantity_total || 0), 0) || 0;

      // Visitors
      const visitorsData = visitorsTodayRes.data || [];
      const visitorsToday = visitorsData.length;
      const totalGuestsToday = visitorsData.reduce((s, v) => s + (v.num_guests || 1), 0);

      setStats({
        totalCheckInsToday: checkInsTodayRes.data?.length || 0,
        checkInsYesterday: checkInsYesterdayRes.count || 0,
        checkInsByRole: roleBreakdown,
        activeUsersCheckedIn: activeCountRes.count || 0,
        averageStayDuration: avgDuration,
        peakHour,
        totalRevenueToday: revenueToday,
        revenueThisWeek: revenueWeek,
        pendingPayments: pendingPayRes.count || 0,
        paidPayments: paidPayRes.count || 0,
        failedPayments: failedPayRes.count || 0,
        pendingBookingPayments: pendingBookingPayRes.count || 0,
        latestChlorine: latestLogRes.data?.chlorine_ppm || null,
        latestPh: latestLogRes.data?.ph_level || null,
        latestWaterClarity: latestLogRes.data?.water_clarity || null,
        latestCleaningStatus: latestLogRes.data?.cleaning_status || null,
        activeLoans: activeLoansRes.count || 0,
        overdueLoans: overdueLoansRes.count || 0,
        availableEquipment,
        totalEquipment,
        recentIncidents: incidentsRes.count || 0,
        bookingsToday: bookingsTodayRes.count || 0,
        confirmedBookings: confirmedBookingsRes.count || 0,
        pendingBookings: pendingBookingsRes.count || 0,
        visitorsToday,
        visitorsCheckedIn: visitorsCheckedInRes.count || 0,
        totalGuestsToday,
        totalGroups: totalGroupsRes.count || 0,
        activeGroups: activeGroupsRes.count || 0,
        totalGroupMembers: groupMembersRes.count || 0,
        totalResidents: residentsRes.count || 0,
        activeResidenceMembers: residenceMembersRes.count || 0,
        unreadInquiries: unreadInqRes.count || 0,
        messagesLast24h: messagesRes.count || 0,
        totalUsers: totalUsersRes.count || 0,
        activeUsers: activeUsersRes.count || 0,
        inactiveUsers: inactiveUsersRes.count || 0,
        pendingApprovals: pendingApprovalsRes.count || 0,
        newUsersThisWeek: newUsersRes.count || 0,
      });
    } catch (error) {
      console.error('Error fetching overview stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWaterQualityStatus = () => {
    const chlorineOk = stats.latestChlorine != null && stats.latestChlorine >= 1 && stats.latestChlorine <= 3;
    const phOk = stats.latestPh != null && stats.latestPh >= 7.2 && stats.latestPh <= 7.8;
    if (chlorineOk && phOk) return { color: 'text-emerald-400', text: 'Good' };
    if (stats.latestChlorine == null && stats.latestPh == null) return { color: 'text-stat-card-muted', text: 'N/A' };
    return { color: 'text-amber-400', text: 'Check' };
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(20)].map((_, i) => (
          <Card key={i} className="bg-gradient-stat-card border-stat-card-border animate-pulse">
            <CardContent className="p-6"><div className="h-20 bg-stat-card-light rounded" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const waterQuality = getWaterQualityStatus();
  const equipUtilPct = stats.totalEquipment > 0 ? Math.round(((stats.totalEquipment - stats.availableEquipment) / stats.totalEquipment) * 100) : 0;
  const userActivePct = stats.totalUsers > 0 ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0;

  const roleLabels: Record<string, string> = {
    student: 'Students', staff: 'Staff', resident: 'Residents', member: 'Members',
    visitor: 'Visitors', rcmrd_team: 'RCMRD Team', rcmrd_official: 'Officials',
  };

  return (
    <div className="space-y-6">
      {/* Attendance */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Activity className="w-5 h-5" /> Attendance
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className={CARD_CLASS}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-stat-card-muted">Check-ins Today</p>
                  <p className="text-2xl font-bold text-stat-card-text">{stats.totalCheckInsToday}</p>
                  <TrendIndicator current={stats.totalCheckInsToday} previous={stats.checkInsYesterday} label="yesterday" />
                </div>
                <Activity className="w-8 h-8 text-stat-card-text opacity-80" />
              </div>
            </CardContent>
          </Card>

          <StatCard label="Currently In Pool" value={stats.activeUsersCheckedIn} icon={UserCheck} />
          <StatCard label="Avg Stay (min)" value={stats.averageStayDuration} icon={Clock} />
          <StatCard label="Peak Hour" value={stats.peakHour || 'N/A'} icon={BarChart3} />

          <Card className={CARD_CLASS}>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-medium text-stat-card-muted">By Role</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-1 text-sm text-stat-card-text">
                {Object.entries(stats.checkInsByRole).map(([role, count]) => (
                  <div key={role} className="flex justify-between">
                    <span>{roleLabels[role] || role}:</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
                {Object.keys(stats.checkInsByRole).length === 0 && (
                  <p className="text-stat-card-muted text-xs">No check-ins yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bookings & Visitors */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Ticket className="w-5 h-5" /> Bookings & Visitors
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Bookings Today" value={stats.bookingsToday} icon={CalendarDays}
            subtext={`${stats.confirmedBookings} confirmed`} />
          <StatCard label="Pending Bookings" value={stats.pendingBookings} icon={Clock}
            highlight={stats.pendingBookings > 0 ? 'warning' : undefined}
            subtext={`${stats.pendingBookingPayments} awaiting payment`} />
          <StatCard label="Visitors Today" value={stats.visitorsToday} icon={Users}
            subtext={`${stats.visitorsCheckedIn} checked in`} />
          <StatCard label="Total Guests Today" value={stats.totalGuestsToday} icon={UserPlus} />
          <Card className={CARD_CLASS}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-stat-card-muted">Visitor Check-in Rate</p>
                  <p className="text-2xl font-bold text-stat-card-text">
                    {stats.visitorsToday > 0 ? Math.round((stats.visitorsCheckedIn / stats.visitorsToday) * 100) : 0}%
                  </p>
                  <Progress value={stats.visitorsToday > 0 ? (stats.visitorsCheckedIn / stats.visitorsToday) * 100 : 0} className="mt-2 h-1.5" />
                </div>
                <ShieldCheck className="w-8 h-8 text-stat-card-text opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Financial */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <DollarSign className="w-5 h-5" /> Financial
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Revenue Today" value={`Ksh ${stats.totalRevenueToday.toLocaleString()}`} icon={DollarSign} />
          <StatCard label="Revenue This Week" value={`Ksh ${stats.revenueThisWeek.toLocaleString()}`} icon={TrendingUp} />
          <StatCard label="Paid Payments" value={stats.paidPayments} icon={CreditCard} highlight="success" />
          <StatCard label="Pending Payments" value={stats.pendingPayments} icon={Clock}
            highlight={stats.pendingPayments > 0 ? 'warning' : undefined} />
          <StatCard label="Failed Payments" value={stats.failedPayments} icon={AlertTriangle}
            highlight={stats.failedPayments > 0 ? 'danger' : undefined} />
        </div>
      </div>

      {/* Pool Operations */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Waves className="w-5 h-5" /> Pool Operations
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className={CARD_CLASS}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-stat-card-muted">Water Quality</p>
                  <p className={`text-2xl font-bold ${waterQuality.color}`}>{waterQuality.text}</p>
                  {stats.latestChlorine != null && <p className="text-xs text-stat-card-muted mt-1">Cl: {stats.latestChlorine} ppm</p>}
                  {stats.latestPh != null && <p className="text-xs text-stat-card-muted">pH: {stats.latestPh}</p>}
                </div>
                <Droplet className={`w-8 h-8 ${waterQuality.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>

          <StatCard label="Cleaning Status" value={stats.latestCleaningStatus || 'N/A'} icon={TestTube} />

          <Card className={CARD_CLASS}>
            <CardContent className="p-4">
              <div>
                <p className="text-xs font-medium text-stat-card-muted">Equipment Utilization</p>
                <p className="text-2xl font-bold text-stat-card-text">{equipUtilPct}%</p>
                <p className="text-xs text-stat-card-muted mt-1">{stats.availableEquipment}/{stats.totalEquipment} available</p>
                <Progress value={equipUtilPct} className="mt-2 h-1.5" />
              </div>
            </CardContent>
          </Card>

          <StatCard label="Active Loans" value={stats.activeLoans} icon={Package}
            subtext={stats.overdueLoans > 0 ? `${stats.overdueLoans} overdue` : undefined}
            highlight={stats.overdueLoans > 0 ? 'danger' : undefined} />

          <StatCard label="Incidents (7d)" value={stats.recentIncidents} icon={AlertTriangle}
            highlight={stats.recentIncidents > 0 ? 'danger' : undefined} />
        </div>
      </div>

      {/* Groups & Membership */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Building2 className="w-5 h-5" /> Groups & Residence
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Total Groups" value={stats.totalGroups} icon={Building2}
            subtext={`${stats.activeGroups} active`} />
          <StatCard label="Group Members" value={stats.totalGroupMembers} icon={Users} />
          <StatCard label="Active Residents" value={stats.totalResidents} icon={Home} />
          <StatCard label="Residence Members" value={stats.activeResidenceMembers} icon={UserCheck} />
          <Card className={CARD_CLASS}>
            <CardContent className="p-4">
              <div>
                <p className="text-xs font-medium text-stat-card-muted">Avg Members/Group</p>
                <p className="text-2xl font-bold text-stat-card-text">
                  {stats.activeGroups > 0 ? (stats.totalGroupMembers / stats.activeGroups).toFixed(1) : '0'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Communication & System */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <MessageSquare className="w-5 h-5" /> Communication & System
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Unread Inquiries" value={stats.unreadInquiries} icon={Mail}
            highlight={stats.unreadInquiries > 0 ? 'warning' : undefined} />
          <StatCard label="Messages (24h)" value={stats.messagesLast24h} icon={MessageSquare} />
          <Card className={CARD_CLASS}>
            <CardContent className="p-4">
              <div>
                <p className="text-xs font-medium text-stat-card-muted">Total Users</p>
                <p className="text-2xl font-bold text-stat-card-text">{stats.totalUsers}</p>
                <p className="text-xs text-stat-card-muted mt-1">
                  {userActivePct}% active ({stats.activeUsers})
                </p>
                <Progress value={userActivePct} className="mt-2 h-1.5" />
              </div>
            </CardContent>
          </Card>
          <StatCard label="New Users (7d)" value={stats.newUsersThisWeek} icon={UserPlus} />
          <StatCard label="Pending Approvals" value={stats.pendingApprovals} icon={ShieldCheck}
            highlight={stats.pendingApprovals > 0 ? 'warning' : undefined} />
        </div>
      </div>
    </div>
  );
}
