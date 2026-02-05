 import { useState, useEffect, useMemo } from "react";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
 import { Badge } from "@/components/ui/badge";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { supabase } from "@/integrations/supabase/client";
 import { useToast } from "@/hooks/use-toast";
 import { format, subDays } from "date-fns";
 import { Download, FileText, RefreshCw, ClipboardList, ChevronLeft, ChevronRight, X, Droplets, Users } from "lucide-react";
 import jsPDF from "jspdf";
 
 interface PoolLog {
   id: string;
   date: string;
   session: string;
   total_swimmers: number | null;
   students_count: number | null;
   staff_count: number | null;
   residents_count: number | null;
   members_count: number | null;
   chlorine_ppm: number | null;
   ph_level: number | null;
   water_clarity: string | null;
   cleaning_status: string | null;
   maintenance_performed: string | null;
   occurrence_reported: boolean | null;
   occurrence_details: string | null;
   checked_by: string | null;
   created_at: string;
 }
 
 const PoolLogsReadOnlyTab = () => {
   const { toast } = useToast();
   const [logs, setLogs] = useState<PoolLog[]>([]);
   const [loading, setLoading] = useState(true);
   
   // Pagination
   const [currentPage, setCurrentPage] = useState(1);
   const itemsPerPage = 10;
   
   // Filters - default to last 7 days
   const [filterDateStart, setFilterDateStart] = useState(format(subDays(new Date(), 7), "yyyy-MM-dd"));
   const [filterDateEnd, setFilterDateEnd] = useState(format(new Date(), "yyyy-MM-dd"));
   const [filterSession, setFilterSession] = useState("all");
   const [filterOccurrence, setFilterOccurrence] = useState("all");
 
   useEffect(() => {
     fetchLogs();
   }, []);
 
   useEffect(() => {
     // Reset to page 1 when filters change
     setCurrentPage(1);
   }, [filterDateStart, filterDateEnd, filterSession, filterOccurrence]);
 
   const fetchLogs = async () => {
     setLoading(true);
     try {
       const { data, error } = await supabase
         .from("pool_logs")
         .select("*")
         .order("created_at", { ascending: false });
 
       if (error) throw error;
       setLogs(data || []);
     } catch (error: any) {
       toast({
         title: "Error",
         description: error.message,
         variant: "destructive",
       });
     } finally {
       setLoading(false);
     }
   };
 
   // Apply filters
   const filteredLogs = useMemo(() => {
     return logs.filter((log) => {
       // Date range filter
       if (filterDateStart && log.date < filterDateStart) return false;
       if (filterDateEnd && log.date > filterDateEnd) return false;
       
       // Session filter
       if (filterSession !== "all" && log.session !== filterSession) return false;
       
       // Occurrence filter
       if (filterOccurrence === "yes" && !log.occurrence_reported) return false;
       if (filterOccurrence === "no" && log.occurrence_reported) return false;
       
       return true;
     });
   }, [logs, filterDateStart, filterDateEnd, filterSession, filterOccurrence]);
 
   // Pagination calculations
   const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
   const paginatedLogs = filteredLogs.slice(
     (currentPage - 1) * itemsPerPage,
     currentPage * itemsPerPage
   );
 
   const clearFilters = () => {
     setFilterDateStart(format(subDays(new Date(), 7), "yyyy-MM-dd"));
     setFilterDateEnd(format(new Date(), "yyyy-MM-dd"));
     setFilterSession("all");
     setFilterOccurrence("all");
     setCurrentPage(1);
   };
 
   const exportToCSV = () => {
     const headers = [
       "Date",
       "Session",
       "Total Swimmers",
       "Students",
       "Staff",
       "Residents",
       "Members",
       "Chlorine (ppm)",
       "pH Level",
       "Water Clarity",
       "Cleaning Status",
       "Maintenance Performed",
       "Occurrence Reported",
       "Occurrence Details",
       "Checked By",
     ];
 
     const rows = filteredLogs.map((log) => [
       log.date,
       log.session,
       log.total_swimmers ?? "",
       log.students_count ?? "",
       log.staff_count ?? "",
       log.residents_count ?? "",
       log.members_count ?? "",
       log.chlorine_ppm ?? "",
       log.ph_level ?? "",
       log.water_clarity ?? "",
       log.cleaning_status ?? "",
       `"${(log.maintenance_performed || "").replace(/"/g, '""')}"`,
       log.occurrence_reported ? "Yes" : "No",
       `"${(log.occurrence_details || "").replace(/"/g, '""')}"`,
       log.checked_by ?? "",
     ]);
 
     const csvContent =
       "data:text/csv;charset=utf-8," +
       [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
 
     const encodedUri = encodeURI(csvContent);
     const link = document.createElement("a");
     link.setAttribute("href", encodedUri);
     link.setAttribute("download", `pool_logs_${format(new Date(), "yyyy-MM-dd")}.csv`);
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
 
     toast({
       title: "Success",
       description: `Exported ${filteredLogs.length} pool logs to CSV`,
     });
   };
 
   const exportToPDF = () => {
     const doc = new jsPDF({ orientation: "landscape" });
     
     // Header
     doc.setFillColor(30, 86, 49);
     doc.rect(0, 0, 297, 30, "F");
     doc.setTextColor(255, 255, 255);
     doc.setFontSize(18);
     doc.text("RCMRD Pool Logs Report", 148.5, 15, { align: "center" });
     doc.setFontSize(10);
     doc.text(`Generated: ${format(new Date(), "MMMM d, yyyy h:mm a")}`, 148.5, 23, { align: "center" });
     
     // Reset text color
     doc.setTextColor(0, 0, 0);
     
     // Filter info
     doc.setFontSize(10);
     let yPos = 40;
     doc.text(`Date Range: ${filterDateStart} to ${filterDateEnd}`, 14, yPos);
     doc.text(`Session: ${filterSession === "all" ? "All" : filterSession}`, 100, yPos);
     doc.text(`Occurrence Filter: ${filterOccurrence === "all" ? "All" : filterOccurrence === "yes" ? "Yes" : "No"}`, 160, yPos);
     doc.text(`Total Records: ${filteredLogs.length}`, 240, yPos);
     
     yPos += 10;
     
     // Table headers
     const headers = ["Date", "Session", "Swimmers", "Chlorine", "pH", "Cleaning", "Occurrence", "Checked By"];
     const colWidths = [30, 25, 25, 25, 20, 35, 25, 45];
     let xPos = 14;
     
     doc.setFillColor(240, 240, 240);
     doc.rect(14, yPos - 5, 269, 8, "F");
     doc.setFontSize(9);
     doc.setFont("helvetica", "bold");
     headers.forEach((header, i) => {
       doc.text(header, xPos, yPos);
       xPos += colWidths[i];
     });
     
     // Table rows
     doc.setFont("helvetica", "normal");
     yPos += 8;
     
       filteredLogs.slice(0, 30).forEach((log) => {
       if (yPos > 190) {
         doc.addPage();
         yPos = 20;
       }
       
       xPos = 14;
       const row = [
         log.date,
         log.session,
         String(log.total_swimmers ?? "-"),
         log.chlorine_ppm ? `${log.chlorine_ppm} ppm` : "-",
         log.ph_level ? String(log.ph_level) : "-",
         log.cleaning_status ?? "-",
         log.occurrence_reported ? "Yes" : "No",
         (log.checked_by ?? "-").substring(0, 20),
       ];
       
       row.forEach((cell, i) => {
         doc.text(cell, xPos, yPos);
         xPos += colWidths[i];
       });
       
       yPos += 7;
     });
     
     if (filteredLogs.length > 30) {
       doc.setFontSize(8);
       doc.text(`... and ${filteredLogs.length - 30} more records (see CSV for full data)`, 14, yPos + 5);
     }
     
     doc.save(`pool_logs_${format(new Date(), "yyyy-MM-dd")}.pdf`);
     
     toast({
       title: "Success",
       description: "Pool logs report exported to PDF",
     });
   };
 
   // Stats calculations
   const stats = useMemo(() => {
     const totalSwimmers = filteredLogs.reduce((sum, log) => sum + (log.total_swimmers || 0), 0);
     const occurrences = filteredLogs.filter(log => log.occurrence_reported).length;
     const avgChlorine = filteredLogs.length > 0
       ? filteredLogs.reduce((sum, log) => sum + (log.chlorine_ppm || 0), 0) / filteredLogs.filter(l => l.chlorine_ppm).length || 0
       : 0;
     const avgPH = filteredLogs.length > 0
       ? filteredLogs.reduce((sum, log) => sum + (log.ph_level || 0), 0) / filteredLogs.filter(l => l.ph_level).length || 0
       : 0;
     
     return { totalSwimmers, occurrences, avgChlorine, avgPH };
   }, [filteredLogs]);
 
   return (
     <div className="space-y-6">
       {/* Stats Cards */}
       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         <Card>
           <CardContent className="p-4">
             <div className="flex items-center gap-3">
               <div className="p-2 bg-primary/10 rounded-lg">
                 <ClipboardList className="w-5 h-5 text-primary" />
               </div>
               <div>
                 <p className="text-sm text-muted-foreground">Total Logs</p>
                 <p className="text-2xl font-bold">{filteredLogs.length}</p>
               </div>
             </div>
           </CardContent>
         </Card>
         <Card>
           <CardContent className="p-4">
             <div className="flex items-center gap-3">
               <div className="p-2 bg-secondary rounded-lg">
                 <Users className="w-5 h-5 text-secondary-foreground" />
               </div>
               <div>
                 <p className="text-sm text-muted-foreground">Total Swimmers</p>
                 <p className="text-2xl font-bold">{stats.totalSwimmers}</p>
               </div>
             </div>
           </CardContent>
         </Card>
         <Card>
           <CardContent className="p-4">
             <div className="flex items-center gap-3">
               <div className="p-2 bg-accent rounded-lg">
                 <Droplets className="w-5 h-5 text-accent-foreground" />
               </div>
               <div>
                 <p className="text-sm text-muted-foreground">Avg Chlorine</p>
                 <p className="text-2xl font-bold">{stats.avgChlorine.toFixed(1)} ppm</p>
               </div>
             </div>
           </CardContent>
         </Card>
         <Card>
           <CardContent className="p-4">
             <div className="flex items-center gap-3">
               <div className="p-2 bg-muted rounded-lg">
                 <FileText className="w-5 h-5 text-muted-foreground" />
               </div>
               <div>
                 <p className="text-sm text-muted-foreground">Occurrences</p>
                 <p className="text-2xl font-bold">{stats.occurrences}</p>
               </div>
             </div>
           </CardContent>
         </Card>
       </div>
 
       {/* Filters and Export */}
       <Card>
         <CardHeader>
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
             <div>
               <CardTitle className="flex items-center gap-2">
                 <ClipboardList className="w-5 h-5" />
                 Pool Logs History
               </CardTitle>
               <CardDescription>
                 Read-only view of pool maintenance and operational records
               </CardDescription>
             </div>
             <div className="flex gap-2">
               <Button onClick={fetchLogs} variant="outline" size="sm" className="gap-2">
                 <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                 Refresh
               </Button>
               <Button onClick={exportToCSV} variant="outline" size="sm" className="gap-2">
                 <Download className="w-4 h-4" />
                 CSV
               </Button>
               <Button onClick={exportToPDF} variant="outline" size="sm" className="gap-2">
                 <FileText className="w-4 h-4" />
                 PDF
               </Button>
             </div>
           </div>
         </CardHeader>
         <CardContent className="space-y-4">
           {/* Filters */}
           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
             <div className="space-y-2">
               <Label>Start Date</Label>
               <Input
                 type="date"
                 value={filterDateStart}
                 onChange={(e) => setFilterDateStart(e.target.value)}
               />
             </div>
             <div className="space-y-2">
               <Label>End Date</Label>
               <Input
                 type="date"
                 value={filterDateEnd}
                 onChange={(e) => setFilterDateEnd(e.target.value)}
               />
             </div>
             <div className="space-y-2">
               <Label>Session</Label>
               <Select value={filterSession} onValueChange={setFilterSession}>
                 <SelectTrigger>
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">All Sessions</SelectItem>
                   <SelectItem value="Morning">Morning</SelectItem>
                   <SelectItem value="Afternoon">Afternoon</SelectItem>
                   <SelectItem value="Evening">Evening</SelectItem>
                 </SelectContent>
               </Select>
             </div>
             <div className="space-y-2">
               <Label>Occurrence Reported</Label>
               <Select value={filterOccurrence} onValueChange={setFilterOccurrence}>
                 <SelectTrigger>
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">All</SelectItem>
                   <SelectItem value="yes">Yes</SelectItem>
                   <SelectItem value="no">No</SelectItem>
                 </SelectContent>
               </Select>
             </div>
             <div className="space-y-2">
               <Label className="invisible">Actions</Label>
               <Button onClick={clearFilters} variant="ghost" className="w-full gap-2">
                 <X className="w-4 h-4" />
                 Clear Filters
               </Button>
             </div>
           </div>
 
           {/* Table */}
           <div className="rounded-md border overflow-x-auto">
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Date</TableHead>
                   <TableHead>Session</TableHead>
                   <TableHead className="text-center">Total Swimmers</TableHead>
                   <TableHead className="text-center">
                     <span className="text-xs">Stu / Stf / Res / Mem</span>
                   </TableHead>
                   <TableHead className="text-center">Chlorine (ppm)</TableHead>
                   <TableHead className="text-center">pH</TableHead>
                   <TableHead>Cleaning</TableHead>
                   <TableHead>Maintenance</TableHead>
                   <TableHead className="text-center">Occurrence</TableHead>
                   <TableHead>Checked By</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {loading ? (
                   <TableRow>
                     <TableCell colSpan={10} className="text-center py-8">
                       <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                       Loading pool logs...
                     </TableCell>
                   </TableRow>
                 ) : paginatedLogs.length === 0 ? (
                   <TableRow>
                     <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                       <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
                       No pool logs found for the selected filters.
                       <br />
                       <span className="text-sm">Try adjusting your date range or filters.</span>
                     </TableCell>
                   </TableRow>
                 ) : (
                   paginatedLogs.map((log) => (
                     <TableRow key={log.id}>
                       <TableCell className="font-medium whitespace-nowrap">
                         {format(new Date(log.date), "MMM d, yyyy")}
                       </TableCell>
                       <TableCell>
                         <Badge variant="outline">{log.session}</Badge>
                       </TableCell>
                       <TableCell className="text-center font-semibold">
                         {log.total_swimmers ?? "—"}
                       </TableCell>
                       <TableCell className="text-center text-xs text-muted-foreground whitespace-nowrap">
                         {log.students_count ?? 0} / {log.staff_count ?? 0} / {log.residents_count ?? 0} / {log.members_count ?? 0}
                       </TableCell>
                       <TableCell className="text-center">
                         {log.chlorine_ppm != null ? (
                           <Badge variant={log.chlorine_ppm >= 1 && log.chlorine_ppm <= 3 ? "default" : "destructive"}>
                             {log.chlorine_ppm}
                           </Badge>
                         ) : "—"}
                       </TableCell>
                       <TableCell className="text-center">
                         {log.ph_level != null ? (
                           <Badge variant={log.ph_level >= 7.2 && log.ph_level <= 7.8 ? "default" : "destructive"}>
                             {log.ph_level}
                           </Badge>
                         ) : "—"}
                       </TableCell>
                       <TableCell>
                         <Badge 
                           variant={
                             log.cleaning_status === "Excellent" ? "default" : 
                             log.cleaning_status === "Good" ? "secondary" : "destructive"
                           }
                         >
                           {log.cleaning_status ?? "—"}
                         </Badge>
                       </TableCell>
                       <TableCell className="max-w-[150px] truncate" title={log.maintenance_performed || undefined}>
                         {log.maintenance_performed || "None"}
                       </TableCell>
                       <TableCell className="text-center">
                         {log.occurrence_reported ? (
                           <Badge variant="destructive" className="cursor-help" title={log.occurrence_details || "No details"}>
                             Yes
                           </Badge>
                         ) : (
                           <Badge variant="secondary">No</Badge>
                         )}
                       </TableCell>
                       <TableCell className="whitespace-nowrap">
                         {log.checked_by || "—"}
                       </TableCell>
                     </TableRow>
                   ))
                 )}
               </TableBody>
             </Table>
           </div>
 
           {/* Pagination */}
           {!loading && filteredLogs.length > 0 && (
             <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
               <p className="text-sm text-muted-foreground">
                 Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredLogs.length)} of {filteredLogs.length} logs
               </p>
               <div className="flex items-center gap-2">
                 <Button
                   variant="outline"
                   size="sm"
                   onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                   disabled={currentPage === 1}
                 >
                   <ChevronLeft className="w-4 h-4" />
                   Previous
                 </Button>
                 <span className="text-sm px-2">
                   Page {currentPage} of {totalPages}
                 </span>
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
 
 export default PoolLogsReadOnlyTab;