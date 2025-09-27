import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Users, 
  UserCheck, 
  AlertTriangle,
  Eye
} from "lucide-react";

interface PendingApproval {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

interface PendingCheckIn {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  notes?: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  };
}

interface ActiveCheckIn {
  id: string;
  user_id: string;
  check_in_time: string;
  status: string;
  notes?: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  };
}

interface ApprovalsTabProps {
  userProfile: any;
}

const ApprovalsTab = ({ userProfile }: ApprovalsTabProps) => {
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [pendingCheckIns, setPendingCheckIns] = useState<PendingCheckIn[]>([]);
  const [activeCheckIns, setActiveCheckIns] = useState<ActiveCheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectionReason, setRejectionReason] = useState("");
  const [forceReason, setForceReason] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchAllApprovals();
    
    // Set up realtime subscriptions
    const channel = supabase
      .channel('approvals-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => fetchPendingApprovals()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'check_ins'
        },
        () => {
          fetchPendingCheckIns();
          fetchActiveCheckIns();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAllApprovals = async () => {
    setLoading(true);
    await Promise.all([
      fetchPendingApprovals(),
      fetchPendingCheckIns(),
      fetchActiveCheckIns()
    ]);
    setLoading(false);
  };

  const fetchPendingApprovals = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPendingApprovals(data || []);
    } catch (error) {
      console.error("Error fetching pending approvals:", error);
      toast({
        title: "Error",
        description: "Failed to fetch pending approvals",
        variant: "destructive",
      });
    }
  };

  const fetchPendingCheckIns = async () => {
    try {
      const { data: checkInsData, error } = await supabase
        .from("check_ins")
        .select("*")
        .eq("status", "pending_approval")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      const checkInsWithProfiles = [];
      if (checkInsData && checkInsData.length > 0) {
        for (const checkIn of checkInsData) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("first_name, last_name, email, role")
            .eq("user_id", checkIn.user_id)
            .single();

          if (profile) {
            checkInsWithProfiles.push({
              ...checkIn,
              profiles: profile
            });
          }
        }
      }

      setPendingCheckIns(checkInsWithProfiles);
    } catch (error) {
      console.error("Error fetching pending check-ins:", error);
      toast({
        title: "Error",
        description: "Failed to fetch pending check-ins",
        variant: "destructive",
      });
    }
  };

  const fetchActiveCheckIns = async () => {
    try {
      const { data: checkInsData, error } = await supabase
        .from("check_ins")
        .select("*")
        .eq("status", "checked_in")
        .order("check_in_time", { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      const checkInsWithProfiles = [];
      if (checkInsData && checkInsData.length > 0) {
        for (const checkIn of checkInsData) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("first_name, last_name, email, role")
            .eq("user_id", checkIn.user_id)
            .single();

          if (profile) {
            checkInsWithProfiles.push({
              ...checkIn,
              profiles: profile
            });
          }
        }
      }

      setActiveCheckIns(checkInsWithProfiles);
    } catch (error) {
      console.error("Error fetching active check-ins:", error);
      toast({
        title: "Error",
        description: "Failed to fetch active check-ins",
        variant: "destructive",
      });
    }
  };

  const handleApproveUser = async (userId: string, userName: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status: "active" })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "User Approved",
        description: `${userName} has been approved successfully`,
      });

      fetchPendingApprovals();
    } catch (error: any) {
      toast({
        title: "Approval Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRejectUser = async (userId: string, userName: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status: "rejected" })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "User Rejected",
        description: `${userName} has been rejected`,
      });

      fetchPendingApprovals();
    } catch (error: any) {
      toast({
        title: "Rejection Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleApproveCheckIn = async (checkInId: string, userName: string) => {
    try {
      const { data, error } = await supabase.rpc('approve_checkin', {
        checkin_id: checkInId,
        approved_by_user_id: userProfile.user_id
      });

      if (error) throw error;

      toast({
        title: "Check-in Approved",
        description: `${userName}'s check-in has been approved`,
      });

      fetchPendingCheckIns();
      fetchActiveCheckIns();
    } catch (error: any) {
      toast({
        title: "Approval Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRejectCheckIn = async (checkInId: string, userName: string, reason: string) => {
    try {
      const { data, error } = await supabase.rpc('reject_checkin', {
        checkin_id: checkInId,
        rejected_by_user_id: userProfile.user_id,
        rejection_reason: reason
      });

      if (error) throw error;

      toast({
        title: "Check-in Rejected",
        description: `${userName}'s check-in has been rejected`,
      });

      fetchPendingCheckIns();
      setRejectionReason("");
    } catch (error: any) {
      toast({
        title: "Rejection Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleForceCheckOut = async (checkInId: string, userName: string, reason: string) => {
    try {
      const { data, error } = await supabase.rpc('force_checkout', {
        checkin_id: checkInId,
        forced_by_user_id: userProfile.user_id,
        force_reason: reason
      });

      if (error) throw error;

      toast({
        title: "Force Checkout Completed",
        description: `${userName} has been forcefully checked out`,
      });

      fetchActiveCheckIns();
      setForceReason("");
    } catch (error: any) {
      toast({
        title: "Force Checkout Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      staff: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      student: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      member: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      resident: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      visitor: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    };
    return colors[role] || "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
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
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Pending User Approvals</p>
                <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">{pendingApprovals.length}</p>
              </div>
              <Users className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900 border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Pending Check-ins</p>
                <p className="text-3xl font-bold text-yellow-900 dark:text-yellow-100">{pendingCheckIns.length}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">Active Check-ins</p>
                <p className="text-3xl font-bold text-red-900 dark:text-red-100">{activeCheckIns.length}</p>
              </div>
              <UserCheck className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different approval types */}
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users">User Approvals</TabsTrigger>
          <TabsTrigger value="checkins">Check-in Approvals</TabsTrigger>
          <TabsTrigger value="active">Active Check-ins</TabsTrigger>
        </TabsList>

        {/* User Approvals Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending User Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingApprovals.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No pending user approvals</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingApprovals.map((approval) => (
                      <TableRow key={approval.id}>
                        <TableCell className="font-medium">
                          {approval.first_name} {approval.last_name}
                        </TableCell>
                        <TableCell>{approval.email}</TableCell>
                        <TableCell>
                          <Badge className={getRoleBadgeColor(approval.role)}>
                            {approval.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatTime(approval.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApproveUser(approval.id, `${approval.first_name} ${approval.last_name}`)}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectUser(approval.id, `${approval.first_name} ${approval.last_name}`)}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
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
        </TabsContent>

        {/* Check-in Approvals Tab */}
        <TabsContent value="checkins" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Check-in Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingCheckIns.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No pending check-in approvals</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingCheckIns.map((checkIn) => (
                      <TableRow key={checkIn.id}>
                        <TableCell className="font-medium">
                          {checkIn.profiles.first_name} {checkIn.profiles.last_name}
                        </TableCell>
                        <TableCell>
                          <Badge className={getRoleBadgeColor(checkIn.profiles.role)}>
                            {checkIn.profiles.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatTime(checkIn.created_at)}</TableCell>
                        <TableCell>{checkIn.notes || "—"}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApproveCheckIn(checkIn.id, `${checkIn.profiles.first_name} ${checkIn.profiles.last_name}`)}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="destructive">
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Reject
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Reject Check-in Request</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <Label htmlFor="rejection-reason">Reason for rejection</Label>
                                  <Textarea
                                    id="rejection-reason"
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    placeholder="Enter reason for rejecting this check-in..."
                                  />
                                  <Button
                                    onClick={() => handleRejectCheckIn(checkIn.id, `${checkIn.profiles.first_name} ${checkIn.profiles.last_name}`, rejectionReason)}
                                    variant="destructive"
                                    className="w-full"
                                  >
                                    Confirm Rejection
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Check-ins Tab */}
        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Check-ins (Force Checkout Available)</CardTitle>
            </CardHeader>
            <CardContent>
              {activeCheckIns.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No active check-ins</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Check-in Time</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeCheckIns.map((checkIn) => {
                      const duration = Math.floor((new Date().getTime() - new Date(checkIn.check_in_time).getTime()) / 60000);
                      return (
                        <TableRow key={checkIn.id}>
                          <TableCell className="font-medium">
                            {checkIn.profiles.first_name} {checkIn.profiles.last_name}
                          </TableCell>
                          <TableCell>
                            <Badge className={getRoleBadgeColor(checkIn.profiles.role)}>
                              {checkIn.profiles.role}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatTime(checkIn.check_in_time)}</TableCell>
                          <TableCell>
                            <Badge variant={duration > 240 ? "destructive" : duration > 120 ? "secondary" : "default"}>
                              {duration < 60 ? `${duration}m` : `${Math.floor(duration / 60)}h ${duration % 60}m`}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50">
                                  <AlertTriangle className="w-4 h-4 mr-1" />
                                  Force Checkout
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Force Checkout</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <Label htmlFor="force-reason">Reason for force checkout</Label>
                                  <Textarea
                                    id="force-reason"
                                    value={forceReason}
                                    onChange={(e) => setForceReason(e.target.value)}
                                    placeholder="Enter reason for forcing checkout..."
                                  />
                                  <Button
                                    onClick={() => handleForceCheckOut(checkIn.id, `${checkIn.profiles.first_name} ${checkIn.profiles.last_name}`, forceReason)}
                                    variant="destructive"
                                    className="w-full"
                                  >
                                    Confirm Force Checkout
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ApprovalsTab;