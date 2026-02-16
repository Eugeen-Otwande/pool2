import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated: () => void;
  editingUser?: any;
}

export default function CreateUserDialog({ 
  open, 
  onOpenChange, 
  onUserCreated, 
  editingUser 
}: CreateUserDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: editingUser?.email || "",
    first_name: editingUser?.first_name || "",
    last_name: editingUser?.last_name || "",
    role: editingUser?.role || "student",
    status: editingUser?.status || "active",
    phone: editingUser?.phone || "",
    emergency_contact: editingUser?.emergency_contact || "",
    emergency_phone: editingUser?.emergency_phone || ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (editingUser) {
        // Update existing user - check if role is changing
        const roleChanged = editingUser.role !== formData.role;
        
        if (roleChanged) {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Not authenticated');

          const { data, error } = await supabase.rpc('update_user_role', {
            _user_id: editingUser.user_id,
            _new_role: formData.role,
            _updated_by: user.id
          });

          if (error) throw error;
          const result = data as { success: boolean; message: string };
          if (!result.success) throw new Error(result.message);
        }
        
        const { role, ...otherFields } = formData;
        const { error: updateError } = await supabase
          .from("profiles")
          .update(roleChanged ? otherFields : formData)
          .eq("user_id", editingUser.user_id);

        if (updateError) throw updateError;
        
        toast.success(roleChanged 
          ? "✅ User updated and role synced across the system" 
          : "User updated successfully"
        );
      } else {
        // Create new user via edge function (creates auth user + profile + role)
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const response = await supabase.functions.invoke('create-user', {
          body: {
            email: formData.email,
            first_name: formData.first_name,
            last_name: formData.last_name,
            role: formData.role,
            phone: formData.phone,
            emergency_contact: formData.emergency_contact,
            emergency_phone: formData.emergency_phone,
          }
        });

        if (response.error) {
          throw new Error(response.error.message || 'Failed to create user');
        }

        const result = response.data;
        if (!result.success) {
          throw new Error(result.error || 'Failed to create user');
        }

        toast.success("✅ Account created with default password (pool123). User will be prompted to change it on first login.");
      }

      onUserCreated();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error("Error saving user:", error);
      toast.error(error.message || "Failed to save user");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      email: "",
      first_name: "",
      last_name: "",
      role: "student",
      status: "active",
      phone: "",
      emergency_contact: "",
      emergency_phone: ""
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingUser ? "Edit User" : "Create New User"}
          </DialogTitle>
          {!editingUser && (
            <p className="text-sm text-muted-foreground mt-1">
              Account will be created with default password <code className="bg-muted px-1 rounded">pool123</code>. 
              User will be prompted to change it on first login.
            </p>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={!!editingUser}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="role">Role</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background">
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="resident">Resident</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="rcmrd_team">RCMRD Team</SelectItem>
                <SelectItem value="rcmrd_official">RCMRD Official</SelectItem>
                <SelectItem value="visitor">Visitor</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {editingUser && (
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="emergency_contact">Emergency Contact</Label>
            <Input
              id="emergency_contact"
              value={formData.emergency_contact}
              onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="emergency_phone">Emergency Phone</Label>
            <Input
              id="emergency_phone"
              value={formData.emergency_phone}
              onChange={(e) => setFormData({ ...formData, emergency_phone: e.target.value })}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingUser ? "Update" : "Create"} User
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
