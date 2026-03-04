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
import { 
  LogOut, 
  Settings, 
  User, 
  Bell, 
  Activity, 
  MessageSquare, 
  Clock, 
  AlertCircle, 
  Menu, 
  UserCheck, 
  Users, 
  Dumbbell, 
  HelpCircle,
  CreditCard,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { User as SupabaseUser } from "@supabase/supabase-js";
import rcmrdLogo from "@/assets/rcmrd-logo.png";
import GlobalSearch from "./GlobalSearch";

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
  onNavigateToTab?: (tab: string) => void;
}

interface NotificationItem {
  id: string;
  type: 'message' | 'approval' | 'checkin' | 'visitor' | 'equipment' | 'inquiry';
  title: string;
  description: string;
  time: string;
  status?: string;
  priority?: 'high' | 'medium' | 'low';
  targetTab?: string;
  metadata?: Record<string, any>;
}

const roleColors: Record<string, string> = {
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

const DashboardNav = ({ user, profile, onSignOut, onNavigateToTab }: DashboardNavProps) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdminOrStaff = profile.role === 'admin' || profile.role === 'staff';

  useEffect(() => {
    fetchNotifications();
    
    // Set up unified real-time channel for all notification sources
    const notificationsChannel = supabase
      .channel('dashboard-notifications-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          console.log('📩 Message update:', payload.eventType);
          fetchNotifications();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'check_ins' },
        (payload) => {
          console.log('✅ Check-in update:', payload.eventType);
          fetchNotifications();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_approvals' },
        (payload) => {
          console.log('👤 Approval update:', payload.eventType);
          fetchNotifications();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'visitors' },
        (payload) => {
          console.log('🎫 Visitor update:', payload.eventType);
          fetchNotifications();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'equipment_loans' },
        (payload) => {
          console.log('🏋️ Equipment loan update:', payload.eventType);
          fetchNotifications();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inquiries' },
        (payload) => {
          console.log('📧 Inquiry update:', payload.eventType);
          fetchNotifications();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        (payload) => {
          console.log('📋 Booking update:', payload.eventType);
          fetchNotifications();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pool_logs' },
        (payload) => {
          console.log('🏊 Pool log update:', payload.eventType);
          fetchNotifications();
        }
      )
      .subscribe((status) => {
        console.log('Notifications channel status:', status);
      });

    // Refresh every 30 seconds for any missed updates
    const refreshInterval = setInterval(() => {
      fetchNotifications();
    }, 30000);

    return () => {
      supabase.removeChannel(notificationsChannel);
      clearInterval(refreshInterval);
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
          // Try to get sender info
          let senderName = "Unknown";
          if (msg.sender_id) {
            const { data: sender } = await supabase
              .from("profiles")
              .select("first_name, last_name")
              .eq("user_id", msg.sender_id)
              .maybeSingle();
            if (sender) {
              senderName = `${sender.first_name || ''} ${sender.last_name || ''}`.trim() || 'Unknown';
            }
          }
          
          allNotifications.push({
            id: msg.id,
            type: 'message',
            title: msg.title,
            description: `From: ${senderName} - ${msg.content?.substring(0, 60) || ''}${msg.content && msg.content.length > 60 ? '...' : ''}`,
            time: msg.created_at,
            status: msg.message_type,
            priority: 'medium',
            targetTab: 'messaging'
          });
        }
      }

      // Fetch user's own recent check-ins
      const { data: myCheckins } = await supabase
        .from("check_ins")
        .select("id, status, check_in_time, check_out_time, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3);

      if (myCheckins) {
        for (const checkin of myCheckins) {
          const statusDesc = checkin.status === 'checked_in' 
            ? `Active since ${new Date(checkin.check_in_time).toLocaleTimeString()}`
            : checkin.status === 'checked_out' 
            ? `Completed at ${new Date(checkin.check_out_time || checkin.created_at).toLocaleTimeString()}`
            : checkin.status === 'pending_approval' 
            ? 'Awaiting staff approval' 
            : checkin.status;

          allNotifications.push({
            id: checkin.id,
            type: 'checkin',
            title: 'Pool Session',
            description: statusDesc,
            time: checkin.check_in_time || checkin.created_at,
            status: checkin.status,
            priority: checkin.status === 'checked_in' ? 'high' : 'low',
            targetTab: 'checkins'
          });
        }
      }

      // Admin/Staff specific notifications
      if (isAdminOrStaff) {
        // Pending user approvals - HIGH PRIORITY
        const { data: pendingApprovals, count: approvalCount } = await supabase
          .from("user_approvals")
          .select("id, user_id, created_at, status", { count: 'exact' })
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(5);

        if (pendingApprovals && pendingApprovals.length > 0) {
          // Get user details for approvals
          for (const approval of pendingApprovals) {
            const { data: userProfile } = await supabase
              .from("profiles")
              .select("first_name, last_name, email, role")
              .eq("user_id", approval.user_id)
              .maybeSingle();
            
            const userName = userProfile 
              ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || userProfile.email
              : 'Unknown User';
            const userRole = userProfile?.role || 'unknown';

            allNotifications.push({
              id: approval.id,
              type: 'approval',
              title: '⚠️ Pending User Approval',
              description: `${userName} (${userRole}) - Registered ${formatTimeAgo(approval.created_at)}`,
              time: approval.created_at,
              status: 'pending',
              priority: 'high',
              targetTab: 'approvals',
              metadata: { totalPending: approvalCount }
            });
          }
        }

        // Today's visitors with payment/check-in details
        const today = new Date().toISOString().split('T')[0];
        const { data: todayVisitors } = await supabase
          .from("visitors")
          .select("id, first_name, last_name, check_in_status, payment_status, num_guests, time_of_visit, created_at")
          .eq("date_of_visit", today)
          .order("created_at", { ascending: false })
          .limit(5);

        if (todayVisitors) {
          for (const visitor of todayVisitors) {
            const amount = visitor.num_guests * 400;
            const paymentInfo = visitor.payment_status === 'Paid' ? '✓ Paid' : `KES ${amount} Pending`;
            
            allNotifications.push({
              id: visitor.id,
              type: 'visitor',
              title: `${visitor.first_name} ${visitor.last_name}`,
              description: `${visitor.num_guests} guest(s) • ${visitor.check_in_status} • ${paymentInfo}`,
              time: visitor.created_at,
              status: visitor.check_in_status,
              priority: visitor.payment_status !== 'Paid' ? 'medium' : 'low',
              targetTab: 'visitors',
              metadata: { paymentStatus: visitor.payment_status, guests: visitor.num_guests }
            });
          }
        }

        // Recent bookings (pending payment)
        const { data: recentBookings } = await supabase
          .from("bookings")
          .select("id, first_name, last_name, reference_code, num_guests, amount, status, payment_status, booking_date, time_slot, created_at")
          .eq("status", "pending_payment")
          .order("created_at", { ascending: false })
          .limit(5);

        if (recentBookings) {
          for (const booking of recentBookings) {
            allNotifications.push({
              id: booking.id,
              type: 'visitor',
              title: `📋 Booking: ${booking.first_name} ${booking.last_name}`,
              description: `Ref: ${booking.reference_code} • ${booking.num_guests} guest(s) • KES ${booking.amount} pending`,
              time: booking.created_at,
              status: 'pending_payment',
              priority: 'medium',
              targetTab: 'visitors',
              metadata: { paymentStatus: booking.payment_status, guests: booking.num_guests }
            });
          }
        }

        // Overdue equipment - HIGH PRIORITY
        const { data: overdueLoans } = await supabase
          .from("equipment_loans")
          .select(`
            id, 
            due_back_at, 
            user_id,
            equipment_id,
            quantity_borrowed,
            loaned_at
          `)
          .eq("status", "active")
          .lt("due_back_at", new Date().toISOString())
          .limit(5);

        if (overdueLoans) {
          for (const loan of overdueLoans) {
            // Get equipment and user details
            const [{ data: equipment }, { data: borrower }] = await Promise.all([
              supabase.from("equipment").select("name, category").eq("id", loan.equipment_id).maybeSingle(),
              supabase.from("profiles").select("first_name, last_name").eq("user_id", loan.user_id).maybeSingle()
            ]);

            const equipmentName = equipment?.name || 'Unknown Item';
            const borrowerName = borrower 
              ? `${borrower.first_name || ''} ${borrower.last_name || ''}`.trim() 
              : 'Unknown';
            const daysOverdue = Math.floor((Date.now() - new Date(loan.due_back_at).getTime()) / (1000 * 60 * 60 * 24));

            allNotifications.push({
              id: loan.id,
              type: 'equipment',
              title: `🚨 Overdue: ${equipmentName}`,
              description: `Borrowed by ${borrowerName} • ${daysOverdue} day(s) overdue • Qty: ${loan.quantity_borrowed}`,
              time: loan.due_back_at,
              status: 'overdue',
              priority: 'high',
              targetTab: 'equipment'
            });
          }
        }

        // New inquiries - MEDIUM PRIORITY
        const { data: newInquiries } = await supabase
          .from("inquiries")
          .select("id, first_name, last_name, subject, email, phone, created_at, status")
          .eq("status", "new")
          .order("created_at", { ascending: false })
          .limit(3);

        if (newInquiries) {
          for (const inquiry of newInquiries) {
            allNotifications.push({
              id: inquiry.id,
              type: 'inquiry',
              title: `📩 ${inquiry.subject}`,
              description: `From: ${inquiry.first_name} ${inquiry.last_name} (${inquiry.email})`,
              time: inquiry.created_at,
              status: 'new',
              priority: 'medium',
              targetTab: 'inquiries'
            });
          }
        }
      }

      // Sort by priority then by time
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      allNotifications.sort((a, b) => {
        const priorityDiff = (priorityOrder[a.priority || 'low']) - (priorityOrder[b.priority || 'low']);
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(b.time).getTime() - new Date(a.time).getTime();
      });
      
      setNotifications(allNotifications.slice(0, 20));
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

  const handleNotificationClick = (notification: NotificationItem) => {
    if (notification.targetTab && onNavigateToTab) {
      onNavigateToTab(notification.targetTab);
      setNotificationsOpen(false);
    }
  };

  const getNotificationIcon = (type: string, status?: string) => {
    switch (type) {
      case 'message': return <MessageSquare className="w-5 h-5 text-blue-500" />;
      case 'approval': return <UserCheck className="w-5 h-5 text-orange-500" />;
      case 'checkin': 
        if (status === 'checked_in') return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
        if (status === 'checked_out') return <XCircle className="w-5 h-5 text-gray-500" />;
        return <Activity className="w-5 h-5 text-blue-500" />;
      case 'visitor': return <Users className="w-5 h-5 text-purple-500" />;
      case 'equipment': return <Dumbbell className="w-5 h-5 text-red-500" />;
      case 'inquiry': return <HelpCircle className="w-5 h-5 text-cyan-500" />;
      default: return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getNotificationStyles = (type: string, priority?: string, status?: string) => {
    if (priority === 'high' || status === 'overdue') {
      return 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/50';
    }
    switch (type) {
      case 'message': return 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50';
      case 'approval': return 'bg-orange-50 dark:bg-orange-950/50 border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/50';
      case 'checkin': return 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50';
      case 'visitor': return 'bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/50';
      case 'equipment': return 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50';
      case 'inquiry': return 'bg-cyan-50 dark:bg-cyan-950/50 border-cyan-200 dark:border-cyan-800 hover:bg-cyan-100 dark:hover:bg-cyan-900/50';
      default: return 'bg-muted/50 border-border hover:bg-muted';
    }
  };

  const getStatusBadge = (status?: string, type?: string) => {
    if (!status) return null;
    
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      'pending': { variant: 'destructive', label: 'Pending' },
      'pending_approval': { variant: 'destructive', label: 'Pending' },
      'checked_in': { variant: 'default', label: 'Active' },
      'checked_out': { variant: 'secondary', label: 'Completed' },
      'overdue': { variant: 'destructive', label: 'Overdue' },
      'new': { variant: 'default', label: 'New' },
      'pending_payment': { variant: 'destructive', label: 'Awaiting Payment' },
      'Not Checked In': { variant: 'outline', label: 'Expected' },
      'Checked In': { variant: 'default', label: 'Present' },
      'Checked Out': { variant: 'secondary', label: 'Left' },
    };

    const config = statusConfig[status] || { variant: 'outline' as const, label: status };
    return (
      <Badge variant={config.variant} className="text-[10px] px-1.5 py-0">
        {config.label}
      </Badge>
    );
  };

  const highPriorityCount = notifications.filter(n => n.priority === 'high').length;
  const totalNotifications = notifications.length;

  const NotificationsPopover = () => (
    <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 group">
          <Bell className="w-5 h-5 transition-transform group-hover:scale-110" />
          {totalNotifications > 0 && (
            <>
              <span className={`absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white transition-all ${
                highPriorityCount > 0 ? 'bg-red-500' : 'bg-primary'
              }`}>
                {totalNotifications > 9 ? '9+' : totalNotifications}
              </span>
              {highPriorityCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 rounded-full bg-red-500 animate-ping opacity-75" />
              )}
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="end">
        {/* Header */}
        <div className="p-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">Notifications</h3>
              <p className="text-sm text-muted-foreground">
                {highPriorityCount > 0 ? (
                  <span className="text-red-500 font-medium">{highPriorityCount} urgent</span>
                ) : totalNotifications > 0 ? (
                  `${totalNotifications} update${totalNotifications > 1 ? 's' : ''}`
                ) : (
                  'All caught up!'
                )}
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => fetchNotifications()}
              disabled={loading}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        
        {/* Notifications List */}
        <ScrollArea className="h-[450px]">
          {loading ? (
            <div className="p-6 text-center">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading notifications...</p>
            </div>
          ) : notifications.length > 0 ? (
            <div className="p-2 space-y-2">
              {notifications.map((notification) => (
                <div 
                  key={`${notification.type}-${notification.id}`}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer group ${getNotificationStyles(notification.type, notification.priority, notification.status)}`}
                >
                  <div className="flex gap-3">
                    {/* Icon */}
                    <div className="shrink-0 mt-0.5">
                      <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center shadow-sm">
                        {getNotificationIcon(notification.type, notification.status)}
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-medium text-sm leading-tight">{notification.title}</p>
                        {getStatusBadge(notification.status, notification.type)}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {notification.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimeAgo(notification.time)}
                        </p>
                        {notification.targetTab && onNavigateToTab && (
                          <span className="text-xs text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            View <ArrowRight className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <p className="font-medium text-foreground">All caught up!</p>
              <p className="text-sm text-muted-foreground mt-1">
                No new notifications at the moment
              </p>
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && isAdminOrStaff && (
          <div className="p-3 border-t bg-muted/30">
            <div className="flex gap-2">
              {onNavigateToTab && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 text-xs"
                    onClick={() => {
                      onNavigateToTab('approvals');
                      setNotificationsOpen(false);
                    }}
                  >
                    <UserCheck className="w-3 h-3 mr-1" />
                    Approvals
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 text-xs"
                    onClick={() => {
                      onNavigateToTab('messaging');
                      setNotificationsOpen(false);
                    }}
                  >
                    <MessageSquare className="w-3 h-3 mr-1" />
                    Messages
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
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
              className={`text-[10px] text-white ${roleColors[profile.role] || roleColors.visitor}`}
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
              className={`text-xs text-white ${roleColors[profile.role] || roleColors.visitor}`}
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

        {/* Desktop: Search, User Info & Actions */}
        <div className="hidden md:flex items-center space-x-2 lg:space-x-4">
          <GlobalSearch 
            userRole={profile.role} 
            onNavigate={(tab) => {
              onNavigateToTab?.(tab);
            }} 
          />
          <NotificationsPopover />
          <UserDropdown />
        </div>

        {/* Mobile: Hamburger Menu */}
        <div className="md:hidden flex items-center gap-2">
          <NotificationsPopover />
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
                      className={`text-xs text-white mt-1 ${roleColors[profile.role] || roleColors.visitor}`}
                    >
                      {getRoleLabel(profile.role)}
                    </Badge>
                  </div>
                </div>

                {/* Notifications Summary */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Notifications</h3>
                  {highPriorityCount > 0 ? (
                    <p className="text-xs text-red-500 font-medium">
                      {highPriorityCount} urgent notification{highPriorityCount > 1 ? 's' : ''}
                    </p>
                  ) : totalNotifications > 0 ? (
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