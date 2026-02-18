const fetchPendingApprovals = async () => {
  try {
    // Fetch all profiles with status = 'pending'
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    console.log("Profiles Data from DB:", profilesData);
    console.log("Profiles Error:", profilesError);

    if (profilesError) throw profilesError;

    // Map profiles to PendingApproval format
    const approvals: PendingApproval[] = [];
    
    if (profilesData && profilesData.length > 0) {
      for (const profile of profilesData) {
        const { data: approval } = await supabase
          .from("user_approvals")
          .select("id, status, requested_at")
          .eq("user_id", profile.user_id)
          .eq("status", "pending")
          .maybeSingle();

        approvals.push({
          id: profile.id,
          first_name: profile.first_name || "",
          last_name: profile.last_name || "",
          email: profile.email || "",
          role: profile.role || "member",
          status: profile.status,
          created_at: profile.created_at,
          user_id: profile.user_id,
          approval_id: approval?.id || ""
        });
      }
    }

    console.log("Final Pending Approvals Array:", approvals);
    setPendingApprovals(approvals);
  } catch (error) {
    console.error("Error fetching pending approvals:", error);
    toast({
      title: "Error",
      description: "Failed to fetch pending approvals",
      variant: "destructive",
    });
  }
};
