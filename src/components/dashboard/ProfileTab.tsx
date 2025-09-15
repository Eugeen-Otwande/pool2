import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User, Lock, Save, Eye, EyeOff } from "lucide-react";
import { User as SupabaseUser } from "@supabase/supabase-js";

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
}

interface ProfileTabProps {
  user: SupabaseUser;
  profile: UserProfile;
  onProfileUpdate?: (updatedProfile: UserProfile) => void;
}

const ProfileTab = ({ user, profile, onProfileUpdate }: ProfileTabProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    first_name: profile.first_name || "",
    last_name: profile.last_name || "",
    phone: profile.phone || "",
    emergency_contact: profile.emergency_contact || "",
    emergency_phone: profile.emergency_phone || "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    setProfileData({
      first_name: profile.first_name || "",
      last_name: profile.last_name || "",
      phone: profile.phone || "",
      emergency_contact: profile.emergency_contact || "",
      emergency_phone: profile.emergency_phone || "",
    });
  }, [profile]);

  const handleProfileUpdate = async () => {
    if (!profileData.first_name.trim() || !profileData.last_name.trim()) {
      toast({
        title: "Validation Error",
        description: "First name and last name are required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({
          first_name: profileData.first_name.trim(),
          last_name: profileData.last_name.trim(),
          phone: profileData.phone.trim() || null,
          emergency_contact: profileData.emergency_contact.trim() || null,
          emergency_phone: profileData.emergency_phone.trim() || null,
        })
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully",
      });

      onProfileUpdate?.(data);
      setIsEditing(false);
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Please fill in all password fields",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Validation Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      toast({
        title: "Password Updated",
        description: "Your password has been updated successfully",
      });

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      toast({
        title: "Password Update Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "staff":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "student":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "member":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "resident":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "rcmrd_official":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Info Display */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-foreground">{profile.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Role</p>
              <Badge className={getRoleColor(profile.role)}>
                {profile.role.replace("_", " ").toUpperCase()}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Badge variant={profile.status === "active" ? "default" : "secondary"}>
                {profile.status.toUpperCase()}
              </Badge>
            </div>
          </div>

          {/* Editable Fields */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Personal Details</h3>
              {!isEditing && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  Edit Profile
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={profileData.first_name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, first_name: e.target.value }))}
                  disabled={!isEditing}
                  placeholder="Enter your first name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={profileData.last_name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, last_name: e.target.value }))}
                  disabled={!isEditing}
                  placeholder="Enter your last name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={profileData.phone}
                  onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                  disabled={!isEditing}
                  placeholder="Enter your phone number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContact">Emergency Contact</Label>
                <Input
                  id="emergencyContact"
                  value={profileData.emergency_contact}
                  onChange={(e) => setProfileData(prev => ({ ...prev, emergency_contact: e.target.value }))}
                  disabled={!isEditing}
                  placeholder="Emergency contact name"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="emergencyPhone">Emergency Contact Phone</Label>
                <Input
                  id="emergencyPhone"
                  value={profileData.emergency_phone}
                  onChange={(e) => setProfileData(prev => ({ ...prev, emergency_phone: e.target.value }))}
                  disabled={!isEditing}
                  placeholder="Emergency contact phone number"
                />
              </div>
            </div>

            {isEditing && (
              <div className="flex gap-2">
                <Button 
                  onClick={handleProfileUpdate}
                  disabled={loading}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setProfileData({
                      first_name: profile.first_name || "",
                      last_name: profile.last_name || "",
                      phone: profile.phone || "",
                      emergency_contact: profile.emergency_contact || "",
                      emergency_phone: profile.emergency_phone || "",
                    });
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Password Update */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Update Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Enter new password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Confirm new password"
              />
            </div>
          </div>
          
          <Button 
            onClick={handlePasswordUpdate}
            disabled={loading || !passwordData.newPassword || !passwordData.confirmPassword}
          >
            <Lock className="w-4 h-4 mr-2" />
            Update Password
          </Button>
        </CardContent>
      </Card>

      {/* Subscription Info (if applicable) */}
      {profile.subscription_type && (
        <Card>
          <CardHeader>
            <CardTitle>Subscription Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Subscription Type</p>
                <p className="text-foreground capitalize">{profile.subscription_type}</p>
              </div>
              {profile.subscription_expires_at && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Expires At</p>
                  <p className="text-foreground">
                    {new Date(profile.subscription_expires_at).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProfileTab;