import { useState, useEffect } from "react";
import { Clock, Users, GraduationCap, Home, Briefcase, Calendar, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

interface PoolSchedule {
  id: string;
  title: string;
  session_name: string | null;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  allowed_roles: string[];
  capacity_limit: number;
  description: string | null;
  is_active: boolean;
}

interface ProcessedSession {
  time: string;
  name: string;
  roles: string[];
  schedule: boolean[];
  capacity: number;
  description: string | null;
}

const RcmrdTimetable = () => {
  const [schedules, setSchedules] = useState<ProcessedSession[]>([]);
  const [loading, setLoading] = useState(true);
  
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('pool_schedules')
        .select('*')
        .eq('is_active', true)
        .order('start_time', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const processed = processSchedules(data as PoolSchedule[]);
        setSchedules(processed);
      } else {
        // Fallback to default schedules if no data
        setSchedules(getDefaultSchedules());
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
      setSchedules(getDefaultSchedules());
    } finally {
      setLoading(false);
    }
  };

  const processSchedules = (data: PoolSchedule[]): ProcessedSession[] => {
    return data.map(schedule => {
      // Create schedule array for each day (0 = Sunday, 1 = Monday, etc.)
      // We display Mon-Sun, so we need to reorder
      const daySchedule = [1, 2, 3, 4, 5, 6, 0].map(dayNum => 
        schedule.days_of_week.includes(dayNum)
      );

      // Format time range
      const formatTime = (time: string) => {
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
      };

      // Format roles for display
      const formatRoles = (roles: string[]) => {
        return roles.map(role => {
          switch (role.toLowerCase()) {
            case 'student': return 'Students';
            case 'resident': return 'Residents';
            case 'staff': return 'Staff';
            case 'member': return 'Members';
            case 'visitor': return 'Visitors';
            default: return role.charAt(0).toUpperCase() + role.slice(1);
          }
        });
      };

      return {
        time: `${formatTime(schedule.start_time)} - ${formatTime(schedule.end_time)}`,
        name: schedule.session_name || schedule.title,
        roles: formatRoles(schedule.allowed_roles),
        schedule: daySchedule,
        capacity: schedule.capacity_limit,
        description: schedule.description
      };
    });
  };

  const getDefaultSchedules = (): ProcessedSession[] => [
    {
      time: "6:00 AM - 8:00 AM",
      name: "Early Morning Swim",
      roles: ["Staff", "Members"],
      schedule: [true, true, true, true, true, true, false],
      capacity: 30,
      description: "Early morning session for staff and members"
    },
    {
      time: "8:00 AM - 10:00 AM",
      name: "Student Session",
      roles: ["Students"],
      schedule: [true, true, true, true, true, false, false],
      capacity: 40,
      description: "Dedicated session for students"
    },
    {
      time: "10:00 AM - 12:00 PM",
      name: "General Swimming",
      roles: ["All"],
      schedule: [true, true, true, true, true, true, true],
      capacity: 50,
      description: "Open to everyone"
    },
    {
      time: "2:00 PM - 4:00 PM",
      name: "Resident Hours",
      roles: ["Residents", "Members"],
      schedule: [true, true, true, true, true, true, true],
      capacity: 35,
      description: "Dedicated hours for residents and members"
    },
    {
      time: "4:00 PM - 6:00 PM",
      name: "Training Session",
      roles: ["Students", "Members"],
      schedule: [true, true, true, true, true, false, false],
      capacity: 30,
      description: "Training and coaching session"
    },
    {
      time: "6:00 PM - 8:00 PM",
      name: "Evening Swim",
      roles: ["All"],
      schedule: [true, true, true, true, true, true, true],
      capacity: 50,
      description: "Evening session open to all"
    },
  ];

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case "students":
        return "bg-purple-500/10 text-purple-600 border-purple-200";
      case "residents":
        return "bg-orange-500/10 text-orange-600 border-orange-200";
      case "staff":
        return "bg-blue-500/10 text-blue-600 border-blue-200";
      case "members":
        return "bg-cyan-500/10 text-cyan-600 border-cyan-200";
      case "visitors":
        return "bg-pink-500/10 text-pink-600 border-pink-200";
      case "all":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-200";
      default:
        return "bg-muted text-muted-foreground border-muted";
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case "students":
        return <GraduationCap className="w-3 h-3" />;
      case "residents":
        return <Home className="w-3 h-3" />;
      case "staff":
        return <Briefcase className="w-3 h-3" />;
      case "members":
        return <Users className="w-3 h-3" />;
      default:
        return <Users className="w-3 h-3" />;
    }
  };

  return (
    <section id="timetable" className="py-24 bg-muted/30">
      <div className="container mx-auto px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center space-y-6 mb-16">
            <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Weekly Schedule</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-light text-foreground">
              Pool Operating
              <span className="block font-semibold text-primary">Timetable</span>
            </h2>
            
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Plan your swim sessions with our weekly schedule. Different time slots are allocated for various user groups to ensure a comfortable experience for everyone.
            </p>
          </div>

          {/* Timetable Card */}
          <Card className="overflow-hidden border-0 shadow-xl bg-card/80 backdrop-blur-sm">
            <CardHeader className="bg-primary/5 border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="w-5 h-5 text-primary" />
                Weekly Pool Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 space-y-4">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Loading schedules...</span>
                  </div>
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold text-foreground min-w-[140px]">Time</TableHead>
                        <TableHead className="font-semibold text-foreground min-w-[150px]">Session</TableHead>
                        {days.map((day) => (
                          <TableHead key={day} className="font-semibold text-foreground text-center min-w-[80px]">
                            <span className="hidden md:inline">{day}</span>
                            <span className="md:hidden">{day.slice(0, 3)}</span>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schedules.map((session, index) => (
                        <TableRow key={index} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="font-medium text-sm">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              {session.time}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              <span className="font-medium text-foreground">{session.name}</span>
                              <div className="flex flex-wrap gap-1">
                                {session.roles.length > 0 ? (
                                  session.roles.map((role, roleIndex) => (
                                    <Badge 
                                      key={roleIndex} 
                                      variant="outline" 
                                      className={`text-xs ${getRoleColor(role)} flex items-center gap-1`}
                                    >
                                      {getRoleIcon(role)}
                                      {role}
                                    </Badge>
                                  ))
                                ) : (
                                  <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">
                                    Closed
                                  </Badge>
                                )}
                              </div>
                              {session.capacity > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  Capacity: {session.capacity}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          {session.schedule.map((available, dayIndex) => (
                            <TableCell key={dayIndex} className="text-center">
                              {available ? (
                                <div className="flex justify-center">
                                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex justify-center">
                                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                    <div className="w-3 h-3 rounded-full bg-muted-foreground/30"></div>
                                  </div>
                                </div>
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Legend */}
          <div className="mt-8 flex flex-wrap justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              </div>
              <span className="text-sm text-muted-foreground">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-muted-foreground/30"></div>
              </div>
              <span className="text-sm text-muted-foreground">Closed</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-200 flex items-center gap-1">
                <Users className="w-3 h-3" />
                All
              </Badge>
              <span className="text-sm text-muted-foreground">Open to everyone</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RcmrdTimetable;
