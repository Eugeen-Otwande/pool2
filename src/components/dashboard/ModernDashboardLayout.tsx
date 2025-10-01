import { useState } from "react";
import { User } from "@supabase/supabase-js";
import { 
  BarChart3, 
  Calendar, 
  Users, 
  Settings, 
  MessageSquare, 
  FileText, 
  Home,
  Building,
  UserPlus,
  CheckCircle,
  Wrench,
  Clock,
  Search,
  Bell,
  Moon,
  Sun
} from "lucide-react";
import rcmrdLogo from "@/assets/rcmrd-logo.png";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  status: string;
  phone: string | null;
  subscription_type: string | null;
  subscription_expires_at: string | null;
  emergency_contact?: string | null;
  emergency_phone?: string | null;
  created_at: string;
  updated_at: string;
}

interface ModernDashboardLayoutProps {
  user: User;
  profile: UserProfile;
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSignOut: () => void;
}

const adminTabs = [
  { id: "overview", label: "Dashboard", icon: BarChart3 },
  { id: "approvals", label: "Approvals", icon: CheckCircle },
  { id: "users", label: "Users", icon: Users },
  { id: "residence", label: "Residence", icon: Building },
  { id: "schedules", label: "Schedules", icon: Calendar },
  { id: "messaging", label: "Messages", icon: MessageSquare },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "equipment", label: "Equipment", icon: Wrench },
  { id: "checkins", label: "Check-ins", icon: Clock },
];

const staffTabs = [
  { id: "overview", label: "Dashboard", icon: BarChart3 },
  { id: "users", label: "Users", icon: Users },
  { id: "residence", label: "Residence", icon: Building },
  { id: "schedules", label: "Schedules", icon: Calendar },
  { id: "messaging", label: "Messages", icon: MessageSquare },
  { id: "equipment", label: "Equipment", icon: Wrench },
  { id: "checkins", label: "Check-ins", icon: Clock },
];

export default function ModernDashboardLayout({
  user,
  profile,
  children,
  activeTab,
  onTabChange,
  onSignOut,
}: ModernDashboardLayoutProps) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [searchQuery, setSearchQuery] = useState("");
  
  const tabs = profile.role === "admin" || profile.role === "system_admin" || profile.role === "pool_admin" 
    ? adminTabs 
    : staffTabs;

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || profile.email[0].toUpperCase();
  };

  const getRoleColor = (role: string) => {
    const colors = {
      admin: "bg-gradient-to-r from-red-500 to-red-600",
      system_admin: "bg-gradient-to-r from-purple-500 to-purple-600", 
      pool_admin: "bg-gradient-to-r from-blue-500 to-blue-600",
      staff: "bg-gradient-to-r from-green-500 to-green-600",
      default: "bg-gradient-to-r from-gray-500 to-gray-600"
    };
    return colors[role as keyof typeof colors] || colors.default;
  };

  const toggleTheme = () => {
    setTheme(prev => prev === "light" ? "dark" : "light");
    document.documentElement.classList.toggle("dark");
  };

  return (
    <SidebarProvider>
      <div className={`min-h-screen w-full ${theme === "dark" ? "dark" : ""}`}>
        <Sidebar variant="inset" className="border-r border-border/40">
          <SidebarHeader className="border-b border-border/40 p-4">
            <div className="flex items-center gap-3">
              <img src={rcmrdLogo} alt="RCMRD Logo" className="h-10 w-auto" />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">RCMRD Pool</span>
                <span className="truncate text-xs text-muted-foreground">Management</span>
              </div>
            </div>
            <div className="mt-3">
              <SidebarInput
                placeholder="Type to search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-background/50"
              />
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Dash menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <SidebarMenuItem key={tab.id}>
                        <SidebarMenuButton
                          onClick={() => onTabChange(tab.id)}
                          isActive={activeTab === tab.id}
                          className="w-full justify-start"
                        >
                          <Icon className="h-4 w-4" />
                          <span>{tab.label}</span>
                          {tab.id === "approvals" && (
                            <Badge variant="secondary" className="ml-auto h-5 w-5 p-0 text-xs">
                              New
                            </Badge>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-auto">
              <SidebarGroupLabel>Category</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton className="text-red-500">
                      <div className="h-2 w-2 rounded-full bg-red-500" />
                      <span>#Sales</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton className="text-green-500">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <span>#Marketing</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-border/40 p-4">
            <div className="flex items-center gap-3">
              <Avatar className={`h-8 w-8 ${getRoleColor(profile.role)}`}>
                <AvatarFallback className="text-white font-medium text-xs">
                  {getInitials(profile.first_name, profile.last_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {profile.first_name && profile.last_name 
                    ? `${profile.first_name} ${profile.last_name}`
                    : profile.email
                  }
                </span>
                <div className="truncate text-xs text-muted-foreground capitalize">
                  {profile.role.replace('_', ' ')}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={toggleTheme}>
                    {theme === "light" ? <Moon className="h-4 w-4 mr-2" /> : <Sun className="h-4 w-4 mr-2" />}
                    {theme === "light" ? "Dark Mode" : "Light Mode"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onSignOut}>
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex flex-1 items-center justify-between">
              <div>
                <h1 className="text-lg font-semibold capitalize">
                  {profile.first_name && profile.last_name 
                    ? `${profile.first_name} ${profile.last_name}`
                    : profile.email.split('@')[0]
                  }
                </h1>
                <p className="text-sm text-muted-foreground">
                  Your last login: 21h ago from newzealand.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8">
                  <Calendar className="h-4 w-4 mr-2" />
                  Last 7 days
                </Button>
                <Button variant="outline" size="sm" className="h-8">
                  <FileText className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 relative">
                  <Bell className="h-4 w-4" />
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs bg-green-500">
                    2
                  </Badge>
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 relative">
                  <Bell className="h-4 w-4" />
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs bg-red-500">
                    2
                  </Badge>
                </Button>
              </div>
            </div>
          </header>
          <main className="flex-1 p-6 space-y-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}