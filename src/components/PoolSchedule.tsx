import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "lucide-react";

const PoolSchedule = () => {
  const scheduleData = [
    {
      session: "Morning",
      time: "6:00 AM - 8:00 AM",
      monday: "15/25",
      tuesday: "8/25",
      wednesday: "20/25",
      thursday: "12/25",
      friday: "5/25",
      saturday: "22/30",
      saturdayTime: "7:00 AM - 10:00 AM",
      sunday: "18/30",
      sundayTime: "8:00 AM - 11:00 AM"
    },
    {
      session: "Evening",
      time: "5:00 PM - 7:00 PM",
      monday: "15/25",
      tuesday: "8/25",
      wednesday: "20/25",
      thursday: "12/25",
      friday: "5/25",
      saturday: "22/30",
      saturdayTime: "3:00 PM - 6:00 PM",
      sunday: "18/30",
      sundayTime: "4:00 PM - 6:00 PM"
    }
  ];

  const getCapacityColor = (capacity: string) => {
    const [current, total] = capacity.split('/').map(Number);
    const percentage = (current / total) * 100;
    
    if (percentage < 50) return "text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400";
    if (percentage < 80) return "text-yellow-600 bg-yellow-50 dark:bg-yellow-950 dark:text-yellow-400";
    return "text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400";
  };

  return (
    <section id="schedule" className="py-24 bg-gradient-to-br from-muted/20 to-background">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">
            Weekly Pool Schedule
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
            Check our weekly timetable
            <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              and plan your swimming sessions
            </span>
          </h2>
        </div>

        {/* Schedule Card */}
        <Card className="max-w-7xl mx-auto bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-center justify-center">
              <Calendar className="w-6 h-6" />
              Swimming Pool Timetable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Session</TableHead>
                    <TableHead className="font-semibold">Monday</TableHead>
                    <TableHead className="font-semibold">Tuesday</TableHead>
                    <TableHead className="font-semibold">Wednesday</TableHead>
                    <TableHead className="font-semibold">Thursday</TableHead>
                    <TableHead className="font-semibold">Friday</TableHead>
                    <TableHead className="font-semibold">Saturday</TableHead>
                    <TableHead className="font-semibold">Sunday</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduleData.map((schedule, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-semibold">{schedule.session}</div>
                          <div className="text-sm text-muted-foreground">{schedule.time}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`${getCapacityColor(schedule.monday)} border-current`}
                        >
                          {schedule.monday}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`${getCapacityColor(schedule.tuesday)} border-current`}
                        >
                          {schedule.tuesday}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`${getCapacityColor(schedule.wednesday)} border-current`}
                        >
                          {schedule.wednesday}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`${getCapacityColor(schedule.thursday)} border-current`}
                        >
                          {schedule.thursday}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`${getCapacityColor(schedule.friday)} border-current`}
                        >
                          {schedule.friday}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <Badge 
                            variant="outline" 
                            className={`${getCapacityColor(schedule.saturday)} border-current mb-1`}
                          >
                            {schedule.saturday}
                          </Badge>
                          <div className="text-xs text-muted-foreground">
                            {schedule.saturdayTime}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <Badge 
                            variant="outline" 
                            className={`${getCapacityColor(schedule.sunday)} border-current mb-1`}
                          >
                            {schedule.sunday}
                          </Badge>
                          <div className="text-xs text-muted-foreground">
                            {schedule.sundayTime}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Legend */}
            <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-500"></div>
                <span className="text-muted-foreground">Available (0-50% capacity)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-yellow-500"></div>
                <span className="text-muted-foreground">Moderate (50-80% capacity)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-500"></div>
                <span className="text-muted-foreground">Busy (80%+ capacity)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default PoolSchedule;