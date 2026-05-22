import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserCheck, UserX, Clock, Mail, RefreshCw } from "lucide-react";

interface PendingUser {
  approval_id: string;
  user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  profile_status: string | null;
  account_origin: string | null;
  phone: string | null;
  emergency_contact: string | null;
  requested_at: string;
  has_profile: boolean;
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

    // Live updates: refresh when approvals or profiles change
    const channel = supabase
      .channel("user-approvals-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_approvals" }, fetchPendingUsers)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, fetchPendingUsers)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPendingUsers = async () => {
    try {
      // Source of truth = user_approvals (status='pending'), join with profile for details
      const { data: approvals, error: aErr } = await supabase
        .from("user_approvals")
        .select("id, user_id, status, requested_at, created_at")
        .eq("status", "pending")
        .order("requested_at", { ascending: false });

      if (aErr) throw aErr;

      // Also include profiles that are still 'pending' even if no approval row exists (safety net)
      const { data: pendingProfiles, error: pErr } = await supabase
        .from("profiles")
        .select("user_id, email, first_name, last_name, role, status, account_origin, phone, emergency_contact, created_at")
        .eq("status", "pending")
        .neq("role", "resident");

      if (pErr) throw pErr;

      const userIds = Array.from(
        new Set([...(approvals || []).map((a) => a.user_id), ...(pendingProfiles || []).map((p) => p.user_id)])
      );

      let profileMap = new Map<string, any>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, email, first_name, last_name, role, status, account_origin, phone, emergency_contact")
          .in("user_id", userIds);
        (profiles || []).forEach((p) => profileMap.set(p.user_id, p));
      }

      const seen = new Set<string>();
      const merged: PendingUser[] = [];

      (approvals || []).forEach((a) => {
        if (seen.has(a.user_id)) return;
        seen.add(a.user_id);
        const p = profileMap.get(a.user_id);
        // Skip orphans (profile was deleted)
        if (!p) return;
        // Skip residents per business rule
        if (p.role === "resident") return;
        merged.push({
          approval_id: a.id,
          user_id: a.user_id,
          email: p.email ?? null,
          first_name: p.first_name ?? null,
          last_name: p.last_name ?? null,
          role: p.role ?? null,
          profile_status: p.status ?? null,
          account_origin: p.account_origin ?? null,
          phone: p.phone ?? null,
          emergency_contact: p.emergency_contact ?? null,
          requested_at: a.requested_at ?? a.created_at,
          has_profile: true,
        });
      });

      (pendingProfiles || []).forEach((p) => {
        if (seen.has(p.user_id)) return;
        seen.add(p.user_id);
        merged.push({
          approval_id: p.user_id, // fallback key
          user_id: p.user_id,
          email: p.email,
          first_name: p.first_name,
          last_name: p.last_name,
          role: p.role,
          profile_status: p.status,
          account_origin: p.account_origin,
          phone: p.phone,
          emergency_contact: p.emergency_contact,
          requested_at: p.created_at,
          has_profile: true,
        });
      });

      setPendingUsers(merged);
    } catch (error: any) {
      const msg = error?.message || error?.details || JSON.stringify(error);
      console.error("Error fetching pending users:", msg, error);
      toast({
        title: "Error",
        description: `Failed to load pending users: ${msg}`,
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

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("user_id", userId);

      if (profileError) throw profileError;

      const { error: approvalError } = await supabase
        .from("user_approvals")
        .upsert(
          {
            user_id: userId,
            status: "approved",
            approved_at: new Date().toISOString(),
            approved_by: currentUser.user.id,
            approval_notes: notes,
          },
          { onConflict: "user_id" }
        );

      if (approvalError) throw approvalError;

      toast({ title: "User Approved", description: "User can now access the system." });
      fetchPendingUsers();
      onRefreshStats();
      setSelectedUser(null);
      setApprovalNotes("");
    } catch (error: any) {
      toast({
        title: "Approval Failed",
        description: error?.message || JSON.stringify(error),
        variant: "destructive",
      });
    }
  };

  const rejectUser = async (userId: string, notes: string = "") => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user?.id) throw new Error("No authenticated user");

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ status: "suspended", updated_at: new Date().toISOString() })
        .eq("user_id", userId);

      if (profileError) throw profileError;

      const { error: approvalError } = await supabase
        .from("user_approvals")
        .upsert(
          {
            user_id: userId,
            status: "rejected",
            approved_by: currentUser.user.id,
            approval_notes: notes,
          },
          { onConflict: "user_id" }
        );

      if (approvalError) throw approvalError;

      toast({ title: "User Rejected", description: "Application has been rejected.", variant: "destructive" });
      fetchPendingUsers();
      onRefreshStats();
      setSelectedUser(null);
      setApprovalNotes("");
    } catch (error: any) {
      toast({
        title: "Rejection Failed",
        description: error?.message || JSON.stringify(error),
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
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-stat-card-text">
              <UserCheck className="w-5 h-5" />
              Pending User Approvals — Account Creation Requests
              {pendingUsers.length > 0 && (
                <Badge variant="secondary" className="ml-2">{pendingUsers.length}</Badge>
              )}
            </CardTitle>
            <p className="text-sm text-stat-card-muted mt-1">
              Approve or reject new system users (staff, admin, managers, etc.)
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchPendingUsers}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
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
                    <TableRow key={user.approval_id} className="border-b border-stat-card-border hover:bg-stat-card-bg-light">
                      <TableCell>
                        <div className="font-medium text-stat-card-text">
                          {user.first_name || ""} {user.last_name || ""}
                          {!user.first_name && !user.last_name && <span className="text-stat-card-muted">—</span>}
                        </div>
                        {user.phone && <div className="text-sm text-stat-card-muted">{user.phone}</div>}
                      </TableCell>
                      <TableCell className="text-stat-card-text">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-stat-card-muted" />
                          {user.email || "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-stat-card-border text-stat-card-text">
                          {user.role || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {user.account_origin === "staff_created" ? "Staff Created" : "Self Sign-up"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-stat-card-text">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-stat-card-muted" />
                          {new Date(user.requested_at).toLocaleDateString()} at{" "}
                          {new Date(user.requested_at).toLocaleTimeString()}
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
