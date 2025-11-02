import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Download, Plus, Edit, Trash2, UserCheck, UserX, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Resident {
  id: string;
  full_name: string;
  name: string;
  email: string;
  phone?: string;
  phone_number?: string;
  school?: string;
  hostel_admission?: string;
  status: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
  currentCheckIn?: {
    id: string;
    status: string;
    check_in_time: string;
    check_out_time?: string;
  } | null;
}

interface ResidentCheckIn {
  id: string;
  user_id: string;
  check_in_time: string;
  check_out_time?: string;
  status: string;
  notes?: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  };
}

interface ResidentsTabProps {
  onRefreshStats?: () => void;
}

export default function ResidentsTab({ onRefreshStats }: ResidentsTabProps) {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [recentCheckIns, setRecentCheckIns] = useState<ResidentCheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingResident, setEditingResident] = useState<Resident | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<'time' | 'status'>('time');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    school: "",
    hostel_admission: "",
    status: "active"
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchResidents();
    fetchRecentCheckIns();

    // Set up real-time subscriptions
    const residentsChannel = supabase
      .channel('residents-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'residents'
        },
        () => {
          fetchResidents();
          fetchRecentCheckIns();
          onRefreshStats?.();
        }
      )
      .subscribe();

    const checkInsChannel = supabase
      .channel('checkins-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'check_ins'
        },
        () => {
          fetchResidents();
          fetchRecentCheckIns();
          onRefreshStats?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(residentsChannel);
      supabase.removeChannel(checkInsChannel);
    };
  }, [onRefreshStats]);

  const fetchResidents = async () => {
    try {
      const { data: residentsData, error } = await supabase
        .from('residents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // For each resident, get their latest check-in status
      const residentsWithStatus = await Promise.all(
        (residentsData || []).map(async (resident) => {
          if (!resident.user_id) return resident;

          const { data: checkInData } = await supabase
            .from('check_ins')
            .select('id, status, check_in_time, check_out_time')
            .eq('user_id', resident.user_id)
            .eq('status', 'checked_in')
            .order('check_in_time', { ascending: false })
            .limit(1)
            .single();

          return {
            ...resident,
            currentCheckIn: checkInData || null
          };
        })
      );

      setResidents(residentsWithStatus);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch residents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentCheckIns = async () => {
    try {
      // First get all check-ins
      const { data: checkInsData, error: checkInsError } = await supabase
        .from('check_ins')
        .select('*')
        .order('check_in_time', { ascending: false })
        .limit(100);

      if (checkInsError) throw checkInsError;

      // Then get profiles for residents only
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, role')
        .eq('role', 'resident');

      if (profilesError) throw profilesError;

      // Create a map of user_id to profile
      const profilesMap = new Map(
        profilesData?.map(p => [p.user_id, p]) || []
      );

      // Filter and combine the data
      const residentCheckIns = (checkInsData || [])
        .filter(checkIn => profilesMap.has(checkIn.user_id))
        .map(checkIn => ({
          ...checkIn,
          profiles: profilesMap.get(checkIn.user_id)!
        }))
        .slice(0, 50); // Limit to 50 results

      setRecentCheckIns(residentCheckIns);
    } catch (error: any) {
      console.error("Error fetching recent check-ins:", error);
      toast({
        title: "Error",
        description: "Failed to fetch recent check-ins",
        variant: "destructive",
      });
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingResident) {
        const { error } = await supabase
          .from('residents')
          .update(formData)
          .eq('id', editingResident.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Resident updated successfully",
        });
      } else {
        const insertData = {
          ...formData,
          name: formData.full_name // Required field
        };
        
        const { error } = await supabase
          .from('residents')
          .insert([insertData]);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Resident added successfully",
        });
      }

      setIsDialogOpen(false);
      setEditingResident(null);
      setFormData({
        full_name: "",
        email: "",
        phone_number: "",
        school: "",
        hostel_admission: "",
        status: "active"
      });
      fetchResidents();
      onRefreshStats?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (resident: Resident) => {
    setEditingResident(resident);
    setFormData({
      full_name: resident.full_name || resident.name,
      email: resident.email,
      phone_number: resident.phone_number || resident.phone || "",
      school: resident.school || "",
      hostel_admission: resident.hostel_admission || "",
      status: resident.status
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (residentId: string) => {
    if (!confirm('Are you sure you want to delete this resident?')) return;

    try {
      const { error } = await supabase
        .from('residents')
        .delete()
        .eq('id', residentId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Resident deleted successfully",
      });
      
      fetchResidents();
      onRefreshStats?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCheckInFromRecord = async (userId: string) => {
    try {
      // Check if user already has an active check-in today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: existingCheckIn } = await supabase
        .from('check_ins')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'checked_in')
        .gte('check_in_time', today.toISOString())
        .single();

      if (existingCheckIn) {
        toast({
          title: "Already Checked In",
          description: "This resident is already checked in today",
          variant: "destructive",
        });
        return;
      }

      // Create new check-in record
      const { error } = await supabase
        .from('check_ins')
        .insert({
          user_id: userId,
          status: 'checked_in',
          check_in_time: new Date().toISOString(),
          notes: 'Checked in by staff from Residents tab'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Resident checked in successfully",
      });

      fetchRecentCheckIns();
      fetchResidents();
      onRefreshStats?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process action",
        variant: "destructive",
      });
    }
  };

  const handleCheckOutFromRecord = async (checkInId: string) => {
    try {
      const { error } = await supabase
        .from('check_ins')
        .update({ 
          status: 'checked_out', 
          check_out_time: new Date().toISOString(),
        })
        .eq('id', checkInId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Resident checked out successfully",
      });

      fetchRecentCheckIns();
      fetchResidents();
      onRefreshStats?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process action",
        variant: "destructive",
      });
    }
  };

  const handleCheckIn = async (resident: Resident) => {
    if (!resident.user_id) {
      toast({
        title: "Error",
        description: "This resident is not linked to a user account",
        variant: "destructive",
      });
      return;
    }

    await handleCheckInFromRecord(resident.user_id);
  };

  const handleCheckOut = async (resident: Resident) => {
    if (!resident.currentCheckIn) {
      toast({
        title: "Error",
        description: "No active check-in found for this resident",
        variant: "destructive",
      });
      return;
    }

    await handleCheckOutFromRecord(resident.currentCheckIn.id);
  };

  const downloadReport = () => {
    const csvContent = "data:text/csv;charset=utf-8," +
      "Name,Email,Check-in Time,Check-out Time,Status\n" +
      filteredAndSortedCheckIns.map(checkIn => {
        const name = `${checkIn.profiles.first_name} ${checkIn.profiles.last_name}`;
        const checkInTime = new Date(checkIn.check_in_time).toLocaleString();
        const checkOutTime = checkIn.check_out_time ? new Date(checkIn.check_out_time).toLocaleString() : '-';
        return `"${name}","${checkIn.profiles.email}","${checkInTime}","${checkOutTime}","${checkIn.status}"`;
      }).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `resident_checkins_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Inactive</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCheckInStatusBadge = (status: string) => {
    switch (status) {
      case 'checked_in':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Checked In</Badge>;
      case 'checked_out':
        return <Badge variant="outline">Checked Out</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Filter and sort recent check-ins
  const filteredAndSortedCheckIns = recentCheckIns
    .filter(checkIn => {
      // Filter by status
      if (statusFilter !== 'all' && checkIn.status !== statusFilter) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'status') {
        return a.status.localeCompare(b.status);
      } else {
        // Sort by most recent check-in time (default)
        return new Date(b.check_in_time).getTime() - new Date(a.check_in_time).getTime();
      }
    });

  // Filter and sort residents for management section
  const filteredAndSortedResidents = residents
    .filter(resident => {
      if (!searchQuery) return true;
      
      const query = searchQuery.toLowerCase();
      const name = (resident.full_name || resident.name || '').toLowerCase();
      const email = (resident.email || '').toLowerCase();
      const hostel = (resident.hostel_admission || '').toLowerCase();
      
      return name.includes(query) || email.includes(query) || hostel.includes(query);
    })
    .sort((a, b) => {
      // Sort by most recent check-in time
      const aTime = a.currentCheckIn?.check_in_time || a.created_at;
      const bTime = b.currentCheckIn?.check_in_time || b.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-[250px]" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[200px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Residents Management</h2>
          <p className="text-muted-foreground">
            Manage residential facility members and their check-in activity
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadReport}>
            <Download className="mr-2 h-4 w-4" />
            Download Report
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Resident
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editingResident ? "Edit Resident" : "Add New Resident"}
                </DialogTitle>
                <DialogDescription>
                  {editingResident ? "Update resident information" : "Add a new resident to the facility"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone_number">Phone Number</Label>
                  <Input
                    id="phone_number"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school">School</Label>
                  <Input
                    id="school"
                    value={formData.school}
                    onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hostel_admission">Hostel Admission</Label>
                  <Input
                    id="hostel_admission"
                    value={formData.hostel_admission}
                    onChange={(e) => setFormData({ ...formData, hostel_admission: e.target.value })}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setEditingResident(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingResident ? "Update" : "Add"} Resident
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Recent Check-ins Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle>Recent Check-ins</CardTitle>
              <CardDescription>
                Latest activity from residents
              </CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadReport}
              >
                <Download className="mr-2 h-4 w-4" />
                Export Report
              </Button>
              <Button
                variant={sortBy === 'time' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('time')}
              >
                Sort by Time
              </Button>
              <Button
                variant={sortBy === 'status' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('status')}
              >
                Sort by Status
              </Button>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="all">All Status</option>
                <option value="checked_in">Checked In</option>
                <option value="checked_out">Checked Out</option>
                <option value="pending_approval">Pending Approval</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAndSortedCheckIns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No check-in records found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resident Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Check-in Time</TableHead>
                    <TableHead>Check-out Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedCheckIns.map((checkIn) => (
                    <TableRow key={checkIn.id}>
                      <TableCell className="font-medium">
                        {checkIn.profiles.first_name} {checkIn.profiles.last_name}
                      </TableCell>
                      <TableCell>{checkIn.profiles.email}</TableCell>
                      <TableCell>
                        {new Date(checkIn.check_in_time).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {checkIn.check_out_time ? 
                          new Date(checkIn.check_out_time).toLocaleString() : 
                          '-'
                        }
                      </TableCell>
                      <TableCell>
                        {checkIn.status === 'checked_in' ? (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                            Checked In
                          </Badge>
                        ) : checkIn.status === 'checked_out' ? (
                          <Badge variant="outline">Checked Out</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            Pending Approval
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {checkIn.status === 'checked_in' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCheckOutFromRecord(checkIn.id)}
                            >
                              <UserX className="mr-1 h-3 w-3" />
                              Check Out
                            </Button>
                          ) : checkIn.status === 'checked_out' ? (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleCheckInFromRecord(checkIn.user_id)}
                            >
                              <UserCheck className="mr-1 h-3 w-3" />
                              Check In
                            </Button>
                          ) : null}
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

      {/* Resident Search & Management */}
      <Card>
        <CardHeader>
          <CardTitle>Resident Search & Check-in Management</CardTitle>
          <CardDescription>
            Search and manage resident check-ins
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or hostel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Check-in Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedResidents.map((resident) => (
                <TableRow key={resident.id}>
                  <TableCell className="font-medium">
                    {resident.full_name || resident.name}
                  </TableCell>
                  <TableCell>{resident.email}</TableCell>
                  <TableCell>{resident.phone_number || resident.phone || '-'}</TableCell>
                  <TableCell>{resident.school || '-'}</TableCell>
                  <TableCell>{getStatusBadge(resident.status)}</TableCell>
                  <TableCell>
                    {resident.currentCheckIn ? (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        Checked In
                      </Badge>
                    ) : (
                      <Badge variant="outline">Not Checked In</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(resident)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(resident.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}