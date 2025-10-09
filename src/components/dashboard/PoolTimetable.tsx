import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Users, Filter } from "lucide-react";

interface Schedule {
  id: string;
  title: string;
  session_name?: string;
  description?: string;
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
}

interface PoolTimetableProps {
  userRole?: string;
}

const PoolTimetable = ({ userRole }: PoolTimetableProps) => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [filteredSchedules, setFilteredSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string>("all");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const { toast } = useToast();

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  
  const roleColors: Record<string, string> = {
    student: "bg-blue-500 text-white",
    staff: "bg-cyan-500 text-white",
    resident: "bg-orange-500 text-white",
    member: "bg-purple-500 text-white",
    rcmrd_team: "bg-indigo-500 text-white",
    rcmrd_official: "bg-violet-500 text-white",
    visitor: "bg-gray-500 text-white",
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [schedules, selectedDay, selectedRole]);

  const fetchSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from("pool_schedules")
        .select("*")
        .eq("is_active", true)
        .order("start_time", { ascending: true });

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      toast({
        title: "Error",
        description: "Failed to load timetable",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...schedules];

    // Filter by day
    if (selectedDay !== "all") {
      const dayIndex = parseInt(selectedDay);
      filtered = filtered.filter(schedule => 
        schedule.days_of_week.includes(dayIndex)
      );
    }

    // Filter by role
    if (selectedRole !== "all") {
      filtered = filtered.filter(schedule =>
        schedule.allowed_roles.includes(selectedRole)
      );
    }

    setFilteredSchedules(filtered);
  };

  const groupByDay = () => {
    const grouped: Record<number, Schedule[]> = {};
    
    filteredSchedules.forEach(schedule => {
      schedule.days_of_week.forEach(day => {
        if (!grouped[day]) {
          grouped[day] = [];
        }
        grouped[day].push(schedule);
      });
    });

    // Sort schedules within each day by start time
    Object.keys(grouped).forEach(day => {
      grouped[parseInt(day)].sort((a, b) => 
        a.start_time.localeCompare(b.start_time)
      );
    });

    return grouped;
  };

  const isScheduleActive = (startTime: string, endTime: string, dayIndex: number) => {
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5);
    
    return currentDay === dayIndex && currentTime >= startTime && currentTime <= endTime;
  };

  const getRemainingSlots = (schedule: Schedule) => {
    const totalMax = schedule.max_students + schedule.max_staff + 
                     schedule.max_residents + schedule.max_members;
    return totalMax || schedule.capacity_limit;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const groupedSchedules = groupByDay();

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Weekly Pool Timetable
          </CardTitle>
          
          {/* Filters */}
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Select value={selectedDay} onValueChange={setSelectedDay}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Days" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Days</SelectItem>
                {dayNames.map((day, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="student">Students</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="resident">Residents</SelectItem>
                <SelectItem value="member">Members</SelectItem>
                <SelectItem value="rcmrd_team">RCMRD Team</SelectItem>
                <SelectItem value="rcmrd_official">RCMRD Official</SelectItem>
                <SelectItem value="visitor">Visitors</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {Object.keys(groupedSchedules).length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg mb-2">No sessions found</p>
            <p className="text-sm text-muted-foreground">
              {selectedDay !== "all" || selectedRole !== "all" 
                ? "Try adjusting your filters"
                : "No active pool sessions scheduled at this time"
              }
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {dayNames.map((dayName, dayIndex) => {
              const daySessions = groupedSchedules[dayIndex];
              if (!daySessions || daySessions.length === 0) return null;

              const isToday = new Date().getDay() === dayIndex;

              return (
                <div key={dayIndex} className="space-y-3">
                  {/* Day Header */}
                  <div className={`flex items-center gap-2 pb-2 border-b ${
                    isToday ? 'border-primary' : 'border-border'
                  }`}>
                    <h3 className={`text-lg font-semibold ${
                      isToday ? 'text-primary' : 'text-foreground'
                    }`}>
                      {dayName}
                    </h3>
                    {isToday && (
                      <Badge className="bg-primary text-primary-foreground">Today</Badge>
                    )}
                    <span className="text-sm text-muted-foreground ml-auto">
                      {daySessions.length} session{daySessions.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Day Sessions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {daySessions.map((schedule) => {
                      const isActive = isScheduleActive(
                        schedule.start_time, 
                        schedule.end_time, 
                        dayIndex
                      );
                      const remainingSlots = getRemainingSlots(schedule);

                      return (
                        <div
                          key={`${schedule.id}-${dayIndex}`}
                          className={`p-4 rounded-lg border transition-all ${
                            isActive
                              ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700 shadow-md'
                              : 'bg-card hover:bg-muted/50'
                          }`}
                        >
                          {/* Session Title */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm truncate">
                                {schedule.title}
                              </h4>
                              {schedule.session_name && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {schedule.session_name}
                                </p>
                              )}
                            </div>
                            {isActive && (
                              <Badge className="bg-emerald-600 text-white shrink-0 text-xs">
                                Active Now
                              </Badge>
                            )}
                          </div>

                          {/* Time */}
                          <div className="flex items-center gap-1 text-sm mb-2">
                            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {schedule.start_time} - {schedule.end_time}
                            </span>
                          </div>

                          {/* Description */}
                          {schedule.description && (
                            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                              {schedule.description}
                            </p>
                          )}

                          {/* Roles */}
                          <div className="flex flex-wrap gap-1 mb-3">
                            {schedule.allowed_roles.slice(0, 3).map((role) => (
                              <Badge
                                key={role}
                                className={`text-xs px-2 py-0 ${roleColors[role] || 'bg-gray-500'}`}
                              >
                                {role}
                              </Badge>
                            ))}
                            {schedule.allowed_roles.length > 3 && (
                              <Badge variant="outline" className="text-xs px-2 py-0">
                                +{schedule.allowed_roles.length - 3}
                              </Badge>
                            )}
                          </div>

                          {/* Capacity */}
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="w-3.5 h-3.5" />
                            <span>
                              Max: {remainingSlots} 
                              {schedule.capacity_limit && schedule.capacity_limit !== remainingSlots && (
                                <span className="text-muted-foreground/70">
                                  {' '}(Limit: {schedule.capacity_limit})
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PoolTimetable;
