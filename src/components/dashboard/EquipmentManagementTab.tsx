import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Search, FileDown } from "lucide-react";
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
          equipment:equipment!equipment_loans_equipment_id_fkey(*),
          profiles:profiles!equipment_loans_user_id_fkey(first_name, last_name, email)
        `)
        .order("loaned_at", { ascending: false });

      if (error) throw error;
      setLoans(data as any || []);
    } catch (error: any) {
      toast.error("Failed to fetch loans");
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
            <h3 className="text-lg font-semibold mb-4">Currently Issued Equipment</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Borrower</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Issued Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loans.filter((loan) => loan.status === "active").map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell className="font-medium">{loan.equipment.name}</TableCell>
                      <TableCell>
                        {loan.profiles.first_name} {loan.profiles.last_name}
                      </TableCell>
                      <TableCell>{loan.quantity_borrowed}</TableCell>
                      <TableCell>{new Date(loan.loaned_at).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(loan.due_back_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400">
                          {loan.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Borrow History</h3>
              <Button variant="outline" size="sm">
                <FileDown className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Borrower</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead>Returned</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loans.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell className="font-medium">{loan.equipment.name}</TableCell>
                      <TableCell>
                        {loan.profiles.first_name} {loan.profiles.last_name}
                      </TableCell>
                      <TableCell>{loan.quantity_borrowed}</TableCell>
                      <TableCell>{new Date(loan.loaned_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {loan.returned_at
                          ? new Date(loan.returned_at).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            loan.status === "returned"
                              ? "bg-green-500/10 text-green-700 dark:text-green-400"
                              : "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                          }
                        >
                          {loan.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
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
