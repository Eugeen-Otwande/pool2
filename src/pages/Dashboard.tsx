import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User, Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import DashboardNav from "@/components/dashboard/DashboardNav";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import StudentDashboard from "@/components/dashboard/StudentDashboard";
import StaffDashboard from "@/components/dashboard/StaffDashboard";
import MemberDashboard from "@/components/dashboard/MemberDashboard";
import ResidentDashboard from "@/components/dashboard/ResidentDashboard";
import VisitorDashboard from "@/components/dashboard/VisitorDashboard";

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  status: string;
  phone: string | null;
  emergency_contact: string | null;
  emergency_phone: string | null;
  subscription_type: string | null;
  subscription_expires_at: string | null;
  check_in_status: string | null;
  check_in_at: string | null;
  check_out_at: string | null;
  created_at: string;
  updated_at: string;
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user profile after auth state change
          setTimeout(() => {
            fetchUserProfile(session.user.id);
          }, 0);
        } else {
          navigate("/auth");
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        toast({
          title: "Error",
          description: "Failed to load user profile",
          variant: "destructive",
        });
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Unable to load user data</p>
        </div>
      </div>
    );
  }

  // Check if user account is pending approval
  if (profile.status === 'pending') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md p-8">
          <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-semibold mb-2">Account Pending Approval</h2>
            <p className="text-muted-foreground mb-4">
              Your account is awaiting approval from the pool staff. You will be notified once your account has been reviewed.
            </p>
            <p className="text-sm text-muted-foreground">
              This usually takes 1-2 business days.
            </p>
          </div>
          <Button onClick={handleSignOut} variant="outline">
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  // Check if user account is rejected or suspended
  if (profile.status === 'rejected' || profile.status === 'suspended') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md p-8">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-semibold mb-2">Account {profile.status === 'rejected' ? 'Not Approved' : 'Suspended'}</h2>
            <p className="text-muted-foreground mb-4">
              Your account registration was not approved. Please contact the pool staff for more information.
            </p>
          </div>
          <Button onClick={handleSignOut} variant="outline">
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState("overview");

  const handleNavigateToTab = (tab: string) => {
    setActiveTab(tab);
  };

  const renderDashboard = () => {
    switch (profile.role) {
      case "admin":
      case "system_admin":
      case "pool_admin":
        return <AdminDashboard user={user} profile={profile} activeTab={activeTab} onTabChange={setActiveTab} />;
      case "staff":
        return <StaffDashboard user={user} profile={profile} activeTab={activeTab} onTabChange={setActiveTab} />;
      case "student":
        return <StudentDashboard user={user} profile={profile} />;
      case "member":
      case "rcmrd_team":
      case "rcmrd_official":
        return <MemberDashboard user={user} profile={profile} />;
      case "resident":
        return <ResidentDashboard user={user} profile={profile} />;
      case "visitor":
        return <VisitorDashboard user={user} profile={profile} />;
      default:
        return (
          <div className="p-6 text-center">
            <p className="text-muted-foreground">
              Role "{profile.role}" dashboard not implemented yet.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav 
        user={user} 
        profile={profile} 
        onSignOut={handleSignOut}
        onNavigateToTab={handleNavigateToTab}
      />
      <main className="pt-16">
        {renderDashboard()}
      </main>
    </div>
  );
};

export default Dashboard;