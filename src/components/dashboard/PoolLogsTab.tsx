import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Download, FileSpreadsheet, Plus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { User } from "@supabase/supabase-js";

interface PoolLogsTabProps {
  user: User;
}

const PoolLogsTab = ({ user }: PoolLogsTabProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [filterDateStart, setFilterDateStart] = useState("");
  const [filterDateEnd, setFilterDateEnd] = useState("");
  const [filterSession, setFilterSession] = useState("all");

  // Form state
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    session: "Morning",
    students_count: 0,
    staff_count: 0,
    residents_count: 0,
    members_count: 0,
    chlorine_ppm: "",
    ph_level: "",
    water_clarity: "Clear",
    chemicals_added: "",
    chemical_notes: "",
    filtration_system: "Good",
    pumps_status: "Working",
    lighting_status: "Working",
    safety_equipment: "All Present",
    cleaning_status: "Excellent",
    maintenance_performed: "",
    system_notes: "",
    occurrence_reported: false,
    occurrence_details: "",
  });

  useEffect(() => {
    fetchLogs();
  }, [filterDateStart, filterDateEnd, filterSession]);

  const fetchLogs = async () => {
    try {
      let query = supabase
        .from("pool_logs")
        .select("*")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50);

      if (filterDateStart) {
        query = query.gte("date", filterDateStart);
      }
      if (filterDateEnd) {
        query = query.lte("date", filterDateEnd);
      }
      if (filterSession !== "all") {
        query = query.eq("session", filterSession);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get user's profile to get their name
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', user.id)
        .single();

      const userName = profile 
        ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
        : user.email || 'Unknown';

      const total_swimmers =
        formData.students_count +
        formData.staff_count +
        formData.residents_count +
        formData.members_count;

      const { error } = await supabase.from("pool_logs").insert({
        ...formData,
        total_swimmers,
        checked_by: userName, // Store user's full name as text
        chlorine_ppm: formData.chlorine_ppm ? parseFloat(formData.chlorine_ppm) : null,
        ph_level: formData.ph_level ? parseFloat(formData.ph_level) : null,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Pool log entry created successfully",
      });

      // Reset form
      setFormData({
        date: format(new Date(), "yyyy-MM-dd"),
        session: "Morning",
        students_count: 0,
        staff_count: 0,
        residents_count: 0,
        members_count: 0,
        chlorine_ppm: "",
        ph_level: "",
        water_clarity: "Clear",
        chemicals_added: "",
        chemical_notes: "",
        filtration_system: "Good",
        pumps_status: "Working",
        lighting_status: "Working",
        safety_equipment: "All Present",
        cleaning_status: "Excellent",
        maintenance_performed: "",
        system_notes: "",
        occurrence_reported: false,
        occurrence_details: "",
      });

      fetchLogs();
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

  const exportToCSV = () => {
    const headers = [
      "Date",
      "Session",
      "Students",
      "Staff",
      "Residents",
      "Members",
      "Total Swimmers",
      "Chlorine (ppm)",
      "pH Level",
      "Water Clarity",
      "Chemicals Added",
      "Filtration",
      "Pumps",
      "Lighting",
      "Safety Equipment",
      "Cleaning",
      "Maintenance",
      "Occurrence Reported",
      "Checked By",
    ];

    const rows = logs.map((log) => [
      log.date,
      log.session,
      log.students_count,
      log.staff_count,
      log.residents_count,
      log.members_count,
      log.total_swimmers,
      log.chlorine_ppm || "",
      log.ph_level || "",
      log.water_clarity || "",
      log.chemicals_added || "",
      log.filtration_system || "",
      log.pumps_status || "",
      log.lighting_status || "",
      log.safety_equipment || "",
      log.cleaning_status || "",
      log.maintenance_performed || "",
      log.occurrence_reported ? "Yes" : "No",
      log.checked_by || "",
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
      description: "Pool logs exported successfully",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            New Pool Log Entry
          </CardTitle>
          <CardDescription>Record daily pool maintenance and usage data</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="session">Session</Label>
                <Select
                  value={formData.session}
                  onValueChange={(value) => setFormData({ ...formData, session: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Morning">Morning</SelectItem>
                    <SelectItem value="Afternoon">Afternoon</SelectItem>
                    <SelectItem value="Evening">Evening</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Swimmer Counts */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Swimmer Counts</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="students">Students</Label>
                  <Input
                    id="students"
                    type="number"
                    min="0"
                    value={formData.students_count}
                    onChange={(e) =>
                      setFormData({ ...formData, students_count: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staff">Staff</Label>
                  <Input
                    id="staff"
                    type="number"
                    min="0"
                    value={formData.staff_count}
                    onChange={(e) =>
                      setFormData({ ...formData, staff_count: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="residents">Residents</Label>
                  <Input
                    id="residents"
                    type="number"
                    min="0"
                    value={formData.residents_count}
                    onChange={(e) =>
                      setFormData({ ...formData, residents_count: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="members">Members</Label>
                  <Input
                    id="members"
                    type="number"
                    min="0"
                    value={formData.members_count}
                    onChange={(e) =>
                      setFormData({ ...formData, members_count: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
              <div className="mt-2 p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">
                  Total Swimmers:{" "}
                  {formData.students_count +
                    formData.staff_count +
                    formData.residents_count +
                    formData.members_count}
                </p>
              </div>
            </div>

            {/* Water Quality */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Water Quality</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="chlorine">Chlorine (ppm)</Label>
                  <Input
                    id="chlorine"
                    type="number"
                    step="0.1"
                    value={formData.chlorine_ppm}
                    onChange={(e) => setFormData({ ...formData, chlorine_ppm: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ph">pH Level</Label>
                  <Input
                    id="ph"
                    type="number"
                    step="0.1"
                    value={formData.ph_level}
                    onChange={(e) => setFormData({ ...formData, ph_level: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clarity">Water Clarity</Label>
                  <Select
                    value={formData.water_clarity}
                    onValueChange={(value) => setFormData({ ...formData, water_clarity: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Clear">Clear</SelectItem>
                      <SelectItem value="Slightly Cloudy">Slightly Cloudy</SelectItem>
                      <SelectItem value="Cloudy">Cloudy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Chemicals */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Chemicals</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="chemicals">Chemicals Added</Label>
                  <Input
                    id="chemicals"
                    value={formData.chemicals_added}
                    onChange={(e) => setFormData({ ...formData, chemicals_added: e.target.value })}
                    placeholder="e.g., Chlorine 5L, pH Increaser 2kg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chemical_notes">Chemical Notes</Label>
                  <Textarea
                    id="chemical_notes"
                    value={formData.chemical_notes}
                    onChange={(e) => setFormData({ ...formData, chemical_notes: e.target.value })}
                    placeholder="Any additional notes about chemicals"
                    rows={1}
                  />
                </div>
              </div>
            </div>

            {/* Systems & Equipment */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Systems & Equipment Status</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Filtration System</Label>
                  <Select
                    value={formData.filtration_system}
                    onValueChange={(value) => setFormData({ ...formData, filtration_system: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Good">Good</SelectItem>
                      <SelectItem value="Fair">Fair</SelectItem>
                      <SelectItem value="Needs Attention">Needs Attention</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Pumps Status</Label>
                  <Select
                    value={formData.pumps_status}
                    onValueChange={(value) => setFormData({ ...formData, pumps_status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Working">Working</SelectItem>
                      <SelectItem value="Partially Working">Partially Working</SelectItem>
                      <SelectItem value="Not Working">Not Working</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Lighting Status</Label>
                  <Select
                    value={formData.lighting_status}
                    onValueChange={(value) => setFormData({ ...formData, lighting_status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Working">Working</SelectItem>
                      <SelectItem value="Partially Working">Partially Working</SelectItem>
                      <SelectItem value="Not Working">Not Working</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Safety Equipment</Label>
                  <Select
                    value={formData.safety_equipment}
                    onValueChange={(value) => setFormData({ ...formData, safety_equipment: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All Present">All Present</SelectItem>
                      <SelectItem value="Some Missing">Some Missing</SelectItem>
                      <SelectItem value="Needs Replacement">Needs Replacement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cleaning Status</Label>
                  <Select
                    value={formData.cleaning_status}
                    onValueChange={(value) => setFormData({ ...formData, cleaning_status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Excellent">Excellent</SelectItem>
                      <SelectItem value="Good">Good</SelectItem>
                      <SelectItem value="Fair">Fair</SelectItem>
                      <SelectItem value="Needs Cleaning">Needs Cleaning</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Maintenance & Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maintenance">Maintenance Performed</Label>
                <Textarea
                  id="maintenance"
                  value={formData.maintenance_performed}
                  onChange={(e) =>
                    setFormData({ ...formData, maintenance_performed: e.target.value })
                  }
                  placeholder="Describe any maintenance work done"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="system_notes">System Notes</Label>
                <Textarea
                  id="system_notes"
                  value={formData.system_notes}
                  onChange={(e) => setFormData({ ...formData, system_notes: e.target.value })}
                  placeholder="Additional system observations"
                  rows={3}
                />
              </div>
            </div>

            {/* Occurrence Reporting */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="occurrence"
                  checked={formData.occurrence_reported}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, occurrence_reported: checked })
                  }
                />
                <Label htmlFor="occurrence" className="cursor-pointer">
                  Occurrence Reported
                </Label>
              </div>
              {formData.occurrence_reported && (
                <div className="space-y-2">
                  <Label htmlFor="occurrence_details">Occurrence Details</Label>
                  <Textarea
                    id="occurrence_details"
                    value={formData.occurrence_details}
                    onChange={(e) =>
                      setFormData({ ...formData, occurrence_details: e.target.value })
                    }
                    placeholder="Describe the occurrence in detail"
                    rows={3}
                    required={formData.occurrence_reported}
                  />
                </div>
              )}
            </div>

            <Button type="submit" disabled={loading} className="w-full md:w-auto">
              {loading ? "Saving..." : "Save Pool Log Entry"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Filters and Export */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle>Recent Pool Logs</CardTitle>
              <CardDescription>View and filter pool maintenance records</CardDescription>
            </div>
            <Button onClick={exportToCSV} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export to CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          </div>

          {/* Table */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Total Swimmers</TableHead>
                  <TableHead>Chlorine (ppm)</TableHead>
                  <TableHead>pH Level</TableHead>
                  <TableHead>Maintenance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Checked By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No pool logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.date}</TableCell>
                      <TableCell>{log.session}</TableCell>
                      <TableCell>{log.total_swimmers}</TableCell>
                      <TableCell>{log.chlorine_ppm || "—"}</TableCell>
                      <TableCell>{log.ph_level || "—"}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {log.maintenance_performed || "None"}
                      </TableCell>
                      <TableCell>
                        {log.occurrence_reported ? (
                          <Badge variant="destructive">Occurrence</Badge>
                        ) : (
                          <Badge variant="secondary">Normal</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.checked_by_profile
                          ? `${log.checked_by_profile.first_name} ${log.checked_by_profile.last_name}`
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PoolLogsTab;
