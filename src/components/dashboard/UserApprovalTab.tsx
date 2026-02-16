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
        .neq("role", "resident") // Exclude residents from approval list
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
      <Card className="bg-stat-card border-stat-card-border backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-stat-card-bg-light rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-stat-card border-stat-card-border backdrop-blur-sm hover:bg-stat-card-bg-hover transition-all duration-300 hover:shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-stat-card-text">
            <UserCheck className="w-5 h-5" />
            Pending User Approvals - Account Creation Requests
          </CardTitle>
          <p className="text-sm text-stat-card-muted mt-1">
            Approve or reject new system users (staff, admin, managers, etc.)
          </p>
        </CardHeader>
        <CardContent>
          {pendingUsers.length === 0 ? (
            <div className="text-center py-8">
              <UserCheck className="w-12 h-12 mx-auto text-stat-card-muted mb-4" />
              <h3 className="text-lg font-medium mb-2 text-stat-card-text">No Pending Approvals</h3>
              <p className="text-stat-card-muted">All user registrations have been processed.</p>
            </div>
          ) : (
            <div className="rounded-md border border-stat-card-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-stat-card-border hover:bg-stat-card-bg-light">
                    <TableHead className="text-stat-card-text font-semibold">Name</TableHead>
                    <TableHead className="text-stat-card-text font-semibold">Email</TableHead>
                    <TableHead className="text-stat-card-text font-semibold">Role Requested</TableHead>
                    <TableHead className="text-stat-card-text font-semibold">Origin</TableHead>
                    <TableHead className="text-stat-card-text font-semibold">Requested Date</TableHead>
                    <TableHead className="text-stat-card-text font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {pendingUsers.map((user) => (
                  <TableRow key={user.id} className="border-b border-stat-card-border hover:bg-stat-card-bg-light">
                    <TableCell>
                      <div className="font-medium text-stat-card-text">
                        {user.first_name} {user.last_name}
                      </div>
                      {user.phone && (
                        <div className="text-sm text-stat-card-muted">{user.phone}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-stat-card-text">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-stat-card-muted" />
                        {user.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-stat-card-border text-stat-card-text">
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        Self Sign-up
                      </Badge>
                    </TableCell>
                    <TableCell className="text-stat-card-text">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-stat-card-muted" />
                        {new Date(user.created_at).toLocaleDateString()} at{" "}
                        {new Date(user.created_at).toLocaleTimeString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedUser(user)}
                              className="border-green-600/30 bg-green-50/50 text-green-700 hover:bg-green-100 hover:text-green-800 dark:bg-green-950/50 dark:text-green-400 dark:hover:bg-green-900/50"
                            >
                              <UserCheck className="w-3 h-3 mr-1" />
                              Approve
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-stat-card border-stat-card-border">
                            <DialogHeader>
                              <DialogTitle className="text-stat-card-text">Approve User Registration</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="p-4 bg-stat-card-bg-light rounded-lg border border-stat-card-border">
                                <h4 className="font-medium mb-3 text-stat-card-text">User Details</h4>
                                <div className="space-y-2 text-sm">
                                  <p className="text-stat-card-text"><strong>Name:</strong> {user.first_name} {user.last_name}</p>
                                  <p className="text-stat-card-text"><strong>Email:</strong> {user.email}</p>
                                  <p className="text-stat-card-text"><strong>Role Requested:</strong> {user.role}</p>
                                  {user.phone && <p className="text-stat-card-text"><strong>Phone:</strong> {user.phone}</p>}
                                  {user.emergency_contact && (
                                    <p className="text-stat-card-text"><strong>Emergency Contact:</strong> {user.emergency_contact}</p>
                                  )}
                                  <p className="text-xs text-stat-card-muted mt-2">User ID: {user.user_id}</p>
                                </div>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-stat-card-text">Approval Notes (Optional)</label>
                                <Textarea
                                  value={approvalNotes}
                                  onChange={(e) => setApprovalNotes(e.target.value)}
                                  placeholder="Add any notes about this approval..."
                                  className="mt-1 bg-stat-card-bg-light border-stat-card-border text-stat-card-text placeholder:text-stat-card-muted"
                                />
                              </div>
                              <div className="flex gap-2 pt-4">
                                <Button
                                  onClick={() => selectedUser && approveUser(selectedUser.user_id, approvalNotes)}
                                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserApprovalTab;