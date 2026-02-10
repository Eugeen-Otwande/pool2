import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { 
  Search, 
  CheckCircle, 
  XCircle, 
  Filter,
  Download,
  RefreshCw,
  Users
} from "lucide-react";

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  check_in_status: string | null;
}

interface CheckIn {
  id: string;
  user_id: string;
  check_in_time: string;
  check_out_time?: string;
  status: string;
  notes?: string;
  group_id?: string | null;
  checked_in_by?: string | null;
  profiles: {
    first_name: string;
    last_name: string;
    role: string;
    email?: string;
  };
  group_name?: string | null;
}

const EnhancedCheckInsTab = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [roleFilter, setRoleFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filteredCheckIns, setFilteredCheckIns] = useState<CheckIn[]>([]);
  const [allCheckIns, setAllCheckIns] = useState<CheckIn[]>([]);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);

  const formatDuration = (checkInTime: string, checkOutTime?: string) => {
    const endTime = checkOutTime ? new Date(checkOutTime) : new Date();
    const checkIn = new Date(checkInTime);
    const diffMs = endTime.getTime() - checkIn.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHours}h ${diffMinutes}m`;
  };

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('id, name')
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const fetchAllCheckIns = async () => {
    try {
      // Fetch check-ins with group info
      const { data, error } = await supabase
        .from('check_ins')
        .select('*, groups(name)')
        .order('check_in_time', { ascending: false })
        .limit(200);

      if (error) throw error;

      // Fetch profile info for each check-in
      const checkInsWithProfiles = await Promise.all(
        (data || []).map(async (checkIn) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, role, email')
            .eq('user_id', checkIn.user_id)
            .maybeSingle();

          return {
            id: checkIn.id,
            user_id: checkIn.user_id,
            check_in_time: checkIn.check_in_time,
            check_out_time: checkIn.check_out_time || undefined,
            status: checkIn.status,
            notes: checkIn.notes || undefined,
            group_id: checkIn.group_id,
            checked_in_by: checkIn.checked_in_by,
            profiles: {
              first_name: profile?.first_name || 'Unknown',
              last_name: profile?.last_name || 'Unknown',
              role: profile?.role || 'Unknown',
              email: profile?.email || 'No email',
            },
            group_name: (checkIn.groups as any)?.name || null,
          };
        })
      );
      
      setAllCheckIns(checkInsWithProfiles);
      setFilteredCheckIns(checkInsWithProfiles);
    } catch (error) {
      console.error('Error fetching check-ins:', error);
      toast({
        title: "Error",
        description: "Failed to fetch check-in history",
        variant: "destructive",
      });
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, id, email, first_name, last_name, role')
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,role.ilike.%${searchTerm}%`);
      
      if (profilesError) throw profilesError;
      
      const { data: residents, error: residentsError } = await supabase
        .from('residents')
        .select('user_id, id, email, name, phone, status')
        .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
        .eq('status', 'active');
      
      if (residentsError) throw residentsError;
      
      const residentsAsProfiles = (residents || [])
        .filter(r => r.user_id)
        .map(resident => ({
          user_id: resident.user_id!,
          id: resident.id,
          email: resident.email,
          first_name: resident.name?.split(' ')[0] || 'Resident',
          last_name: resident.name?.split(' ').slice(1).join(' ') || '',
          role: 'resident'
        }));
      
      const allProfiles = [...(profiles || []), ...residentsAsProfiles];
      const uniqueProfiles = allProfiles.filter((profile, index, self) =>
        index === self.findIndex((p) => p.user_id === profile.user_id)
      );
      
      const enrichedResults = await Promise.all(
        uniqueProfiles.map(async (profile) => {
          try {
            const { data: statusData } = await supabase.rpc('get_user_checkin_status', {
              _user_id: profile.user_id
            });
            
            return {
              ...profile,
              check_in_status: statusData?.[0]?.is_checked_in ? 'Checked In' : 'Not Checked In'
            };
          } catch (statusError) {
            console.error('Error getting check-in status for user:', profile.user_id, statusError);
            return {
              ...profile,
              check_in_status: 'Unknown'
            };
          }
        })
      );
      
      setSearchResults(enrichedResults);
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        title: "Search Error",
        description: "Failed to search users",
        variant: "destructive",
      });
    }
  };

  const handleStaffCheckIn = async (userId: string, userName: string) => {
    try {
      const { data: statusData, error: statusError } = await supabase.rpc('get_user_checkin_status', {
        _user_id: userId
      });
      
      if (statusError) throw statusError;
      
      if (statusData?.[0]?.is_checked_in) {
        toast({
          title: "Check-in Error",
          description: "User is already checked in.",
          variant: "destructive",
        });
        return;
      }
      
      const today = new Date().toISOString().split('T')[0];
      const { data: todayCheckIns } = await supabase
        .from('check_ins')
        .select('id')
        .eq('user_id', userId)
        .gte('check_in_time', `${today}T00:00:00`)
        .lte('check_in_time', `${today}T23:59:59`);
      
      if (todayCheckIns && todayCheckIns.length > 0) {
        toast({
          title: "Check-in Error",
          description: "User already has a check-in record for today.",
          variant: "destructive",
        });
        return;
      }
      
      const { error: insertError } = await supabase
        .from('check_ins')
        .insert({
          user_id: userId,
          check_in_time: new Date().toISOString(),
          status: 'checked_in'
        });
      
      if (insertError) throw insertError;
      
      toast({
        title: "Success",
        description: `${userName} has been checked in`,
      });
      
      await fetchAllCheckIns();
      await handleSearch();
    } catch (error) {
      console.error('Error checking in user:', error);
      let errorMessage = "Failed to check in user";
      
      if (error instanceof Error) {
        if (error.message.includes('violates row-level security')) {
          errorMessage = "Permission denied: User not found or access restricted";
        } else if (error.message.includes('duplicate key')) {
          errorMessage = "User is already checked in";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Check-in Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleStaffCheckOut = async (userId: string, userName: string) => {
    try {
      const { data: openCheckIns, error: queryError } = await supabase
        .from('check_ins')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'checked_in')
        .is('check_out_time', null)
        .order('check_in_time', { ascending: false })
        .limit(1);
      
      if (queryError) throw queryError;
      
      if (!openCheckIns || openCheckIns.length === 0) {
        toast({
          title: "Check-out Error",
          description: "User is not currently checked in.",
          variant: "destructive",
        });
        return;
      }
      
      const { error: updateError } = await supabase
        .from('check_ins')
        .update({
          check_out_time: new Date().toISOString(),
          status: 'checked_out'
        })
        .eq('id', openCheckIns[0].id);
      
      if (updateError) throw updateError;
      
      toast({
        title: "Success",
        description: `${userName} has been checked out`,
      });
      
      await fetchAllCheckIns();
      await handleSearch();
    } catch (error) {
      console.error('Error checking out user:', error);
      let errorMessage = "Failed to check out user";
      
      if (error instanceof Error) {
        if (error.message.includes('violates row-level security')) {
          errorMessage = "Permission denied: User not found or access restricted";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Check-out Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleManualCheckOut = async (checkInId: string, userName: string) => {
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
        description: `${userName} has been checked out`,
      });
      
      fetchAllCheckIns();
    } catch (error) {
      console.error('Error checking out user:', error);
      toast({
        title: "Check-out Error",
        description: "Failed to check out user",
        variant: "destructive",
      });
    }
  };

  const downloadCSVReport = () => {
    const csvData = filteredCheckIns.map(checkIn => ({
      Name: `${checkIn.profiles?.first_name} ${checkIn.profiles?.last_name}`,
      Email: checkIn.profiles?.email || 'No email',
      Role: checkIn.profiles?.role,
      Group: checkIn.group_name || 'Individual',
      'Check-in Time': new Date(checkIn.check_in_time).toLocaleString(),
      'Check-out Time': checkIn.check_out_time ? new Date(checkIn.check_out_time).toLocaleString() : 'Still checked in',
      Duration: checkIn.check_out_time 
        ? formatDuration(checkIn.check_in_time, checkIn.check_out_time)
        : formatDuration(checkIn.check_in_time),
      Status: checkIn.status,
      Notes: checkIn.notes || ''
    }));

    if (csvData.length === 0) {
      toast({
        title: "No Data",
        description: "No check-ins to export",
        variant: "destructive",
      });
      return;
    }

    const headers = Object.keys(csvData[0]);
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header as keyof typeof row] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `check-ins-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "CSV report downloaded successfully",
    });
  };

  useEffect(() => {
    fetchAllCheckIns();
    fetchGroups();
  }, []);

  // Auto-apply filters when filters change
  useEffect(() => {
    if (allCheckIns.length > 0) {
      let filtered = [...allCheckIns];

      // Role filter
      if (roleFilter !== 'all') {
        filtered = filtered.filter(c => c.profiles?.role === roleFilter);
      }

      // Group filter
      if (groupFilter !== 'all') {
        if (groupFilter === 'individual') {
          filtered = filtered.filter(c => !c.group_id);
        } else {
          filtered = filtered.filter(c => c.group_id === groupFilter);
        }
      }

      // Date filters
      if (dateFrom) {
        filtered = filtered.filter(c => c.check_in_time >= `${dateFrom}T00:00:00`);
      }
      if (dateTo) {
        filtered = filtered.filter(c => c.check_in_time <= `${dateTo}T23:59:59`);
      }

      setFilteredCheckIns(filtered);
    }
  }, [roleFilter, groupFilter, dateFrom, dateTo, allCheckIns]);

  return (
    <div className="space-y-6">
      {/* User Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            User Search & Check-in Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Search by name, email, or phone (Students, Members, Residents, Visitors)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={!searchTerm.trim()}>
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Search Results ({searchResults.length})
              </span>
              <Button onClick={() => setSearchResults([])} variant="outline" size="sm">
                Clear Results
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {searchResults.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
                  <div className="flex items-center space-x-3">
                    <div>
                      <p className="font-medium">{user.first_name} {user.last_name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <Badge variant="outline">{user.role}</Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={user.check_in_status === 'Checked In' ? 'default' : 'secondary'}
                    >
                      {user.check_in_status || 'Not Checked In'}
                    </Badge>
                    {user.check_in_status === 'Checked In' ? (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleStaffCheckOut(user.user_id, `${user.first_name} ${user.last_name}`)}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Check Out
                      </Button>
                    ) : (
                      <Button 
                        size="sm"
                        onClick={() => handleStaffCheckIn(user.user_id, `${user.first_name} ${user.last_name}`)}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Check In
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters for Check-ins History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filter Check-ins History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Role</label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="resident">Resident</SelectItem>
                  <SelectItem value="visitor">Visitor</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="rcmrd_team">RCMRD Team</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Group</label>
              <Select value={groupFilter} onValueChange={setGroupFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All (Group + Individual)</SelectItem>
                  <SelectItem value="individual">Individual Only</SelectItem>
                  {groups.map(g => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">From Date</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">To Date</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Check-ins History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Check-ins History ({filteredCheckIns.length})
            </span>
            <div className="flex gap-2">
              <Button onClick={downloadCSVReport} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download CSV
              </Button>
              <Button onClick={fetchAllCheckIns} size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Check-in Time</TableHead>
                <TableHead>Check-out Time</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCheckIns.map((checkIn) => (
                <TableRow key={checkIn.id}>
                  <TableCell className="font-medium">
                    {checkIn.profiles?.first_name} {checkIn.profiles?.last_name}
                  </TableCell>
                  <TableCell>
                    {checkIn.profiles?.email || 'No email'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{checkIn.profiles?.role}</Badge>
                  </TableCell>
                  <TableCell>
                    {checkIn.group_name ? (
                      <Badge variant="secondary">{checkIn.group_name}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(checkIn.check_in_time).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {checkIn.check_out_time 
                      ? new Date(checkIn.check_out_time).toLocaleString() 
                      : 'Still checked in'
                    }
                  </TableCell>
                  <TableCell>
                    {checkIn.check_out_time 
                      ? formatDuration(checkIn.check_in_time, checkIn.check_out_time)
                      : formatDuration(checkIn.check_in_time)
                    }
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={checkIn.status === 'checked_in' ? 'default' : 'secondary'}
                    >
                      {checkIn.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {checkIn.status === 'checked_in' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleManualCheckOut(
                          checkIn.id,
                          `${checkIn.profiles?.first_name} ${checkIn.profiles?.last_name}`
                        )}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
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

export default EnhancedCheckInsTab;
