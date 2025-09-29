import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { User } from "@supabase/supabase-js";

interface CheckInWidgetProps {
  user: User;
  profile: {
    role: string;
    first_name: string | null;
    status: string;
  };
}

const CheckInWidget = ({ user, profile }: CheckInWidgetProps) => {
  const [currentCheckIn, setCurrentCheckIn] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCurrentCheckIn();
    
    // Set up real-time subscription
    const channel = supabase
      .channel(`checkin-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'check_ins',
          filter: `user_id=eq.${user.id}`
        },
        () => fetchCurrentCheckIn()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id]);

  const fetchCurrentCheckIn = async () => {
    try {
      const { data, error } = await supabase
        .from("check_ins")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "checked_in")
        .is("check_out_time", null)
        .order("check_in_time", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setCurrentCheckIn(data);
    } catch (error) {
      console.error("Error fetching current check-in:", error);
    }
  };

  const handleToggleCheckIn = async () => {
    if (profile.status !== 'active') {
      toast({
        title: "Access Denied", 
        description: "Your account needs to be approved to access the pool",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('toggle_checkin_for_user', {
        _user_id: user.id
      });

      if (error) throw error;

      const result = data?.[0];
      if (!result) throw new Error('No result returned from check-in toggle');

      const isCheckIn = result.status === 'checked_in';
      
      toast({
        title: isCheckIn ? "Check-in Successful" : "Check-out Successful",
        description: isCheckIn 
          ? `Welcome to the pool, ${profile.first_name || profile.role}!`
          : "Thanks for visiting! Have a great day",
      });

      // Reload widget state
      fetchCurrentCheckIn();
    } catch (error: any) {
      toast({
        title: "Operation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (checkInTime: string) => {
    const start = new Date(checkInTime);
    const now = new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / 60000); // minutes
    
    if (diff < 60) return `${diff}m`;
    return `${Math.floor(diff / 60)}h ${diff % 60}m`;
  };

  return (
    <Card className={`${currentCheckIn ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-emerald-200 dark:border-emerald-800' : 'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900'}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {currentCheckIn ? (
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          ) : (
            <XCircle className="w-5 h-5 text-slate-600" />
          )}
          Pool Access
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentCheckIn ? (
          <div>
            <Badge className="mb-3 bg-emerald-600">Currently In Pool</Badge>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Duration: {formatDuration(currentCheckIn.check_in_time)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Checked in: {new Date(currentCheckIn.check_in_time).toLocaleTimeString()}
            </p>
            <Button 
              onClick={handleToggleCheckIn}
              className="w-full"
              variant="outline"
              disabled={loading}
            >
              <XCircle className="w-4 h-4 mr-2" />
              {loading ? "Checking out..." : "Check Out"}
            </Button>
          </div>
        ) : (
          <div>
            <Badge variant="secondary" className="mb-3">
              {profile.status === 'active' ? 'Ready to Enter' : 'Pending Approval'}
            </Badge>
            <p className="text-sm text-muted-foreground mb-4">
              {profile.status === 'active' 
                ? 'Click below to check into the pool'
                : 'Your account needs approval to access the pool'
              }
            </p>
            <Button 
              onClick={handleToggleCheckIn}
              className="w-full"
              disabled={loading || profile.status !== 'active'}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {loading ? "Checking in..." : "Check In"}
            </Button>
          </div>
        )}
        
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Role: <Badge variant="outline" className="text-xs">{profile.role}</Badge>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CheckInWidget;