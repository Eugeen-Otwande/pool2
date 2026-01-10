import { useState, useEffect } from "react";
import { Home, CheckCircle, MessageSquare, Calendar, User, LayoutDashboard, Users, Settings, ClipboardList, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  role?: string;
  unreadMessages?: number;
}

const MobileBottomNav = ({ activeTab, onTabChange, role = "member", unreadMessages = 0 }: MobileBottomNavProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Hide on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // Define navigation items based on role
  const getNavItems = (): NavItem[] => {
    const isAdminOrStaff = role === "admin" || role === "staff" || role === "system_admin" || role === "pool_admin";
    
    if (isAdminOrStaff) {
      return [
        { id: "overview", label: "Home", icon: Home },
        { id: "checkins", label: "Check-ins", icon: CheckCircle },
        { id: "users", label: "Users", icon: Users },
        { id: "messaging", label: "Messages", icon: MessageSquare, badge: unreadMessages },
        { id: "more", label: "More", icon: Settings },
      ];
    }

    // Default for students, members, residents
    return [
      { id: "overview", label: "Home", icon: Home },
      { id: "timetable", label: "Schedule", icon: Calendar },
      { id: "messages", label: "Messages", icon: MessageSquare, badge: unreadMessages },
      { id: "activity", label: "Activity", icon: ClipboardList },
      { id: "profile", label: "Profile", icon: User },
    ];
  };

  const navItems = getNavItems();

  return (
    <nav
      className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border/50 transition-transform duration-300 ease-out",
        "safe-area-inset-bottom",
        !isVisible && "translate-y-full"
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-xl transition-all duration-200 relative min-w-[60px]",
                "active:scale-95 touch-manipulation",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <div className="relative">
                <Icon className={cn("w-5 h-5 transition-transform", isActive && "scale-110")} />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-[10px] font-medium transition-all",
                isActive ? "opacity-100" : "opacity-70"
              )}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
