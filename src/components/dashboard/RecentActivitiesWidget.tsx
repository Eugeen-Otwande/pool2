import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, Download, FileSpreadsheet } from "lucide-react";

interface RecentActivity {
  id: string;
  check_in_time: string;
  check_out_time?: string;
  status: string;
  user_id: string;
  pool_schedules?: { title: string } | null;
  profiles?: { first_name: string; last_name: string; role: string } | null;
}

interface RecentActivitiesWidgetProps {
  activities: RecentActivity[];
  title?: string;
  showUserInfo?: boolean;
  limit?: number;
}

const RecentActivitiesWidget = ({ 
  activities, 
  title = "Recent Activities", 
  showUserInfo = false,
  limit = 5 
}: RecentActivitiesWidgetProps) => {
  const [isExporting, setIsExporting] = useState(false);

  const formatDuration = (checkInTime: string, checkOutTime?: string) => {
    const start = new Date(checkInTime);
    const end = checkOutTime ? new Date(checkOutTime) : new Date();
    const diff = Math.floor((end.getTime() - start.getTime()) / 60000); // minutes
    
    if (diff < 60) return `${diff}m`;
    return `${Math.floor(diff / 60)}h ${diff % 60}m`;
  };

  const exportToCSV = () => {
    setIsExporting(true);
    
    const headers = showUserInfo 
      ? ['Date', 'User', 'Role', 'Session', 'Status', 'Duration', 'Check In Time', 'Check Out Time']
      : ['Date', 'Session', 'Status', 'Duration', 'Check In Time', 'Check Out Time'];
    
    const csvData = activities.map(activity => {
      const row = [
        new Date(activity.check_in_time).toLocaleDateString(),
        ...(showUserInfo ? [
          `${activity.profiles?.first_name || ''} ${activity.profiles?.last_name || ''}`.trim() || 'N/A',
          activity.profiles?.role || 'N/A'
        ] : []),
        activity.pool_schedules?.title || 'Pool Session',
        activity.status,
        formatDuration(activity.check_in_time, activity.check_out_time),
        new Date(activity.check_in_time).toLocaleString(),
        activity.check_out_time ? new Date(activity.check_out_time).toLocaleString() : 'N/A'
      ];
      return row;
    });

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `recent_activities_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => setIsExporting(false), 1000);
  };

  const exportToExcel = () => {
    setIsExporting(true);
    
    // Simple tab-separated format that Excel can read
    const headers = showUserInfo 
      ? ['Date', 'User', 'Role', 'Session', 'Status', 'Duration', 'Check In Time', 'Check Out Time']
      : ['Date', 'Session', 'Status', 'Duration', 'Check In Time', 'Check Out Time'];
    
    const excelData = activities.map(activity => {
      const row = [
        new Date(activity.check_in_time).toLocaleDateString(),
        ...(showUserInfo ? [
          `${activity.profiles?.first_name || ''} ${activity.profiles?.last_name || ''}`.trim() || 'N/A',
          activity.profiles?.role || 'N/A'
        ] : []),
        activity.pool_schedules?.title || 'Pool Session',
        activity.status,
        formatDuration(activity.check_in_time, activity.check_out_time),
        new Date(activity.check_in_time).toLocaleString(),
        activity.check_out_time ? new Date(activity.check_out_time).toLocaleString() : 'N/A'
      ];
      return row;
    });

    const excelContent = [headers, ...excelData]
      .map(row => row.join('\t'))
      .join('\n');

    const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `recent_activities_${new Date().toISOString().split('T')[0]}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => setIsExporting(false), 1000);
  };

  const displayedActivities = activities.slice(0, limit);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            {title}
          </CardTitle>
          {activities.length > 0 && (
            <div className="flex gap-2">
              <Button
                onClick={exportToCSV}
                variant="outline"
                size="sm"
                disabled={isExporting}
              >
                <Download className="w-4 h-4 mr-2" />
                {isExporting ? "Exporting..." : "CSV"}
              </Button>
              <Button
                onClick={exportToExcel}
                variant="outline"
                size="sm"
                disabled={isExporting}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                {isExporting ? "Exporting..." : "Excel"}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {displayedActivities.length > 0 ? (
            displayedActivities.map((activity) => (
              <div key={activity.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div className={`w-2 h-2 rounded-full ${
                  activity.status === 'checked_out' ? 'bg-green-500' : 'bg-blue-500'
                }`}></div>
                <div className="flex-1 min-w-0">
                  {showUserInfo && activity.profiles && (
                    <p className="text-sm font-medium truncate">
                      {`${activity.profiles.first_name || ''} ${activity.profiles.last_name || ''}`.trim() || 'Unknown User'}
                    </p>
                  )}
                  <p className={`text-sm ${showUserInfo ? 'text-muted-foreground' : 'font-medium'} truncate`}>
                    {activity.pool_schedules?.title || "Pool Session"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(activity.check_in_time).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                    {showUserInfo && activity.profiles && (
                      <span className="ml-2">• {activity.profiles.role}</span>
                    )}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant={activity.status === "checked_out" ? "secondary" : "default"} className="text-xs">
                    {formatDuration(activity.check_in_time, activity.check_out_time)}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {activity.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-center py-8 text-sm">
              No recent activity found
            </p>
          )}
        </div>
        {activities.length > limit && (
          <div className="mt-4 pt-3 border-t text-center">
            <p className="text-xs text-muted-foreground">
              Showing {limit} of {activities.length} activities. Export to see all.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivitiesWidget;