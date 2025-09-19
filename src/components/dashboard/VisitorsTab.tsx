import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, UserCheck, UserX, Calendar, Phone, Mail, Users } from "lucide-react";

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

const VisitorsTab = () => {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();

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
      console.error('Error fetching visitors:', error);
      toast({
        title: "Error",
        description: "Failed to fetch visitors",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateCheckInStatus = async (visitorId: string, action: 'check_in' | 'check_out') => {
    try {
      const { error } = await supabase.rpc('visitor_checkin_checkout', {
        visitor_id: visitorId,
        action: action
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Visitor ${action === 'check_in' ? 'checked in' : 'checked out'} successfully`,
      });

      fetchVisitors();
    } catch (error) {
      console.error('Error updating check-in status:', error);
      toast({
        title: "Error",
        description: "Failed to update check-in status",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Checked In':
        return <Badge variant="default" className="bg-green-100 text-green-800">Checked In</Badge>;
      case 'Checked Out':
        return <Badge variant="secondary">Checked Out</Badge>;
      default:
        return <Badge variant="outline">Not Checked In</Badge>;
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'Paid':
        return <Badge variant="default" className="bg-green-100 text-green-800">Paid</Badge>;
      case 'Pending':
        return <Badge variant="outline">Pending</Badge>;
      default:
        return <Badge variant="destructive">Unpaid</Badge>;
    }
  };

  const filteredVisitors = visitors.filter(visitor => {
    const matchesSearch = 
      visitor.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      visitor.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      visitor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      visitor.phone.includes(searchTerm);

    const matchesStatus = statusFilter === "all" || visitor.check_in_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading visitors...</div>;
  }

  const todayVisitors = visitors.filter(v => 
    new Date(v.date_of_visit).toDateString() === new Date().toDateString()
  ).length;

  const checkedInVisitors = visitors.filter(v => v.check_in_status === 'Checked In').length;
  const paidVisitors = visitors.filter(v => v.payment_status === 'Paid').length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Visitors</p>
                <p className="text-2xl font-bold">{visitors.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Today's Bookings</p>
                <p className="text-2xl font-bold">{todayVisitors}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Checked In</p>
                <p className="text-2xl font-bold">{checkedInVisitors}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Paid</p>
                <p className="text-2xl font-bold">{paidVisitors}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search visitors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Not Checked In">Not Checked In</SelectItem>
            <SelectItem value="Checked In">Checked In</SelectItem>
            <SelectItem value="Checked Out">Checked Out</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Visitors Table */}
      <Card>
        <CardHeader>
          <CardTitle>Visitor Records</CardTitle>
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
                  <TableCell>
                    <div>
                      <div className="font-medium">{visitor.first_name} {visitor.last_name}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        <span className="text-sm">{visitor.email}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        <span className="text-sm">{visitor.phone}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{new Date(visitor.date_of_visit).toLocaleDateString()}</TableCell>
                  <TableCell>{visitor.time_of_visit}</TableCell>
                  <TableCell>{visitor.num_guests}</TableCell>
                  <TableCell>{getPaymentBadge(visitor.payment_status)}</TableCell>
                  <TableCell>{getStatusBadge(visitor.check_in_status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {visitor.check_in_status === 'Not Checked In' && (
                        <Button
                          size="sm"
                          onClick={() => updateCheckInStatus(visitor.id, 'check_in')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <UserCheck className="w-4 h-4" />
                        </Button>
                      )}
                      {visitor.check_in_status === 'Checked In' && (
                        <Button
                          size="sm"
                          onClick={() => updateCheckInStatus(visitor.id, 'check_out')}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          <UserX className="w-4 h-4" />
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

export default VisitorsTab;