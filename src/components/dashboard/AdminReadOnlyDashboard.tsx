import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  Calendar, 
  Package, 
  Eye,
  Trash2,
  Search,
  ShieldAlert,
  UserCheck,
  Home,
  ClipboardCheck,
  CreditCard,
  Waves,
  MessageSquare,
  Mail,
  FileText,
  Download,
  User
} from "lucide-react";
import ProfileTab from "./ProfileTab";
import { User } from "@supabase/supabase-js";
import { format } from "date-fns";

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  status: string;
  phone: string | null;
  created_at: string;
}

interface AdminReadOnlyDashboardProps {
  user: User;
  profile: UserProfile;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const AdminReadOnlyDashboard = ({ user, profile, activeTab: externalActiveTab, onTabChange }: AdminReadOnlyDashboardProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [internalActiveTab, setInternalActiveTab] = useState("approvals");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Delete confirmation
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: string; id: string; name: string }>({
    open: false, type: "", id: "", name: ""
  });
  
  // Bulk delete confirmation
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState<{ open: boolean; type: string; count: number }>({
    open: false, type: "", count: 0
  });
  
  // Selected items for bulk delete
  const [selectedItems, setSelectedItems] = useState<Record<string, Set<string>>>({
    approvals: new Set(),
    users: new Set(),
    visitors: new Set(),
    residents: new Set(),
    checkins: new Set(),
    schedules: new Set(),
    payments: new Set(),
    equipment: new Set(),
    poollogs: new Set(),
    inquiries: new Set(),
    messages: new Set(),
    reports: new Set(),
  });
  
  // View detail modal
  const [viewDialog, setViewDialog] = useState<{ open: boolean; type: string; data: any }>({
    open: false, type: "", data: null
  });
  
  // Data states
  const [approvals, setApprovals] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [visitors, setVisitors] = useState<any[]>([]);
  const [residents, setResidents] = useState<any[]>([]);
  const [checkIns, setCheckIns] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [poolLogs, setPoolLogs] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  
  // Notification counts
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [pendingVisitorsCount, setPendingVisitorsCount] = useState(0);
  const [newInquiriesCount, setNewInquiriesCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  const activeTab = externalActiveTab !== undefined ? externalActiveTab : internalActiveTab;
  const setActiveTab = onTabChange || setInternalActiveTab;

  useEffect(() => {
    fetchAllData();
    fetchNotificationCounts();
    
    const channel = supabase
      .channel('admin-readonly-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchApprovals();
        fetchUsers();
        fetchNotificationCounts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitors' }, () => {
        fetchVisitors();
        fetchNotificationCounts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inquiries' }, () => {
        fetchInquiries();
        fetchNotificationCounts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        fetchMessages();
        fetchNotificationCounts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'check_ins' }, fetchCheckIns)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchNotificationCounts = async () => {
    try {
      const { count: approvalsCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      setPendingApprovalsCount(approvalsCount || 0);

      // Fetch pending visitor/booking requests
      const { count: bookingsCount } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending_payment");
      setPendingVisitorsCount(bookingsCount || 0);

      const { count: inquiriesCount } = await supabase
        .from("inquiries")
        .select("*", { count: "exact", head: true })
        .eq("status", "new");
      setNewInquiriesCount(inquiriesCount || 0);

      const { count: messagesCount } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .is("read_at", null)
        .or(`recipient_id.eq.${user.id},recipient_role.eq.admin`);
      setUnreadMessagesCount(messagesCount || 0);
    } catch (error) {
      console.error("Error fetching notification counts:", error);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchApprovals(),
      fetchUsers(),
      fetchVisitors(),
      fetchResidents(),
      fetchCheckIns(),
      fetchSchedules(),
      fetchPayments(),
      fetchEquipment(),
      fetchPoolLogs(),
      fetchInquiries(),
      fetchMessages(),
      fetchReports(),
    ]);
    setLoading(false);
  };

  const fetchApprovals = async () => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .in("status", ["pending", "approved", "rejected"])
        .order("created_at", { ascending: false });
      setApprovals(data || []);
    } catch (error) {
      console.error("Error fetching approvals:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchVisitors = async () => {
    try {
      const { data } = await supabase
        .from("visitors")
        .select("*")
        .order("created_at", { ascending: false });
      setVisitors(data || []);
    } catch (error) {
      console.error("Error fetching visitors:", error);
    }
  };

  const fetchResidents = async () => {
    try {
      const { data } = await supabase
        .from("residents")
        .select("*")
        .order("created_at", { ascending: false });
      setResidents(data || []);
    } catch (error) {
      console.error("Error fetching residents:", error);
    }
  };

  const fetchCheckIns = async () => {
    try {
      const { data: checkInsData } = await supabase
        .from("check_ins")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (checkInsData && checkInsData.length > 0) {
        const userIds = [...new Set(checkInsData.map(c => c.user_id))];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, first_name, last_name, role, email")
          .in("user_id", userIds);

        const profileMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
        const enriched = checkInsData.map(c => ({
          ...c,
          profile: profileMap.get(c.user_id) || null
        }));
        setCheckIns(enriched);
      } else {
        setCheckIns([]);
      }
    } catch (error) {
      console.error("Error fetching check-ins:", error);
    }
  };

  const fetchSchedules = async () => {
    try {
      const { data } = await supabase
        .from("pool_schedules")
        .select("*")
        .order("created_at", { ascending: false });
      setSchedules(data || []);
    } catch (error) {
      console.error("Error fetching schedules:", error);
    }
  };

  const fetchPayments = async () => {
    try {
      const { data: paymentsData } = await supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false });

      if (paymentsData && paymentsData.length > 0) {
        const visitorIds = [...new Set(paymentsData.map(p => p.visitor_id))];
        const { data: visitorsData } = await supabase
          .from("visitors")
          .select("id, first_name, last_name")
          .in("id", visitorIds);

        const visitorMap = new Map(visitorsData?.map(v => [v.id, v]) || []);
        const enriched = paymentsData.map(p => ({
          ...p,
          visitor: visitorMap.get(p.visitor_id) || null
        }));
        setPayments(enriched);
      } else {
        setPayments([]);
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
    }
  };

  const fetchEquipment = async () => {
    try {
      const { data } = await supabase
        .from("equipment")
        .select("*")
        .order("created_at", { ascending: false });
      setEquipment(data || []);
    } catch (error) {
      console.error("Error fetching equipment:", error);
    }
  };

  const fetchPoolLogs = async () => {
    try {
      const { data } = await supabase
        .from("pool_logs")
        .select("*")
        .order("date", { ascending: false });
      setPoolLogs(data || []);
    } catch (error) {
      console.error("Error fetching pool logs:", error);
    }
  };

  const fetchInquiries = async () => {
    try {
      const { data } = await supabase
        .from("inquiries")
        .select("*")
        .order("created_at", { ascending: false });
      setInquiries(data || []);
    } catch (error) {
      console.error("Error fetching inquiries:", error);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data } = await supabase
        .from("v_messages_summary")
        .select("*")
        .order("created_at", { ascending: false });
      setMessages(data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const fetchReports = async () => {
    try {
      const { data } = await supabase
        .from("reports_metadata")
        .select("*")
        .order("created_at", { ascending: false });
      setReports(data || []);
    } catch (error) {
      console.error("Error fetching reports:", error);
    }
  };

  const handleDelete = async () => {
    const { type, id } = deleteDialog;
    try {
      let error = null;
      switch (type) {
        case "approval":
        case "user":
          ({ error } = await supabase.from("profiles").delete().eq("id", id));
          if (!error) fetchUsers();
          break;
        case "visitor":
          ({ error } = await supabase.from("visitors").delete().eq("id", id));
          if (!error) fetchVisitors();
          break;
        case "resident":
          ({ error } = await supabase.from("residents").delete().eq("id", id));
          if (!error) fetchResidents();
          break;
        case "checkin":
          ({ error } = await supabase.from("check_ins").delete().eq("id", id));
          if (!error) fetchCheckIns();
          break;
        case "schedule":
          ({ error } = await supabase.from("pool_schedules").delete().eq("id", id));
          if (!error) fetchSchedules();
          break;
        case "payment":
          ({ error } = await supabase.from("payments").delete().eq("id", id));
          if (!error) fetchPayments();
          break;
        case "equipment":
          ({ error } = await supabase.from("equipment").delete().eq("id", id));
          if (!error) fetchEquipment();
          break;
        case "poollog":
          ({ error } = await supabase.from("pool_logs").delete().eq("id", id));
          if (!error) fetchPoolLogs();
          break;
        case "inquiry":
          ({ error } = await supabase.from("inquiries").delete().eq("id", id));
          if (!error) fetchInquiries();
          break;
        case "message":
          ({ error } = await supabase.from("messages").delete().eq("id", id));
          if (!error) fetchMessages();
          break;
        case "report":
          ({ error } = await supabase.from("reports_metadata").delete().eq("id", id));
          if (!error) fetchReports();
          break;
      }

      if (error) throw error;
      toast({ title: "Deleted", description: "Record has been deleted successfully." });
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({ title: "Error", description: error.message || "Failed to delete record", variant: "destructive" });
    } finally {
      setDeleteDialog({ open: false, type: "", id: "", name: "" });
    }
  };

  const confirmDelete = (type: string, id: string, name: string) => {
    setDeleteDialog({ open: true, type, id, name });
  };

  const openViewDialog = (type: string, data: any) => {
    setViewDialog({ open: true, type, data });
  };

  // Bulk selection handlers
  const toggleSelectItem = (tabType: string, id: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev[tabType]);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return { ...prev, [tabType]: newSet };
    });
  };

  const toggleSelectAll = (tabType: string, items: any[]) => {
    setSelectedItems(prev => {
      const currentSet = prev[tabType];
      const allIds = items.map(item => item.id);
      const allSelected = allIds.every(id => currentSet.has(id));
      
      if (allSelected) {
        return { ...prev, [tabType]: new Set() };
      } else {
        return { ...prev, [tabType]: new Set(allIds) };
      }
    });
  };

  const getSelectedCount = (tabType: string) => selectedItems[tabType]?.size || 0;

  const isSelected = (tabType: string, id: string) => selectedItems[tabType]?.has(id) || false;

  const isAllSelected = (tabType: string, items: any[]) => {
    if (items.length === 0) return false;
    return items.every(item => selectedItems[tabType]?.has(item.id));
  };

  const confirmBulkDelete = (tabType: string) => {
    const count = getSelectedCount(tabType);
    if (count > 0) {
      setBulkDeleteDialog({ open: true, type: tabType, count });
    }
  };

  const handleBulkDelete = async () => {
    const { type } = bulkDeleteDialog;
    const ids = Array.from(selectedItems[type] || []);
    
    if (ids.length === 0) return;
    
    try {
      let error = null;
      const tableMap: Record<string, string> = {
        approvals: "profiles",
        users: "profiles",
        visitors: "visitors",
        residents: "residents",
        checkins: "check_ins",
        schedules: "pool_schedules",
        payments: "payments",
        equipment: "equipment",
        poollogs: "pool_logs",
        inquiries: "inquiries",
        messages: "messages",
        reports: "reports_metadata",
      };
      
      const tableName = tableMap[type] as "profiles" | "visitors" | "residents" | "check_ins" | "pool_schedules" | "payments" | "equipment" | "pool_logs" | "inquiries" | "messages" | "reports_metadata";
      if (tableName) {
        ({ error } = await supabase.from(tableName).delete().in("id", ids));
      }
      
      if (error) throw error;
      
      // Clear selections for this tab
      setSelectedItems(prev => ({ ...prev, [type]: new Set() }));
      
      // Refresh data
      const refreshMap: Record<string, () => void> = {
        approvals: () => { fetchApprovals(); fetchUsers(); },
        users: fetchUsers,
        visitors: fetchVisitors,
        residents: fetchResidents,
        checkins: fetchCheckIns,
        schedules: fetchSchedules,
        payments: fetchPayments,
        equipment: fetchEquipment,
        poollogs: fetchPoolLogs,
        inquiries: fetchInquiries,
        messages: fetchMessages,
        reports: fetchReports,
      };
      
      refreshMap[type]?.();
      
      toast({ 
        title: "Bulk Delete Complete", 
        description: `Successfully deleted ${ids.length} record(s).` 
      });
    } catch (error: any) {
      console.error("Bulk delete error:", error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete records", 
        variant: "destructive" 
      });
    } finally {
      setBulkDeleteDialog({ open: false, type: "", count: 0 });
    }
  };

  const filterData = (data: any[], fields: string[]) => {
    if (!searchTerm) return data;
    const term = searchTerm.toLowerCase();
    return data.filter(item => 
      fields.some(field => {
        const value = field.split('.').reduce((obj, key) => obj?.[key], item);
        return value?.toString().toLowerCase().includes(term);
      })
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      approved: "default",
      active: "default",
      rejected: "destructive",
      suspended: "destructive",
      new: "secondary",
      "Not Checked In": "secondary",
      "Checked In": "default",
      "Checked Out": "outline",
      checked_in: "default",
      checked_out: "outline",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
            <Badge variant="outline" className="text-amber-600 border-amber-600">
              <ShieldAlert className="w-3 h-3 mr-1" />
              View-Only (Delete Permitted)
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Read-only oversight dashboard • Auditing and controlled cleanup only
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search across all records..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <TabsList className="inline-flex h-auto w-full flex-wrap gap-1 bg-transparent p-2">
            <TabsTrigger value="approvals" className="data-[state=active]:bg-background data-[state=active]:shadow-sm relative">
              <UserCheck className="w-4 h-4 mr-1.5" />
              Approvals
              {pendingApprovalsCount > 0 && (
                <Badge variant="destructive" className="ml-1.5 h-5 min-w-[20px] px-1.5 text-xs">
                  {pendingApprovalsCount > 9 ? "9+" : pendingApprovalsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Users className="w-4 h-4 mr-1.5" />
              Users
            </TabsTrigger>
            <TabsTrigger value="visitors" className="data-[state=active]:bg-background data-[state=active]:shadow-sm relative">
              <Users className="w-4 h-4 mr-1.5" />
              Visitors
              {pendingVisitorsCount > 0 && (
                <Badge variant="destructive" className="ml-1.5 h-5 min-w-[20px] px-1.5 text-xs">
                  {pendingVisitorsCount > 9 ? "9+" : pendingVisitorsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="residents" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Home className="w-4 h-4 mr-1.5" />
              Residents
            </TabsTrigger>
            <TabsTrigger value="checkins" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <ClipboardCheck className="w-4 h-4 mr-1.5" />
              Check-ins
            </TabsTrigger>
            <TabsTrigger value="schedules" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Calendar className="w-4 h-4 mr-1.5" />
              Schedules
            </TabsTrigger>
            <TabsTrigger value="payments" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <CreditCard className="w-4 h-4 mr-1.5" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="equipment" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Package className="w-4 h-4 mr-1.5" />
              Equipment
            </TabsTrigger>
            <TabsTrigger value="poollogs" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Waves className="w-4 h-4 mr-1.5" />
              Pool Logs
            </TabsTrigger>
            <TabsTrigger value="inquiries" className="data-[state=active]:bg-background data-[state=active]:shadow-sm relative">
              <Mail className="w-4 h-4 mr-1.5" />
              Inquiries
              {newInquiriesCount > 0 && (
                <Badge variant="destructive" className="ml-1.5 h-5 min-w-[20px] px-1.5 text-xs">
                  {newInquiriesCount > 9 ? "9+" : newInquiriesCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="messages" className="data-[state=active]:bg-background data-[state=active]:shadow-sm relative">
              <MessageSquare className="w-4 h-4 mr-1.5" />
              Messages
              {unreadMessagesCount > 0 && (
                <Badge variant="destructive" className="ml-1.5 h-5 min-w-[20px] px-1.5 text-xs">
                  {unreadMessagesCount > 9 ? "9+" : unreadMessagesCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <FileText className="w-4 h-4 mr-1.5" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="profile" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <User className="w-4 h-4 mr-1.5" />
              Profile
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Approvals Tab */}
        <TabsContent value="approvals" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                User Signup & Approval Requests
              </CardTitle>
              {getSelectedCount("approvals") > 0 && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => confirmBulkDelete("approvals")}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected ({getSelectedCount("approvals")})
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={isAllSelected("approvals", filterData(approvals, ["first_name", "last_name", "email", "role"]))}
                        onCheckedChange={() => toggleSelectAll("approvals", filterData(approvals, ["first_name", "last_name", "email", "role"]))}
                      />
                    </TableHead>
                    <TableHead>User Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterData(approvals, ["first_name", "last_name", "email", "role"]).map((item) => (
                    <TableRow key={item.id} className={isSelected("approvals", item.id) ? "bg-muted/50" : ""}>
                      <TableCell>
                        <Checkbox 
                          checked={isSelected("approvals", item.id)}
                          onCheckedChange={() => toggleSelectItem("approvals", item.id)}
                        />
                      </TableCell>
                      <TableCell>{item.first_name} {item.last_name}</TableCell>
                      <TableCell>{item.email}</TableCell>
                      <TableCell><Badge variant="outline">{item.role}</Badge></TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell>{format(new Date(item.created_at), "PPp")}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="ghost" onClick={() => openViewDialog("approval", item)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => confirmDelete("approval", item.id, `${item.first_name} ${item.last_name}`)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {approvals.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No approval requests found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                All Users
              </CardTitle>
              {getSelectedCount("users") > 0 && (
                <Button variant="destructive" size="sm" onClick={() => confirmBulkDelete("users")}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected ({getSelectedCount("users")})
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={isAllSelected("users", filterData(users, ["first_name", "last_name", "email", "role"]))}
                        onCheckedChange={() => toggleSelectAll("users", filterData(users, ["first_name", "last_name", "email", "role"]))}
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterData(users, ["first_name", "last_name", "email", "role"]).map((item) => (
                    <TableRow key={item.id} className={isSelected("users", item.id) ? "bg-muted/50" : ""}>
                      <TableCell>
                        <Checkbox checked={isSelected("users", item.id)} onCheckedChange={() => toggleSelectItem("users", item.id)} />
                      </TableCell>
                      <TableCell>{item.first_name} {item.last_name}</TableCell>
                      <TableCell>{item.email}</TableCell>
                      <TableCell><Badge variant="outline">{item.role}</Badge></TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell>{format(new Date(item.created_at), "PPp")}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="ghost" onClick={() => openViewDialog("user", item)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => confirmDelete("user", item.id, `${item.first_name} ${item.last_name}`)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No users found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Visitors Tab */}
        <TabsContent value="visitors" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                All Visitors
              </CardTitle>
              {getSelectedCount("visitors") > 0 && (
                <Button variant="destructive" size="sm" onClick={() => confirmBulkDelete("visitors")}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected ({getSelectedCount("visitors")})
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={isAllSelected("visitors", filterData(visitors, ["first_name", "last_name", "email"]))}
                        onCheckedChange={() => toggleSelectAll("visitors", filterData(visitors, ["first_name", "last_name", "email"]))}
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Visit Date</TableHead>
                    <TableHead>Check-in Status</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead>Guests</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterData(visitors, ["first_name", "last_name", "email"]).map((item) => (
                    <TableRow key={item.id} className={isSelected("visitors", item.id) ? "bg-muted/50" : ""}>
                      <TableCell>
                        <Checkbox checked={isSelected("visitors", item.id)} onCheckedChange={() => toggleSelectItem("visitors", item.id)} />
                      </TableCell>
                      <TableCell>{item.first_name} {item.last_name}</TableCell>
                      <TableCell>{format(new Date(item.date_of_visit), "PP")}</TableCell>
                      <TableCell>{getStatusBadge(item.check_in_status)}</TableCell>
                      <TableCell>{getStatusBadge(item.payment_status)}</TableCell>
                      <TableCell>{item.num_guests}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="ghost" onClick={() => openViewDialog("visitor", item)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => confirmDelete("visitor", item.id, `${item.first_name} ${item.last_name}`)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {visitors.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No visitors found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Residents Tab */}
        <TabsContent value="residents" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Home className="w-5 h-5" />
                All Residents
              </CardTitle>
              {getSelectedCount("residents") > 0 && (
                <Button variant="destructive" size="sm" onClick={() => confirmBulkDelete("residents")}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected ({getSelectedCount("residents")})
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={isAllSelected("residents", filterData(residents, ["name", "email", "hostel_admission"]))}
                        onCheckedChange={() => toggleSelectAll("residents", filterData(residents, ["name", "email", "hostel_admission"]))}
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Hostel/Admission</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>School</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterData(residents, ["name", "email", "hostel_admission"]).map((item) => (
                    <TableRow key={item.id} className={isSelected("residents", item.id) ? "bg-muted/50" : ""}>
                      <TableCell>
                        <Checkbox checked={isSelected("residents", item.id)} onCheckedChange={() => toggleSelectItem("residents", item.id)} />
                      </TableCell>
                      <TableCell>{item.name || item.full_name}</TableCell>
                      <TableCell>{item.email}</TableCell>
                      <TableCell>{item.hostel_admission || "N/A"}</TableCell>
                      <TableCell>{getStatusBadge(item.status || "active")}</TableCell>
                      <TableCell>{item.school || "N/A"}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="ghost" onClick={() => openViewDialog("resident", item)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => confirmDelete("resident", item.id, item.name || item.full_name)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {residents.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No residents found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Check-ins Tab */}
        <TabsContent value="checkins" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5" />
                Check-in Records
              </CardTitle>
              {getSelectedCount("checkins") > 0 && (
                <Button variant="destructive" size="sm" onClick={() => confirmBulkDelete("checkins")}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected ({getSelectedCount("checkins")})
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={isAllSelected("checkins", filterData(checkIns, ["profile.first_name", "profile.last_name", "profile.email"]))}
                        onCheckedChange={() => toggleSelectAll("checkins", filterData(checkIns, ["profile.first_name", "profile.last_name", "profile.email"]))}
                      />
                    </TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Check-in Time</TableHead>
                    <TableHead>Check-out Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterData(checkIns, ["profile.first_name", "profile.last_name", "profile.email"]).map((item) => (
                    <TableRow key={item.id} className={isSelected("checkins", item.id) ? "bg-muted/50" : ""}>
                      <TableCell>
                        <Checkbox checked={isSelected("checkins", item.id)} onCheckedChange={() => toggleSelectItem("checkins", item.id)} />
                      </TableCell>
                      <TableCell>{item.profile?.first_name} {item.profile?.last_name}</TableCell>
                      <TableCell><Badge variant="outline">{item.profile?.role || "N/A"}</Badge></TableCell>
                      <TableCell>{format(new Date(item.check_in_time), "PPp")}</TableCell>
                      <TableCell>{item.check_out_time ? format(new Date(item.check_out_time), "PPp") : "Still in"}</TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="ghost" onClick={() => openViewDialog("checkin", item)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => confirmDelete("checkin", item.id, `${item.profile?.first_name || "Unknown"} check-in`)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {checkIns.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No check-in records found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedules Tab */}
        <TabsContent value="schedules" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Pool Schedules
              </CardTitle>
              {getSelectedCount("schedules") > 0 && (
                <Button variant="destructive" size="sm" onClick={() => confirmBulkDelete("schedules")}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected ({getSelectedCount("schedules")})
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={isAllSelected("schedules", filterData(schedules, ["title", "session_name"]))}
                        onCheckedChange={() => toggleSelectAll("schedules", filterData(schedules, ["title", "session_name"]))}
                      />
                    </TableHead>
                    <TableHead>Session Name</TableHead>
                    <TableHead>Time Range</TableHead>
                    <TableHead>Allowed Roles</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterData(schedules, ["title", "session_name"]).map((item) => (
                    <TableRow key={item.id} className={isSelected("schedules", item.id) ? "bg-muted/50" : ""}>
                      <TableCell>
                        <Checkbox checked={isSelected("schedules", item.id)} onCheckedChange={() => toggleSelectItem("schedules", item.id)} />
                      </TableCell>
                      <TableCell>{item.session_name || item.title}</TableCell>
                      <TableCell>{item.start_time} - {item.end_time}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {item.allowed_roles?.slice(0, 3).map((role: string) => (
                            <Badge key={role} variant="secondary" className="text-xs">{role}</Badge>
                          ))}
                          {item.allowed_roles?.length > 3 && <Badge variant="secondary" className="text-xs">+{item.allowed_roles.length - 3}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>{item.capacity_limit}</TableCell>
                      <TableCell>{item.is_active ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="ghost" onClick={() => openViewDialog("schedule", item)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => confirmDelete("schedule", item.id, item.session_name || item.title)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {schedules.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No schedules found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Records
              </CardTitle>
              {getSelectedCount("payments") > 0 && (
                <Button variant="destructive" size="sm" onClick={() => confirmBulkDelete("payments")}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected ({getSelectedCount("payments")})
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={isAllSelected("payments", payments)}
                        onCheckedChange={() => toggleSelectAll("payments", payments)}
                      />
                    </TableHead>
                    <TableHead>User/Visitor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((item) => (
                    <TableRow key={item.id} className={isSelected("payments", item.id) ? "bg-muted/50" : ""}>
                      <TableCell>
                        <Checkbox checked={isSelected("payments", item.id)} onCheckedChange={() => toggleSelectItem("payments", item.id)} />
                      </TableCell>
                      <TableCell>{item.visitor?.first_name} {item.visitor?.last_name}</TableCell>
                      <TableCell>KES {item.amount}</TableCell>
                      <TableCell>{getStatusBadge(item.payment_status)}</TableCell>
                      <TableCell>{format(new Date(item.created_at), "PPp")}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="ghost" onClick={() => openViewDialog("payment", item)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => confirmDelete("payment", item.id, `Payment #${item.id.slice(0,8)}`)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {payments.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No payment records found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Equipment Tab */}
        <TabsContent value="equipment" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Equipment Inventory
              </CardTitle>
              {getSelectedCount("equipment") > 0 && (
                <Button variant="destructive" size="sm" onClick={() => confirmBulkDelete("equipment")}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected ({getSelectedCount("equipment")})
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={isAllSelected("equipment", filterData(equipment, ["name", "category"]))}
                        onCheckedChange={() => toggleSelectAll("equipment", filterData(equipment, ["name", "category"]))}
                      />
                    </TableHead>
                    <TableHead>Equipment Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterData(equipment, ["name", "category"]).map((item) => (
                    <TableRow key={item.id} className={isSelected("equipment", item.id) ? "bg-muted/50" : ""}>
                      <TableCell>
                        <Checkbox checked={isSelected("equipment", item.id)} onCheckedChange={() => toggleSelectItem("equipment", item.id)} />
                      </TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell><Badge variant="outline">{item.category}</Badge></TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell>{item.quantity_available} / {item.quantity_total}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="ghost" onClick={() => openViewDialog("equipment", item)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => confirmDelete("equipment", item.id, item.name)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {equipment.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No equipment found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pool Logs Tab */}
        <TabsContent value="poollogs" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Waves className="w-5 h-5" />
                Pool Operational Logs
              </CardTitle>
              {getSelectedCount("poollogs") > 0 && (
                <Button variant="destructive" size="sm" onClick={() => confirmBulkDelete("poollogs")}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected ({getSelectedCount("poollogs")})
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={isAllSelected("poollogs", poolLogs)}
                        onCheckedChange={() => toggleSelectAll("poollogs", poolLogs)}
                      />
                    </TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Session</TableHead>
                    <TableHead>Total Swimmers</TableHead>
                    <TableHead>Water Quality</TableHead>
                    <TableHead>Logged By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {poolLogs.map((item) => (
                    <TableRow key={item.id} className={isSelected("poollogs", item.id) ? "bg-muted/50" : ""}>
                      <TableCell>
                        <Checkbox checked={isSelected("poollogs", item.id)} onCheckedChange={() => toggleSelectItem("poollogs", item.id)} />
                      </TableCell>
                      <TableCell>{format(new Date(item.date), "PP")}</TableCell>
                      <TableCell>{item.session}</TableCell>
                      <TableCell>{item.total_swimmers || 0}</TableCell>
                      <TableCell>{item.water_clarity || "N/A"}</TableCell>
                      <TableCell>{item.checked_by || "N/A"}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="ghost" onClick={() => openViewDialog("poollog", item)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => confirmDelete("poollog", item.id, `Log ${format(new Date(item.date), "PP")}`)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {poolLogs.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No pool logs found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inquiries Tab */}
        <TabsContent value="inquiries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                All Inquiries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sender</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Responded By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterData(inquiries, ["first_name", "last_name", "subject", "email"]).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.first_name} {item.last_name}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{item.subject}</TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell>{format(new Date(item.created_at), "PPp")}</TableCell>
                      <TableCell>{item.responded_by || "Not responded"}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="ghost" onClick={() => openViewDialog("inquiry", item)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => confirmDelete("inquiry", item.id, item.subject)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {inquiries.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No inquiries found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                All Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sender</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Sent At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterData(messages, ["sender_name", "recipient_name", "title"]).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.sender_name || "System"}</TableCell>
                      <TableCell>{item.recipient_name || item.recipient_role || "All"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{item.title}</TableCell>
                      <TableCell><Badge variant="outline">{item.message_type}</Badge></TableCell>
                      <TableCell>{item.created_at ? format(new Date(item.created_at), "PPp") : "N/A"}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="ghost" onClick={() => openViewDialog("message", item)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => confirmDelete("message", item.id || "", item.title || "Message")}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {messages.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No messages found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Generated Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report Type</TableHead>
                    <TableHead>Report Name</TableHead>
                    <TableHead>Date Range</TableHead>
                    <TableHead>Generated At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterData(reports, ["report_type", "report_name"]).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell><Badge variant="outline">{item.report_type}</Badge></TableCell>
                      <TableCell>{item.report_name}</TableCell>
                      <TableCell>
                        {item.date_range_start && item.date_range_end 
                          ? `${format(new Date(item.date_range_start), "PP")} - ${format(new Date(item.date_range_end), "PP")}`
                          : "N/A"}
                      </TableCell>
                      <TableCell>{format(new Date(item.created_at), "PPp")}</TableCell>
                      <TableCell className="text-right space-x-2">
                        {item.file_path && (
                          <Button size="sm" variant="ghost">
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => openViewDialog("report", item)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => confirmDelete("report", item.id, item.report_name)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {reports.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No reports found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ ...deleteDialog, open: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>"{deleteDialog.name}"</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Details Dialog */}
      <Dialog open={viewDialog.open} onOpenChange={(open) => !open && setViewDialog({ ...viewDialog, open: false })}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="capitalize">{viewDialog.type} Details</DialogTitle>
            <DialogDescription>View-only record information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {viewDialog.data && (
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(viewDialog.data).map(([key, value]) => {
                  if (key === "id" || key.includes("password") || typeof value === "object") return null;
                  return (
                    <div key={key} className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground capitalize">{key.replace(/_/g, " ")}</p>
                      <p className="text-sm">{value?.toString() || "N/A"}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialog({ open: false, type: "", data: null })}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminReadOnlyDashboard;
