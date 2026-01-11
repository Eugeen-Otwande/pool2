import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  User, 
  MessageSquare, 
  Users, 
  Calendar, 
  Dumbbell,
  ClipboardList,
  Clock,
  Mail,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowRight,
  Command as CommandIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  type: "user" | "message" | "visitor" | "checkin" | "equipment" | "inquiry" | "schedule";
  title: string;
  subtitle: string;
  meta?: string;
  status?: string;
  icon: React.ReactNode;
  targetTab?: string;
  data?: Record<string, unknown>;
}

interface GlobalSearchProps {
  userRole: string;
  onNavigate?: (tab: string) => void;
  className?: string;
}

const GlobalSearch = ({ userRole, onNavigate, className }: GlobalSearchProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const debounceRef = useRef<NodeJS.Timeout>();

  const isAdminOrStaff = ['admin', 'staff', 'system_admin', 'pool_admin'].includes(userRole);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('rcmrd-recent-searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved).slice(0, 5));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Keyboard shortcut to open search
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const saveRecentSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('rcmrd-recent-searches', JSON.stringify(updated));
  };

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    const allResults: SearchResult[] = [];
    const searchTerm = `%${searchQuery.toLowerCase()}%`;

    try {
      // Search users/profiles (admin/staff only)
      if (isAdminOrStaff) {
        const { data: users } = await supabase
          .from("profiles")
          .select("user_id, first_name, last_name, email, role, status")
          .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm}`)
          .limit(5);

        if (users) {
          users.forEach(user => {
            allResults.push({
              id: user.user_id,
              type: "user",
              title: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
              subtitle: user.email,
              meta: user.role,
              status: user.status,
              icon: <User className="w-4 h-4" />,
              targetTab: "users",
              data: user
            });
          });
        }
      }

      // Search messages
      const { data: messages } = await supabase
        .from("messages")
        .select("id, title, content, created_at, message_type")
        .or(`title.ilike.${searchTerm},content.ilike.${searchTerm}`)
        .order("created_at", { ascending: false })
        .limit(5);

      if (messages) {
        messages.forEach(msg => {
          allResults.push({
            id: msg.id,
            type: "message",
            title: msg.title,
            subtitle: msg.content.substring(0, 60) + (msg.content.length > 60 ? "..." : ""),
            meta: msg.message_type,
            icon: <MessageSquare className="w-4 h-4" />,
            targetTab: "messaging"
          });
        });
      }

      // Search visitors (admin/staff only)
      if (isAdminOrStaff) {
        const { data: visitors } = await supabase
          .from("visitors")
          .select("id, first_name, last_name, email, phone, date_of_visit, check_in_status")
          .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm},phone.ilike.${searchTerm}`)
          .order("created_at", { ascending: false })
          .limit(5);

        if (visitors) {
          visitors.forEach(visitor => {
            allResults.push({
              id: visitor.id,
              type: "visitor",
              title: `${visitor.first_name} ${visitor.last_name}`,
              subtitle: `${visitor.email} • ${visitor.date_of_visit}`,
              status: visitor.check_in_status,
              icon: <Users className="w-4 h-4" />,
              targetTab: "visitors"
            });
          });
        }
      }

      // Search equipment
      const { data: equipment } = await supabase
        .from("equipment")
        .select("id, name, category, status, quantity_available, quantity_total")
        .or(`name.ilike.${searchTerm},category.ilike.${searchTerm},barcode.ilike.${searchTerm}`)
        .limit(5);

      if (equipment) {
        equipment.forEach(item => {
          allResults.push({
            id: item.id,
            type: "equipment",
            title: item.name,
            subtitle: `${item.category} • ${item.quantity_available}/${item.quantity_total} available`,
            status: item.status,
            icon: <Dumbbell className="w-4 h-4" />,
            targetTab: "equipment"
          });
        });
      }

      // Search pool schedules
      const { data: schedules } = await supabase
        .from("pool_schedules")
        .select("id, title, session_name, start_time, end_time, allowed_roles")
        .or(`title.ilike.${searchTerm},session_name.ilike.${searchTerm}`)
        .eq("is_active", true)
        .limit(5);

      if (schedules) {
        schedules.forEach(schedule => {
          allResults.push({
            id: schedule.id,
            type: "schedule",
            title: schedule.title,
            subtitle: `${schedule.start_time} - ${schedule.end_time}`,
            meta: schedule.session_name || undefined,
            icon: <Calendar className="w-4 h-4" />,
            targetTab: "schedules"
          });
        });
      }

      // Search inquiries (admin/staff only)
      if (isAdminOrStaff) {
        const { data: inquiries } = await supabase
          .from("inquiries")
          .select("id, first_name, last_name, subject, email, status")
          .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},subject.ilike.${searchTerm},email.ilike.${searchTerm}`)
          .order("created_at", { ascending: false })
          .limit(5);

        if (inquiries) {
          inquiries.forEach(inquiry => {
            allResults.push({
              id: inquiry.id,
              type: "inquiry",
              title: inquiry.subject,
              subtitle: `${inquiry.first_name} ${inquiry.last_name} (${inquiry.email})`,
              status: inquiry.status,
              icon: <Mail className="w-4 h-4" />,
              targetTab: "inquiries"
            });
          });
        }
      }

      setResults(allResults);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  }, [isAdminOrStaff]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, performSearch]);

  const handleSelect = (result: SearchResult) => {
    saveRecentSearch(query);
    setOpen(false);
    setQuery("");
    if (result.targetTab && onNavigate) {
      onNavigate(result.targetTab);
    }
  };

  const handleRecentSearch = (searchTerm: string) => {
    setQuery(searchTerm);
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      approved: "default",
      "Checked In": "default",
      pending: "secondary",
      "Not Checked In": "outline",
      inactive: "destructive",
      rejected: "destructive",
      "Checked Out": "outline",
    };

    return (
      <Badge variant={variants[status] || "outline"} className="text-[10px] ml-auto">
        {status}
      </Badge>
    );
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      user: "bg-blue-500",
      message: "bg-purple-500",
      visitor: "bg-green-500",
      checkin: "bg-amber-500",
      equipment: "bg-cyan-500",
      inquiry: "bg-pink-500",
      schedule: "bg-indigo-500",
    };
    return colors[type] || "bg-gray-500";
  };

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  const typeLabels: Record<string, string> = {
    user: "Users",
    message: "Messages",
    visitor: "Visitors",
    checkin: "Check-ins",
    equipment: "Equipment",
    inquiry: "Inquiries",
    schedule: "Schedules",
  };

  return (
    <>
      {/* Search Trigger Button */}
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className={cn(
          "relative h-9 justify-start text-sm text-muted-foreground bg-muted/50 hover:bg-muted",
          "md:w-64 lg:w-80",
          className
        )}
      >
        <Search className="mr-2 h-4 w-4 shrink-0" />
        <span className="hidden md:inline-flex">Search everything...</span>
        <span className="inline-flex md:hidden">Search...</span>
        <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      {/* Search Dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search users, messages, visitors, equipment..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {loading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && query.length < 2 && (
            <>
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <CommandGroup heading="Recent Searches">
                  {recentSearches.map((search, idx) => (
                    <CommandItem
                      key={idx}
                      onSelect={() => handleRecentSearch(search)}
                      className="cursor-pointer"
                    >
                      <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>{search}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Quick Actions */}
              <CommandGroup heading="Quick Actions">
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    onNavigate?.("checkins");
                  }}
                  className="cursor-pointer"
                >
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  <span>View Check-ins</span>
                  <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    onNavigate?.("messaging");
                  }}
                  className="cursor-pointer"
                >
                  <MessageSquare className="mr-2 h-4 w-4 text-purple-500" />
                  <span>View Messages</span>
                  <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
                </CommandItem>
                {isAdminOrStaff && (
                  <>
                    <CommandItem
                      onSelect={() => {
                        setOpen(false);
                        onNavigate?.("visitors");
                      }}
                      className="cursor-pointer"
                    >
                      <Users className="mr-2 h-4 w-4 text-blue-500" />
                      <span>View Visitors</span>
                      <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
                    </CommandItem>
                    <CommandItem
                      onSelect={() => {
                        setOpen(false);
                        onNavigate?.("users");
                      }}
                      className="cursor-pointer"
                    >
                      <User className="mr-2 h-4 w-4 text-cyan-500" />
                      <span>Manage Users</span>
                      <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
                    </CommandItem>
                  </>
                )}
              </CommandGroup>
            </>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <CommandEmpty>
              <div className="flex flex-col items-center py-6">
                <Search className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium">No results found</p>
                <p className="text-xs text-muted-foreground">
                  Try searching with different keywords
                </p>
              </div>
            </CommandEmpty>
          )}

          {!loading && results.length > 0 && (
            <>
              {Object.entries(groupedResults).map(([type, items], groupIdx) => (
                <div key={type}>
                  {groupIdx > 0 && <CommandSeparator />}
                  <CommandGroup heading={typeLabels[type] || type}>
                    {items.map((result) => (
                      <CommandItem
                        key={`${result.type}-${result.id}`}
                        onSelect={() => handleSelect(result)}
                        className="cursor-pointer"
                      >
                        <div className={cn(
                          "flex items-center justify-center w-8 h-8 rounded-lg mr-3",
                          getTypeColor(result.type),
                          "text-white"
                        )}>
                          {result.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{result.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                        </div>
                        {result.meta && (
                          <Badge variant="outline" className="text-[10px] mx-2">
                            {result.meta}
                          </Badge>
                        )}
                        {getStatusBadge(result.status)}
                        <ArrowRight className="ml-2 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </div>
              ))}
            </>
          )}
        </CommandList>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">↑↓</kbd>
            <span>Navigate</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">↵</kbd>
            <span>Select</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">esc</kbd>
            <span>Close</span>
          </div>
        </div>
      </CommandDialog>
    </>
  );
};

export default GlobalSearch;