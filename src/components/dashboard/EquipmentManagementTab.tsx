import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Search, FileDown, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { AddEditEquipmentDialog } from "./AddEditEquipmentDialog";
import { IssueEquipmentDialog } from "./IssueEquipmentDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Equipment {
  id: string;
  name: string;
  category: string;
  description: string | null;
  quantity_total: number;
  quantity_available: number;
  status: string;
  condition?: string;
  barcode?: string | null;
}

interface EquipmentLoan {
  id: string;
  equipment_id: string;
  user_id: string;
  loaned_at: string;
  due_back_at: string;
  returned_at: string | null;
  quantity_borrowed: number;
  status: string;
  notes: string | null;
  equipment: Equipment;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  };
}

interface EquipmentManagementTabProps {
  userRole: string;
}

export function EquipmentManagementTab({ userRole }: EquipmentManagementTabProps) {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loans, setLoans] = useState<EquipmentLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [loanStatusFilter, setLoanStatusFilter] = useState<string>("all");
  const [loanUserFilter, setLoanUserFilter] = useState<string>("all");
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [showAddEditDialog, setShowAddEditDialog] = useState(false);
  const [showIssueDialog, setShowIssueDialog] = useState(false);

  const isAdminOrStaff = userRole === 'admin' || userRole === 'staff';

  useEffect(() => {
    fetchEquipment();
    if (isAdminOrStaff) {
      fetchLoans();
    }
  }, [isAdminOrStaff]);

  const fetchEquipment = async () => {
    try {
      const { data, error } = await supabase
        .from("equipment")
        .select("*")
        .order("name");

      if (error) throw error;
      setEquipment(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch equipment");
    } finally {
      setLoading(false);
    }
  };

  const fetchLoans = async () => {
    try {
      const { data, error } = await supabase
        .from("equipment_loans")
        .select(`
          *,
          equipment:equipment!equipment_loans_equipment_id_fkey(id, name, category, description, status),
          profiles:profiles!equipment_loans_user_id_fkey(first_name, last_name, email, role)
        `)
        .order("loaned_at", { ascending: false });

      if (error) {
        console.error("Error fetching loans:", error);
        toast.error("Failed to fetch loans");
        setLoans([]);
        return;
      }
      setLoans(data as any || []);
    } catch (error: any) {
      console.error("Exception fetching loans:", error);
      toast.error("Failed to fetch loans");
      setLoans([]);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this equipment?")) return;

    try {
      const { error } = await supabase
        .from("equipment")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Equipment deleted successfully");
      fetchEquipment();
    } catch (error: any) {
      toast.error("Failed to delete equipment");
    }
  };

  const handleEdit = (item: Equipment) => {
    setSelectedEquipment(item);
    setShowAddEditDialog(true);
  };

  const handleIssue = (item: Equipment) => {
    setSelectedEquipment(item);
    setShowIssueDialog(true);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "available":
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "in use":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
      case "under maintenance":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
    }
  };

  const filteredEquipment = equipment.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const categories = Array.from(new Set(equipment.map((e) => e.category)));
  const loanUsers = Array.from(new Set(loans.map((loan) => ({
    id: loan.user_id,
    name: `${loan.profiles.first_name} ${loan.profiles.last_name}`
  }))));

  const isOverdue = (dueDate: string, status: string) => {
    if (status === "returned") return false;
    return new Date(dueDate) < new Date();
  };

  const getLoanStatusColor = (loan: EquipmentLoan) => {
    if (loan.status === "returned") {
      return "bg-green-500/10 text-green-700 dark:text-green-400";
    }
    if (isOverdue(loan.due_back_at, loan.status)) {
      return "bg-red-500/10 text-red-700 dark:text-red-400";
    }
    return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
  };

  const getLoanStatusText = (loan: EquipmentLoan) => {
    if (loan.status === "returned") return "Returned";
    if (isOverdue(loan.due_back_at, loan.status)) return "Overdue";
    return "Active";
  };

  const handleReturnEquipment = async (loanId: string) => {
    try {
      const { error } = await supabase
        .from("equipment_loans")
        .update({ 
          status: "returned", 
          returned_at: new Date().toISOString() 
        })
        .eq("id", loanId);

      if (error) throw error;
      toast.success("Equipment marked as returned");
      fetchEquipment();
      fetchLoans();
    } catch (error: any) {
      toast.error("Failed to mark equipment as returned");
    }
  };

  const filteredLoans = loans.filter((loan) => {
    const matchesStatus = loanStatusFilter === "all" || 
      (loanStatusFilter === "overdue" && isOverdue(loan.due_back_at, loan.status)) ||
      loan.status === loanStatusFilter;
    const matchesUser = loanUserFilter === "all" || loan.user_id === loanUserFilter;
    return matchesStatus && matchesUser;
  });

  const exportToCSV = () => {
    const headers = ["Equipment", "Borrower", "Role", "Quantity", "Issued Date", "Due Date", "Returned Date", "Status"];
    const rows = filteredLoans.map(loan => [
      loan.equipment.name,
      `${loan.profiles.first_name} ${loan.profiles.last_name}`,
      loan.profiles.role,
      loan.quantity_borrowed,
      new Date(loan.loaned_at).toLocaleDateString(),
      new Date(loan.due_back_at).toLocaleDateString(),
      loan.returned_at ? new Date(loan.returned_at).toLocaleDateString() : "N/A",
      getLoanStatusText(loan)
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `equipment-loans-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("CSV exported successfully");
  };

  if (!isAdminOrStaff) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">Access denied. Admin or staff privileges required.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Equipment</TabsTrigger>
          <TabsTrigger value="issued">Issued Equipment</TabsTrigger>
          <TabsTrigger value="history">Borrow History</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div className="flex-1 flex flex-col sm:flex-row gap-2 w-full">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search equipment..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="in use">In Use</SelectItem>
                    <SelectItem value="under maintenance">Under Maintenance</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => { setSelectedEquipment(null); setShowAddEditDialog(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Equipment
              </Button>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Total Qty</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">Loading...</TableCell>
                    </TableRow>
                  ) : filteredEquipment.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No equipment found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEquipment.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>{item.quantity_total}</TableCell>
                        <TableCell>{item.quantity_available}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(item.status)}>{item.status}</Badge>
                        </TableCell>
                        <TableCell>{item.condition || "Good"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleIssue(item)}
                              disabled={item.quantity_available === 0}
                            >
                              Issue
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(item)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="issued" className="space-y-4">
          <Card className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
              <h3 className="text-lg font-semibold">Currently Issued Equipment</h3>
              <div className="flex gap-2 w-full md:w-auto">
                <Select value={loanUserFilter} onValueChange={setLoanUserFilter}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Filter by user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {loanUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Borrower</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Issued Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLoans.filter((loan) => loan.status === "active").length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        No current equipment loans found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLoans.filter((loan) => loan.status === "active").map((loan) => (
                      <TableRow key={loan.id}>
                        <TableCell className="font-medium">{loan.equipment.name}</TableCell>
                        <TableCell>{loan.equipment.category}</TableCell>
                        <TableCell>
                          {loan.profiles.first_name} {loan.profiles.last_name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {loan.profiles.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{loan.quantity_borrowed}</TableCell>
                        <TableCell>{new Date(loan.loaned_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <span className={isOverdue(loan.due_back_at, loan.status) ? "text-red-600 font-medium flex items-center gap-1" : ""}>
                            {new Date(loan.due_back_at).toLocaleDateString()}
                            {isOverdue(loan.due_back_at, loan.status) && <AlertCircle className="w-4 h-4" />}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={getLoanStatusColor(loan)}>
                            {getLoanStatusText(loan)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReturnEquipment(loan.id)}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Return
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
              <h3 className="text-lg font-semibold">Borrow History</h3>
              <div className="flex gap-2">
                <Select value={loanStatusFilter} onValueChange={setLoanStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="returned">Returned</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={loanUserFilter} onValueChange={setLoanUserFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {loanUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={exportToCSV}>
                  <FileDown className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Borrower</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Returned</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLoans.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        No equipment loans found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLoans.map((loan) => (
                      <TableRow key={loan.id}>
                        <TableCell className="font-medium">{loan.equipment.name}</TableCell>
                        <TableCell>{loan.equipment.category}</TableCell>
                        <TableCell>
                          {loan.profiles.first_name} {loan.profiles.last_name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {loan.profiles.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{loan.quantity_borrowed}</TableCell>
                        <TableCell>{new Date(loan.loaned_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <span className={isOverdue(loan.due_back_at, loan.status) ? "text-red-600 font-medium" : ""}>
                            {new Date(loan.due_back_at).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          {loan.returned_at
                            ? new Date(loan.returned_at).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge className={getLoanStatusColor(loan)}>
                            {getLoanStatusText(loan)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <AddEditEquipmentDialog
        open={showAddEditDialog}
        onOpenChange={setShowAddEditDialog}
        equipment={selectedEquipment}
        onSuccess={() => {
          fetchEquipment();
          setShowAddEditDialog(false);
        }}
      />

      <IssueEquipmentDialog
        open={showIssueDialog}
        onOpenChange={setShowIssueDialog}
        equipment={selectedEquipment}
        onSuccess={() => {
          fetchEquipment();
          fetchLoans();
          setShowIssueDialog(false);
        }}
      />
    </div>
  );
}
