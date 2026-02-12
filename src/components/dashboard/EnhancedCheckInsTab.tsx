import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  Search, 
  CheckCircle, 
  XCircle, 
  Filter,
  Download,
  RefreshCw,
  Users,
  ChevronLeft,
  ChevronRight,
  Loader2,
  UserCheck,
  UserX
} from "lucide-react";

interface CheckInRow {
  id: string;
  user_id: string;
  check_in_time: string;
  check_out_time: string | null;
  status: string;
  notes: string | null;
  group_id: string | null;
  checked_in_by: string | null;
  first_name: string | null;
  last_name: string | null;
  user_email: string | null;
  user_role: string | null;
  group_name: string | null;
}

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  check_in_status: string | null;
  source: 'profile' | 'visitor';
  visitor_id?: string;
}

interface GroupMember {
  id: string;
  member_name: string;
  member_email: string | null;
  member_phone: string | null;
  member_role: string;
  status: string;
  user_id: string | null;
}

interface GroupWithMembers {
  id: string;
  name: string;
  group_type: string;
  organization: string | null;
  contact_person: string | null;
  members: GroupMember[];
}

const PAGE_SIZE = 30;
const CACHE_TTL = 30_000; // 30 seconds

const EnhancedCheckInsTab = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [roleFilter, setRoleFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [checkIns, setCheckIns] = useState<CheckInRow[]>([]);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [groupsWithMembers, setGroupsWithMembers] = useState<GroupWithMembers[]>([]);
  const [groupMembersLoading, setGroupMembersLoading] = useState(false);
  const [groupActionLoading, setGroupActionLoading] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const cacheRef = useRef<{ data: CheckInRow[]; count: number; key: string; ts: number } | null>(null);

  const formatDuration = (checkInTime: string, checkOutTime?: string | null) => {
    const endTime = checkOutTime ? new Date(checkOutTime) : new Date();
    const checkIn = new Date(checkInTime);
    const diffMs = endTime.getTime() - checkIn.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHours}h ${diffMinutes}m`;
  };

  const cacheKey = useMemo(() => 
    `${roleFilter}|${groupFilter}|${dateFrom}|${dateTo}|${page}`,
    [roleFilter, groupFilter, dateFrom, dateTo, page]
  );

  const fetchGroups = useCallback(async () => {
    const { data } = await supabase
      .from('groups')
      .select('id, name')
      .eq('status', 'active')
      .order('name');
    setGroups(data || []);
  }, []);

  const fetchGroupsWithMembers = useCallback(async () => {
    setGroupMembersLoading(true);
    try {
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('id, name, group_type, organization, contact_person')
        .eq('status', 'active')
        .order('name');

      if (groupsError) throw groupsError;
      if (!groupsData || groupsData.length === 0) {
        setGroupsWithMembers([]);
        return;
      }

      const groupIds = groupsData.map(g => g.id);
      const { data: membersData, error: membersError } = await supabase
        .from('group_members')
        .select('id, member_name, member_email, member_phone, member_role, status, user_id, group_id')
        .in('group_id', groupIds)
        .eq('status', 'active');

      if (membersError) throw membersError;

      const membersByGroup = (membersData || []).reduce((acc, m) => {
        const gid = (m as any).group_id;
        if (!acc[gid]) acc[gid] = [];
        acc[gid].push(m as GroupMember);
        return acc;
      }, {} as Record<string, GroupMember[]>);

      setGroupsWithMembers(groupsData.map(g => ({
        ...g,
        members: membersByGroup[g.id] || [],
      })));
    } catch (error) {
      console.error('Error fetching groups with members:', error);
    } finally {
      setGroupMembersLoading(false);
    }
  }, []);

  const handleGroupMemberCheckIn = async (member: GroupMember, groupId: string, groupName: string) => {
    if (!member.user_id) {
      toast({ title: "Cannot Check In", description: `${member.member_name} has no linked user account`, variant: "destructive" });
      return;
    }
    setGroupActionLoading(member.id);
    try {
      const { error } = await supabase
        .from('check_ins')
        .insert({ user_id: member.user_id, check_in_time: new Date().toISOString(), status: 'checked_in', group_id: groupId });
      if (error) throw error;
      toast({ title: "Success", description: `${member.member_name} checked in (${groupName})` });
      cacheRef.current = null;
      fetchCheckIns(true);
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to check in member", variant: "destructive" });
    } finally {
      setGroupActionLoading(null);
    }
  };

  const handleBulkGroupCheckIn = async (group: GroupWithMembers) => {
    setGroupActionLoading(`bulk-${group.id}`);
    try {
      const { error } = await supabase.rpc('bulk_group_checkin', { p_group_id: group.id });
      if (error) throw error;
      toast({ title: "Success", description: `All members of ${group.name} checked in` });
      cacheRef.current = null;
      fetchCheckIns(true);
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to bulk check in", variant: "destructive" });
    } finally {
      setGroupActionLoading(null);
    }
  };

  const handleBulkGroupCheckOut = async (group: GroupWithMembers) => {
    setGroupActionLoading(`bulkout-${group.id}`);
    try {
      const { error } = await supabase.rpc('bulk_group_checkout', { p_group_id: group.id });
      if (error) throw error;
      toast({ title: "Success", description: `All members of ${group.name} checked out` });
      cacheRef.current = null;
      fetchCheckIns(true);
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to bulk check out", variant: "destructive" });
    } finally {
      setGroupActionLoading(null);
    }
  };

  const fetchCheckIns = useCallback(async (skipCache = false) => {
    // Check cache
    if (!skipCache && cacheRef.current && cacheRef.current.key === cacheKey && Date.now() - cacheRef.current.ts < CACHE_TTL) {
      setCheckIns(cacheRef.current.data);
      setTotalCount(cacheRef.current.count);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Build query using the view for single-query joins
      let query = supabase
        .from('v_check_ins_with_details')
        .select('id, user_id, check_in_time, check_out_time, status, notes, group_id, checked_in_by, first_name, last_name, user_email, user_role, group_name', { count: 'exact' })
        .order('check_in_time', { ascending: false })
        .range(from, to);

      // Server-side filters
      if (roleFilter !== 'all') {
        query = query.eq('user_role', roleFilter);
      }
      if (groupFilter === 'individual') {
        query = query.is('group_id', null);
      } else if (groupFilter !== 'all') {
        query = query.eq('group_id', groupFilter);
      }
      if (dateFrom) {
        query = query.gte('check_in_time', `${dateFrom}T00:00:00`);
      }
      if (dateTo) {
        query = query.lte('check_in_time', `${dateTo}T23:59:59`);
      }

      const { data, count, error } = await query;
      if (error) throw error;

      const rows = (data || []) as CheckInRow[];
      setCheckIns(rows);
      setTotalCount(count || 0);

      // Cache result
      cacheRef.current = { data: rows, count: count || 0, key: cacheKey, ts: Date.now() };
    } catch (error) {
      console.error('Error fetching check-ins:', error);
      toast({ title: "Error", description: "Failed to fetch check-in history", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [cacheKey, page, roleFilter, groupFilter, dateFrom, dateTo]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setSearchLoading(true);
    try {
      // Search profiles and visitors in parallel
      const [profilesRes, visitorsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, id, email, first_name, last_name, role, check_in_status')
          .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,role.ilike.%${searchTerm}%`)
          .limit(15),
        supabase
          .from('visitors')
          .select('id, first_name, last_name, email, phone, check_in_status, date_of_visit, payment_status')
          .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
          .limit(10)
      ]);

      if (profilesRes.error) throw profilesRes.error;

      const profileResults: UserProfile[] = (profilesRes.data || []).map(p => ({
        ...p,
        check_in_status: p.check_in_status || 'Not Checked In',
        source: 'profile' as const,
      }));

      const visitorResults: UserProfile[] = (visitorsRes.data || []).map(v => ({
        id: v.id,
        user_id: v.id,
        email: v.email,
        first_name: v.first_name,
        last_name: v.last_name,
        role: 'visitor',
        check_in_status: v.check_in_status || 'Not Checked In',
        source: 'visitor' as const,
        visitor_id: v.id,
      }));

      setSearchResults([...profileResults, ...visitorResults]);
    } catch (error) {
      console.error('Error searching users:', error);
      toast({ title: "Search Error", description: "Failed to search users", variant: "destructive" });
    } finally {
      setSearchLoading(false);
    }
  };

  const handleStaffCheckIn = async (userId: string, userName: string) => {
    setActionLoading(userId);
    try {
      // Optimistic update on search results
      setSearchResults(prev => prev.map(u => 
        u.user_id === userId ? { ...u, check_in_status: 'Checked In' } : u
      ));

      const { error } = await supabase
        .from('check_ins')
        .insert({ user_id: userId, check_in_time: new Date().toISOString(), status: 'checked_in' });

      if (error) {
        // Revert optimistic update
        setSearchResults(prev => prev.map(u => 
          u.user_id === userId ? { ...u, check_in_status: 'Not Checked In' } : u
        ));
        throw error;
      }

      toast({ title: "Success", description: `${userName} has been checked in` });
      // Invalidate cache and refresh
      cacheRef.current = null;
      fetchCheckIns(true);
    } catch (error: any) {
      console.error('Error checking in user:', error);
      let msg = "Failed to check in user";
      if (error?.message?.includes('violates row-level security')) msg = "Permission denied";
      else if (error?.message?.includes('duplicate key')) msg = "User is already checked in";
      else if (error?.message) msg = error.message;
      toast({ title: "Check-in Error", description: msg, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleStaffCheckOut = async (userId: string, userName: string) => {
    setActionLoading(userId);
    try {
      // Optimistic update on search results
      setSearchResults(prev => prev.map(u => 
        u.user_id === userId ? { ...u, check_in_status: 'Checked Out' } : u
      ));

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
        setSearchResults(prev => prev.map(u => 
          u.user_id === userId ? { ...u, check_in_status: 'Not Checked In' } : u
        ));
        toast({ title: "Check-out Error", description: "User is not currently checked in.", variant: "destructive" });
        return;
      }

      const { error } = await supabase
        .from('check_ins')
        .update({ check_out_time: new Date().toISOString(), status: 'checked_out' })
        .eq('id', openCheckIns[0].id);

      if (error) throw error;

      toast({ title: "Success", description: `${userName} has been checked out` });
      cacheRef.current = null;
      fetchCheckIns(true);
    } catch (error: any) {
      console.error('Error checking out user:', error);
      toast({ title: "Check-out Error", description: error?.message || "Failed to check out user", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleVisitorCheckIn = async (visitorId: string, visitorName: string) => {
    setActionLoading(visitorId);
    setSearchResults(prev => prev.map(u => 
      u.visitor_id === visitorId ? { ...u, check_in_status: 'Checked In' } : u
    ));
    try {
      const { error } = await supabase.rpc('visitor_checkin_checkout', { visitor_id: visitorId, action: 'check_in' });
      if (error) throw error;
      toast({ title: "Success", description: `${visitorName} has been checked in` });
    } catch (error: any) {
      setSearchResults(prev => prev.map(u => 
        u.visitor_id === visitorId ? { ...u, check_in_status: 'Not Checked In' } : u
      ));
      toast({ title: "Error", description: error?.message || "Failed to check in visitor", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleVisitorCheckOut = async (visitorId: string, visitorName: string) => {
    setActionLoading(visitorId);
    setSearchResults(prev => prev.map(u => 
      u.visitor_id === visitorId ? { ...u, check_in_status: 'Checked Out' } : u
    ));
    try {
      const { error } = await supabase.rpc('visitor_checkin_checkout', { visitor_id: visitorId, action: 'check_out' });
      if (error) throw error;
      toast({ title: "Success", description: `${visitorName} has been checked out` });
    } catch (error: any) {
      setSearchResults(prev => prev.map(u => 
        u.visitor_id === visitorId ? { ...u, check_in_status: 'Checked In' } : u
      ));
      toast({ title: "Error", description: error?.message || "Failed to check out visitor", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleManualCheckOut = async (checkInId: string, userName: string) => {
    setActionLoading(checkInId);
    // Optimistic: remove from active list
    setCheckIns(prev => prev.map(c => 
      c.id === checkInId ? { ...c, status: 'checked_out', check_out_time: new Date().toISOString() } : c
    ));

    try {
      const { error } = await supabase
        .from('check_ins')
        .update({ status: 'checked_out', check_out_time: new Date().toISOString() })
        .eq('id', checkInId);

      if (error) throw error;
      toast({ title: "Success", description: `${userName} has been checked out` });
      cacheRef.current = null;
    } catch (error) {
      console.error('Error checking out user:', error);
      toast({ title: "Check-out Error", description: "Failed to check out user", variant: "destructive" });
      // Revert
      cacheRef.current = null;
      fetchCheckIns(true);
    } finally {
      setActionLoading(null);
    }
  };

  const downloadCSVReport = () => {
    const csvData = checkIns.map(c => ({
      Name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown',
      Email: c.user_email || 'No email',
      Role: c.user_role || 'Unknown',
      Group: c.group_name || 'Individual',
      'Check-in Time': new Date(c.check_in_time).toLocaleString(),
      'Check-out Time': c.check_out_time ? new Date(c.check_out_time).toLocaleString() : 'Still checked in',
      Duration: formatDuration(c.check_in_time, c.check_out_time),
      Status: c.status,
      Notes: c.notes || ''
    }));

    if (csvData.length === 0) {
      toast({ title: "No Data", description: "No check-ins to export", variant: "destructive" });
      return;
    }

    const headers = Object.keys(csvData[0]);
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(h => `"${row[h as keyof typeof row] || ''}"`).join(','))
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
    toast({ title: "Success", description: "CSV report downloaded successfully" });
  };

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [roleFilter, groupFilter, dateFrom, dateTo]);

  // Fetch data
  useEffect(() => {
    fetchCheckIns();
  }, [fetchCheckIns]);

  useEffect(() => {
    fetchGroups();
    fetchGroupsWithMembers();
  }, [fetchGroups, fetchGroupsWithMembers]);

  // Real-time subscription for check-in changes
  useEffect(() => {
    const channel = supabase
      .channel('check_ins_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'check_ins' }, () => {
        cacheRef.current = null;
        fetchCheckIns(true);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchCheckIns]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const SkeletonRow = () => (
    <TableRow>
      {Array.from({ length: 9 }).map((_, i) => (
        <TableCell key={i}><Skeleton className="h-4 w-full" /></TableCell>
      ))}
    </TableRow>
  );

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
              placeholder="Search users or visitors by name, email, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={!searchTerm.trim() || searchLoading}>
              {searchLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
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
              <Button onClick={() => setSearchResults([])} variant="outline" size="sm">Clear Results</Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {searchResults.map((user) => {
                const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
                const isVisitor = user.source === 'visitor';
                const isCheckedIn = user.check_in_status === 'Checked In';
                const loadingId = isVisitor ? user.visitor_id! : user.user_id;

                return (
                  <div key={`${user.source}-${user.id}`} className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
                    <div className="flex items-center space-x-3">
                      <div>
                        <p className="font-medium">{name || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <Badge variant="outline">{user.role}</Badge>
                      {isVisitor && <Badge variant="secondary" className="text-xs">Visitor</Badge>}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={isCheckedIn ? 'default' : 'secondary'}>
                        {user.check_in_status || 'Not Checked In'}
                      </Badge>
                      {isVisitor ? (
                        isCheckedIn ? (
                          <Button size="sm" variant="outline" disabled={actionLoading === loadingId}
                            onClick={() => handleVisitorCheckOut(user.visitor_id!, name)}>
                            {actionLoading === loadingId ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                            Check Out
                          </Button>
                        ) : user.check_in_status !== 'Checked Out' ? (
                          <Button size="sm" disabled={actionLoading === loadingId}
                            onClick={() => handleVisitorCheckIn(user.visitor_id!, name)}>
                            {actionLoading === loadingId ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                            Check In
                          </Button>
                        ) : null
                      ) : (
                        isCheckedIn ? (
                          <Button size="sm" variant="outline" disabled={actionLoading === loadingId}
                            onClick={() => handleStaffCheckOut(user.user_id, name)}>
                            {actionLoading === loadingId ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                            Check Out
                          </Button>
                        ) : (
                          <Button size="sm" disabled={actionLoading === loadingId}
                            onClick={() => handleStaffCheckIn(user.user_id, name)}>
                            {actionLoading === loadingId ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                            Check In
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Groups with Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Groups ({groupsWithMembers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {groupMembersLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : groupsWithMembers.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">No active groups found</p>
          ) : (
            <Accordion type="multiple" className="w-full">
              {groupsWithMembers.map((group) => (
                <AccordionItem key={group.id} value={group.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 text-left">
                      <span className="font-medium">{group.name}</span>
                      <Badge variant="outline" className="text-xs">{group.group_type}</Badge>
                      <Badge variant="secondary" className="text-xs">{group.members.length} members</Badge>
                      {group.organization && (
                        <span className="text-xs text-muted-foreground">{group.organization}</span>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 pt-2">
                      {/* Bulk actions */}
                      <div className="flex gap-2 mb-3">
                        <Button
                          size="sm"
                          disabled={groupActionLoading === `bulk-${group.id}` || group.members.length === 0}
                          onClick={() => handleBulkGroupCheckIn(group)}
                        >
                          {groupActionLoading === `bulk-${group.id}` ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <UserCheck className="w-4 h-4 mr-2" />
                          )}
                          Check In All
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={groupActionLoading === `bulkout-${group.id}` || group.members.length === 0}
                          onClick={() => handleBulkGroupCheckOut(group)}
                        >
                          {groupActionLoading === `bulkout-${group.id}` ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <UserX className="w-4 h-4 mr-2" />
                          )}
                          Check Out All
                        </Button>
                      </div>

                      {/* Members list */}
                      {group.members.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No members in this group</p>
                      ) : (
                        <div className="space-y-2">
                          {group.members.map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                            >
                              <div className="flex items-center gap-3">
                                <div>
                                  <p className="font-medium text-sm">{member.member_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {member.member_email || 'No email'}
                                    {member.member_phone ? ` · ${member.member_phone}` : ''}
                                  </p>
                                </div>
                                <Badge variant="outline" className="text-xs">{member.member_role}</Badge>
                                {!member.user_id && (
                                  <Badge variant="destructive" className="text-xs">No account</Badge>
                                )}
                              </div>
                              <Button
                                size="sm"
                                disabled={!member.user_id || groupActionLoading === member.id}
                                onClick={() => handleGroupMemberCheckIn(member, group.id, group.name)}
                              >
                                {groupActionLoading === member.id ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                )}
                                Check In
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
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
                <SelectTrigger><SelectValue placeholder="All Roles" /></SelectTrigger>
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
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
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
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">To Date</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
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
              Check-ins History ({totalCount})
            </span>
            <div className="flex gap-2">
              <Button onClick={downloadCSVReport} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download CSV
              </Button>
              <Button onClick={() => { cacheRef.current = null; fetchCheckIns(true); }} size="sm">
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
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : checkIns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No check-ins found
                  </TableCell>
                </TableRow>
              ) : (
                checkIns.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      {c.first_name || ''} {c.last_name || ''}
                    </TableCell>
                    <TableCell>{c.user_email || 'No email'}</TableCell>
                    <TableCell><Badge variant="outline">{c.user_role || 'Unknown'}</Badge></TableCell>
                    <TableCell>
                      {c.group_name ? (
                        <Badge variant="secondary">{c.group_name}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>{new Date(c.check_in_time).toLocaleString()}</TableCell>
                    <TableCell>
                      {c.check_out_time ? new Date(c.check_out_time).toLocaleString() : 'Still checked in'}
                    </TableCell>
                    <TableCell>{formatDuration(c.check_in_time, c.check_out_time)}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === 'checked_in' ? 'default' : 'secondary'}>{c.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {c.status === 'checked_in' && (
                        <Button size="sm" variant="outline" disabled={actionLoading === c.id}
                          onClick={() => handleManualCheckOut(c.id, `${c.first_name || ''} ${c.last_name || ''}`)}>
                          {actionLoading === c.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                          Check Out
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-3">
              <p className="text-sm text-muted-foreground">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {(() => {
                  const pages: (number | 'ellipsis')[] = [];
                  if (totalPages <= 7) {
                    for (let i = 0; i < totalPages; i++) pages.push(i);
                  } else {
                    pages.push(0);
                    if (page > 2) pages.push('ellipsis');
                    for (let i = Math.max(1, page - 1); i <= Math.min(totalPages - 2, page + 1); i++) pages.push(i);
                    if (page < totalPages - 3) pages.push('ellipsis');
                    pages.push(totalPages - 1);
                  }
                  return pages.map((p, idx) =>
                    p === 'ellipsis' ? (
                      <span key={`e${idx}`} className="px-1 text-muted-foreground">…</span>
                    ) : (
                      <Button
                        key={p}
                        variant={p === page ? "default" : "outline"}
                        size="icon"
                        className="h-8 w-8 text-xs"
                        onClick={() => setPage(p)}
                      >
                        {p + 1}
                      </Button>
                    )
                  );
                })()}
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedCheckInsTab;
