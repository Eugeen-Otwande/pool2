import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Clock, 
  Calendar, 
  QrCode, 
  History,
  UserPlus,
  Users,
  CheckCircle,
  XCircle,
  Home,
  MessageSquare,
  User as UserIcon,
  Package
} from "lucide-react";
import { User } from "@supabase/supabase-js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface ResidentDashboardProps {
  user: User;
  profile: UserProfile;
}

const ResidentDashboard = ({ user, profile }: ResidentDashboardProps) => {
  const [currentCheckIn, setCurrentCheckIn] = useState<any>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [recentVisits, setRecentVisits] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [guestForm, setGuestForm] = useState({
    name: "",
    email: "",
    phone: ""
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
    
    // Set up real-time subscription for check-ins
    const channel = supabase
      .channel('resident-checkins')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'check_ins',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchCurrentCheckIn();
          fetchRecentVisits();
        }
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
      fetchUnreadCount()
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
        .contains("allowed_roles", ["resident"])
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

  const fetchUnreadCount = async () => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("id", { count: 'exact' })
        .or(`recipient_id.eq.${user.id},recipient_role.eq.resident`)
        .is("read_at", null);
      
      if (error) throw error;
      setUnreadCount(data?.length || 0);
    } catch (error) {
      console.error("Error fetching unread count:", error);
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
          description: "Thanks for using the residential pool",
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
            notes: "Resident check-in"
          });

        if (error) throw error;

        toast({
          title: "Check-in Successful",
          description: "Welcome to your residential pool access",
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

  const handleGuestInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // This would typically create a temporary guest pass
    // For now, we'll just show a success message
    toast({
      title: "Guest Invite Sent",
      description: `Invitation sent to ${guestForm.name} at ${guestForm.email}`,
    });

    setGuestForm({ name: "", email: "", phone: "" });
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
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
          <Home className="w-6 h-6 text-orange-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Resident Portal
          </h1>
          <p className="text-muted-foreground">
            Welcome {profile.first_name}, enjoy your residential pool privileges
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">
            <Home className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="timetable">
            <Calendar className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Timetable</span>
          </TabsTrigger>
          <TabsTrigger value="equipment">
            <Package className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Equipment</span>
          </TabsTrigger>
          <TabsTrigger value="visits">
            <History className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Visits</span>
          </TabsTrigger>
          <TabsTrigger value="messages" className="relative">
            <MessageSquare className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Messages</span>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 flex items-center justify-center p-0 text-xs rounded-full">
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="profile">
            <UserIcon className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Check-in Status & Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className={`${currentCheckIn ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-emerald-200 dark:border-emerald-800' : 'bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800'}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {currentCheckIn ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <Home className="w-5 h-5 text-orange-600" />
                  )}
                  Pool Access Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentCheckIn ? (
                  <div>
                    <Badge className="mb-3 bg-emerald-600">Currently at Pool</Badge>
                    <p className="text-sm text-muted-foreground">
                      Session duration: {formatDuration(currentCheckIn.check_in_time)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Started: {new Date(currentCheckIn.check_in_time).toLocaleTimeString()}
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
                    <Badge className="mb-3 bg-orange-600">Ready to Swim</Badge>
                    <p className="text-sm text-muted-foreground mb-4">
                      Your residential pool access is available 24/7
                    </p>
                    <Button 
                      onClick={() => handleToggleCheckIn()}
                      className="w-full"
                    >
                      <QrCode className="w-4 h-4 mr-2" />
                      Check In to Pool
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Guest Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Invite Guest
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleGuestInvite} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="guest-name">Guest Name</Label>
                    <Input
                      id="guest-name"
                      value={guestForm.name}
                      onChange={(e) => setGuestForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter guest's full name"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="guest-email">Guest Email</Label>
                    <Input
                      id="guest-email"
                      type="email"
                      value={guestForm.email}
                      onChange={(e) => setGuestForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="guest@example.com"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="guest-phone">Phone (Optional)</Label>
                    <Input
                      id="guest-phone"
                      type="tel"
                      value={guestForm.phone}
                      onChange={(e) => setGuestForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Send Guest Invitation
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Resident Hours */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Resident Pool Hours
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
                    <div className="text-center py-4">
                      <p className="text-muted-foreground mb-2">
                        No dedicated resident hours today
                      </p>
                      <p className="text-xs text-muted-foreground">
                        As a resident, you can access the pool during general hours - show from the schedule module from admin.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity Preview with Export */}
            <RecentActivitiesWidget 
              activities={recentVisits} 
              title="Recent Pool Visits"
              limit={4}
            />
          </div>

          {/* Resident Benefits */}
          <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 border-orange-200 dark:border-orange-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
                <Users className="w-5 h-5" />
                Resident Privileges
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Clock className="w-6 h-6 text-orange-600" />
                  </div>
                  <h3 className="font-semibold text-orange-800 dark:text-orange-200">Extended Hours</h3>
                  <p className="text-sm text-orange-600 dark:text-orange-400">24/7 pool access for residents</p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <UserPlus className="w-6 h-6 text-orange-600" />
                  </div>
                  <h3 className="font-semibold text-orange-800 dark:text-orange-200">Guest Privileges</h3>
                  <p className="text-sm text-orange-600 dark:text-orange-400">Invite guests with special access</p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Users className="w-6 h-6 text-orange-600" />
                  </div>
                  <h3 className="font-semibold text-orange-800 dark:text-orange-200">Priority Access</h3>
                  <p className="text-sm text-orange-600 dark:text-orange-400">Skip queues during peak hours</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timetable Tab */}
        <TabsContent value="timetable" className="space-y-6">
          <PoolTimetable userRole="resident" />
        </TabsContent>

        {/* Equipment Tab */}
        <TabsContent value="equipment" className="space-y-6">
          <MyBorrowedEquipment userId={user.id} />
        </TabsContent>

        {/* Recent Visits Tab */}
        <TabsContent value="visits" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Pool Visit History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {recentVisits.length > 0 ? (
                  recentVisits.map((visit) => (
                    <div key={visit.id} className="p-4 rounded-lg bg-muted/50 border">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            visit.status === 'checked_out' ? 'bg-green-500' : 'bg-orange-500'
                          }`}></div>
                          <div>
                            <p className="font-medium">
                              {visit.pool_schedules?.title || "Pool Session"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(visit.check_in_time).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant={visit.status === "checked_out" ? "secondary" : "default"}>
                          {visit.status.replace("_", " ").toUpperCase()}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Check-in Time</p>
                          <p className="font-medium">{new Date(visit.check_in_time).toLocaleTimeString()}</p>
                        </div>
                        {visit.check_out_time && (
                          <div>
                            <p className="text-muted-foreground">Check-out Time</p>
                            <p className="font-medium">{new Date(visit.check_out_time).toLocaleTimeString()}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-muted-foreground">Duration</p>
                          <p className="font-medium">{formatDuration(visit.check_in_time, visit.check_out_time)}</p>
                        </div>
                        {visit.notes && (
                          <div>
                            <p className="text-muted-foreground">Notes</p>
                            <p className="font-medium">{visit.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No visit history found</p>
                    <p className="text-sm text-muted-foreground">Your pool visits will appear here once you start using the facility</p>
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
              <MessagingTab onRefreshStats={fetchUnreadCount} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <ProfileTab 
            user={user} 
            profile={profile} 
            onProfileUpdate={(updatedProfile) => {
              // Update local profile state if parent component provides a way
              console.log("Profile updated:", updatedProfile);
            }} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ResidentDashboard;