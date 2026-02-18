-- Create index for faster queries on pending user profiles
CREATE INDEX idx_profiles_pending
ON profiles(status)
WHERE status = 'pending';
