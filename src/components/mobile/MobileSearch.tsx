import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Search, 
  User, 
  MessageSquare, 
  Users, 
  Calendar, 
  Dumbbell,
  Mail,
  Clock,
  Loader2,
  ArrowRight,
  X,
  Home,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { MobileSheet } from "./MobileSheet";

interface SearchResult {
  id: string;
  type: "user" | "message" | "visitor" | "equipment" | "inquiry" | "schedule" | "resident";
  title: string;
  subtitle: string;
  meta?: string;
  status?: string;
  targetTab?: string;
}

type SearchFilter = "all" | "users" | "messages" | "visitors" | "equipment" | "schedules" | "residents";

interface MobileSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRole: string;
  onNavigate?: (tab: string) => void;
}

const MobileSearch = ({ open, onOpenChange, userRole, onNavigate }: MobileSearchProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<SearchFilter>("all");
  const [totalCount, setTotalCount] = useState(0);

  const isAdminOrStaff = ['admin', 'staff', 'system_admin', 'pool_admin'].includes(userRole);

  useEffect(() => {
    const saved = localStorage.getItem('rcmrd-recent-searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved).slice(0, 5));
      } catch {
        // Ignore
      }
    }
  }, []);

  const saveRecentSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('rcmrd-recent-searches', JSON.stringify(updated));
  };

  const performSearch = useCallback(async (searchQuery: string, filter: SearchFilter = "all") => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults([]);
      setTotalCount(0);
      return;
    }

    setLoading(true);
    const allResults: SearchResult[] = [];
    const searchTerm = `%${searchQuery.toLowerCase()}%`;

    try {
      // Search users/profiles (admin/staff only)
      if (isAdminOrStaff && (filter === "all" || filter === "users")) {
        const { data: users } = await supabase
          .from("profiles")
          .select("user_id, first_name, last_name, email, role, status")
          .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm}`)
          .limit(filter === "users" ? 20 : 5);

        if (users) {
          users.forEach(user => {
            allResults.push({
              id: user.user_id,
              type: "user",
              title: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
              subtitle: user.email,
              meta: user.role,
              status: user.status,
              targetTab: "users",
            });
          });
        }
      }

      // Search messages
      if (filter === "all" || filter === "messages") {
        const { data: messages } = await supabase
          .from("messages")
          .select("id, title, content, message_type")
          .or(`title.ilike.${searchTerm},content.ilike.${searchTerm}`)
          .order("created_at", { ascending: false })
          .limit(filter === "messages" ? 20 : 5);

        if (messages) {
          messages.forEach(msg => {
            allResults.push({
              id: msg.id,
              type: "message",
              title: msg.title,
              subtitle: msg.content.substring(0, 50) + "...",
              meta: msg.message_type,
              targetTab: "messages"
            });
          });
        }
      }

      // Search visitors (admin/staff only)
      if (isAdminOrStaff && (filter === "all" || filter === "visitors")) {
        const { data: visitors } = await supabase
          .from("visitors")
          .select("id, first_name, last_name, email, date_of_visit, check_in_status")
          .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm}`)
          .order("created_at", { ascending: false })
          .limit(filter === "visitors" ? 20 : 5);

        if (visitors) {
          visitors.forEach(visitor => {
            allResults.push({
              id: visitor.id,
              type: "visitor",
              title: `${visitor.first_name} ${visitor.last_name}`,
              subtitle: visitor.date_of_visit,
              status: visitor.check_in_status,
              targetTab: "visitors"
            });
          });
        }
      }

      // Search residents (admin/staff only)
      if (isAdminOrStaff && (filter === "all" || filter === "residents")) {
        const { data: residents } = await supabase
          .from("residents")
          .select("id, name, email, phone, hostel_admission, school, status")
          .or(`name.ilike.${searchTerm},email.ilike.${searchTerm},phone.ilike.${searchTerm},hostel_admission.ilike.${searchTerm}`)
          .limit(filter === "residents" ? 20 : 5);

        if (residents) {
          residents.forEach(resident => {
            allResults.push({
              id: resident.id,
              type: "resident",
              title: resident.name,
              subtitle: `${resident.email} ${resident.hostel_admission ? `• ${resident.hostel_admission}` : ''}`,
              meta: resident.school || undefined,
              status: resident.status || undefined,
              targetTab: "residents"
            });
          });
        }
      }

      // Search equipment
      if (filter === "all" || filter === "equipment") {
        const { data: equipment } = await supabase
          .from("equipment")
          .select("id, name, category, status")
          .or(`name.ilike.${searchTerm},category.ilike.${searchTerm}`)
          .limit(filter === "equipment" ? 20 : 5);

        if (equipment) {
          equipment.forEach(item => {
            allResults.push({
              id: item.id,
              type: "equipment",
              title: item.name,
              subtitle: item.category,
              status: item.status,
              targetTab: "equipment"
            });
          });
        }
      }

      // Search schedules
      if (filter === "all" || filter === "schedules") {
        const { data: schedules } = await supabase
          .from("pool_schedules")
          .select("id, title, session_name, start_time, end_time")
          .or(`title.ilike.${searchTerm},session_name.ilike.${searchTerm}`)
          .eq("is_active", true)
          .limit(filter === "schedules" ? 20 : 5);

        if (schedules) {
          schedules.forEach(schedule => {
            allResults.push({
              id: schedule.id,
              type: "schedule",
              title: schedule.title,
              subtitle: `${schedule.start_time} - ${schedule.end_time}`,
              meta: schedule.session_name || undefined,
              targetTab: "schedules"
            });
          });
        }
      }

      setResults(allResults);
      setTotalCount(allResults.length);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  }, [isAdminOrStaff]);

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query, activeFilter);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, activeFilter, performSearch]);

  const handleFilterChange = (filter: SearchFilter) => {
    setActiveFilter(filter);
    if (query.length >= 2) {
      performSearch(query, filter);
    }
  };

  const handleSelect = (result: SearchResult) => {
    saveRecentSearch(query);
    onOpenChange(false);
    setQuery("");
    if (result.targetTab && onNavigate) {
      onNavigate(result.targetTab);
    }
  };

  const getIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      user: <User className="w-4 h-4" />,
      message: <MessageSquare className="w-4 h-4" />,
      visitor: <Users className="w-4 h-4" />,
      equipment: <Dumbbell className="w-4 h-4" />,
      inquiry: <Mail className="w-4 h-4" />,
      schedule: <Calendar className="w-4 h-4" />,
      resident: <Home className="w-4 h-4" />,
    };
    return icons[type] || <Search className="w-4 h-4" />;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      user: "bg-blue-500",
      message: "bg-purple-500",
      visitor: "bg-green-500",
      equipment: "bg-cyan-500",
      inquiry: "bg-pink-500",
      schedule: "bg-indigo-500",
      resident: "bg-orange-500",
    };
    return colors[type] || "bg-gray-500";
  };

  const typeLabels: Record<string, string> = {
    user: "Users",
    message: "Messages",
    visitor: "Visitors",
    equipment: "Equipment",
    inquiry: "Inquiries",
    schedule: "Schedules",
    resident: "Residents",
  };

  const filterOptions: { key: SearchFilter; label: string; icon: React.ReactNode }[] = [
    { key: "all", label: "All", icon: <Search className="w-3 h-3" /> },
    { key: "users", label: "Users", icon: <User className="w-3 h-3" /> },
    { key: "messages", label: "Messages", icon: <MessageSquare className="w-3 h-3" /> },
    { key: "visitors", label: "Visitors", icon: <Users className="w-3 h-3" /> },
    { key: "residents", label: "Residents", icon: <Home className="w-3 h-3" /> },
    { key: "equipment", label: "Equipment", icon: <Dumbbell className="w-3 h-3" /> },
    { key: "schedules", label: "Schedules", icon: <Calendar className="w-3 h-3" /> },
  ];

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) acc[result.type] = [];
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <MobileSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Search"
      description="Find anything across the system"
    >
      <div className="flex flex-col h-full">
        {/* Search Input */}
        <div className="px-4 py-3 border-b border-border/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users, messages, residents..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 pr-10"
              autoFocus
            />
            {query && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => { setQuery(""); setActiveFilter("all"); }}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Filter Buttons */}
        {isAdminOrStaff && query.length >= 2 && (
          <div className="flex items-center gap-1 px-4 py-2 border-b border-border/50 overflow-x-auto">
            <Filter className="h-3 w-3 text-muted-foreground shrink-0 mr-1" />
            {filterOptions.map((filter) => (
              <Button
                key={filter.key}
                variant={activeFilter === filter.key ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs gap-1 shrink-0"
                onClick={() => handleFilterChange(filter.key)}
              >
                {filter.icon}
                {filter.label}
              </Button>
            ))}
          </div>
        )}

        {/* Result Count */}
        {query.length >= 2 && !loading && totalCount > 0 && (
          <div className="px-4 py-1.5 text-xs text-muted-foreground border-b bg-muted/30">
            Found {totalCount} result{totalCount !== 1 ? 's' : ''}
          </div>
        )}

        {/* Results */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : query.length < 2 ? (
            <div className="p-4">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div className="mb-6">
                  <p className="text-xs font-medium text-muted-foreground mb-3">RECENT SEARCHES</p>
                  <div className="space-y-1">
                    {recentSearches.map((search, idx) => (
                      <button
                        key={idx}
                        onClick={() => setQuery(search)}
                        className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-accent transition-colors text-left"
                      >
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{search}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Links */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-3">QUICK LINKS</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="justify-start h-auto py-3"
                    onClick={() => {
                      onOpenChange(false);
                      onNavigate?.("checkins");
                    }}
                  >
                    <Users className="w-4 h-4 mr-2 text-green-500" />
                    Check-ins
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start h-auto py-3"
                    onClick={() => {
                      onOpenChange(false);
                      onNavigate?.("messages");
                    }}
                  >
                    <MessageSquare className="w-4 h-4 mr-2 text-purple-500" />
                    Messages
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start h-auto py-3"
                    onClick={() => {
                      onOpenChange(false);
                      onNavigate?.("equipment");
                    }}
                  >
                    <Dumbbell className="w-4 h-4 mr-2 text-cyan-500" />
                    Equipment
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start h-auto py-3"
                    onClick={() => {
                      onOpenChange(false);
                      onNavigate?.("schedules");
                    }}
                  >
                    <Calendar className="w-4 h-4 mr-2 text-indigo-500" />
                    Schedules
                  </Button>
                </div>
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Search className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="text-sm font-medium">No results found</p>
              <p className="text-xs text-muted-foreground">Try different keywords</p>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {Object.entries(groupedResults).map(([type, items]) => (
                <div key={type}>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    {typeLabels[type]?.toUpperCase() || type.toUpperCase()}
                  </p>
                  <div className="space-y-1">
                    {items.map((result) => (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={() => handleSelect(result)}
                        className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-accent transition-colors text-left"
                      >
                        <div className={cn(
                          "flex items-center justify-center w-9 h-9 rounded-lg text-white",
                          getTypeColor(result.type)
                        )}>
                          {getIcon(result.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{result.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                        </div>
                        {result.meta && (
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {result.meta}
                          </Badge>
                        )}
                        <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </MobileSheet>
  );
};

export default MobileSearch;