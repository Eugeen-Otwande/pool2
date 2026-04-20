import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, Mail, Phone, Calendar, Eye, Send, Trash2, CheckCircle2 } from 'lucide-react';

interface Inquiry {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: string;
  response: string | null;
  responded_at: string | null;
  responded_by: string | null;
  created_at: string;
}

const InquiriesTab = () => {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [responseText, setResponseText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchInquiries();

    const channel = supabase
      .channel('inquiries-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inquiries' },
        () => fetchInquiries()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchInquiries = async () => {
    try {
      const { data, error } = await supabase
        .from('inquiries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInquiries((data || []) as Inquiry[]);
    } catch (error) {
      toast.error('Error fetching inquiries');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('inquiries')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      toast.success('Status updated');
      fetchInquiries();
    } catch (error) {
      toast.error('Error updating status');
      console.error('Error:', error);
    }
  };

  const sendResponse = async () => {
    if (!selectedInquiry || !responseText.trim()) return;
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('inquiries')
        .update({
          response: responseText.trim(),
          responded_at: new Date().toISOString(),
          responded_by: user?.id ?? null,
          status: 'resolved',
        })
        .eq('id', selectedInquiry.id);

      if (error) throw error;
      toast.success('Response saved & marked resolved');
      setResponseText('');
      setSelectedInquiry(null);
      fetchInquiries();
    } catch (error: any) {
      toast.error('Failed to save response');
      console.error('Error:', error);
    } finally {
      setSending(false);
    }
  };

  const deleteInquiry = async (id: string) => {
    try {
      const { error } = await supabase.from('inquiries').delete().eq('id', id);
      if (error) throw error;
      toast.success('Inquiry deleted');
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to delete inquiry');
      console.error('Error:', error);
    }
  };

  const filteredInquiries = inquiries.filter((inquiry) => {
    const fullName = `${inquiry.first_name} ${inquiry.last_name}`.toLowerCase();
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      fullName.includes(term) ||
      inquiry.email.toLowerCase().includes(term) ||
      inquiry.subject.toLowerCase().includes(term);
    const matchesStatus = statusFilter === 'all' || inquiry.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      new: 'destructive',
      in_progress: 'default',
      resolved: 'secondary',
    };
    return <Badge variant={variants[status] || 'outline'}>{status.replace('_', ' ')}</Badge>;
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading inquiries...</div>;
  }

  const counts = {
    total: inquiries.length,
    new: inquiries.filter((i) => i.status === 'new').length,
    in_progress: inquiries.filter((i) => i.status === 'in_progress').length,
    resolved: inquiries.filter((i) => i.status === 'resolved').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Customer Inquiries</h2>
          <p className="text-muted-foreground">Manage incoming customer messages and inquiries</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Mail className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{counts.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Calendar className="h-5 w-5 text-destructive" />
            <div>
              <p className="text-sm text-muted-foreground">New</p>
              <p className="text-2xl font-bold">{counts.new}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Phone className="h-5 w-5 text-accent-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">In Progress</p>
              <p className="text-2xl font-bold">{counts.in_progress}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Resolved</p>
              <p className="text-2xl font-bold">{counts.resolved}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by name, email, or subject..."
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
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Inquiries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inquiry Messages</CardTitle>
          <CardDescription>
            View, respond to, and manage customer inquiries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInquiries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No inquiries found
                  </TableCell>
                </TableRow>
              ) : (
                filteredInquiries.map((inquiry) => (
                  <TableRow key={inquiry.id}>
                    <TableCell className="font-medium">
                      {inquiry.first_name} {inquiry.last_name}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{inquiry.email}</div>
                        {inquiry.phone && (
                          <div className="text-muted-foreground">{inquiry.phone}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{inquiry.subject}</TableCell>
                    <TableCell>{new Date(inquiry.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>{getStatusBadge(inquiry.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedInquiry(inquiry);
                            setResponseText(inquiry.response || '');
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this inquiry?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This permanently removes the inquiry from{' '}
                                <strong>{inquiry.first_name} {inquiry.last_name}</strong>.
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteInquiry(inquiry.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail / Response Dialog */}
      <Dialog open={!!selectedInquiry} onOpenChange={(o) => !o && setSelectedInquiry(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedInquiry && (
            <>
              <DialogHeader>
                <DialogTitle>Inquiry Details</DialogTitle>
                <DialogDescription>
                  From {selectedInquiry.first_name} {selectedInquiry.last_name} •{' '}
                  {new Date(selectedInquiry.created_at).toLocaleString()}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedInquiry.email}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p className="font-medium">{selectedInquiry.phone || '—'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Subject</p>
                  <p className="font-semibold">{selectedInquiry.subject}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Message</p>
                  <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap text-sm">
                    {selectedInquiry.message}
                  </div>
                </div>

                {selectedInquiry.response && (
                  <div>
                    <p className="text-muted-foreground text-sm mb-1">
                      Previous Response
                      {selectedInquiry.responded_at && (
                        <span className="ml-2">
                          ({new Date(selectedInquiry.responded_at).toLocaleString()})
                        </span>
                      )}
                    </p>
                    <div className="p-4 bg-accent/30 border border-accent rounded-lg whitespace-pre-wrap text-sm">
                      {selectedInquiry.response}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-sm font-medium">Write a response</p>
                  <Textarea
                    rows={5}
                    placeholder="Type your response to the customer..."
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <p className="text-sm text-muted-foreground">Status:</p>
                  <Select
                    value={selectedInquiry.status}
                    onValueChange={(v) => {
                      updateStatus(selectedInquiry.id, v);
                      setSelectedInquiry({ ...selectedInquiry, status: v });
                    }}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    window.open(
                      `mailto:${selectedInquiry.email}?subject=Re: ${encodeURIComponent(
                        selectedInquiry.subject
                      )}&body=${encodeURIComponent(responseText)}`,
                      '_blank'
                    )
                  }
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Open in Email
                </Button>
                <Button onClick={sendResponse} disabled={sending || !responseText.trim()}>
                  <Send className="h-4 w-4 mr-2" />
                  {sending ? 'Saving...' : 'Save & Mark Resolved'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InquiriesTab;
