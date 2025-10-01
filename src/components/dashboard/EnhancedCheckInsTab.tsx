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
  profiles: {
    first_name: string;
    last_name: string;
    role: string;
    email?: string;
  };
}

const EnhancedCheckInsTab = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [roleFilter, setRoleFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filteredCheckIns, setFilteredCheckIns] = useState<CheckIn[]>([]);
  const [allCheckIns, setAllCheckIns] = useState<CheckIn[]>([]);

  const formatDuration = (checkInTime: string, checkOutTime?: string) => {
    const endTime = checkOutTime ? new Date(checkOutTime) : new Date();
    const checkIn = new Date(checkInTime);
    const diffMs = endTime.getTime() - checkIn.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHours}h ${diffMinutes}m`;
  };

  const fetchAllCheckIns = async () => {
    try {
      const { data, error } = await supabase
        .from('v_recent_activities')
        .select('*')
        .order('check_in_time', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our CheckIn interface
      const transformedData = (data || []).map(item => ({
        id: item.id!,
        user_id: item.user_id!,
        check_in_time: item.check_in_time!,
        check_out_time: item.check_out_time || undefined,
        status: item.status!,
        notes: item.notes || undefined,
        profiles: {
          first_name: item.first_name || 'Unknown',
          last_name: item.last_name || 'Unknown',
          role: item.role || 'Unknown',
          email: (item as any).email || 'No email' // Safely access email field
        }
      }));
      
      setAllCheckIns(transformedData);
      setFilteredCheckIns(transformedData);
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
      // Search for users and get their check-in status
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, id, email, first_name, last_name, role')
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,role.ilike.%${searchTerm}%`);
      
      if (profilesError) throw profilesError;
      
      // Get check-in status for each user
      const enrichedResults = await Promise.all(
        (profiles || []).map(async (profile) => {
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
      // First check if user is already checked in
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
      
      // Insert new check-in record
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
      
      // Refresh data immediately
      await fetchAllCheckIns();
      await handleSearch(); // Refresh search results to update status
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
      // Find the latest open check-in for this user
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
      
      // Update the open check-in record
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
      
      // Refresh data immediately
      await fetchAllCheckIns();
      await handleSearch(); // Refresh search results to update status
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

  const handleFilterCheckIns = async () => {
    try {
      let query = supabase
        .from('v_recent_activities')
        .select('*')
        .order('check_in_time', { ascending: false });

      // Apply date filters
      if (dateFrom) {
        query = query.gte('check_in_time', `${dateFrom}T00:00:00`);
      }
      if (dateTo) {
        query = query.lte('check_in_time', `${dateTo}T23:59:59`);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      let filtered = (data || []).map(item => ({
        id: item.id!,
        user_id: item.user_id!,
        check_in_time: item.check_in_time!,
        check_out_time: item.check_out_time || undefined,
        status: item.status!,
        notes: item.notes || undefined,
        profiles: {
          first_name: item.first_name || 'Unknown',
          last_name: item.last_name || 'Unknown',
          role: item.role || 'Unknown',
          email: (item as any).email || 'No email'
        }
      }));
      
      // Apply role filter
      if (roleFilter !== 'all') {
        filtered = filtered.filter(checkIn => 
          checkIn.profiles?.role === roleFilter
        );
      }
      
      setFilteredCheckIns(filtered);
    } catch (error) {
      console.error('Error filtering check-ins:', error);
      toast({
        title: "Filter Error",
        description: "Failed to filter check-ins",
        variant: "destructive",
      });
    }
  };

  const downloadCSVReport = () => {
    const csvData = filteredCheckIns.map(checkIn => ({
      Name: `${checkIn.profiles?.first_name} ${checkIn.profiles?.last_name}`,
      Email: checkIn.profiles?.email || 'No email',
      Role: checkIn.profiles?.role,
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
  }, []);

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            User Search & Check-in Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Box */}
          <div className="flex gap-2">
            <Input
              placeholder="Search by name, email, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={!searchTerm.trim()}>
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Role Filter</label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="resident">Resident</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
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
            <div className="flex items-end">
              <Button onClick={handleFilterCheckIns} className="w-full">
                <Filter className="w-4 h-4 mr-2" />
                Apply Filters
              </Button>
            </div>
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

      {/* Check-ins History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Check-ins History ({filteredCheckIns.length})
            </span>
            <div className="flex gap-2">
              <Button onClick={downloadCSVReport} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download CSV
              </Button>
              <Button onClick={fetchAllCheckIns}>
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