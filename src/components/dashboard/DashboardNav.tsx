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
import { Waves, LogOut, Settings, User, Bell, Activity, MessageSquare, Clock, AlertCircle, Menu, X } from "lucide-react";
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

const roleColors = {
  system_admin: "bg-gradient-to-r from-red-500 to-pink-500",
  pool_admin: "bg-gradient-to-r from-blue-600 to-purple-600", 
  staff: "bg-gradient-to-r from-cyan-500 to-blue-500",
  student: "bg-gradient-to-r from-emerald-500 to-teal-500",
  member: "bg-gradient-to-r from-indigo-500 to-purple-500",
  resident: "bg-gradient-to-r from-orange-500 to-amber-500",
  visitor: "bg-gradient-to-r from-gray-500 to-slate-500",
};

const DashboardNav = ({ user, profile, onSignOut }: DashboardNavProps) => {
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [unreadMessages, setUnreadMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchNotifications();
    
    // Set up real-time subscriptions
    const messagesChannel = supabase
      .channel('user-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`
        },
        () => fetchNotifications()
      )
      .subscribe();

    const checkInsChannel = supabase
      .channel('user-checkins')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'check_ins',
          filter: `user_id=eq.${user.id}`
        },
        () => fetchNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(checkInsChannel);
    };
  }, [user.id]);

  const fetchNotifications = async () => {
    setLoading(true);
    
    try {
      // Fetch recent activities
      const { data: activities } = await supabase
        .from("check_ins")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      
      setRecentActivities(activities || []);

      // Fetch unread messages
      const { data: messages } = await supabase
        .from("messages")
        .select("*")
        .or(`recipient_id.eq.${user.id},recipient_role.eq.${profile.role}`)
        .is("read_at", null)
        .order("created_at", { ascending: false })
        .limit(5);
      
      setUnreadMessages(messages || []);
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

  const totalNotifications = unreadMessages.length;

  const NotificationsPopover = () => (
    <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="w-4 h-4" />
          {totalNotifications > 0 && (
            <Badge className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center p-0 text-[10px]">
              {totalNotifications}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-lg">Notifications</h3>
          <p className="text-sm text-muted-foreground">
            {totalNotifications > 0 
              ? `You have ${totalNotifications} unread message${totalNotifications > 1 ? 's' : ''}`
              : 'All caught up!'
            }
          </p>
        </div>
        
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading...
            </div>
          ) : (
            <div className="space-y-2">
              {/* Unread Messages */}
              {unreadMessages.length > 0 && (
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-4 h-4 text-blue-500" />
                    <h4 className="font-medium text-sm">Unread Messages</h4>
                  </div>
                  <div className="space-y-2">
                    {unreadMessages.map((message) => (
                      <div 
                        key={message.id}
                        className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{message.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                              {message.content}
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {message.message_type}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimeAgo(message.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {unreadMessages.length > 0 && recentActivities.length > 0 && (
                <Separator />
              )}

              {/* Recent Activities */}
              {recentActivities.length > 0 && (
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-4 h-4 text-emerald-500" />
                    <h4 className="font-medium text-sm">Recent Activities</h4>
                  </div>
                  <div className="space-y-2">
                    {recentActivities.map((activity) => (
                      <div 
                        key={activity.id}
                        className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              activity.status === 'checked_out' 
                                ? 'bg-green-500' 
                                : activity.status === 'checked_in'
                                ? 'bg-blue-500'
                                : 'bg-gray-500'
                            }`}></div>
                            <div>
                              <p className="text-sm font-medium">Pool Session</p>
                              <p className="text-xs text-muted-foreground">
                                {activity.status === 'checked_in' 
                                  ? 'Currently checked in' 
                                  : activity.status === 'checked_out'
                                  ? 'Session completed'
                                  : activity.status}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {formatTimeAgo(activity.check_in_time)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {unreadMessages.length === 0 && recentActivities.length === 0 && (
                <div className="p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-sm text-muted-foreground">No notifications yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Check back later for updates
                  </p>
                </div>
              )}
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
                      {totalNotifications} unread message{totalNotifications > 1 ? 's' : ''}
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