import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, DollarSign, CreditCard, Receipt } from 'lucide-react';

interface Payment {
  id: string;
  visitor_id: string;
  amount: number;
  payment_status: string;
  created_at: string;
  visitor?: {
    first_name: string;
    last_name: string;
    email: string;
    receipt_url?: string;
  };
}

const PaymentsTab = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          visitor:visitors(first_name, last_name, email, receipt_url)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      toast.error('Error fetching payments');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePaymentStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('payments')
        .update({ payment_status: status })
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Payment status updated successfully');
      fetchPayments();
    } catch (error) {
      toast.error('Error updating payment status');
      console.error('Error:', error);
    }
  };

  const filteredPayments = payments.filter(payment => {
    const visitorName = payment.visitor 
      ? `${payment.visitor.first_name} ${payment.visitor.last_name}`.toLowerCase()
      : '';
    const visitorEmail = payment.visitor?.email?.toLowerCase() || '';
    
    const matchesSearch = visitorName.includes(searchTerm.toLowerCase()) ||
                         visitorEmail.includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || payment.payment_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      Pending: "outline",
      Paid: "default",
      Failed: "destructive"
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  if (loading) {
    return <div className="p-8 text-center">Loading payments...</div>;
  }

  const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const paidAmount = payments
    .filter(p => p.payment_status === 'Paid')
    .reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Payment Management</h2>
          <p className="text-gray-600">Track and manage visitor payments</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold">KSh {totalAmount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Paid Amount</p>
                <p className="text-2xl font-bold">KSh {paidAmount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Receipt className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Total Payments</p>
                <p className="text-2xl font-bold">{payments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold">
                  {payments.filter(p => p.payment_status === 'Pending').length}
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
            placeholder="Search by visitor name or email..."
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
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Paid">Paid</SelectItem>
            <SelectItem value="Failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Records</CardTitle>
          <CardDescription>
            View and manage all payment transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Visitor</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">
                    {payment.visitor 
                      ? `${payment.visitor.first_name} ${payment.visitor.last_name}`
                      : 'Unknown Visitor'
                    }
                  </TableCell>
                  <TableCell>{payment.visitor?.email || 'N/A'}</TableCell>
                  <TableCell>KSh {payment.amount.toLocaleString()}</TableCell>
                  <TableCell>{getStatusBadge(payment.payment_status)}</TableCell>
                  <TableCell>{new Date(payment.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {payment.payment_status === 'Pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => updatePaymentStatus(payment.id, 'Paid')}
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
                      {payment.payment_status === 'Paid' && payment.visitor?.receipt_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(payment.visitor!.receipt_url, '_blank')}
                        >
                          View Receipt
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

export default PaymentsTab;