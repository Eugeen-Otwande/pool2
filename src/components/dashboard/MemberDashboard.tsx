import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Clock, 
  Calendar, 
  QrCode, 
  History,
  Trophy,
  Target,
  CheckCircle,
  XCircle,
  CreditCard,
  MessageSquare
} from "lucide-react";
import { User } from "@supabase/supabase-js";
import MessagingTab from "./MessagingTab";

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  status: string;
  subscription_type: string | null;
  subscription_expires_at: string | null;
}

interface MemberDashboardProps {
  user: User;
  profile: UserProfile;
}

const MemberDashboard = ({ user, profile }: MemberDashboardProps) => {
  const [currentCheckIn, setCurrentCheckIn] = useState<any>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [recentVisits, setRecentVisits] = useState<any[]>([]);
  const [monthlyStats, setMonthlyStats] = useState({
    visitsThisMonth: 0,
    totalDuration: 0,
    goalProgress: 0
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
    
    // Set up real-time subscription for check-ins
    const channel = supabase
      .channel('member-checkins')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'check_ins',
          filter: `user_id=eq.${user.id}`
        },
        () => fetchCurrentCheckIn()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id]);

  const fetchDashboardData = async () => {
    await Promise.all([
      fetchCurrentCheckIn(),
      fetchSchedules(),
      fetchRecentVisits(),
      fetchMonthlyStats()
    ]);
    setLoading(false);
  };

  const fetchCurrentCheckIn = async () => {
    try {
      const { data, error } = await supabase
        .from("check_ins")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "checked_in")
        .maybeSingle();

      if (error) throw error;
      setCurrentCheckIn(data);
    } catch (error) {
      console.error("Error fetching current check-in:", error);
    }
  };

  const fetchSchedules = async () => {
    try {
      const currentDay = new Date().getDay();
      const currentTime = new Date().toTimeString().slice(0, 5);

      const { data, error } = await supabase
        .from("pool_schedules")
        .select("*")
        .contains("allowed_roles", ["member"])
        .contains("days_of_week", [currentDay])
        .eq("is_active", true);

      if (error) throw error;

      // Filter schedules for current and upcoming sessions
      const relevantSchedules = data?.filter(schedule => 
        schedule.end_time > currentTime
      ) || [];

      setSchedules(relevantSchedules);
    } catch (error) {
      console.error("Error fetching schedules:", error);
    }
  };

  const fetchRecentVisits = async () => {
    try {
      const { data, error } = await supabase
        .from("check_ins")
        .select(`
          *,
          pool_schedules(title)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentVisits(data || []);
    } catch (error) {
      console.error("Error fetching recent visits:", error);
    }
  };

  const fetchMonthlyStats = async () => {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("check_ins")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", startOfMonth.toISOString())
        .eq("status", "checked_out");

      if (error) throw error;

      let totalDuration = 0;
      data?.forEach(visit => {
        if (visit.check_in_time && visit.check_out_time) {
          const duration = new Date(visit.check_out_time).getTime() - new Date(visit.check_in_time).getTime();
          totalDuration += duration;
        }
      });

      const visitsThisMonth = data?.length || 0;
      const goalVisits = 12; // Monthly goal
      const goalProgress = Math.min((visitsThisMonth / goalVisits) * 100, 100);

      setMonthlyStats({
        visitsThisMonth,
        totalDuration: Math.floor(totalDuration / (1000 * 60 * 60)), // Convert to hours
        goalProgress
      });
    } catch (error) {
      console.error("Error fetching monthly stats:", error);
    }
  };

  const handleCheckIn = async (scheduleId?: string) => {
    try {
      const { error } = await supabase
        .from("check_ins")
        .insert({
          user_id: user.id,
          schedule_id: scheduleId,
          status: "checked_in"
        });

      if (error) throw error;

      toast({
        title: "Check-in Successful",
        description: "Welcome to the pool! Enjoy your session",
      });

      fetchCurrentCheckIn();
    } catch (error: any) {
      toast({
        title: "Check-in Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCheckOut = async () => {
    if (!currentCheckIn) return;

    try {
      const { error } = await supabase
        .from("check_ins")
        .update({
          check_out_time: new Date().toISOString(),
          status: "checked_out"
        })
        .eq("id", currentCheckIn.id);

      if (error) throw error;

      toast({
        title: "Check-out Successful",
        description: "Thanks for visiting! Have a great day",
      });

      setCurrentCheckIn(null);
      fetchRecentVisits();
      fetchMonthlyStats();
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

  const isScheduleActive = (startTime: string, endTime: string) => {
    const now = new Date().toTimeString().slice(0, 5);
    return now >= startTime && now <= endTime;
  };

  const isSubscriptionExpired = () => {
    if (!profile.subscription_expires_at) return false;
    return new Date(profile.subscription_expires_at) < new Date();
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-32 bg-muted rounded"></div>
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
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {profile.first_name || "Member"}!
          </h1>
          <p className="text-muted-foreground">
            Your premium pool access awaits
          </p>
        </div>
        
        {/* Membership Status */}
        <Card className="w-72">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Membership Status</p>
                <Badge 
                  variant={isSubscriptionExpired() ? "destructive" : "default"}
                  className="mt-1"
                >
                  {isSubscriptionExpired() ? "Expired" : "Active"}
                </Badge>
              </div>
              <CreditCard className="w-8 h-8 text-muted-foreground" />
            </div>
            {profile.subscription_expires_at && (
              <p className="text-xs text-muted-foreground mt-2">
                {isSubscriptionExpired() ? "Expired" : "Expires"}: {new Date(profile.subscription_expires_at).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Check-in Status */}
        <Card className={`${currentCheckIn ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-emerald-200 dark:border-emerald-800' : 'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {currentCheckIn ? (
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              ) : (
                <XCircle className="w-5 h-5 text-slate-600" />
              )}
              Pool Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentCheckIn ? (
              <div>
                <Badge className="mb-3 bg-emerald-600">Currently Swimming</Badge>
                <p className="text-sm text-muted-foreground">
                  Duration: {formatDuration(currentCheckIn.check_in_time)}
                </p>
                <Button 
                  onClick={handleCheckOut}
                  className="w-full mt-4"
                  variant="outline"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Check Out
                </Button>
              </div>
            ) : (
              <div>
                <Badge variant="secondary" className="mb-3">Ready to Swim</Badge>
                <Button 
                  onClick={() => handleCheckIn()}
                  className="w-full"
                  disabled={isSubscriptionExpired()}
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  {isSubscriptionExpired() ? "Membership Expired" : "Check In"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Progress */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              Monthly Goal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Visits this month</span>
                <span>{monthlyStats.visitsThisMonth}/12</span>
              </div>
              <Progress value={monthlyStats.goalProgress} className="h-2" />
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              {12 - monthlyStats.visitsThisMonth} visits to reach goal
            </p>
          </CardContent>
        </Card>

        {/* Swimming Stats */}
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-purple-600" />
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                  {monthlyStats.totalDuration}h
                </p>
                <p className="text-sm text-purple-600 dark:text-purple-400">Total swim time</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-purple-900 dark:text-purple-100">
                  {monthlyStats.visitsThisMonth}
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400">Pool visits</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Available Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Available Sessions Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {schedules.length > 0 ? (
                schedules.map((schedule) => (
                  <div 
                    key={schedule.id} 
                    className={`p-3 rounded-lg border ${
                      isScheduleActive(schedule.start_time, schedule.end_time)
                        ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800'
                        : 'bg-muted/50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{schedule.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {schedule.start_time} - {schedule.end_time}
                        </p>
                        {schedule.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {schedule.description}
                          </p>
                        )}
                      </div>
                      {isScheduleActive(schedule.start_time, schedule.end_time) && (
                        <Badge className="bg-emerald-600">Open Now</Badge>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No member sessions available today
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {recentVisits.length > 0 ? (
                recentVisits.map((visit) => (
                  <div key={visit.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium">
                          {visit.pool_schedules?.title || "Pool Session"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(visit.check_in_time).toLocaleDateString()} • 
                          {new Date(visit.check_in_time).toLocaleTimeString()}
                          {visit.check_out_time && (
                            <> - {new Date(visit.check_out_time).toLocaleTimeString()}</>
                          )}
                        </p>
                      </div>
                    </div>
                    <Badge variant={visit.status === "checked_out" ? "secondary" : "default"}>
                      {visit.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No recent activity found
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Messages Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Messages & Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MessagingTab onRefreshStats={() => {}} />
        </CardContent>
      </Card>
    </div>
  );
};

export default MemberDashboard;