import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Plus, Edit, Trash2, Users } from "lucide-react";

interface Schedule {
  id: string;
  title: string;
  description?: string;
  session_name?: string;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  capacity_limit: number;
  max_students: number;
  max_staff: number;
  max_residents: number;
  max_members: number;
  allowed_roles: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TimetableManagementProps {
  onRefreshStats: () => void;
}

const TimetableManagement = ({ onRefreshStats }: TimetableManagementProps) => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    session_name: "",
    start_time: "",
    end_time: "",
    days_of_week: [] as number[],
    capacity_limit: 25,
    max_students: 10,
    max_staff: 5,
    max_residents: 8,
    max_members: 2,
    allowed_roles: ["student", "staff", "resident", "member", "faculty"] as string[],
    is_active: true,
  });
  const { toast } = useToast();

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const roleOptions = ["student", "staff", "resident", "member", "visitor", "faculty"];

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from("pool_schedules")
        .select("*")
        .order("start_time", { ascending: true });

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      toast({
        title: "Error",
        description: "Failed to load schedules",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      session_name: "",
      start_time: "",
      end_time: "",
      days_of_week: [],
      capacity_limit: 25,
      max_students: 10,
      max_staff: 5,
      max_residents: 8,
      max_members: 2,
      allowed_roles: ["student", "staff", "resident", "member", "faculty"],
      is_active: true,
    });
    setSelectedSchedule(null);
  };

  const handleEdit = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setFormData({
      title: schedule.title,
      description: schedule.description || "",
      session_name: schedule.session_name || "",
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      days_of_week: schedule.days_of_week,
      capacity_limit: schedule.capacity_limit,
      max_students: schedule.max_students || 0,
      max_staff: schedule.max_staff || 0,
      max_residents: schedule.max_residents || 0,
      max_members: schedule.max_members || 0,
      allowed_roles: schedule.allowed_roles,
      is_active: schedule.is_active,
    });
    setShowAddDialog(true);
  };

  const handleSubmit = async () => {
    try {
      if (selectedSchedule) {
        // Update existing schedule
        const { error } = await supabase
          .from("pool_schedules")
          .update(formData)
          .eq("id", selectedSchedule.id);

        if (error) throw error;
        toast({ title: "Success", description: "Schedule updated successfully" });
      } else {
        // Create new schedule
        const { error } = await supabase
          .from("pool_schedules")
          .insert([formData]);

        if (error) throw error;
        toast({ title: "Success", description: "Schedule created successfully" });
      }

      fetchSchedules();
      onRefreshStats();
      setShowAddDialog(false);
      resetForm();
    } catch (error) {
      console.error("Error saving schedule:", error);
      toast({
        title: "Error",
        description: "Failed to save schedule",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (scheduleId: string) => {
    try {
      const { error } = await supabase
        .from("pool_schedules")
        .delete()
        .eq("id", scheduleId);

      if (error) throw error;

      toast({ title: "Success", description: "Schedule deleted successfully" });
      fetchSchedules();
      onRefreshStats();
    } catch (error) {
      console.error("Error deleting schedule:", error);
      toast({
        title: "Error",
        description: "Failed to delete schedule",
        variant: "destructive",
      });
    }
  };

  const toggleDayOfWeek = (day: number) => {
    setFormData(prev => {
      const currentDays = prev.days_of_week || [];
      return {
        ...prev,
        days_of_week: currentDays.includes(day)
          ? currentDays.filter(d => d !== day)
          : [...currentDays, day].sort()
      };
    });
  };

  const toggleRole = (role: string) => {
    setFormData(prev => {
      const currentRoles = prev.allowed_roles || [];
      return {
        ...prev,
        allowed_roles: currentRoles.includes(role)
          ? currentRoles.filter(r => r !== role)
          : [...currentRoles, role]
      };
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Pool Schedule Management
          </CardTitle>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Add Schedule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {selectedSchedule ? "Edit Schedule" : "Add New Schedule"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Session Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Morning Swim"
                    />
                  </div>
                  <div>
                    <Label htmlFor="session_name">Session Name</Label>
                    <Input
                      id="session_name"
                      value={formData.session_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, session_name: e.target.value }))}
                      placeholder="e.g., Morning Session"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Optional description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_time">Start Time</Label>
                    <Input
                      id="start_time"
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_time">End Time</Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label>Days of Week</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {dayNames.map((day, index) => (
                      <Button
                        key={index}
                        type="button"
                        variant={(formData.days_of_week || []).includes(index) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleDayOfWeek(index)}
                      >
                        {day.slice(0, 3)}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Capacity Limits per User Type</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <Label htmlFor="max_students">Students</Label>
                      <Input
                        id="max_students"
                        type="number"
                        value={formData.max_students}
                        onChange={(e) => setFormData(prev => ({ ...prev, max_students: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="max_staff">Staff</Label>
                      <Input
                        id="max_staff"
                        type="number"
                        value={formData.max_staff}
                        onChange={(e) => setFormData(prev => ({ ...prev, max_staff: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="max_residents">Residents</Label>
                      <Input
                        id="max_residents"
                        type="number"
                        value={formData.max_residents}
                        onChange={(e) => setFormData(prev => ({ ...prev, max_residents: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="max_members">Members</Label>
                      <Input
                        id="max_members"
                        type="number"
                        value={formData.max_members}
                        onChange={(e) => setFormData(prev => ({ ...prev, max_members: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="capacity_limit">Total Capacity Limit</Label>
                  <Input
                    id="capacity_limit"
                    type="number"
                    value={formData.capacity_limit}
                    onChange={(e) => setFormData(prev => ({ ...prev, capacity_limit: parseInt(e.target.value) || 0 }))}
                  />
                </div>

                <div>
                  <Label>Allowed Roles</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {roleOptions.map((role) => (
                      <Button
                        key={role}
                        type="button"
                        variant={(formData.allowed_roles || []).includes(role) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleRole(role)}
                      >
                        {role}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  />
                  <Label htmlFor="is_active">Active Schedule</Label>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSubmit} className="flex-1">
                    {selectedSchedule ? "Update Schedule" : "Create Schedule"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddDialog(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((schedule) => (
                <TableRow key={schedule.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{schedule.title}</div>
                      {schedule.session_name && (
                        <div className="text-sm text-muted-foreground">{schedule.session_name}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      <Clock className="w-3 h-3 mr-1" />
                      {schedule.start_time} - {schedule.end_time}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(schedule.days_of_week || []).map((day) => (
                        <Badge key={day} variant="secondary" className="text-xs">
                          {dayNames[day]?.slice(0, 3) || 'N/A'}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">{schedule.capacity_limit || 0} total</div>
                      <div className="text-muted-foreground">
                        S:{schedule.max_students || 0} St:{schedule.max_staff || 0} R:{schedule.max_residents || 0} M:{schedule.max_members || 0}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(schedule.allowed_roles || []).slice(0, 2).map((role) => (
                        <Badge key={role} variant="outline" className="text-xs">
                          {role}
                        </Badge>
                      ))}
                      {(schedule.allowed_roles || []).length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{(schedule.allowed_roles || []).length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={schedule.is_active ? "default" : "secondary"}>
                      {schedule.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(schedule)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(schedule.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
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

export default TimetableManagement;