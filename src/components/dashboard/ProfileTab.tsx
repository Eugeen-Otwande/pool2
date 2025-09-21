import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  Mail, 
  Phone, 
  UserCheck, 
  Calendar, 
  Save, 
  Edit, 
  Eye, 
  EyeOff,
  Shield,
  CreditCard,
  MapPin,
  AlertTriangle
} from "lucide-react";
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
  created_at: string;
  updated_at: string;
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
  const [passwordLoading, setPasswordLoading] = useState(false);
  
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

  // Update local state when profile prop changes
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
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated",
      });

      setIsEditing(false);
      if (onProfileUpdate && data) {
        onProfileUpdate(data);
      }
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile",
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
        title: "Password Mismatch",
        description: "New password and confirm password don't match",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      toast({
        title: "Password Updated",
        description: "Your password has been successfully updated",
      });

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      toast({
        title: "Password Update Failed",
        description: error.message || "Failed to update password",
        variant: "destructive",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
      case "system_admin":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "staff":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "member":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "student":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "resident":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "visitor":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "suspended":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const isSubscriptionExpired = () => {
    if (!profile.subscription_expires_at) return false;
    return new Date(profile.subscription_expires_at) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Account Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Account Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Email Address</Label>
              <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{profile.email}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">User ID</Label>
              <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                <UserCheck className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-mono">{user.id.slice(0, 8)}...</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Role</Label>
              <Badge className={getRoleColor(profile.role)}>
                {profile.role.replace("_", " ").toUpperCase()}
              </Badge>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Status</Label>
              <Badge className={getStatusColor(profile.status)}>
                {profile.status.toUpperCase()}
              </Badge>
            </div>
          </div>
          <div className="pt-2">
            <div className="text-xs text-muted-foreground">
              Member since: {new Date(profile.created_at).toLocaleDateString()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Personal Information
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              {isEditing ? "Cancel" : "Edit Profile"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={profileData.first_name}
                onChange={(e) => setProfileData(prev => ({ ...prev, first_name: e.target.value }))}
                disabled={!isEditing}
                placeholder="Enter your first name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                value={profileData.last_name}
                onChange={(e) => setProfileData(prev => ({ ...prev, last_name: e.target.value }))}
                disabled={!isEditing}
                placeholder="Enter your last name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={profileData.phone}
                  onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                  disabled={!isEditing}
                  placeholder="+254 700 000 000"
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {isEditing && (
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleProfileUpdate}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {loading ? "Saving..." : "Save Changes"}
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
        </CardContent>
      </Card>

      {/* Emergency Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Emergency Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="emergency_contact">Emergency Contact Name</Label>
              <Input
                id="emergency_contact"
                value={profileData.emergency_contact}
                onChange={(e) => setProfileData(prev => ({ ...prev, emergency_contact: e.target.value }))}
                disabled={!isEditing}
                placeholder="Full name of emergency contact"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergency_phone">Emergency Contact Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="emergency_phone"
                  value={profileData.emergency_phone}
                  onChange={(e) => setProfileData(prev => ({ ...prev, emergency_phone: e.target.value }))}
                  disabled={!isEditing}
                  placeholder="+254 700 000 000"
                  className="pl-10"
                />
              </div>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            This information will be used to contact someone in case of emergency during your pool visits.
          </div>
        </CardContent>
      </Card>

      {/* Membership Information */}
      {(profile.role === "member" || profile.subscription_type) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Membership Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.subscription_type && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Subscription Type</Label>
                  <div className="p-2 rounded-md bg-muted/50">
                    <span className="text-sm capitalize">{profile.subscription_type}</span>
                  </div>
                </div>
              )}
              {profile.subscription_expires_at && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Expires</Label>
                  <div className={`p-2 rounded-md ${isSubscriptionExpired() ? 'bg-red-100 dark:bg-red-900' : 'bg-muted/50'}`}>
                    <span className={`text-sm ${isSubscriptionExpired() ? 'text-red-800 dark:text-red-200' : ''}`}>
                      {new Date(profile.subscription_expires_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
            {isSubscriptionExpired() && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-sm text-red-800 dark:text-red-200">
                  Your membership has expired. Please contact administration to renew.
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new_password">New Password</Label>
              <div className="relative">
                <Input
                  id="new_password"
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
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirm New Password</Label>
              <Input
                id="confirm_password"
                type={showPassword ? "text" : "password"}
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Confirm new password"
              />
            </div>
            <Button
              onClick={handlePasswordUpdate}
              disabled={passwordLoading || !passwordData.newPassword || !passwordData.confirmPassword}
              className="flex items-center gap-2"
            >
              <Shield className="w-4 h-4" />
              {passwordLoading ? "Updating..." : "Update Password"}
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            Password must be at least 6 characters long.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileTab;