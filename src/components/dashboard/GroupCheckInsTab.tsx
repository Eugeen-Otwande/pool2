import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import {
  Users,
  UserCheck,
  UserX,
  Building2,
  Clock,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  UserPlus,
} from "lucide-react";

interface Group {
  id: string;
  name: string;
  organization: string | null;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  group_type: string;
  expected_session_time: string | null;
  schedule_id: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

interface GroupMember {
  id: string;
  group_id: string;
  user_id: string | null;
  member_name: string;
  member_email: string | null;
  member_phone: string | null;
  member_role: string;
  status: string;
  check_in_status?: string;
}

interface GroupCheckInsTabProps {
  user: User;
}

const GroupCheckInsTab = ({ user }: GroupCheckInsTabProps) => {
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState("groups");
  
  // Dialog states
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [showMemberDialog, setShowMemberDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [editingMember, setEditingMember] = useState<GroupMember | null>(null);
  
  // Form states
  const [groupForm, setGroupForm] = useState({
    name: "",
    organization: "",
    contact_person: "",
    contact_email: "",
    contact_phone: "",
    group_type: "other",
    expected_session_time: "",
    notes: "",
  });
  
  const [memberForm, setMemberForm] = useState({
    member_name: "",
    member_email: "",
    member_phone: "",
    member_role: "member",
  });

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      fetchMembers(selectedGroup.id);
    }
  }, [selectedGroup]);

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setGroups(data || []);
    } catch (error: any) {
      console.error("Error fetching groups:", error);
      toast({
        title: "Error",
        description: "Failed to load groups",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async (groupId: string) => {
    try {
      const { data: membersData, error } = await supabase
        .from("group_members")
        .select("*")
        .eq("group_id", groupId)
        .order("member_name", { ascending: true });

      if (error) throw error;

      // Get check-in status for each member with a user_id
      const membersWithStatus = await Promise.all(
        (membersData || []).map(async (member) => {
          if (member.user_id) {
            const { data: checkIn } = await supabase
              .from("check_ins")
              .select("status")
              .eq("user_id", member.user_id)
              .eq("status", "checked_in")
              .gte("check_in_time", new Date().toISOString().split("T")[0])
              .maybeSingle();

            return {
              ...member,
              check_in_status: checkIn ? "Checked In" : "Not Checked In",
            };
          }
          return { ...member, check_in_status: "Not Linked" };
        })
      );

      setMembers(membersWithStatus);
    } catch (error: any) {
      console.error("Error fetching members:", error);
      toast({
        title: "Error",
        description: "Failed to load group members",
        variant: "destructive",
      });
    }
  };

  const handleCreateGroup = async () => {
    try {
      const groupData = {
        name: groupForm.name,
        organization: groupForm.organization || null,
        contact_person: groupForm.contact_person || null,
        contact_email: groupForm.contact_email || null,
        contact_phone: groupForm.contact_phone || null,
        group_type: groupForm.group_type,
        expected_session_time: groupForm.expected_session_time || null,
        notes: groupForm.notes || null,
        created_by: user.id,
      };

      if (editingGroup) {
        const { error } = await supabase
          .from("groups")
          .update(groupData)
          .eq("id", editingGroup.id);

        if (error) throw error;
        toast({ title: "Success", description: "Group updated successfully" });
      } else {
        const { error } = await supabase.from("groups").insert([groupData]);

        if (error) throw error;
        toast({ title: "Success", description: "Group created successfully" });
      }

      setShowGroupDialog(false);
      setEditingGroup(null);
      resetGroupForm();
      fetchGroups();
    } catch (error: any) {
      console.error("Error saving group:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save group",
        variant: "destructive",
      });
    }
  };

  const handleDeleteGroup = async (group: Group) => {
    if (!confirm(`Are you sure you want to delete "${group.name}"? This will also remove all members.`)) {
      return;
    }

    try {
      const { error } = await supabase.from("groups").delete().eq("id", group.id);

      if (error) throw error;
      toast({ title: "Success", description: "Group deleted successfully" });
      
      if (selectedGroup?.id === group.id) {
        setSelectedGroup(null);
        setMembers([]);
      }
      fetchGroups();
    } catch (error: any) {
      console.error("Error deleting group:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete group",
        variant: "destructive",
      });
    }
  };

  const handleAddMember = async () => {
    if (!selectedGroup) return;

    try {
      if (memberForm.member_email) {
        const { data: existing } = await supabase
          .from("group_members")
          .select("id")
          .eq("group_id", selectedGroup.id)
          .eq("member_email", memberForm.member_email)
          .maybeSingle();

        if (existing && !editingMember) {
          toast({
            title: "Error",
            description: "A member with this email already exists in the group",
            variant: "destructive",
          });
          return;
        }
      }

      let userId = null;
      if (memberForm.member_email) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("email", memberForm.member_email)
          .maybeSingle();

        if (profile) {
          userId = profile.user_id;
        }
      }

      const memberData = {
        group_id: selectedGroup.id,
        user_id: userId,
        member_name: memberForm.member_name,
        member_email: memberForm.member_email || null,
        member_phone: memberForm.member_phone || null,
        member_role: memberForm.member_role,
      };

      if (editingMember) {
        const { error } = await supabase
          .from("group_members")
          .update(memberData)
          .eq("id", editingMember.id);

        if (error) throw error;
        toast({ title: "Success", description: "Member updated successfully" });
      } else {
        const { error } = await supabase.from("group_members").insert([memberData]);

        if (error) throw error;
        toast({ title: "Success", description: "Member added successfully" });
      }

      setShowMemberDialog(false);
      setEditingMember(null);
      resetMemberForm();
      fetchMembers(selectedGroup.id);
    } catch (error: any) {
      console.error("Error saving member:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save member",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMember = async (member: GroupMember) => {
    if (!confirm(`Remove "${member.member_name}" from the group?`)) {
      return;
    }

    try {
      const { error } = await supabase.from("group_members").delete().eq("id", member.id);

      if (error) throw error;
      toast({ title: "Success", description: "Member removed successfully" });
      
      if (selectedGroup) {
        fetchMembers(selectedGroup.id);
      }
    } catch (error: any) {
      console.error("Error removing member:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove member",
        variant: "destructive",
      });
    }
  };

  const handleBulkCheckIn = async () => {
    if (!selectedGroup) return;

    try {
      const { data, error } = await supabase.rpc("bulk_group_checkin", {
        p_group_id: selectedGroup.id,
        p_schedule_id: selectedGroup.schedule_id,
        p_checked_in_by: user.id,
      });

      if (error) throw error;

      const result = data as { success: boolean; checked_in: number; already_checked_in: number; message: string };
      
      toast({
        title: "Group Check-in Complete",
        description: result.message,
      });

      fetchMembers(selectedGroup.id);
    } catch (error: any) {
      console.error("Error during bulk check-in:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to check in group",
        variant: "destructive",
      });
    }
  };

  const handleBulkCheckOut = async () => {
    if (!selectedGroup) return;

    try {
      const { data, error } = await supabase.rpc("bulk_group_checkout", {
        p_group_id: selectedGroup.id,
        p_checked_out_by: user.id,
      });

      if (error) throw error;

      const result = data as { success: boolean; checked_out: number; message: string };
      
      toast({
        title: "Group Check-out Complete",
        description: result.message,
      });

      fetchMembers(selectedGroup.id);
    } catch (error: any) {
      console.error("Error during bulk check-out:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to check out group",
        variant: "destructive",
      });
    }
  };

  const handleIndividualCheckIn = async (member: GroupMember) => {
    if (!member.user_id) {
      toast({
        title: "Cannot Check In",
        description: "This member is not linked to a user account",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("check_ins").insert([
        {
          user_id: member.user_id,
          group_id: selectedGroup?.id,
          checked_in_by: user.id,
          status: "checked_in",
        },
      ]);

      if (error) throw error;

      await supabase
        .from("profiles")
        .update({ check_in_status: "Checked In", check_in_at: new Date().toISOString() })
        .eq("user_id", member.user_id);

      toast({
        title: "Success",
        description: `${member.member_name} checked in`,
      });

      if (selectedGroup) {
        fetchMembers(selectedGroup.id);
      }
    } catch (error: any) {
      console.error("Error checking in member:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to check in member",
        variant: "destructive",
      });
    }
  };

  const handleIndividualCheckOut = async (member: GroupMember) => {
    if (!member.user_id) return;

    try {
      const { error } = await supabase
        .from("check_ins")
        .update({ status: "checked_out", check_out_time: new Date().toISOString() })
        .eq("user_id", member.user_id)
        .eq("status", "checked_in")
        .gte("check_in_time", new Date().toISOString().split("T")[0]);

      if (error) throw error;

      await supabase
        .from("profiles")
        .update({ check_in_status: "Checked Out", check_out_at: new Date().toISOString() })
        .eq("user_id", member.user_id);

      toast({
        title: "Success",
        description: `${member.member_name} checked out`,
      });

      if (selectedGroup) {
        fetchMembers(selectedGroup.id);
      }
    } catch (error: any) {
      console.error("Error checking out member:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to check out member",
        variant: "destructive",
      });
    }
  };

  const resetGroupForm = () => {
    setGroupForm({
      name: "",
      organization: "",
      contact_person: "",
      contact_email: "",
      contact_phone: "",
      group_type: "other",
      expected_session_time: "",
      notes: "",
    });
  };

  const resetMemberForm = () => {
    setMemberForm({
      member_name: "",
      member_email: "",
      member_phone: "",
      member_role: "member",
    });
  };

  const openEditGroup = (group: Group) => {
    setEditingGroup(group);
    setGroupForm({
      name: group.name,
      organization: group.organization || "",
      contact_person: group.contact_person || "",
      contact_email: group.contact_email || "",
      contact_phone: group.contact_phone || "",
      group_type: group.group_type,
      expected_session_time: group.expected_session_time || "",
      notes: group.notes || "",
    });
    setShowGroupDialog(true);
  };

  const openEditMember = (member: GroupMember) => {
    setEditingMember(member);
    setMemberForm({
      member_name: member.member_name,
      member_email: member.member_email || "",
      member_phone: member.member_phone || "",
      member_role: member.member_role,
    });
    setShowMemberDialog(true);
  };

  const getGroupTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      university: "University",
      club: "Club",
      corporate: "Corporate",
      training: "Training",
      school: "School",
      other: "Other",
    };
    return labels[type] || type;
  };

  const getMemberRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      student: "Student",
      member: "Member",
      resident: "Resident",
      visitor: "Visitor",
      coach: "Coach",
      instructor: "Instructor",
      other: "Other",
    };
    return labels[role] || role;
  };

  const checkedInCount = members.filter((m) => m.check_in_status === "Checked In").length;
  const linkedMembersCount = members.filter((m) => m.user_id).length;

  return (
    <div className="space-y-6">
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="groups" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Groups
          </TabsTrigger>
          <TabsTrigger value="checkin" className="flex items-center gap-2" disabled={!selectedGroup}>
            <UserCheck className="w-4 h-4" />
            Check-in
          </TabsTrigger>
        </TabsList>

        {/* Groups Tab */}
        <TabsContent value="groups" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Manage Groups
                  </CardTitle>
                  <CardDescription>
                    Create and manage swimmer groups — check-in history appears in the main Check-ins tab
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={fetchGroups}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                  <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
                    <DialogTrigger asChild>
                      <Button onClick={() => { resetGroupForm(); setEditingGroup(null); }}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Group
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>{editingGroup ? "Edit Group" : "Create New Group"}</DialogTitle>
                        <DialogDescription>
                          {editingGroup ? "Update group details" : "Add a new swimmer group"}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Group Name *</Label>
                            <Input
                              value={groupForm.name}
                              onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                              placeholder="e.g., PAC University"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Group Type</Label>
                            <Select
                              value={groupForm.group_type}
                              onValueChange={(v) => setGroupForm({ ...groupForm, group_type: v })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="university">University</SelectItem>
                                <SelectItem value="school">School</SelectItem>
                                <SelectItem value="club">Club</SelectItem>
                                <SelectItem value="corporate">Corporate</SelectItem>
                                <SelectItem value="training">Training</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Organization / Institution</Label>
                          <Input
                            value={groupForm.organization}
                            onChange={(e) => setGroupForm({ ...groupForm, organization: e.target.value })}
                            placeholder="e.g., Pan Africa Christian University"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Contact Person</Label>
                            <Input
                              value={groupForm.contact_person}
                              onChange={(e) => setGroupForm({ ...groupForm, contact_person: e.target.value })}
                              placeholder="Name of contact"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Expected Session Time</Label>
                            <Input
                              type="time"
                              value={groupForm.expected_session_time}
                              onChange={(e) => setGroupForm({ ...groupForm, expected_session_time: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Contact Email</Label>
                            <Input
                              type="email"
                              value={groupForm.contact_email}
                              onChange={(e) => setGroupForm({ ...groupForm, contact_email: e.target.value })}
                              placeholder="contact@example.com"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Contact Phone</Label>
                            <Input
                              value={groupForm.contact_phone}
                              onChange={(e) => setGroupForm({ ...groupForm, contact_phone: e.target.value })}
                              placeholder="+254..."
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Notes</Label>
                          <Textarea
                            value={groupForm.notes}
                            onChange={(e) => setGroupForm({ ...groupForm, notes: e.target.value })}
                            placeholder="Any additional notes..."
                            rows={2}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowGroupDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateGroup} disabled={!groupForm.name}>
                          {editingGroup ? "Update Group" : "Create Group"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading groups...</div>
              ) : groups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No groups created yet</p>
                  <p className="text-sm">Create a group to start managing bulk check-ins</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groups.map((group) => (
                    <Card
                      key={group.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedGroup?.id === group.id ? "ring-2 ring-primary" : ""
                      }`}
                      onClick={() => {
                        setSelectedGroup(group);
                        setActiveSubTab("checkin");
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold">{group.name}</h3>
                            <p className="text-sm text-muted-foreground">{group.organization}</p>
                          </div>
                          <Badge variant={group.status === "active" ? "default" : "secondary"}>
                            {getGroupTypeLabel(group.group_type)}
                          </Badge>
                        </div>
                        {group.contact_person && (
                          <p className="text-xs text-muted-foreground mb-2">
                            Contact: {group.contact_person}
                          </p>
                        )}
                        {group.expected_session_time && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Session: {group.expected_session_time}
                          </p>
                        )}
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditGroup(group);
                            }}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteGroup(group);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Check-in Tab */}
        <TabsContent value="checkin" className="space-y-6">
          {selectedGroup ? (
            <>
              {/* Group Details Panel */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        {selectedGroup.name}
                      </CardTitle>
                      <CardDescription>{selectedGroup.organization}</CardDescription>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Members</p>
                        <p className="text-2xl font-bold">{members.length}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Checked In</p>
                        <p className="text-2xl font-bold text-emerald-600">{checkedInCount}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Type</p>
                      <Badge variant="outline">{getGroupTypeLabel(selectedGroup.group_type)}</Badge>
                    </div>
                    {selectedGroup.contact_person && (
                      <div>
                        <p className="text-xs text-muted-foreground">Contact</p>
                        <p className="text-sm font-medium">{selectedGroup.contact_person}</p>
                      </div>
                    )}
                    {selectedGroup.contact_email && (
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="text-sm">{selectedGroup.contact_email}</p>
                      </div>
                    )}
                    {selectedGroup.expected_session_time && (
                      <div>
                        <p className="text-xs text-muted-foreground">Session Time</p>
                        <p className="text-sm">{selectedGroup.expected_session_time}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleBulkCheckIn} disabled={linkedMembersCount === 0}>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Check In Group ({linkedMembersCount} linked)
                    </Button>
                    <Button variant="outline" onClick={handleBulkCheckOut} disabled={checkedInCount === 0}>
                      <XCircle className="w-4 h-4 mr-2" />
                      Check Out Group ({checkedInCount} checked in)
                    </Button>
                    <Button variant="ghost" onClick={() => { setSelectedGroup(null); setActiveSubTab("groups"); }}>
                      Back to Groups
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Members List */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Group Members
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => fetchMembers(selectedGroup.id)}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                      </Button>
                      <Dialog open={showMemberDialog} onOpenChange={setShowMemberDialog}>
                        <DialogTrigger asChild>
                          <Button size="sm" onClick={() => { resetMemberForm(); setEditingMember(null); }}>
                            <UserPlus className="w-4 h-4 mr-2" />
                            Add Member
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{editingMember ? "Edit Member" : "Add Member"}</DialogTitle>
                            <DialogDescription>
                              {editingMember ? "Update member details" : "Add a member to this group"}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Full Name *</Label>
                              <Input
                                value={memberForm.member_name}
                                onChange={(e) => setMemberForm({ ...memberForm, member_name: e.target.value })}
                                placeholder="John Doe"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Email</Label>
                              <Input
                                type="email"
                                value={memberForm.member_email}
                                onChange={(e) => setMemberForm({ ...memberForm, member_email: e.target.value })}
                                placeholder="john@example.com"
                              />
                              <p className="text-xs text-muted-foreground">
                                If email matches an existing user, they will be linked for check-ins
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Phone</Label>
                                <Input
                                  value={memberForm.member_phone}
                                  onChange={(e) => setMemberForm({ ...memberForm, member_phone: e.target.value })}
                                  placeholder="+254..."
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Role</Label>
                                <Select
                                  value={memberForm.member_role}
                                  onValueChange={(v) => setMemberForm({ ...memberForm, member_role: v })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="student">Student</SelectItem>
                                    <SelectItem value="member">Member</SelectItem>
                                    <SelectItem value="resident">Resident</SelectItem>
                                    <SelectItem value="visitor">Visitor</SelectItem>
                                    <SelectItem value="coach">Coach</SelectItem>
                                    <SelectItem value="instructor">Instructor</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setShowMemberDialog(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleAddMember} disabled={!memberForm.member_name}>
                              {editingMember ? "Update Member" : "Add Member"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {members.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <UserPlus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No members in this group yet</p>
                      <p className="text-sm">Add members to enable group check-ins</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Check-in Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {members.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell className="font-medium">{member.member_name}</TableCell>
                            <TableCell>{member.member_email || "-"}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{getMemberRoleLabel(member.member_role)}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  member.check_in_status === "Checked In"
                                    ? "default"
                                    : member.check_in_status === "Not Linked"
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {member.check_in_status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {member.check_in_status === "Checked In" ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleIndividualCheckOut(member)}
                                  >
                                    <UserX className="w-3 h-3 mr-1" />
                                    Check Out
                                  </Button>
                                ) : member.check_in_status !== "Not Linked" ? (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => handleIndividualCheckIn(member)}
                                  >
                                    <UserCheck className="w-3 h-3 mr-1" />
                                    Check In
                                  </Button>
                                ) : null}
                                <Button size="sm" variant="ghost" onClick={() => openEditMember(member)}>
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive"
                                  onClick={() => handleDeleteMember(member)}
                                >
                                  <Trash2 className="w-3 h-3" />
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
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Select a group to manage check-ins</p>
                <Button className="mt-4" onClick={() => setActiveSubTab("groups")}>
                  View Groups
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GroupCheckInsTab;
