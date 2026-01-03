import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Waves, LogOut, Settings, User, Bell, Activity, MessageSquare, Clock, AlertCircle, Menu, X, UserCheck, Users, Dumbbell, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { User as SupabaseUser } from "@supabase/supabase-js";
import rcmrdLogo from "@/assets/rcmrd-logo.png";

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  status: string;
}

interface DashboardNavProps {
  user: SupabaseUser;
  profile: UserProfile;
  onSignOut: () => void;
}

interface NotificationItem {
  id: string;
  type: 'message' | 'approval' | 'checkin' | 'visitor' | 'equipment' | 'inquiry';
  title: string;
  description: string;
  time: string;
  status?: string;
  sender?: string;
}

const roleColors = {
  system_admin: "bg-gradient-to-r from-red-500 to-pink-500",
  admin: "bg-gradient-to-r from-red-500 to-pink-500",
  pool_admin: "bg-gradient-to-r from-blue-600 to-purple-600", 
  staff: "bg-gradient-to-r from-cyan-500 to-blue-500",
  student: "bg-gradient-to-r from-emerald-500 to-teal-500",
  member: "bg-gradient-to-r from-indigo-500 to-purple-500",
  resident: "bg-gradient-to-r from-orange-500 to-amber-500",
  rcmrd_team: "bg-gradient-to-r from-blue-500 to-indigo-500",
  rcmrd_official: "bg-gradient-to-r from-purple-500 to-pink-500",
  visitor: "bg-gradient-to-r from-gray-500 to-slate-500",
};

const DashboardNav = ({ user, profile, onSignOut }: DashboardNavProps) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdminOrStaff = profile.role === 'admin' || profile.role === 'staff';

  useEffect(() => {
    fetchNotifications();
    
    // Set up real-time subscriptions
    const messagesChannel = supabase
      .channel('user-messages-notif')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => fetchNotifications()
      )
      .subscribe();

    const checkInsChannel = supabase
      .channel('user-checkins-notif')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'check_ins' },
        () => fetchNotifications()
      )
      .subscribe();

    const approvalsChannel = supabase
      .channel('user-approvals-notif')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_approvals' },
        () => fetchNotifications()
      )
      .subscribe();

    const visitorsChannel = supabase
      .channel('visitors-notif')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'visitors' },
        () => fetchNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(checkInsChannel);
      supabase.removeChannel(approvalsChannel);
      supabase.removeChannel(visitorsChannel);
    };
  }, [user.id, profile.role]);

  const fetchNotifications = async () => {
    setLoading(true);
    const allNotifications: NotificationItem[] = [];
    
    try {
      // Fetch unread messages for all users
      const { data: messages } = await supabase
        .from("messages")
        .select("id, title, content, created_at, message_type, sender_id")
        .or(`recipient_id.eq.${user.id},recipient_role.eq.${profile.role}`)
        .is("read_at", null)
        .order("created_at", { ascending: false })
        .limit(5);
      
      if (messages) {
        for (const msg of messages) {
          allNotifications.push({
            id: msg.id,
            type: 'message',
            title: msg.title,
            description: msg.content?.substring(0, 100) || '',
            time: msg.created_at,
            status: msg.message_type
          });
        }
      }

      // Fetch user's own recent check-ins
      const { data: myCheckins } = await supabase
        .from("check_ins")
        .select("id, status, check_in_time, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3);

      if (myCheckins) {
        for (const checkin of myCheckins) {
          allNotifications.push({
            id: checkin.id,
            type: 'checkin',
            title: 'Pool Session',
            description: checkin.status === 'checked_in' ? 'Currently checked in' : 
                        checkin.status === 'checked_out' ? 'Session completed' : 
                        checkin.status === 'pending_approval' ? 'Awaiting approval' : checkin.status,
            time: checkin.check_in_time || checkin.created_at,
            status: checkin.status
          });
        }
      }

      // Admin/Staff specific notifications
      if (isAdminOrStaff) {
        // Pending user approvals
        const { data: pendingApprovals } = await supabase
          .from("user_approvals")
          .select("id, user_id, created_at, status")
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(5);

        if (pendingApprovals) {
          for (const approval of pendingApprovals) {
            allNotifications.push({
              id: approval.id,
              type: 'approval',
              title: 'Pending User Approval',
              description: 'New user registration awaiting approval',
              time: approval.created_at,
              status: 'pending'
            });
          }
        }

        // Today's visitors
        const today = new Date().toISOString().split('T')[0];
        const { data: todayVisitors } = await supabase
          .from("visitors")
          .select("id, first_name, last_name, check_in_status, created_at")
          .eq("date_of_visit", today)
          .order("created_at", { ascending: false })
          .limit(5);

        if (todayVisitors) {
          for (const visitor of todayVisitors) {
            allNotifications.push({
              id: visitor.id,
              type: 'visitor',
              title: `Visitor: ${visitor.first_name} ${visitor.last_name}`,
              description: `Status: ${visitor.check_in_status}`,
              time: visitor.created_at,
              status: visitor.check_in_status
            });
          }
        }

        // Overdue equipment
        const { data: overdueLoans } = await supabase
          .from("equipment_loans")
          .select("id, equipment_id, due_back_at, user_id")
          .eq("status", "active")
          .lt("due_back_at", new Date().toISOString())
          .limit(5);

        if (overdueLoans) {
          for (const loan of overdueLoans) {
            allNotifications.push({
              id: loan.id,
              type: 'equipment',
              title: 'Overdue Equipment',
              description: 'Equipment loan overdue for return',
              time: loan.due_back_at,
              status: 'overdue'
            });
          }
        }

        // Recent inquiries
        const { data: newInquiries } = await supabase
          .from("inquiries")
          .select("id, first_name, last_name, subject, created_at, status")
          .eq("status", "new")
          .order("created_at", { ascending: false })
          .limit(3);

        if (newInquiries) {
          for (const inquiry of newInquiries) {
            allNotifications.push({
              id: inquiry.id,
              type: 'inquiry',
              title: `Inquiry: ${inquiry.subject}`,
              description: `From: ${inquiry.first_name} ${inquiry.last_name}`,
              time: inquiry.created_at,
              status: 'new'
            });
          }
        }
      }

      // Sort all notifications by time
      allNotifications.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setNotifications(allNotifications.slice(0, 15));
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    return `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase() || "U";
  };

  const getRoleLabel = (role: string) => {
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const totalNotifications = notifications.length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message': return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'approval': return <UserCheck className="w-4 h-4 text-orange-500" />;
      case 'checkin': return <Activity className="w-4 h-4 text-emerald-500" />;
      case 'visitor': return <Users className="w-4 h-4 text-purple-500" />;
      case 'equipment': return <Dumbbell className="w-4 h-4 text-red-500" />;
      case 'inquiry': return <MessageSquare className="w-4 h-4 text-cyan-500" />;
      default: return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const getNotificationColor = (type: string, status?: string) => {
    if (status === 'overdue') return 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800';
    switch (type) {
      case 'message': return 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800';
      case 'approval': return 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800';
      case 'checkin': return 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800';
      case 'visitor': return 'bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800';
      case 'equipment': return 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800';
      case 'inquiry': return 'bg-cyan-50 dark:bg-cyan-950 border-cyan-200 dark:border-cyan-800';
      default: return 'bg-muted/50';
    }
  };

  const NotificationsPopover = () => (
    <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="w-4 h-4" />
          {totalNotifications > 0 && (
            <Badge className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center p-0 text-[10px]">
              {totalNotifications > 9 ? '9+' : totalNotifications}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-lg">Notifications</h3>
          <p className="text-sm text-muted-foreground">
            {totalNotifications > 0 
              ? `You have ${totalNotifications} notification${totalNotifications > 1 ? 's' : ''}`
              : 'All caught up!'
            }
          </p>
        </div>
        
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading...
            </div>
          ) : notifications.length > 0 ? (
            <div className="p-2 space-y-2">
              {notifications.map((notification) => (
                <div 
                  key={`${notification.type}-${notification.id}`}
                  className={`p-3 rounded-lg border transition-colors cursor-pointer hover:opacity-80 ${getNotificationColor(notification.type, notification.status)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm truncate">{notification.title}</p>
                        {notification.status && (
                          <Badge variant="secondary" className="text-xs shrink-0 capitalize">
                            {notification.status.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {notification.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(notification.time)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Check back later for updates
              </p>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );

  const UserDropdown = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-auto px-1.5 space-x-1.5">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-xs font-medium">
              {getInitials(profile.first_name, profile.last_name)}
            </AvatarFallback>
          </Avatar>
          <div className="text-left hidden lg:block">
            <p className="text-xs font-medium">
              {profile.first_name && profile.last_name 
                ? `${profile.first_name} ${profile.last_name}`
                : profile.email
              }
            </p>
            <Badge 
              variant="secondary" 
              className={`text-[10px] text-white ${roleColors[profile.role as keyof typeof roleColors] || roleColors.visitor}`}
            >
              {getRoleLabel(profile.role)}
            </Badge>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel>
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {profile.first_name && profile.last_name 
                ? `${profile.first_name} ${profile.last_name}`
                : "User Account"
              }
            </p>
            <p className="text-xs text-muted-foreground">{profile.email}</p>
            <Badge 
              variant="secondary" 
              className={`text-xs text-white ${roleColors[profile.role as keyof typeof roleColors] || roleColors.visitor}`}
            >
              {getRoleLabel(profile.role)}
            </Badge>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-glass border-b border-border/50 shadow-glass">
      <div className="container mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center">
          <img src={rcmrdLogo} alt="RCMRD Logo" className="h-7 md:h-8 w-auto hover:opacity-90 transition-opacity" />
        </div>

        {/* Desktop: User Info & Actions */}
        <div className="hidden md:flex items-center space-x-2 lg:space-x-4">
          <NotificationsPopover />
          <UserDropdown />
        </div>

        {/* Mobile: Hamburger Menu */}
        <div className="md:hidden">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Menu className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <div className="flex flex-col space-y-6 mt-6">
                {/* User Info */}
                <div className="flex items-center space-x-3 pb-4 border-b">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="text-lg font-medium">
                      {getInitials(profile.first_name, profile.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {profile.first_name && profile.last_name 
                        ? `${profile.first_name} ${profile.last_name}`
                        : profile.email
                      }
                    </p>
                    <p className="text-xs text-muted-foreground">{profile.email}</p>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs text-white mt-1 ${roleColors[profile.role as keyof typeof roleColors] || roleColors.visitor}`}
                    >
                      {getRoleLabel(profile.role)}
                    </Badge>
                  </div>
                </div>

                {/* Notifications Summary */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Notifications</h3>
                  {totalNotifications > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {totalNotifications} notification{totalNotifications > 1 ? 's' : ''}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">All caught up!</p>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Button>
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-destructive" 
                    size="sm"
                    onClick={onSignOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default DashboardNav;