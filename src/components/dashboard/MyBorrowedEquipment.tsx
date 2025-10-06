import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { CheckCircle } from "lucide-react";

interface Equipment {
  id: string;
  name: string;
  category: string;
}

interface BorrowedEquipment {
  id: string;
  equipment_id: string;
  loaned_at: string;
  due_back_at: string;
  returned_at: string | null;
  quantity_borrowed: number;
  status: string;
  notes: string | null;
  equipment: Equipment;
}

interface MyBorrowedEquipmentProps {
  userId: string;
}

export function MyBorrowedEquipment({ userId }: MyBorrowedEquipmentProps) {
  const [loans, setLoans] = useState<BorrowedEquipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyLoans();
  }, [userId]);

  const fetchMyLoans = async () => {
    try {
      const { data, error } = await supabase
        .from("equipment_loans")
        .select(`
          *,
          equipment:equipment!equipment_loans_equipment_id_fkey(id, name, category)
        `)
        .eq("user_id", userId)
        .order("loaned_at", { ascending: false });

      if (error) throw error;
      setLoans(data as any || []);
    } catch (error: any) {
      toast.error("Failed to fetch borrowed equipment");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkReturned = async (loanId: string) => {
    try {
      const { error } = await supabase
        .from("equipment_loans")
        .update({ status: "returned", returned_at: new Date().toISOString() })
        .eq("id", loanId);

      if (error) throw error;
      toast.success("Equipment marked as returned");
      fetchMyLoans();
    } catch (error: any) {
      toast.error("Failed to mark as returned");
    }
  };

  const isOverdue = (dueDate: string, status: string) => {
    if (status === "returned") return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">My Borrowed Equipment</h3>

      {loading ? (
        <p className="text-center text-muted-foreground">Loading...</p>
      ) : loans.length === 0 ? (
        <p className="text-center text-muted-foreground">You haven't borrowed any equipment yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipment Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Date Issued</TableHead>
                <TableHead>Expected Return</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loans.map((loan) => (
                <TableRow key={loan.id}>
                  <TableCell className="font-medium">{loan.equipment.name}</TableCell>
                  <TableCell>{loan.equipment.category}</TableCell>
                  <TableCell>{loan.quantity_borrowed}</TableCell>
                  <TableCell>{new Date(loan.loaned_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <span className={isOverdue(loan.due_back_at, loan.status) ? "text-red-600 font-medium" : ""}>
                      {new Date(loan.due_back_at).toLocaleDateString()}
                      {isOverdue(loan.due_back_at, loan.status) && " (Overdue)"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        loan.status === "returned"
                          ? "bg-green-500/10 text-green-700 dark:text-green-400"
                          : isOverdue(loan.due_back_at, loan.status)
                          ? "bg-red-500/10 text-red-700 dark:text-red-400"
                          : "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                      }
                    >
                      {loan.status === "returned" ? "Returned" : isOverdue(loan.due_back_at, loan.status) ? "Overdue" : "Pending"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {loan.status === "active" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkReturned(loan.id)}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark Returned
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
