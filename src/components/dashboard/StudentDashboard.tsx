import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  XCircle
} from "lucide-react";
import { User } from "@supabase/supabase-js";

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  status: string;
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
        .select(`
          *,
          pool_schedules(title)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentVisits(data || []);
    } catch (error) {
      console.error("Error fetching recent visits:", error);
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
        description: "You have been checked into the pool",
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
        description: "You have been checked out of the pool",
      });

      setCurrentCheckIn(null);
      fetchRecentVisits();
    } catch (error: any) {
      toast({
        title: "Check-out Failed",
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Welcome, {profile.first_name || "Student"}!
        </h1>
        <p className="text-muted-foreground">
          Ready for your swimming session today?
        </p>
      </div>

      {/* Check-in Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <Badge variant="secondary" className="mb-3">Not Checked In</Badge>
                <p className="text-sm text-muted-foreground mb-4">
                  You are not currently checked into the pool.
                </p>
                <Button 
                  onClick={() => handleCheckIn()}
                  className="w-full"
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

      {/* Recent Visits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Recent Visits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentVisits.length > 0 ? (
              recentVisits.map((visit) => (
                <div key={visit.id} className="p-3 rounded-lg bg-muted/50 border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        visit.status === 'checked_out' ? 'bg-green-500' : 'bg-blue-500'
                      }`}></div>
                      <div>
                        <p className="text-sm font-medium">
                          {visit.pool_schedules?.title || "Pool Session"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(visit.check_in_time).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant={visit.status === "checked_out" ? "secondary" : "default"}>
                      {visit.status}
                    </Badge>
                  </div>
                  
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex justify-between">
                      <span>Check-in:</span>
                      <span>{new Date(visit.check_in_time).toLocaleTimeString()}</span>
                    </div>
                    {visit.check_out_time && (
                      <div className="flex justify-between">
                        <span>Check-out:</span>
                        <span>{new Date(visit.check_out_time).toLocaleTimeString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-medium">
                      <span>Duration:</span>
                      <span>{formatDuration(visit.check_in_time, visit.check_out_time)}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No recent visits found
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentDashboard;