import { Clock, Users, GraduationCap, Home, Briefcase, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const RcmrdTimetable = () => {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  
  const sessions = [
    {
      time: "6:00 AM - 8:00 AM",
      name: "Early Morning Swim",
      roles: ["Staff", "Members"],
      schedule: [true, true, true, true, true, true, false],
      color: "bg-blue-500/10 text-blue-600 border-blue-200"
    },
    {
      time: "8:00 AM - 10:00 AM",
      name: "Student Session",
      roles: ["Students"],
      schedule: [true, true, true, true, true, false, false],
      color: "bg-purple-500/10 text-purple-600 border-purple-200"
    },
    {
      time: "10:00 AM - 12:00 PM",
      name: "General Swimming",
      roles: ["All"],
      schedule: [true, true, true, true, true, true, true],
      color: "bg-emerald-500/10 text-emerald-600 border-emerald-200"
    },
    {
      time: "12:00 PM - 2:00 PM",
      name: "Lunch Break",
      roles: [],
      schedule: [false, false, false, false, false, false, false],
      color: "bg-muted text-muted-foreground border-muted"
    },
    {
      time: "2:00 PM - 4:00 PM",
      name: "Resident Hours",
      roles: ["Residents", "Members"],
      schedule: [true, true, true, true, true, true, true],
      color: "bg-orange-500/10 text-orange-600 border-orange-200"
    },
    {
      time: "4:00 PM - 6:00 PM",
      name: "Training Session",
      roles: ["Students", "Members"],
      schedule: [true, true, true, true, true, false, false],
      color: "bg-cyan-500/10 text-cyan-600 border-cyan-200"
    },
    {
      time: "6:00 PM - 8:00 PM",
      name: "Evening Swim",
      roles: ["All"],
      schedule: [true, true, true, true, true, true, true],
      color: "bg-indigo-500/10 text-indigo-600 border-indigo-200"
    },
  ];

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
                    {sessions.map((session, index) => (
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
                                    className={`text-xs ${session.color} flex items-center gap-1`}
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
