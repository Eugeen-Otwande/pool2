import { Bell, ChevronLeft, Settings, LogOut, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import rcmrdLogo from "@/assets/rcmrd-logo.png";

interface MobileAppHeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  profile?: {
    first_name?: string | null;
    last_name?: string | null;
    role?: string;
    email?: string;
  };
  onSignOut?: () => void;
  notificationCount?: number;
  onNotificationClick?: () => void;
  showLogo?: boolean;
}

const MobileAppHeader = ({
  title,
  showBack,
  onBack,
  profile,
  onSignOut,
  notificationCount = 0,
  onNotificationClick,
  showLogo = false,
}: MobileAppHeaderProps) => {
  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    return `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase() || "U";
  };

  const getRoleLabel = (role?: string) => {
    if (!role) return "";
    return role.split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  };

  const roleColors: Record<string, string> = {
    admin: "bg-gradient-to-r from-red-500 to-pink-500",
    staff: "bg-gradient-to-r from-cyan-500 to-blue-500",
    student: "bg-gradient-to-r from-emerald-500 to-teal-500",
    member: "bg-gradient-to-r from-indigo-500 to-purple-500",
    resident: "bg-gradient-to-r from-orange-500 to-amber-500",
    visitor: "bg-gradient-to-r from-gray-500 to-slate-500",
  };

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border/50 safe-area-inset-top">
      <div
        className="flex items-center justify-between h-14 px-4"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        {/* Left Section */}
        <div className="flex items-center gap-3">
          {showBack ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="h-9 w-9 rounded-full"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          ) : showLogo ? (
            <img src={rcmrdLogo} alt="RCMRD" className="h-8 w-auto" />
          ) : null}
          
          {title && (
            <h1 className="text-lg font-semibold truncate max-w-[180px]">{title}</h1>
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onNotificationClick}
            className="relative h-9 w-9 rounded-full"
          >
            <Bell className="w-5 h-5" />
            {notificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-pulse">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            )}
          </Button>

          {/* Profile Menu */}
          {profile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback
                      className={cn(
                        "text-white text-sm font-medium",
                        roleColors[profile.role || ""] || "bg-primary"
                      )}
                    >
                      {getInitials(profile.first_name, profile.last_name)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">
                      {profile.first_name} {profile.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {profile.email}
                    </p>
                    <Badge variant="secondary" className="w-fit mt-1 text-xs">
                      {getRoleLabel(profile.role)}
                    </Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2">
                  <User className="w-4 h-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2">
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gap-2 text-destructive focus:text-destructive"
                  onClick={onSignOut}
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
};

export default MobileAppHeader;
