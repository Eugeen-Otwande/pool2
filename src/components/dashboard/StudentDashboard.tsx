import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Clock, 
  Calendar, 
  QrCode, 
  History,
  Timer,
  Users,
  CheckCircle,
  XCircle,
  MessageSquare,
  Home,
  BarChart3,
  User as UserIcon
} from "lucide-react";
import { User } from "@supabase/supabase-js";
import MessagingTab from "./MessagingTab";
import ProfileTab from "./ProfileTab";
import RecentActivitiesWidget from "./RecentActivitiesWidget";

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  emergency_contact: string | null;
  emergency_phone: string | null;
  role: string;
  status: string;
  subscription_type: string | null;
  subscription_expires_at: string | null;
  check_in_status: string | null;
  check_in_at: string | null;
  check_out_at: string | null;
  created_at: string;
  updated_at: string;
}

interface StudentDashboardProps {
  user: User;
  profile: UserProfile;
}

const StudentDashboard = ({ user, profile }: StudentDashboardProps) => {
  const [currentCheckIn, setCurrentCheckIn] = useState<any>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [recentVisits, setRecentVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
    
    // Set up real-time subscription for check-ins
    const channel = supabase
      .channel('student-checkins')
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
      fetchRecentVisits()
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
        .contains("allowed_roles", ["student"])
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
            notes: "Self check-in"
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
        fetchRecentVisits()
      ]);
    } catch (error: any) {
      toast({
        title: "Operation Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatDuration = (checkInTime: string, checkOutTime?: string) => {
    const start = new Date(checkInTime);
    const end = checkOutTime ? new Date(checkOutTime) : new Date();
    const diff = Math.floor((end.getTime() - start.getTime()) / 60000); // minutes
    
    if (diff < 60) return `${diff}m`;
    return `${Math.floor(diff / 60)}h ${diff % 60}m`;
  };

  const isScheduleActive = (startTime: string, endTime: string) => {
    const now = new Date().toTimeString().slice(0, 5);
    return now >= startTime && now <= endTime;
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
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
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 border-b">
        <div className="max-w-4xl">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Welcome back, {profile.first_name || "Student"}! 👋
          </h1>
          <p className="text-lg text-muted-foreground">
            Your pool access awaits. Ready for today's session?
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="px-8 py-4">
            <TabsList className="grid w-full max-w-md grid-cols-4 h-auto">
              <TabsTrigger value="overview" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm">
                <Home className="w-4 h-4" />
                <span>Overview</span>
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm">
                <BarChart3 className="w-4 h-4" />
                <span>Activity</span>
              </TabsTrigger>
              <TabsTrigger value="messages" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm">
                <MessageSquare className="w-4 h-4" />
                <span>Messages</span>
              </TabsTrigger>
              <TabsTrigger value="profile" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm">
                <UserIcon className="w-4 h-4" />
                <span>Profile</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6 lg:p-8">
          <TabsContent value="overview" className="space-y-4 sm:space-y-6 mt-0">

            {/* Pool Access Status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <Card className={`${currentCheckIn ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-emerald-200 dark:border-emerald-800' : 'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900'}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {currentCheckIn ? (
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-slate-600" />
                    )}
                    Pool Access Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {currentCheckIn ? (
                    <div>
                      <Badge className="mb-3 bg-emerald-600">Currently Checked In</Badge>
                      <p className="text-sm text-muted-foreground">
                        Session duration: {formatDuration(currentCheckIn.check_in_time)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Checked in at: {new Date(currentCheckIn.check_in_time).toLocaleTimeString()}
                      </p>
                      <Button 
                        onClick={() => handleToggleCheckIn()}
                        className="w-full mt-4"
                        variant="outline"
                        size="lg"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Check Out
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <Badge variant="secondary" className="mb-3">Not Checked In</Badge>
                      <p className="text-sm text-muted-foreground mb-4">
                        You are not currently checked into the pool.
                      </p>
                      <Button 
                        onClick={() => handleToggleCheckIn()}
                        className="w-full"
                        size="lg"
                      >
                        <QrCode className="w-4 h-4 mr-2" />
                        Check In Now
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Today's Schedule */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Today's Schedule
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
                              <p className="text-xs text-muted-foreground">
                                Capacity: {schedule.capacity_limit} people
                              </p>
                            </div>
                            {isScheduleActive(schedule.start_time, schedule.end_time) && (
                              <Badge className="bg-emerald-600">Active Now</Badge>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-center py-4">
                        No student sessions scheduled for today
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4 sm:space-y-6 mt-0">

            {/* Recent Visits & Statistics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Swimming Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <div className="text-2xl font-bold text-primary">{recentVisits.length}</div>
                      <div className="text-xs text-muted-foreground">Total Visits</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800">
                      <div className="text-2xl font-bold text-emerald-600">
                        {recentVisits.filter(v => v.status === 'checked_out').length}
                      </div>
                      <div className="text-xs text-muted-foreground">Completed Sessions</div>
                    </div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                    <div className="text-lg font-bold text-blue-600">
                      {currentCheckIn ? 'Active Session' : 'Ready to Swim'}
                    </div>
                    <div className="text-xs text-muted-foreground">Current Status</div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity Timeline with Export */}
              <RecentActivitiesWidget 
                activities={recentVisits} 
                title="Recent Activity"
                limit={5}
              />
            </div>
          </TabsContent>

          <TabsContent value="messages" className="mt-0">

            <MessagingTab onRefreshStats={() => {}} />
          </TabsContent>

          <TabsContent value="profile" className="mt-0">
            <ProfileTab user={user} profile={profile} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default StudentDashboard;