import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Building, UserPlus, Edit, Trash2, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ResidenceMember {
  id: string;
  full_name: string;
  school: string;
  hostel_admission: string;
  phone_number: string;
  email: string;
  user_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

interface ResidenceTabProps {
  onRefreshStats?: () => void;
}

export default function ResidenceTab({ onRefreshStats }: ResidenceTabProps) {
  const [members, setMembers] = useState<ResidenceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMember, setEditingMember] = useState<ResidenceMember | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    school: "",
    hostel_admission: "",
    phone_number: "",
    email: "",
  });
  
  const { toast } = useToast();

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from("residence_members")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setMembers(data || []);
    } catch (error: any) {
      console.error("Error fetching residence members:", error);
      toast({
        title: "Error",
        description: "Failed to load residence members",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const resetForm = () => {
    setFormData({
      full_name: "",
      school: "",
      hostel_admission: "",
      phone_number: "",
      email: "",
    });
    setEditingMember(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (editingMember) {
        // Update existing member
        const { error } = await supabase
          .from("residence_members")
          .update({
            full_name: formData.full_name,
            school: formData.school,
            hostel_admission: formData.hostel_admission,
            phone_number: formData.phone_number,
            email: formData.email,
          })
          .eq("id", editingMember.id);

        if (error) {
          throw error;
        }

        toast({
          title: "Success",
          description: "Residence member updated successfully",
        });
      } else {
        // Create new member
        const { error } = await supabase
          .from("residence_members")
          .insert({
            full_name: formData.full_name,
            school: formData.school,
            hostel_admission: formData.hostel_admission,
            phone_number: formData.phone_number,
            email: formData.email,
            created_by: user?.id,
          });

        if (error) {
          throw error;
        }

        toast({
          title: "Success",
          description: "Residence member created successfully",
        });
      }

      resetForm();
      setShowCreateDialog(false);
      fetchMembers();
      onRefreshStats?.();
    } catch (error: any) {
      console.error("Error saving residence member:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save residence member",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (member: ResidenceMember) => {
    setFormData({
      full_name: member.full_name,
      school: member.school,
      hostel_admission: member.hostel_admission,
      phone_number: member.phone_number,
      email: member.email,
    });
    setEditingMember(member);
    setShowCreateDialog(true);
  };

  const handleDelete = async (memberId: string) => {
    if (!confirm("Are you sure you want to delete this residence member?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("residence_members")
        .delete()
        .eq("id", memberId);

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Residence member deleted successfully",
      });

      fetchMembers();
      onRefreshStats?.();
    } catch (error: any) {
      console.error("Error deleting residence member:", error);
      toast({
        title: "Error",
        description: "Failed to delete residence member",
        variant: "destructive",
      });
    }
  };

  const handleSelfCheckIn = async (memberId: string) => {
    try {
      const { data, error } = await supabase.rpc('residence_member_checkin', {
        member_id: memberId
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Residence member checked in successfully",
      });

      onRefreshStats?.();
    } catch (error: any) {
      console.error("Error checking in residence member:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to check in residence member",
        variant: "destructive",
      });
    }
  };

  if (loading && members.length === 0) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Residence Management</h2>
          <p className="text-muted-foreground">
            Manage residence members and their pool access
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Add Residence Member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingMember ? "Edit Residence Member" : "Add New Residence Member"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="school">School</Label>
                <Input
                  id="school"
                  value={formData.school}
                  onChange={(e) => setFormData(prev => ({ ...prev, school: e.target.value }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="hostel_admission">Hostel Admission</Label>
                <Input
                  id="hostel_admission"
                  value={formData.hostel_admission}
                  onChange={(e) => setFormData(prev => ({ ...prev, hostel_admission: e.target.value }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone_number">Phone Number</Label>
                <Input
                  id="phone_number"
                  value={formData.phone_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Saving..." : editingMember ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Residence Members ({members.length})
          </CardTitle>
          <CardDescription>
            Manage residence members who have pool access
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No residence members found. Add your first member to get started.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>School</TableHead>
                    <TableHead>Hostel Admission</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.full_name}</TableCell>
                      <TableCell>{member.school}</TableCell>
                      <TableCell>{member.hostel_admission}</TableCell>
                      <TableCell>{member.phone_number}</TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>
                        <Badge variant={member.status === "active" ? "default" : "secondary"}>
                          {member.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSelfCheckIn(member.id)}
                            className="gap-1"
                          >
                            <CheckCircle className="h-3 w-3" />
                            Check In
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(member)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(member.id)}
                          >
                            <Trash2 className="h-3 w-3" />
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
}