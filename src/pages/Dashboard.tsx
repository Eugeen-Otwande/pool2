import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User, Session } from "@supabase/supabase-js";
import ModernDashboardLayout from "@/components/dashboard/ModernDashboardLayout";
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
  subscription_type: string | null;
  subscription_expires_at: string | null;
  emergency_contact?: string | null;
  emergency_phone?: string | null;
  created_at: string;
  updated_at: string;
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
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

  // Use modern layout for admin and staff roles
  if (profile.role === "admin" || profile.role === "system_admin" || profile.role === "pool_admin" || profile.role === "staff") {
    return (
      <ModernDashboardLayout
        user={user}
        profile={profile}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSignOut={handleSignOut}
      >
        {renderDashboard()}
      </ModernDashboardLayout>
    );
  }

  // Legacy layout for other roles
  return (
    <div className="min-h-screen bg-background">
      <main>
        {renderDashboard()}
      </main>
    </div>
  );
};

export default Dashboard;