import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  FileText, 
  Download, 
  Calendar,
  Users,
  TrendingUp,
  Package,
  CheckCircle,
  Clock,
  AlertTriangle,
  Filter,
  FileSpreadsheet,
  File
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ReportsTabProps {
  onRefreshStats?: () => void;
}

export default function ReportsTab({ onRefreshStats }: ReportsTabProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: "",
    end: ""
  });
  const { toast } = useToast();

  const reportTypes = [
    {
      id: "daily-attendance",
      title: "Daily Attendance Report",
      icon: Users,
      description: "User check-ins and check-outs by day",
      status: "ready"
    },
    {
      id: "weekly-usage",
      title: "Weekly Usage Report", 
      icon: TrendingUp,
      description: "Pool usage trends and statistics",
      status: "ready"
    },
    {
      id: "equipment-usage",
      title: "Equipment Usage Report",
      icon: Package,
      description: "Equipment loans and returns tracking",
      status: "ready"
    },
    {
      id: "checkin-log",
      title: "Check-in/Check-out Log",
      icon: CheckCircle,
      description: "Complete activity log with timestamps",
      status: "ready"
    },
    {
      id: "peak-hours",
      title: "Peak Hours Analysis",
      icon: Clock,
      description: "Busiest times and capacity analysis",
      status: "coming-soon"
    },
    {
      id: "incident-reports",
      title: "Incident Reports",
      icon: AlertTriangle,
      description: "Safety incidents and occurrences",
      status: "coming-soon"
    },
    {
      id: "user-demographics",
      title: "User Demographics",
      icon: Users,
      description: "Member statistics by role and status",
      status: "ready"
    },
    {
      id: "pool-logs",
      title: "Pool Maintenance Logs",
      icon: FileText,
      description: "Chemical levels and maintenance records",
      status: "ready"
    }
  ];

  const generateReport = async (reportType: string, format: 'csv' | 'pdf' = 'csv') => {
    if (!dateRange.start || !dateRange.end) {
      toast({
        title: "Date Range Required",
        description: "Please select start and end dates for the report",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      // Store report metadata
      const { data: reportData, error: reportError } = await supabase
        .from('reports_metadata')
        .insert({
          report_type: reportType,
          report_name: `${reportType}-${new Date().toISOString().split('T')[0]}`,
          date_range_start: dateRange.start,
          date_range_end: dateRange.end,
          generated_by: (await supabase.auth.getUser()).data.user?.id || '',
          filters: { format }
        })
        .select()
        .single();

      if (reportError) throw reportError;

      // Generate the actual report data
      let reportContent = '';
      let filename = '';

      switch (reportType) {
        case 'daily-attendance':
          const { data: checkIns } = await supabase
            .from('check_ins')
            .select(`
              *,
              profiles(first_name, last_name, role)
            `)
            .gte('check_in_time', dateRange.start)
            .lte('check_in_time', dateRange.end)
            .order('check_in_time', { ascending: false });

          if (format === 'csv') {
            reportContent = 'Date,Name,Role,Check-in Time,Check-out Time,Duration,Status\n';
            checkIns?.forEach(record => {
              const duration = record.check_out_time 
                ? Math.round((new Date(record.check_out_time).getTime() - new Date(record.check_in_time).getTime()) / (1000 * 60))
                : 'Ongoing';
              reportContent += `${new Date(record.check_in_time).toLocaleDateString()},${record.profiles?.first_name} ${record.profiles?.last_name},${record.profiles?.role},${new Date(record.check_in_time).toLocaleTimeString()},${record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString() : 'N/A'},"${duration} min",${record.status}\n`;
            });
            filename = `daily-attendance-${dateRange.start}-to-${dateRange.end}.csv`;
          }
          break;

        case 'equipment-usage':
          const { data: loans } = await supabase
            .from('equipment_loans')
            .select(`
              *,
              profiles(first_name, last_name, role),
              equipment(name, category)
            `)
            .gte('loaned_at', dateRange.start)
            .lte('loaned_at', dateRange.end)
            .order('loaned_at', { ascending: false });

          if (format === 'csv') {
            reportContent = 'Date,User,Role,Equipment,Category,Loaned At,Due Back,Returned,Status\n';
            loans?.forEach(loan => {
              reportContent += `${new Date(loan.loaned_at).toLocaleDateString()},${loan.profiles?.first_name} ${loan.profiles?.last_name},${loan.profiles?.role},${loan.equipment?.name},${loan.equipment?.category},${new Date(loan.loaned_at).toLocaleTimeString()},${new Date(loan.due_back_at).toLocaleTimeString()},${loan.returned_at ? new Date(loan.returned_at).toLocaleTimeString() : 'No'},${loan.status}\n`;
            });
            filename = `equipment-usage-${dateRange.start}-to-${dateRange.end}.csv`;
          }
          break;

        case 'user-demographics':
          const { data: users } = await supabase
            .from('profiles')
            .select('role, status')
            .order('created_at', { ascending: false });

          if (format === 'csv') {
            reportContent = 'Role,Status,Count\n';
            const demographics: Record<string, Record<string, number>> = {};
            users?.forEach(user => {
              if (!demographics[user.role]) demographics[user.role] = {};
              if (!demographics[user.role][user.status]) demographics[user.role][user.status] = 0;
              demographics[user.role][user.status]++;
            });
            
            Object.entries(demographics).forEach(([role, statuses]) => {
              Object.entries(statuses).forEach(([status, count]) => {
                reportContent += `${role},${status},${count}\n`;
              });
            });
            filename = `user-demographics-${new Date().toISOString().split('T')[0]}.csv`;
          }
          break;

        case 'pool-logs':
          const { data: poolLogs } = await supabase
            .from('pool_logs')
            .select(`
              *,
              checked_by_profile:profiles!pool_logs_checked_by_fkey(first_name, last_name),
              confirmed_by_profile:profiles!pool_logs_confirmed_by_fkey(first_name, last_name)
            `)
            .gte('date', dateRange.start)
            .lte('date', dateRange.end)
            .order('date', { ascending: false });

          if (format === 'csv') {
            reportContent = 'Date,Session,pH Level,Chlorine PPM,Water Clarity,Total Swimmers,Students,Staff,Members,Residents,Checked By,Confirmed By\n';
            poolLogs?.forEach(log => {
              reportContent += `${log.date},${log.session},${log.ph_level || 'N/A'},${log.chlorine_ppm || 'N/A'},${log.water_clarity || 'N/A'},${log.total_swimmers},${log.students_count},${log.staff_count},${log.members_count},${log.residents_count},"${log.checked_by_profile?.first_name} ${log.checked_by_profile?.last_name}","${log.confirmed_by_profile?.first_name} ${log.confirmed_by_profile?.last_name}"\n`;
            });
            filename = `pool-logs-${dateRange.start}-to-${dateRange.end}.csv`;
          }
          break;

        default:
          throw new Error('Report type not implemented');
      }

      // Download the file
      const blob = new Blob([reportContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Report Generated",
        description: `${filename} has been downloaded successfully`
      });

      onRefreshStats?.();
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Available Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reportTypes.map((report) => {
              const IconComponent = report.icon;
              return (
                <Card key={report.id} className="relative">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <IconComponent className="w-6 h-6 text-primary" />
                      <Badge variant={report.status === 'ready' ? 'default' : 'secondary'}>
                        {report.status === 'ready' ? 'Ready' : 'Coming Soon'}
                      </Badge>
                    </div>
                    <h4 className="font-medium mb-2">{report.title}</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      {report.description}
                    </p>
                    
                    {report.status === 'ready' ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => generateReport(report.id, 'csv')}
                          disabled={isGenerating}
                          className="flex-1"
                        >
                          <FileSpreadsheet className="w-4 h-4 mr-1" />
                          CSV
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => generateReport(report.id, 'pdf')}
                          disabled={true}
                          className="flex-1"
                        >
                          <File className="w-4 h-4 mr-1" />
                          PDF
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-2">
                        <span className="text-sm text-muted-foreground">Coming Soon</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Recent Report Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Report history and analytics coming soon</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}