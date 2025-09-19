import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, DollarSign, CreditCard, TrendingUp, Calendar } from "lucide-react";

interface Payment {
  id: string;
  visitor_id: string;
  amount: number;
  payment_status: string;
  created_at: string;
  visitors?: {
    first_name: string;
    last_name: string;
    email: string;
    date_of_visit: string;
  };
}

const PaymentsTab = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          visitors (
            first_name,
            last_name,
            email,
            date_of_visit
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast({
        title: "Error",
        description: "Failed to fetch payments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePaymentStatus = async (paymentId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('payments')
        .update({ payment_status: status })
        .eq('id', paymentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Payment status updated to ${status}`,
      });

      fetchPayments();
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast({
        title: "Error",
        description: "Failed to update payment status",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Paid':
        return <Badge variant="default" className="bg-green-100 text-green-800">Paid</Badge>;
      case 'Pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'Failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const filteredPayments = payments.filter(payment => {
    const visitorName = payment.visitors ? 
      `${payment.visitors.first_name} ${payment.visitors.last_name}`.toLowerCase() : '';
    const visitorEmail = payment.visitors?.email?.toLowerCase() || '';
    
    const matchesSearch = 
      visitorName.includes(searchTerm.toLowerCase()) ||
      visitorEmail.includes(searchTerm.toLowerCase()) ||
      payment.amount.toString().includes(searchTerm);

    const matchesStatus = statusFilter === "all" || payment.payment_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading payments...</div>;
  }

  const totalRevenue = payments.filter(p => p.payment_status === 'Paid')
    .reduce((sum, payment) => sum + payment.amount, 0);
  
  const pendingPayments = payments.filter(p => p.payment_status === 'Pending').length;
  const paidPayments = payments.filter(p => p.payment_status === 'Paid').length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">KSH {totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Paid Payments</p>
                <p className="text-2xl font-bold">{paidPayments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{pendingPayments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Payments</p>
                <p className="text-2xl font-bold">{payments.length}</p>
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
            placeholder="Search payments..."
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
            <SelectItem value="Paid">Paid</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Records</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Visitor</TableHead>
                <TableHead>Visit Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {payment.visitors?.first_name} {payment.visitors?.last_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {payment.visitors?.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {payment.visitors?.date_of_visit ? 
                      new Date(payment.visitors.date_of_visit).toLocaleDateString() : 
                      'N/A'
                    }
                  </TableCell>
                  <TableCell className="font-medium">KSH {payment.amount}</TableCell>
                  <TableCell>{getStatusBadge(payment.payment_status)}</TableCell>
                  <TableCell>{new Date(payment.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {payment.payment_status === 'Pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => updatePaymentStatus(payment.id, 'Paid')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Mark Paid
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updatePaymentStatus(payment.id, 'Failed')}
                          >
                            Mark Failed
                          </Button>
                        </>
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

export default PaymentsTab;