import { useState, useEffect } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { 
  Bell, 
  MessageSquare, 
  UserCheck, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  X,
  ChevronRight,
  Loader2,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { MobileSheet } from "./MobileSheet";

interface NotificationItem {
  id: string;
  type: "message" | "checkin" | "approval" | "activity";
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  icon: React.ReactNode;
  iconBg: string;
  meta?: string;
}

interface MobileNotificationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userRole: string;
  onNavigate?: (tab: string) => void;
}

const MobileNotificationPanel = ({
  open,
  onOpenChange,
  userId,
  userRole,
  onNavigate,
}: MobileNotificationPanelProps) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isAdminOrStaff = ['admin', 'staff', 'system_admin', 'pool_admin'].includes(userRole);

  const fetchNotifications = async () => {
    try {
      const items: NotificationItem[] = [];

      // Fetch unread messages
      const { data: messages } = await supabase
        .from("messages")
        .select("id, title, content, created_at, read_at, sender_id")
        .or(`recipient_id.eq.${userId},recipient_role.eq.${userRole}`)
        .order("created_at", { ascending: false })
        .limit(10);

      if (messages) {
        for (const msg of messages) {
          // Fetch sender info
          const { data: sender } = await supabase
            .from("profiles")
            .select("first_name, last_name, role")
            .eq("user_id", msg.sender_id)
            .maybeSingle();

          items.push({
            id: `msg-${msg.id}`,
            type: "message",
            title: msg.title,
            description: msg.content.substring(0, 80) + (msg.content.length > 80 ? "..." : ""),
            timestamp: msg.created_at,
            read: !!msg.read_at,
            icon: <MessageSquare className="w-4 h-4" />,
            iconBg: "bg-blue-500",
            meta: sender ? `${sender.first_name || ""} ${sender.last_name || ""}`.trim() : "Unknown",
          });
        }
      }

      // Fetch recent check-ins (for admin/staff)
      if (isAdminOrStaff) {
        const { data: checkIns } = await supabase
          .from("v_recent_activities")
          .select("*")
          .order("check_in_time", { ascending: false })
          .limit(10);

        if (checkIns) {
          for (const ci of checkIns) {
            items.push({
              id: `ci-${ci.id}`,
              type: "checkin",
              title: `${ci.first_name || ""} ${ci.last_name || ""}`.trim() || "User",
              description: ci.check_out_time 
                ? `Checked out` 
                : `Checked in`,
              timestamp: ci.check_out_time || ci.check_in_time || ci.created_at || "",
              read: !!ci.check_out_time,
              icon: ci.check_out_time 
                ? <CheckCircle className="w-4 h-4" /> 
                : <Clock className="w-4 h-4" />,
              iconBg: ci.check_out_time ? "bg-green-500" : "bg-amber-500",
              meta: ci.role ? ci.role.charAt(0).toUpperCase() + ci.role.slice(1) : undefined,
            });
          }
        }

        // Fetch pending approvals
        const { data: approvals } = await supabase
          .from("user_approvals")
          .select("id, user_id, status, requested_at")
          .eq("status", "pending")
          .order("requested_at", { ascending: false })
          .limit(5);

        if (approvals) {
          for (const approval of approvals) {
            const { data: userProfile } = await supabase
              .from("profiles")
              .select("first_name, last_name, email, role")
              .eq("user_id", approval.user_id)
              .maybeSingle();

            items.push({
              id: `apr-${approval.id}`,
              type: "approval",
              title: "Pending Approval",
              description: userProfile 
                ? `${userProfile.first_name || ""} ${userProfile.last_name || ""}`.trim() || userProfile.email
                : "New user registration",
              timestamp: approval.requested_at,
              read: false,
              icon: <UserCheck className="w-4 h-4" />,
              iconBg: "bg-purple-500",
              meta: userProfile?.role ? userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1) : undefined,
            });
          }
        }
      }

      // Sort by timestamp, newest first
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setNotifications(items);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetchNotifications();

      // Set up real-time subscription
      const channel = supabase
        .channel('mobile-notifications')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchNotifications)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'check_ins' }, fetchNotifications)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_approvals' }, fetchNotifications)
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [open, userId, userRole]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleItemClick = (item: NotificationItem) => {
    onOpenChange(false);
    if (onNavigate) {
      switch (item.type) {
        case "message":
          onNavigate("messaging");
          break;
        case "checkin":
          onNavigate("checkins");
          break;
        case "approval":
          onNavigate("approvals");
          break;
        default:
          onNavigate("overview");
      }
    }
  };

  const getTimeAgo = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return "";
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <MobileSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Notifications"
      description={unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
    >
      <div className="flex flex-col h-full">
        {/* Header Actions */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Badge variant={unreadCount > 0 ? "destructive" : "secondary"} className="text-xs">
              {unreadCount} new
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-8 px-2"
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
          </Button>
        </div>

        {/* Notifications List */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">No notifications</p>
              <p className="text-sm text-muted-foreground/70">You're all caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {notifications.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={cn(
                    "w-full flex items-start gap-3 p-4 text-left transition-colors",
                    "hover:bg-accent/50 active:bg-accent",
                    !item.read && "bg-primary/5"
                  )}
                >
                  {/* Icon */}
                  <div className={cn(
                    "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white",
                    item.iconBg
                  )}>
                    {item.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm truncate",
                          !item.read ? "font-semibold" : "font-medium"
                        )}>
                          {item.title}
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                          {item.description}
                        </p>
                      </div>
                      {!item.read && (
                        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1.5">
                      {item.meta && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {item.meta}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {getTimeAgo(item.timestamp)}
                      </span>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-3" />
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Quick Actions */}
        {notifications.length > 0 && (
          <div className="p-4 border-t border-border/50 space-y-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                onOpenChange(false);
                onNavigate?.("messaging");
              }}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              View All Messages
            </Button>
          </div>
        )}
      </div>
    </MobileSheet>
  );
};

export default MobileNotificationPanel;