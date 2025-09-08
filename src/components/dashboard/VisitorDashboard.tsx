import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Clock, 
  Calendar, 
  Info,
  CheckCircle,
  XCircle,
  MapPin,
  Users,
  Waves
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

interface VisitorDashboardProps {
  user: User;
  profile: UserProfile;
}

const VisitorDashboard = ({ user, profile }: VisitorDashboardProps) => {
  const [currentCheckIn, setCurrentCheckIn] = useState<any>(null);
  const [todaysSchedules, setTodaysSchedules] = useState<any[]>([]);
  const [currentPoolLog, setCurrentPoolLog] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
    
    // Set up real-time subscription for check-ins
    const channel = supabase
      .channel('visitor-checkins')
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
      fetchTodaysSchedules(),
      fetchCurrentPoolLog(),
      fetchMessages(),
      fetchAllUsers()
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

  const fetchTodaysSchedules = async () => {
    try {
      const currentDay = new Date().getDay();
      const currentTime = new Date().toTimeString().slice(0, 5);

      const { data, error } = await supabase
        .from("pool_schedules")
        .select("*")
        .contains("allowed_roles", ["visitor"])
        .contains("days_of_week", [currentDay])
        .eq("is_active", true);

      if (error) throw error;

      // Sort schedules by start time and show upcoming ones
      const sortedSchedules = data?.sort((a, b) => 
        a.start_time.localeCompare(b.start_time)
      ) || [];

      setTodaysSchedules(sortedSchedules);
    } catch (error) {
      console.error("Error fetching schedules:", error);
    }
  };

  const fetchCurrentPoolLog = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from("pool_logs")
        .select("*")
        .eq("date", today)
        .maybeSingle();

      if (error) throw error;
      setCurrentPoolLog(data);
    } catch (error) {
      console.error("Error fetching pool log:", error);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          sender_profile:profiles!messages_sender_id_fkey(first_name, last_name, role)
        `)
        .or(`recipient_id.eq.${user.id},recipient_role.eq.visitor`)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("first_name", { ascending: true });

      if (error) throw error;
      setAllUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
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
        description: "Welcome to the pool! Please follow all facility rules",
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
        description: "Thank you for visiting! Have a great day",
      });

      setCurrentCheckIn(null);
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

  const getScheduleStatus = (startTime: string, endTime: string) => {
    const now = new Date().toTimeString().slice(0, 5);
    if (now < startTime) return { status: "upcoming", label: "Upcoming" };
    if (now >= startTime && now <= endTime) return { status: "active", label: "Open Now" };
    return { status: "ended", label: "Ended" };
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
            Welcome, {profile.first_name || "Visitor"}!
          </h1>
          <p className="text-muted-foreground">
            Pool facility visitor access
          </p>
        </div>
        
        {/* Visitor Status */}
        <Card className="w-64">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Access Level</p>
                <Badge variant="outline" className="mt-1">
                  Visitor
                </Badge>
              </div>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Day pass access only
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access Grid */}
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
                <Badge className="mb-3 bg-emerald-600">Currently In Pool</Badge>
                <p className="text-sm text-muted-foreground">
                  Visit Duration: {formatDuration(currentCheckIn.check_in_time)}
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
                <Badge variant="secondary" className="mb-3">Ready to Enter</Badge>
                <p className="text-xs text-muted-foreground mb-3">
                  Check in when you arrive at the pool
                </p>
                <Button 
                  onClick={() => handleCheckIn()}
                  className="w-full"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Check In
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pool Conditions */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Waves className="w-5 h-5 text-blue-600" />
              Pool Conditions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {currentPoolLog ? (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Water Clarity</span>
                  <Badge variant="outline">{currentPoolLog.water_clarity || "Good"}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Temperature</span>
                  <span className="text-sm text-blue-600">Comfortable</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Safety Equipment</span>
                  <Badge variant="outline">{currentPoolLog.safety_equipment}</Badge>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Pool conditions not available
              </p>
            )}
          </CardContent>
        </Card>

        {/* Facility Info */}
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-amber-600" />
              Important Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-amber-600 mt-0.5" />
                <span>Pool rules must be followed at all times</span>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-amber-600 mt-0.5" />
                <span>Visitor sessions are time-limited</span>
              </div>
              <div className="flex items-start gap-2">
                <Users className="w-4 h-4 text-amber-600 mt-0.5" />
                <span>Supervision may be required</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Available Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Visitor Sessions Today
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {todaysSchedules.length > 0 ? (
              todaysSchedules.map((schedule) => {
                const { status, label } = getScheduleStatus(schedule.start_time, schedule.end_time);
                return (
                  <div 
                    key={schedule.id} 
                    className={`p-4 rounded-lg border ${
                      status === 'active'
                        ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800'
                        : status === 'upcoming'
                        ? 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800'
                        : 'bg-muted/50 opacity-60'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">{schedule.title}</h3>
                          <Badge 
                            variant={status === 'active' ? 'default' : 'outline'}
                            className={
                              status === 'active' 
                                ? 'bg-emerald-600' 
                                : status === 'upcoming'
                                ? 'bg-blue-600 text-white'
                                : ''
                            }
                          >
                            {label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          <Clock className="w-4 h-4 inline mr-1" />
                          {schedule.start_time} - {schedule.end_time}
                        </p>
                        {schedule.description && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {schedule.description}
                          </p>
                        )}
                        <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                          <span>Max Capacity: {schedule.capacity_limit}</span>
                          {schedule.max_visitors && (
                            <span>Visitors: {schedule.max_visitors}</span>
                          )}
                        </div>
                      </div>
                      {status === 'active' && !currentCheckIn && (
                        <Button 
                          onClick={() => handleCheckIn(schedule.id)}
                          size="sm"
                        >
                          Check In
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  No visitor sessions available today
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Please check back tomorrow or contact staff for assistance
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Messages from Staff/Admin */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            Messages & Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {messages.length > 0 ? (
              messages.map((message) => (
                <div key={message.id} className="p-3 rounded-lg border bg-muted/50">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-sm">{message.title}</h4>
                    <Badge variant="outline">
                      {message.message_type}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {message.content}
                  </p>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>
                      From: {message.sender_profile?.first_name} {message.sender_profile?.last_name} ({message.sender_profile?.role})
                    </span>
                    <span>{new Date(message.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No messages available
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* All Users Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Pool Community ({allUsers.length} members)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allUsers.slice(0, 12).map((user) => (
              <div key={user.id} className="p-3 rounded-lg border bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-sm font-medium">
                      {(user.first_name?.charAt(0) || "")}
                      {(user.last_name?.charAt(0) || "")}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {user.first_name} {user.last_name}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {user.role}
                      </Badge>
                      <Badge 
                        variant={user.status === 'active' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {user.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {allUsers.length > 12 && (
            <p className="text-center text-sm text-muted-foreground mt-4">
              And {allUsers.length - 12} more members...
            </p>
          )}
        </CardContent>
      </Card>

      {/* Pool Rules & Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            Pool Rules & Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium text-foreground">Safety Requirements</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• No running on pool deck</li>
                <li>• Children must be supervised</li>
                <li>• No diving in shallow end</li>
                <li>• Follow lifeguard instructions</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium text-foreground">Visitor Guidelines</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Check in/out required</li>
                <li>• Limited session times</li>
                <li>• Bring own towels</li>
                <li>• Shower before entering</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VisitorDashboard;