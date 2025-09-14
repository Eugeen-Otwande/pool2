import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Edit, Trash2, CheckCircle, Download, XCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ResidenceMember {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  school: string;
  hostel_admission: string;
  status: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
}

interface CheckIn {
  id: string;
  user_id: string;
  check_in_time: string;
  status: string;
  notes?: string;
  residence_member?: {
    full_name: string;
    school: string;
  };
}

interface ResidenceTabProps {
  onRefreshStats?: () => void;
}

export default function ResidenceTab({ onRefreshStats }: ResidenceTabProps) {
  const [members, setMembers] = useState<ResidenceMember[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingMember, setEditingMember] = useState<ResidenceMember | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    school: "",
    hostel_admission: "",
    status: "active"
  });

  // Fetch residence members
  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from("residence_members")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error("Error fetching members:", error);
      toast.error("Failed to fetch residence members");
    }
  };

  // Fetch recent check-ins with member details
  const fetchCheckIns = async () => {
    try {
      const { data: checkInsData, error } = await supabase
        .from("check_ins")
        .select(`
          id,
          user_id,
          check_in_time,
          status,
          notes
        `)
        .order("check_in_time", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get member details for each check-in
      const checkInsWithMembers = await Promise.all(
        (checkInsData || []).map(async (checkIn) => {
          const { data: memberData } = await supabase
            .from("residence_members")
            .select("full_name, school")
            .eq("user_id", checkIn.user_id)
            .maybeSingle();

          return {
            ...checkIn,
            residence_member: memberData
          };
        })
      );

      setCheckIns(checkInsWithMembers.filter(ci => ci.residence_member));
    } catch (error) {
      console.error("Error fetching check-ins:", error);
      toast.error("Failed to fetch check-in history");
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchMembers(), fetchCheckIns()]);
      setLoading(false);
    };

    loadData();

    // Set up real-time subscriptions
    const membersChannel = supabase
      .channel('residence_members_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'residence_members'
        },
        () => {
          fetchMembers();
          onRefreshStats?.();
        }
      )
      .subscribe();

    const checkInsChannel = supabase
      .channel('check_ins_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'check_ins'
        },
        () => {
          fetchCheckIns();
          onRefreshStats?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(membersChannel);
      supabase.removeChannel(checkInsChannel);
    };
  }, [onRefreshStats]);

  const resetForm = () => {
    setFormData({
      full_name: "",
      email: "",
      phone_number: "",
      school: "",
      hostel_admission: "",
      status: "active"
    });
    setEditingMember(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingMember) {
        // Update existing member
        const { error } = await supabase
          .from("residence_members")
          .update(formData)
          .eq("id", editingMember.id);

        if (error) throw error;
        toast.success("Residence member updated successfully");
      } else {
        // Create new member
        const { data: userData } = await supabase.auth.getUser();
        const { error } = await supabase
          .from("residence_members")
          .insert({
            ...formData,
            created_by: userData.user?.id
          });

        if (error) throw error;
        toast.success("Residence member created successfully");
      }

      setShowCreateDialog(false);
      resetForm();
      fetchMembers();
      onRefreshStats?.();
    } catch (error: any) {
      console.error("Error saving member:", error);
      toast.error(error.message || "Failed to save residence member");
    }
  };

  const handleEdit = (member: ResidenceMember) => {
    setEditingMember(member);
    setFormData({
      full_name: member.full_name,
      email: member.email,
      phone_number: member.phone_number,
      school: member.school,
      hostel_admission: member.hostel_admission,
      status: member.status
    });
    setShowCreateDialog(true);
  };

  const handleDelete = async (member: ResidenceMember) => {
    if (!confirm(`Are you sure you want to delete ${member.full_name}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("residence_members")
        .delete()
        .eq("id", member.id);

      if (error) throw error;
      
      toast.success("Residence member deleted successfully");
      fetchMembers();
      onRefreshStats?.();
    } catch (error: any) {
      console.error("Error deleting member:", error);
      toast.error(error.message || "Failed to delete residence member");
    }
  };

  const handleSelfCheckIn = async (member: ResidenceMember) => {
    try {
      const { data, error } = await supabase.rpc('residence_member_checkin', {
        member_id: member.id
      });

      if (error) throw error;
      
      toast.success(`${member.full_name} checked in successfully`);
      fetchCheckIns();
      onRefreshStats?.();
    } catch (error: any) {
      console.error("Error checking in member:", error);
      toast.error(error.message || "Failed to check in member");
    }
  };

  const handleSelfCheckOut = async (member: ResidenceMember) => {
    try {
      // Find the current check-in for this member
      const { data: currentCheckIn, error: findError } = await supabase
        .from("check_ins")
        .select("id")
        .eq("user_id", member.user_id)
        .eq("status", "checked_in")
        .order("check_in_time", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (findError) throw findError;
      
      if (!currentCheckIn) {
        toast.error(`${member.full_name} is not currently checked in`);
        return;
      }

      const { error } = await supabase
        .from("check_ins")
        .update({
          check_out_time: new Date().toISOString(),
          status: "checked_out"
        })
        .eq("id", currentCheckIn.id);

      if (error) throw error;
      
      toast.success(`${member.full_name} checked out successfully`);
      fetchCheckIns();
      onRefreshStats?.();
    } catch (error: any) {
      console.error("Error checking out member:", error);
      toast.error(error.message || "Failed to check out member");
    }
  };

  const downloadReport = async () => {
    try {
      const csvData = [
        ['Name', 'Email', 'Phone', 'School', 'Hostel Admission', 'Status', 'Created Date'],
        ...members.map(member => [
          member.full_name,
          member.email,
          member.phone_number,
          member.school,
          member.hostel_admission,
          member.status,
          new Date(member.created_at).toLocaleDateString()
        ])
      ];

      const csvContent = csvData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `residence_members_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success("Report downloaded successfully");
    } catch (error) {
      console.error("Error downloading report:", error);
      toast.error("Failed to download report");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Residence Management</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadReport}>
            <Download className="mr-2 h-4 w-4" />
            Download Report
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingMember ? "Edit Residence Member" : "Add New Residence Member"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone_number">Phone Number</Label>
                  <Input
                    id="phone_number"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="school">School</Label>
                  <Input
                    id="school"
                    value={formData.school}
                    onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="hostel_admission">Hostel Admission</Label>
                  <Input
                    id="hostel_admission"
                    value={formData.hostel_admission}
                    onChange={(e) => setFormData({ ...formData, hostel_admission: e.target.value })}
                    required
                  />
                </div>
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
                      <SelectItem value="graduated">Graduated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    {editingMember ? "Update" : "Create"} Member
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowCreateDialog(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Residence Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>Residence Members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No residence members found. Add the first member to get started.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Hostel Admission</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.full_name}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>{member.school}</TableCell>
                    <TableCell>{member.hostel_admission}</TableCell>
                    <TableCell>
                      <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                        {member.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSelfCheckIn(member)}
                          disabled={member.status !== 'active'}
                          title="Check in member"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSelfCheckOut(member)}
                          disabled={member.status !== 'active'}
                          title="Check out member"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(member)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(member)}
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Real-time Check-in History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Check-ins ({checkIns.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {checkIns.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No recent check-ins found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Check-in Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checkIns.map((checkIn) => (
                  <TableRow key={checkIn.id}>
                    <TableCell className="font-medium">
                      {checkIn.residence_member?.full_name || 'Unknown'}
                    </TableCell>
                    <TableCell>{checkIn.residence_member?.school || 'N/A'}</TableCell>
                    <TableCell>
                      {new Date(checkIn.check_in_time).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">{checkIn.status}</Badge>
                    </TableCell>
                    <TableCell>{checkIn.notes || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}