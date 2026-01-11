import { ReactNode, useState } from "react";
import { User } from "@supabase/supabase-js";
import MobileBottomNav from "./MobileBottomNav";
import MobileAppHeader from "./MobileAppHeader";
import MobileMoreMenu from "./MobileMoreMenu";
import MobileNotificationPanel from "./MobileNotificationPanel";
import MobileSearch from "./MobileSearch";
import { useIsMobile } from "@/hooks/use-mobile";

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  status: string;
}

interface MobileDashboardWrapperProps {
  user: User;
  profile: UserProfile;
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSignOut: () => void;
  title?: string;
  unreadMessages?: number;
  notificationCount?: number;
  pendingApprovals?: number;
}

const MobileDashboardWrapper = ({
  user,
  profile,
  children,
  activeTab,
  onTabChange,
  onSignOut,
  title,
  unreadMessages = 0,
  notificationCount = 0,
  pendingApprovals = 0,
}: MobileDashboardWrapperProps) => {
  const isMobile = useIsMobile();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const getPageTitle = () => {
    if (title) return title;
    
    const titles: Record<string, string> = {
      overview: "Dashboard",
      checkins: "Check-ins",
      users: "Users",
      messaging: "Messages",
      messages: "Messages",
      visitors: "Visitors",
      residents: "Residents",
      schedules: "Schedules",
      timetable: "Timetable",
      equipment: "Equipment",
      approvals: "Approvals",
      payments: "Payments",
      reports: "Reports",
      pool_logs: "Pool Logs",
      inquiries: "Inquiries",
      activity: "Activity",
      profile: "Profile",
      settings: "Settings",
    };
    
    return titles[activeTab] || "Dashboard";
  };

  const handleTabChange = (tab: string) => {
    if (tab === "more") {
      setMoreMenuOpen(true);
    } else {
      onTabChange(tab);
    }
  };

  // Don't render mobile wrapper on desktop
  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Mobile Header */}
      <MobileAppHeader
        title={getPageTitle()}
        showLogo={activeTab === "overview"}
        profile={{
          first_name: profile.first_name,
          last_name: profile.last_name,
          role: profile.role,
          email: profile.email,
        }}
        onSignOut={onSignOut}
        notificationCount={notificationCount}
        onNotificationClick={() => setNotificationsOpen(true)}
        onSearchClick={() => setSearchOpen(true)}
      />

      {/* Mobile Search */}
      <MobileSearch
        open={searchOpen}
        onOpenChange={setSearchOpen}
        userRole={profile.role}
        onNavigate={(tab) => {
          setSearchOpen(false);
          onTabChange(tab);
        }}
      />

      {/* Main Content with padding for header and bottom nav */}
      <main className="flex-1 pt-14 pb-20 overflow-y-auto">
        {children}
      </main>

      {/* Bottom Navigation */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        role={profile.role}
        unreadMessages={unreadMessages}
      />

      {/* More Menu Sheet */}
      <MobileMoreMenu
        open={moreMenuOpen}
        onOpenChange={setMoreMenuOpen}
        onItemClick={onTabChange}
        role={profile.role}
        pendingApprovals={pendingApprovals}
        onSignOut={onSignOut}
      />

      {/* Notifications Panel */}
      <MobileNotificationPanel
        open={notificationsOpen}
        onOpenChange={setNotificationsOpen}
        userId={user.id}
        userRole={profile.role}
        onNavigate={(tab) => {
          setNotificationsOpen(false);
          onTabChange(tab);
        }}
      />
    </div>
  );
};

export default MobileDashboardWrapper;
