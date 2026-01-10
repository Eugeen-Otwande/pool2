import { ReactNode, useState } from "react";
import { 
  Users, 
  CalendarDays, 
  CreditCard, 
  Package, 
  FileText, 
  ClipboardList, 
  Settings,
  HelpCircle,
  LogOut,
  ChevronRight,
  AlertTriangle,
  Shield
} from "lucide-react";
import { MobileSheet } from "./MobileSheet";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface MenuItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  variant?: "default" | "danger";
}

interface MenuSection {
  title?: string;
  items: MenuItem[];
}

interface MobileMoreMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemClick: (itemId: string) => void;
  role?: string;
  pendingApprovals?: number;
  onSignOut?: () => void;
}

const MobileMoreMenu = ({
  open,
  onOpenChange,
  onItemClick,
  role = "member",
  pendingApprovals = 0,
  onSignOut,
}: MobileMoreMenuProps) => {
  const isAdminOrStaff = role === "admin" || role === "staff" || role === "system_admin" || role === "pool_admin";

  const getMenuSections = (): MenuSection[] => {
    if (isAdminOrStaff) {
      return [
        {
          title: "Management",
          items: [
            { id: "visitors", label: "Visitors", description: "Manage visitor bookings", icon: Users },
            { id: "residents", label: "Residents", description: "View residence members", icon: Users },
            { id: "schedules", label: "Schedules", description: "Pool timetable", icon: CalendarDays },
            { id: "equipment", label: "Equipment", description: "Manage equipment loans", icon: Package },
          ],
        },
        {
          title: "Administration",
          items: [
            { id: "approvals", label: "Pending Approvals", description: "User registrations", icon: Shield, badge: pendingApprovals > 0 ? pendingApprovals : undefined },
            { id: "payments", label: "Payments", description: "View payment records", icon: CreditCard },
            { id: "reports", label: "Reports", description: "Generate reports", icon: FileText },
            { id: "pool_logs", label: "Pool Logs", description: "Daily pool records", icon: ClipboardList },
          ],
        },
        {
          title: "Other",
          items: [
            { id: "inquiries", label: "Inquiries", description: "Customer inquiries", icon: HelpCircle },
            { id: "settings", label: "Settings", description: "App settings", icon: Settings },
            { id: "signout", label: "Sign Out", description: "Log out of your account", icon: LogOut, variant: "danger" as const },
          ],
        },
      ];
    }

    // Default menu for regular users
    return [
      {
        title: "Pool",
        items: [
          { id: "timetable", label: "Pool Schedule", description: "View timetable", icon: CalendarDays },
          { id: "equipment", label: "My Equipment", description: "Borrowed items", icon: Package },
        ],
      },
      {
        title: "Account",
        items: [
          { id: "profile", label: "My Profile", description: "Edit your details", icon: Settings },
          { id: "signout", label: "Sign Out", description: "Log out of your account", icon: LogOut, variant: "danger" as const },
        ],
      },
    ];
  };

  const handleItemClick = (item: MenuItem) => {
    if (item.id === "signout") {
      onSignOut?.();
    } else {
      onItemClick(item.id);
    }
    onOpenChange(false);
  };

  const sections = getMenuSections();

  return (
    <MobileSheet
      open={open}
      onOpenChange={onOpenChange}
      title="More Options"
    >
      <div className="space-y-6">
        {sections.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            {section.title && (
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                {section.title}
              </h4>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl transition-colors",
                      "active:scale-[0.98] touch-manipulation",
                      item.variant === "danger"
                        ? "hover:bg-destructive/10 text-destructive"
                        : "hover:bg-accent"
                    )}
                  >
                    <div
                      className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0",
                        item.variant === "danger"
                          ? "bg-destructive/10"
                          : "bg-primary/10"
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-5 h-5",
                          item.variant === "danger" ? "text-destructive" : "text-primary"
                        )}
                      />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium text-sm">{item.label}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {item.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {item.badge !== undefined && (
                        <Badge variant="destructive" className="text-xs">
                          {item.badge}
                        </Badge>
                      )}
                      {item.variant !== "danger" && (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </MobileSheet>
  );
};

export default MobileMoreMenu;
