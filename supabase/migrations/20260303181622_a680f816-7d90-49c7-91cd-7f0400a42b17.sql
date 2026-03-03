
-- Performance indexes for group-based check-ins
CREATE INDEX IF NOT EXISTS idx_group_members_full_name ON public.group_members USING gin (to_tsvector('simple', member_name));
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members (group_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_group_id ON public.check_ins (group_id) WHERE group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_group_members_email ON public.group_members (member_email) WHERE member_email IS NOT NULL;
