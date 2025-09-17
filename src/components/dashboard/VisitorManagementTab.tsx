import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, Calendar, Users, CreditCard } from 'lucide-react';

interface Visitor {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_visit: string;
  time_of_visit: string;
  num_guests: number;
  payment_status: string;
  check_in_status: string;
  check_in_time: string | null;
  check_out_time: string | null;
  created_at: string;
}

const VisitorManagementTab = () => {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchVisitors();
  }, []);

  const fetchVisitors = async () => {
    try {
      const { data, error } = await supabase
        .from('visitors')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVisitors(data || []);
    } catch (error) {
      toast.error('Error fetching visitor data');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateCheckInStatus = async (id: string, action: 'check_in' | 'check_out') => {
    try {
      const { error } = await supabase
        .rpc('visitor_checkin_checkout', {
          visitor_id: id,
          action: action
        });

      if (error) throw error;
      
      toast.success(`Visitor ${action.replace('_', ' ')} successful`);
      fetchVisitors();
    } catch (error) {
      toast.error('Error updating check-in status');
      console.error('Error:', error);
    }
  };

  const getVisitorStatus = (visitor: Visitor) => {
    return visitor.check_in_status.toLowerCase().replace(' ', '_');
  };

  const filteredVisitors = visitors.filter(visitor => {
    const fullName = `${visitor.first_name} ${visitor.last_name}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) ||
                         visitor.email.toLowerCase().includes(searchTerm.toLowerCase());
    const status = getVisitorStatus(visitor);
    const matchesStatus = statusFilter === 'all' || status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      checked_in: "default",
      checked_out: "secondary"
    };
    return <Badge variant={variants[status] || "outline"}>{status.replace('_', ' ')}</Badge>;
  };

  const getPaymentBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      paid: "default",
      failed: "destructive"
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  if (loading) {
    return <div className="p-8 text-center">Loading visitor data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Visitor Management</h2>
          <p className="text-gray-600">Manage pool visitor bookings and check-ins</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Visitors</p>
                <p className="text-2xl font-bold">{visitors.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Today's Bookings</p>
                <p className="text-2xl font-bold">
                  {visitors.filter(v => v.date_of_visit === new Date().toISOString().split('T')[0]).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
                <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Checked In</p>
                <p className="text-2xl font-bold">
                  {visitors.filter(v => v.check_in_status === 'Checked In').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Paid</p>
                <p className="text-2xl font-bold">
                  {visitors.filter(v => v.payment_status === 'Paid').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search visitors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="not_checked_in">Not Checked In</SelectItem>
            <SelectItem value="checked_in">Checked In</SelectItem>
            <SelectItem value="checked_out">Checked Out</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Visitors Table */}
      <Card>
        <CardHeader>
          <CardTitle>Visitor Records</CardTitle>
          <CardDescription>
            View and manage all visitor bookings and check-in status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Visit Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Guests</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVisitors.map((visitor) => (
                <TableRow key={visitor.id}>
                  <TableCell className="font-medium">{visitor.first_name} {visitor.last_name}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{visitor.email}</div>
                      <div className="text-gray-500">{visitor.phone}</div>
                    </div>
                  </TableCell>
                  <TableCell>{visitor.date_of_visit}</TableCell>
                  <TableCell>{visitor.time_of_visit}</TableCell>
                  <TableCell>{visitor.num_guests}</TableCell>
                  <TableCell>{getPaymentBadge(visitor.payment_status)}</TableCell>
                  <TableCell>{getStatusBadge(getVisitorStatus(visitor))}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {visitor.check_in_status === 'Not Checked In' && (
                        <Button
                          size="sm"
                          onClick={() => updateCheckInStatus(visitor.id, 'check_in')}
                        >
                          Check In
                        </Button>
                      )}
                      {visitor.check_in_status === 'Checked In' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateCheckInStatus(visitor.id, 'check_out')}
                        >
                          Check Out
                        </Button>
                      )}
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
};

export default VisitorManagementTab;