import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Home,
  Calendar, 
  QrCode, 
  BarChart3,
  Trophy,
  Target,
  CheckCircle,
  XCircle,
  CreditCard,
  MessageSquare,
  User as UserIcon,
  MapPin,
  Mail,
  Phone,
  Facebook,
  Instagram,
  Twitter,
  Send,
  Clock,
  Activity,
  Package
} from "lucide-react";
import { User } from "@supabase/supabase-js";
import MessagingTab from "./MessagingTab";
import ProfileTab from "./ProfileTab";
import RecentActivitiesWidget from "./RecentActivitiesWidget";
import PoolTimetable from "./PoolTimetable";
import { MyBorrowedEquipment } from "./MyBorrowedEquipment";

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
        .is("check_out_time", null)
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
        .or(`allowed_roles.cs.{member},allowed_roles.cs.{rcmrd_team},allowed_roles.cs.{rcmrd_official}`)
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
        .select("*")
        .eq("user_id", user.id)
        .order("check_in_time", { ascending: false })
        .limit(5);

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

  const handleToggleCheckIn = async (scheduleId?: string) => {
    try {
      if (currentCheckIn) {
        // User is checked in, so check them out
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
      } else {
        // User is not checked in, so check them in
        const { error } = await supabase
          .from("check_ins")
          .insert({
            user_id: user.id,
            schedule_id: scheduleId || null,
            status: "checked_in",
            check_in_time: new Date().toISOString(),
            notes: "Member check-in"
          });

        if (error) throw error;

        toast({
          title: "Check-in Successful",
          description: "Welcome to the pool! Enjoy your session",
        });
      }

      // Refresh data
      await Promise.all([
        fetchCurrentCheckIn(),
        fetchRecentVisits(),
        fetchMonthlyStats()
      ]);
    } catch (error: any) {
      toast({
        title: "Operation Failed",
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
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                Welcome back, {profile.first_name || "Geen"}! 👋
              </h1>
              <p className="text-lg text-muted-foreground">
                Your premium pool access awaits.
              </p>
            </div>
            
            {/* Membership Status Card */}
            <Card className="w-80">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Membership Status</p>
                    <Badge 
                      variant={isSubscriptionExpired() ? "destructive" : "default"}
                      className="mt-2"
                    >
                      {isSubscriptionExpired() ? "Expired" : "Active ✅"}
                    </Badge>
                  </div>
                  <CreditCard className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Access: Ready to Swim</p>
                  {profile.subscription_expires_at && (
                    <p className="text-xs text-muted-foreground">
                      {isSubscriptionExpired() ? "Expired" : "Expires"}: {new Date(profile.subscription_expires_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="timetable" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Timetable
            </TabsTrigger>
            <TabsTrigger value="equipment" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Equipment
            </TabsTrigger>
            <TabsTrigger value="sessions" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Sessions
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              Profile
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Check-in and Goal Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Membership Card */}
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
                        onClick={() => handleToggleCheckIn()}
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
                        onClick={() => handleToggleCheckIn()}
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

              {/* Monthly Goal Progress */}
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    Monthly Goal Progress
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Visits this month</span>
                      <span>{monthlyStats.visitsThisMonth}/12</span>
                    </div>
                    <Progress value={monthlyStats.goalProgress} className="h-3" />
                  </div>
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                    {12 - monthlyStats.visitsThisMonth} visits left to reach goal
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Available Sessions Preview */}
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
                    schedules.slice(0, 3).map((schedule) => (
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
                          </div>
                          {isScheduleActive(schedule.start_time, schedule.end_time) && (
                            <Badge className="bg-emerald-600">Open Now</Badge>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No sessions available today</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity Preview with Export */}
            <RecentActivitiesWidget 
              activities={recentVisits} 
              title="Recent Visits"
              limit={3}
            />
          </TabsContent>

          {/* Timetable Tab */}
          <TabsContent value="timetable" className="space-y-6">
            <PoolTimetable userRole="member" />
          </TabsContent>

          {/* Equipment Tab */}
          <TabsContent value="equipment" className="space-y-6">
            <MyBorrowedEquipment userId={user.id} />
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Available Sessions Today</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {schedules.length > 0 ? (
                    schedules.map((schedule) => (
                      <div 
                        key={schedule.id} 
                        className={`p-4 rounded-lg border ${
                          isScheduleActive(schedule.start_time, schedule.end_time)
                            ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800'
                            : 'bg-muted/50'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <h4 className="font-medium text-lg">{schedule.title}</h4>
                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              {schedule.start_time} - {schedule.end_time}
                            </p>
                            {schedule.description && (
                              <p className="text-sm text-muted-foreground">
                                {schedule.description}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {isScheduleActive(schedule.start_time, schedule.end_time) && (
                              <Badge className="bg-emerald-600">Open Now</Badge>
                            )}
                            <Button size="sm" variant="outline">
                              View Details
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No sessions available today</h3>
                      <p className="text-muted-foreground">Check back tomorrow for new sessions.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            {/* Monthly Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-purple-600" />
                    Swim Time This Month
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                      {monthlyStats.totalDuration}h
                    </p>
                    <p className="text-sm text-purple-600 dark:text-purple-400">Total swimming time</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    Total Visits
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                      {monthlyStats.visitsThisMonth}
                    </p>
                    <p className="text-sm text-blue-600 dark:text-blue-400">Pool visits this month</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Recent Activity Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentVisits.length > 0 ? (
                    recentVisits.map((visit) => (
                      <div key={visit.id} className="flex items-center space-x-4 p-4 rounded-lg bg-muted/50">
                        <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0"></div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">
                                {visit.pool_schedules?.title || "Pool Session"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(visit.check_in_time).toLocaleDateString()} • 
                                {new Date(visit.check_in_time).toLocaleTimeString()}
                                {visit.check_out_time && (
                                  <> - {new Date(visit.check_out_time).toLocaleTimeString()}</>
                                )}
                              </p>
                            </div>
                            <Badge variant={visit.status === "checked_out" ? "secondary" : "default"}>
                              {visit.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No activity yet</h3>
                      <p className="text-muted-foreground">Your pool visits will appear here.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-6">
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
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <ProfileTab user={user} profile={profile} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <footer className="bg-background border-t border-border/50 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            
            {/* About Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">About</h3>
              <p className="text-sm text-muted-foreground">
                Premium swimming experience at RCMRD, Kasarani Road.
              </p>
            </div>

            {/* Quick Links */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Quick Links</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary">About</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary">Sessions</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary">Membership</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary">Reports</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary">Contact</a></li>
              </ul>
            </div>

            {/* Contact Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Contact Info</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Swimmingpool@rcmrd.org</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">0742335679</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-primary mt-0.5" />
                  <span className="text-sm text-muted-foreground">Kasarani Police Station, Nairobi</span>
                </div>
              </div>
            </div>

            {/* Opening Hours */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Opening Hours</h3>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Mon–Sat: 8AM–5PM</p>
                <p className="text-sm text-muted-foreground">Sun: 8AM–5PM</p>
              </div>
            </div>

            {/* Newsletter Signup */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Stay Connected</h3>
              <div className="space-y-3">
                <Input 
                  placeholder="Enter your email"
                  className="bg-background/50 border-border/50"
                />
                <Button className="w-full">
                  <Send className="w-4 h-4 mr-2" />
                  Subscribe
                </Button>
              </div>
              <div className="flex space-x-3">
                <Button variant="outline" size="icon">
                  <Facebook className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon">
                  <Instagram className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon">
                  <Twitter className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-border/50 mt-8 pt-6">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <div className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} RCMRD Swimming Pool. All rights reserved.
              </div>
              <div className="flex items-center space-x-6 text-sm">
                <a href="#" className="text-muted-foreground hover:text-primary">Privacy Policy</a>
                <a href="#" className="text-muted-foreground hover:text-primary">Terms of Service</a>
                <a href="#" className="text-muted-foreground hover:text-primary">Accessibility</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MemberDashboard;