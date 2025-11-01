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
}

interface CheckIn {
  id: string;
  user_id: string;
  check_in_time: string;
  check_out_time?: string;
  status: string;
  notes?: string;
  profiles?: {
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
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingResident, setEditingResident] = useState<Resident | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
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
    fetchCheckIns();

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
          fetchCheckIns();
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
      const { data, error } = await supabase
        .from('residents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResidents(data || []);
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

  const fetchCheckIns = async () => {
    try {
      // Get all residents' user_ids
      const residentUserIds = residents
        .filter(r => r.user_id)
        .map(r => r.user_id);

      if (residentUserIds.length === 0) {
        setCheckIns([]);
        return;
      }

      const { data: checkInsData, error } = await supabase
        .from('check_ins')
        .select('*')
        .in('user_id', residentUserIds)
        .order('check_in_time', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Fetch user details for each check-in
      const checkInsWithProfiles = [];
      if (checkInsData && checkInsData.length > 0) {
        for (const checkIn of checkInsData) {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('first_name, last_name, email, role')
            .eq('user_id', checkIn.user_id)
            .single();

          if (userProfile) {
            checkInsWithProfiles.push({
              ...checkIn,
              profiles: userProfile
            });
          }
        }
      }

      setCheckIns(checkInsWithProfiles);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch check-ins",
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

  const handleToggleCheckIn = async (resident: Resident) => {
    if (!resident.user_id) {
      toast({
        title: "Error",
        description: "This resident is not linked to a user account",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check for existing active check-in to prevent duplicates
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: existingCheckIns } = await supabase
        .from('check_ins')
        .select('*')
        .eq('user_id', resident.user_id)
        .eq('status', 'checked_in')
        .gte('check_in_time', today.toISOString());

      if (existingCheckIns && existingCheckIns.length > 0) {
        // User already checked in today, check them out
        const { error: checkoutError } = await supabase
          .from('check_ins')
          .update({ 
            status: 'checked_out', 
            check_out_time: new Date().toISOString(),
          })
          .eq('id', existingCheckIns[0].id);

        if (checkoutError) throw checkoutError;

        toast({
          title: "Success",
          description: "Resident checked out successfully",
        });
      } else {
        // No active check-in, create new one
        const { error: checkinError } = await supabase
          .from('check_ins')
          .insert({
            user_id: resident.user_id,
            status: 'checked_in',
            check_in_time: new Date().toISOString(),
            notes: 'Checked in by staff from Residents tab'
          });

        if (checkinError) throw checkinError;

        toast({
          title: "Success",
          description: "Resident checked in successfully",
        });
      }

      fetchCheckIns();
      onRefreshStats?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleManualCheckOut = async (checkInId: string) => {
    try {
      const { error } = await supabase
        .from('check_ins')
        .update({ 
          status: 'checked_out', 
          check_out_time: new Date().toISOString(),
          notes: 'Manual checkout by admin'
        })
        .eq('id', checkInId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Successfully checked out resident",
      });

      fetchCheckIns();
      onRefreshStats?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const downloadReport = () => {
    const csvContent = "data:text/csv;charset=utf-8," +
      "Name,Email,Phone,School,Hostel Admission,Status,Created At\n" +
      residents.map(resident => 
        `"${resident.full_name || resident.name}","${resident.email}","${resident.phone_number || resident.phone || ''}","${resident.school || ''}","${resident.hostel_admission || ''}","${resident.status}","${new Date(resident.created_at).toLocaleString()}"`
      ).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `residents_report_${new Date().toISOString().split('T')[0]}.csv`);
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

  const getCurrentCheckInStatus = (resident: Resident) => {
    if (!resident.user_id) return null;
    
    const activeCheckIn = checkIns.find(
      checkIn => checkIn.user_id === resident.user_id && checkIn.status === 'checked_in'
    );
    
    return activeCheckIn ? 'checked_in' : 'checked_out';
  };

  // Filter residents based on search query
  const filteredResidents = residents.filter(resident => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    const name = (resident.full_name || resident.name || '').toLowerCase();
    const email = (resident.email || '').toLowerCase();
    const hostel = (resident.hostel_admission || '').toLowerCase();
    
    return name.includes(query) || email.includes(query) || hostel.includes(query);
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
          <CardTitle>Recent Check-ins</CardTitle>
          <CardDescription>
            Latest activity from residents
          </CardDescription>
        </CardHeader>
        <CardContent>
          {checkIns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No check-in records yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resident Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Check-in Time</TableHead>
                  <TableHead>Check-out Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Approved By</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checkIns.map((checkIn) => (
                  <TableRow key={checkIn.id}>
                    <TableCell className="font-medium">
                      {checkIn.profiles ? (
                        `${checkIn.profiles.first_name} ${checkIn.profiles.last_name}`
                      ) : (
                        'Unknown'
                      )}
                    </TableCell>
                    <TableCell>{checkIn.profiles?.email || '-'}</TableCell>
                    <TableCell>
                      {new Date(checkIn.check_in_time).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {checkIn.check_out_time ? 
                        new Date(checkIn.check_out_time).toLocaleString() : 
                        '-'
                      }
                    </TableCell>
                    <TableCell>{getCheckInStatusBadge(checkIn.status)}</TableCell>
                    <TableCell>
                      {checkIn.notes?.includes('staff') ? 'Staff' : 'Self'}
                    </TableCell>
                    <TableCell>
                      {checkIn.status === 'checked_in' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleManualCheckOut(checkIn.id)}
                        >
                          <UserX className="mr-1 h-3 w-3" />
                          Check Out
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
              {filteredResidents.map((resident) => {
                const checkInStatus = getCurrentCheckInStatus(resident);
                return (
                  <TableRow key={resident.id}>
                    <TableCell className="font-medium">
                      {resident.full_name || resident.name}
                    </TableCell>
                    <TableCell>{resident.email}</TableCell>
                    <TableCell>{resident.phone_number || resident.phone || '-'}</TableCell>
                    <TableCell>{resident.school || '-'}</TableCell>
                    <TableCell>{getStatusBadge(resident.status)}</TableCell>
                    <TableCell>
                      {checkInStatus ? getCheckInStatusBadge(checkInStatus) : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {resident.user_id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleCheckIn(resident)}
                          >
                            {checkInStatus === 'checked_in' ? (
                              <>
                                <UserX className="mr-1 h-3 w-3" />
                                Check Out
                              </>
                            ) : (
                              <>
                                <UserCheck className="mr-1 h-3 w-3" />
                                Check In
                              </>
                            )}
                          </Button>
                        )}
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
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}