import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, UserCheck, UserX, Download, Users, Home, School, Phone } from "lucide-react";

interface ResidenceMember {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  school: string;
  hostel_admission: string;
  status: string;
  created_at: string;
  user_id?: string;
}

interface CheckIn {
  id: string;
  user_id: string;
  check_in_time: string;
  check_out_time?: string;
  status: string;
  created_at: string;
  profiles?: {
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

const ResidentsTab = () => {
  const [residents, setResidents] = useState<ResidenceMember[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchResidents();
    fetchRecentCheckIns();
  }, []);

  const fetchResidents = async () => {
    try {
      const { data, error } = await supabase
        .from('residence_members')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResidents(data || []);
    } catch (error) {
      console.error('Error fetching residents:', error);
      toast({
        title: "Error",
        description: "Failed to fetch residents",
        variant: "destructive",
      });
    }
  };

  const fetchRecentCheckIns = async () => {
    try {
      const { data, error } = await supabase
        .from('check_ins')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      // Fetch user profiles separately
      if (data && data.length > 0) {
        const userIds = data.map(checkIn => checkIn.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, email')
          .in('user_id', userIds);

        const enrichedData = data.map(checkIn => ({
          ...checkIn,
          profiles: profilesData?.find(p => p.user_id === checkIn.user_id)
        }));
        
        setCheckIns(enrichedData);
      } else {
        setCheckIns([]);
      }
    } catch (error) {
      console.error('Error fetching check-ins:', error);
    } finally {
      setLoading(false);
    }
  };

  const performCheckIn = async (memberId: string) => {
    try {
      const { data, error } = await supabase.rpc('residence_member_checkin', {
        member_id: memberId
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Residence member checked in successfully",
      });

      fetchRecentCheckIns();
    } catch (error) {
      console.error('Error checking in resident:', error);
      toast({
        title: "Error",
        description: "Failed to check in resident",
        variant: "destructive",
      });
    }
  };

  const performCheckOut = async (checkInId: string) => {
    try {
      const { error } = await supabase
        .from('check_ins')
        .update({ 
          status: 'checked_out',
          check_out_time: new Date().toISOString()
        })
        .eq('id', checkInId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Resident checked out successfully",
      });

      fetchRecentCheckIns();
    } catch (error) {
      console.error('Error checking out resident:', error);
      toast({
        title: "Error",
        description: "Failed to check out resident",
        variant: "destructive",
      });
    }
  };

  const exportCheckIns = () => {
    const csvContent = [
      ['Name', 'Email', 'Check In Time', 'Check Out Time', 'Status'],
      ...checkIns.map(checkIn => [
        `${checkIn.profiles?.first_name || ''} ${checkIn.profiles?.last_name || ''}`,
        checkIn.profiles?.email || '',
        new Date(checkIn.check_in_time).toLocaleString(),
        checkIn.check_out_time ? new Date(checkIn.check_out_time).toLocaleString() : '',
        checkIn.status
      ])
    ].map(row => row.map(field => `"${field}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `check_ins_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Check-ins exported successfully",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCheckInStatusBadge = (status: string) => {
    switch (status) {
      case 'checked_in':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Checked In</Badge>;
      case 'checked_out':
        return <Badge variant="secondary">Checked Out</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredResidents = residents.filter(resident => 
    resident.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resident.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resident.school.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading residents...</div>;
  }

  const activeResidents = residents.filter(r => r.status === 'active').length;
  const currentlyCheckedIn = checkIns.filter(c => c.status === 'checked_in').length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Residents</p>
                <p className="text-2xl font-bold">{residents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Home className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Active Residents</p>
                <p className="text-2xl font-bold">{activeResidents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Currently Checked In</p>
                <p className="text-2xl font-bold">{currentlyCheckedIn}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <School className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Recent Check-ins</p>
                <p className="text-2xl font-bold">{checkIns.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Residents Management */}
      <Card>
        <CardHeader>
          <CardTitle>Residence Members</CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search residents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Hostel Admission</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResidents.map((resident) => (
                <TableRow key={resident.id}>
                  <TableCell className="font-medium">{resident.full_name}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm">{resident.email}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {resident.phone_number}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{resident.school}</TableCell>
                  <TableCell>{resident.hostel_admission}</TableCell>
                  <TableCell>{getStatusBadge(resident.status)}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      onClick={() => performCheckIn(resident.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <UserCheck className="w-4 h-4 mr-1" />
                      Check In
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Check-ins */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Check-ins</CardTitle>
            <Button onClick={exportCheckIns} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Check In Time</TableHead>
                <TableHead>Check Out Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {checkIns.map((checkIn) => (
                <TableRow key={checkIn.id}>
                  <TableCell className="font-medium">
                    {checkIn.profiles?.first_name} {checkIn.profiles?.last_name}
                  </TableCell>
                  <TableCell>{checkIn.profiles?.email}</TableCell>
                  <TableCell>{new Date(checkIn.check_in_time).toLocaleString()}</TableCell>
                  <TableCell>
                    {checkIn.check_out_time ? 
                      new Date(checkIn.check_out_time).toLocaleString() : 
                      'Not checked out'
                    }
                  </TableCell>
                  <TableCell>{getCheckInStatusBadge(checkIn.status)}</TableCell>
                  <TableCell>
                    {checkIn.status === 'checked_in' && (
                      <Button
                        size="sm"
                        onClick={() => performCheckOut(checkIn.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        <UserX className="w-4 h-4 mr-1" />
                        Check Out
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResidentsTab;