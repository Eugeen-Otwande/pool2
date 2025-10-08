import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Equipment {
  id: string;
  name: string;
  quantity_available: number;
}

interface Profile {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

interface IssueEquipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: Equipment | null;
  onSuccess: () => void;
}

export function IssueEquipmentDialog({
  open,
  onOpenChange,
  equipment,
  onSuccess,
}: IssueEquipmentDialogProps) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [formData, setFormData] = useState({
    user_id: "",
    quantity_borrowed: 1,
    due_back_at: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchUsers();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 7);
      setFormData({
        user_id: "",
        quantity_borrowed: 1,
        due_back_at: tomorrow.toISOString().split("T")[0],
        notes: "",
      });
    }
  }, [open]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, email, role")
        .in("role", ["student", "member", "resident", "visitor", "staff", "faculty"])
        .order("first_name");

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch users");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!equipment) return;
    
    if (formData.quantity_borrowed > equipment.quantity_available) {
      toast.error("Quantity exceeds available equipment");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("equipment_loans")
        .insert([{
          equipment_id: equipment.id,
          user_id: formData.user_id,
          quantity_borrowed: formData.quantity_borrowed,
          due_back_at: formData.due_back_at,
          notes: formData.notes,
          status: "active",
        }]);

      if (error) throw error;
      toast.success("Equipment issued successfully");
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to issue equipment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Issue Equipment</DialogTitle>
        </DialogHeader>

        {equipment && (
          <div className="mb-4 p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium">{equipment.name}</p>
            <p className="text-xs text-muted-foreground">
              Available: {equipment.quantity_available} units
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user_id">Borrower *</Label>
            <Select value={formData.user_id} onValueChange={(value) => setFormData({ ...formData, user_id: value })}>
              <SelectTrigger id="user_id">
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.user_id} value={user.user_id}>
                    {user.first_name} {user.last_name} ({user.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={equipment?.quantity_available || 1}
              value={formData.quantity_borrowed}
              onChange={(e) => setFormData({ ...formData, quantity_borrowed: parseInt(e.target.value) || 1 })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="due_date">Expected Return Date *</Label>
            <Input
              id="due_date"
              type="date"
              value={formData.due_back_at}
              onChange={(e) => setFormData({ ...formData, due_back_at: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Remarks</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Any additional notes..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.user_id}>
              {loading ? "Issuing..." : "Issue Equipment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
