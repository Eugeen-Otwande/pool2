import { useState } from "react";
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
import { Waves, LogOut, Settings, User, Bell } from "lucide-react";
import { User as SupabaseUser } from "@supabase/supabase-js";

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
  const [notifications] = useState(3); // Mock notifications count

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    return `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase() || "U";
  };

  const getRoleLabel = (role: string) => {
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-glass border-b border-border/50 shadow-glass">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo & Title */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
            <Waves className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Pool Management</h1>
            <p className="text-xs text-muted-foreground">RCMRD Aquatic Center</p>
          </div>
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="w-5 h-5" />
            {notifications > 0 && (
              <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 text-xs">
                {notifications}
              </Badge>
            )}
          </Button>

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-auto px-2 space-x-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-sm font-medium">
                    {getInitials(profile.first_name, profile.last_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left hidden md:block">
                  <p className="text-sm font-medium">
                    {profile.first_name && profile.last_name 
                      ? `${profile.first_name} ${profile.last_name}`
                      : profile.email
                    }
                  </p>
                  <Badge 
                    variant="secondary" 
                    className={`text-xs text-white ${roleColors[profile.role as keyof typeof roleColors] || roleColors.visitor}`}
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
        </div>
      </div>
    </nav>
  );
};

export default DashboardNav;