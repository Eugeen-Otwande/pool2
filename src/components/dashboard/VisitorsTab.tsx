import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, UserCheck, UserX, Calendar as CalendarIcon, Phone, Mail, Users, Download, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";

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

const ITEMS_PER_PAGE = 10;

const VisitorsTab = () => {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
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
    const matchesPayment = paymentFilter === "all" || visitor.payment_status === paymentFilter;

    const visitDate = new Date(visitor.date_of_visit);
    const matchesDateFrom = !dateFrom || visitDate >= dateFrom;
    const matchesDateTo = !dateTo || visitDate <= dateTo;

    return matchesSearch && matchesStatus && matchesPayment && matchesDateFrom && matchesDateTo;
  });

  // Pagination
  const totalPages = Math.ceil(filteredVisitors.length / ITEMS_PER_PAGE);
  const paginatedVisitors = filteredVisitors.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, paymentFilter, dateFrom, dateTo]);

  const downloadCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Visit Date', 'Time', 'Guests', 'Payment Status', 'Check-in Status', 'Created At'];
    const csvData = filteredVisitors.map(v => [
      `${v.first_name} ${v.last_name}`,
      v.email,
      v.phone,
      v.date_of_visit,
      v.time_of_visit,
      v.num_guests.toString(),
      v.payment_status,
      v.check_in_status,
      new Date(v.created_at).toLocaleString()
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `visitor-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();

    toast({
      title: "Success",
      description: "CSV report downloaded successfully",
    });
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(30, 64, 175);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('RCMRD Aquatic Center', pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(14);
    doc.text('Visitor Records Report', pageWidth / 2, 25, { align: 'center' });

    // Report info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), 'PPP p')}`, 14, 45);
    doc.text(`Total Records: ${filteredVisitors.length}`, 14, 52);
    
    if (dateFrom || dateTo) {
      const dateRange = `Date Range: ${dateFrom ? format(dateFrom, 'PP') : 'Start'} - ${dateTo ? format(dateTo, 'PP') : 'End'}`;
      doc.text(dateRange, 14, 59);
    }

    // Table
    let yPos = 70;
    const colWidths = [35, 45, 25, 20, 25, 25, 20];
    const headers = ['Name', 'Email', 'Phone', 'Date', 'Payment', 'Status', 'Guests'];

    // Table header
    doc.setFillColor(240, 240, 240);
    doc.rect(10, yPos - 5, pageWidth - 20, 8, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    
    let xPos = 12;
    headers.forEach((header, i) => {
      doc.text(header, xPos, yPos);
      xPos += colWidths[i];
    });

    yPos += 8;
    doc.setFont('helvetica', 'normal');

    // Table rows
    filteredVisitors.forEach((visitor, index) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }

      if (index % 2 === 0) {
        doc.setFillColor(248, 248, 248);
        doc.rect(10, yPos - 4, pageWidth - 20, 7, 'F');
      }

      xPos = 12;
      const rowData = [
        `${visitor.first_name} ${visitor.last_name}`.substring(0, 18),
        visitor.email.substring(0, 22),
        visitor.phone.substring(0, 12),
        visitor.date_of_visit,
        visitor.payment_status,
        visitor.check_in_status.substring(0, 12),
        visitor.num_guests.toString()
      ];

      rowData.forEach((cell, i) => {
        doc.text(cell, xPos, yPos);
        xPos += colWidths[i];
      });

      yPos += 7;
    });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text('© RCMRD Aquatic Center - Confidential', pageWidth / 2, 290, { align: 'center' });

    doc.save(`visitor-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);

    toast({
      title: "Success",
      description: "PDF report downloaded successfully",
    });
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setPaymentFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

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
              <CalendarIcon className="w-5 h-5 text-green-500" />
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
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Check-in Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Not Checked In">Not Checked In</SelectItem>
                  <SelectItem value="Checked In">Checked In</SelectItem>
                  <SelectItem value="Checked Out">Checked Out</SelectItem>
                </SelectContent>
              </Select>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Payment Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div className="flex gap-2 items-center">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Date Range:</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "PP") : "From"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground">-</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "PP") : "To"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="flex gap-2 ml-auto">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
                <Button variant="outline" size="sm" onClick={downloadCSV}>
                  <Download className="w-4 h-4 mr-2" />
                  CSV
                </Button>
                <Button variant="outline" size="sm" onClick={downloadPDF}>
                  <FileText className="w-4 h-4 mr-2" />
                  PDF
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visitors Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Visitor Records</CardTitle>
          <span className="text-sm text-muted-foreground">
            Showing {paginatedVisitors.length} of {filteredVisitors.length} records
          </span>
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
              {paginatedVisitors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No visitors found matching your filters
                  </TableCell>
                </TableRow>
              ) : (
                paginatedVisitors.map((visitor) => (
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
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-8"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
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

export default VisitorsTab;
