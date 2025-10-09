import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserCheck, UserX, Clock, Mail } from "lucide-react";

interface PendingUser {
  id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  status: string;
  created_at: string;
  phone?: string | null;
  emergency_contact?: string | null;
}

interface UserApprovalTabProps {
  onRefreshStats: () => void;
}

const UserApprovalTab = ({ onRefreshStats }: UserApprovalTabProps) => {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    try {
      console.log("UserApprovalTab: Fetching pending users...");
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("UserApprovalTab: Error fetching pending users:", error);
        throw error;
      }
      console.log("UserApprovalTab: Fetched pending users:", data?.length || 0);
      setPendingUsers(data || []);
    } catch (error) {
      console.error("Error fetching pending users:", error);
      toast({
        title: "Error",
        description: "Failed to load pending users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const approveUser = async (userId: string, notes: string = "") => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user?.id) throw new Error("No authenticated user");

      // Update user status to active
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("user_id", userId);

      if (profileError) throw profileError;

      // Update or insert approval record
      const { error: approvalError } = await supabase
        .from("user_approvals")
        .upsert({
          user_id: userId,
          status: "approved",
          approved_at: new Date().toISOString(),
          approved_by: currentUser.user.id,
          approval_notes: notes,
        }, {
          onConflict: 'user_id'
        });

      if (approvalError) throw approvalError;

      toast({
        title: "User Approved",
        description: "User has been successfully approved and can now access the system",
      });

      fetchPendingUsers();
      onRefreshStats();
      setSelectedUser(null);
      setApprovalNotes("");
    } catch (error) {
      console.error("Error approving user:", error);
      toast({
        title: "Error",
        description: "Failed to approve user",
        variant: "destructive",
      });
    }
  };

  const rejectUser = async (userId: string, notes: string = "") => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user?.id) throw new Error("No authenticated user");

      // Update user status to suspended (rejected users can't access)
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ status: "suspended", updated_at: new Date().toISOString() })
        .eq("user_id", userId);

      if (profileError) throw profileError;

      // Update or insert approval record
      const { error: approvalError } = await supabase
        .from("user_approvals")
        .upsert({
          user_id: userId,
          status: "rejected",
          approved_by: currentUser.user.id,
          approval_notes: notes,
        }, {
          onConflict: 'user_id'
        });

      if (approvalError) throw approvalError;

      toast({
        title: "User Rejected",
        description: "User application has been rejected",
        variant: "destructive",
      });

      fetchPendingUsers();
      onRefreshStats();
      setSelectedUser(null);
      setApprovalNotes("");
    } catch (error) {
      console.error("Error rejecting user:", error);
      toast({
        title: "Error",
        description: "Failed to reject user",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Pending User Approvals ({pendingUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingUsers.length === 0 ? (
            <div className="text-center py-8">
              <UserCheck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Pending Approvals</h3>
              <p className="text-muted-foreground">All user registrations have been processed.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Registration Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="font-medium">
                        {user.first_name} {user.last_name}
                      </div>
                      {user.phone && (
                        <div className="text-sm text-muted-foreground">{user.phone}</div>
                      )}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedUser(user)}
                            >
                              <UserCheck className="w-3 h-3 mr-1" />
                              Approve
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Approve User Registration</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="p-4 bg-muted rounded-lg">
                                <h4 className="font-medium mb-2">User Details</h4>
                                 <p><strong>Name:</strong> {user.first_name} {user.last_name}</p>
                                <p><strong>Email:</strong> {user.email}</p>
                                <p><strong>Role:</strong> {user.role}</p>
                                <p className="text-xs text-muted-foreground mt-2">User ID: {user.user_id}</p>
                                {user.phone && <p><strong>Phone:</strong> {user.phone}</p>}
                                {user.emergency_contact && (
                                  <p><strong>Emergency Contact:</strong> {user.emergency_contact}</p>
                                )}
                              </div>
                              <div>
                                <label className="text-sm font-medium">Approval Notes (Optional)</label>
                                <Textarea
                                  value={approvalNotes}
                                  onChange={(e) => setApprovalNotes(e.target.value)}
                                  placeholder="Add any notes about this approval..."
                                  className="mt-1"
                                />
                              </div>
                               <div className="flex gap-2 pt-4">
                                <Button
                                  onClick={() => selectedUser && approveUser(selectedUser.user_id, approvalNotes)}
                                  className="flex-1"
                                >
                                  <UserCheck className="w-4 h-4 mr-2" />
                                  Approve User
                                </Button>
                                <Button
                                  onClick={() => selectedUser && rejectUser(selectedUser.user_id, approvalNotes)}
                                  variant="destructive"
                                  className="flex-1"
                                >
                                  <UserX className="w-4 h-4 mr-2" />
                                  Reject User
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => rejectUser(user.user_id)}
                        >
                          <UserX className="w-3 h-3 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserApprovalTab;