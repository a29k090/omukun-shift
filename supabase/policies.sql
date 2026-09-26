-- Row Level Security (RLS) Policies for omukun Shift

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_month_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staffing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_assignments ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is admin of store
CREATE OR REPLACE FUNCTION public.is_store_admin(target_store_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.store_members
    WHERE store_id = target_store_id
      AND user_id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check store membership
CREATE OR REPLACE FUNCTION public.is_store_member(target_store_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.store_members
    WHERE store_id = target_store_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STORES POLICIES
CREATE POLICY "Store members can view their store"
ON public.stores FOR SELECT
USING (public.is_store_member(id));

CREATE POLICY "Admins can update their store"
ON public.stores FOR UPDATE
USING (public.is_store_admin(id));

-- STORE MEMBERS POLICIES
CREATE POLICY "Members can view co-workers basic profile"
ON public.store_members FOR SELECT
USING (public.is_store_member(store_id));

CREATE POLICY "Admins can manage store members"
ON public.store_members FOR ALL
USING (public.is_store_admin(store_id));

-- STORE INVITATIONS POLICIES
CREATE POLICY "Admins can manage invitations"
ON public.store_invitations FOR ALL
USING (public.is_store_admin(store_id));

CREATE POLICY "Anyone can lookup active invitation by token"
ON public.store_invitations FOR SELECT
USING (status = 'active' AND expires_at > NOW());

-- SHIFT PERIODS POLICIES
CREATE POLICY "Admins can manage periods"
ON public.shift_periods FOR ALL
USING (public.is_store_admin(store_id));

CREATE POLICY "Staff can view open/closed periods"
ON public.shift_periods FOR SELECT
USING (public.is_store_member(store_id) AND status IN ('open', 'closed', 'archived'));

-- AVAILABILITY ENTRIES POLICIES
CREATE POLICY "Admins can manage all availability in store"
ON public.availability_entries FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.store_members m
    WHERE m.id = availability_entries.member_id
      AND public.is_store_admin(m.store_id)
  )
);

CREATE POLICY "Staff can manage their own availability"
ON public.availability_entries FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.store_members m
    WHERE m.id = availability_entries.member_id
      AND m.user_id = auth.uid()
  )
);

-- SCHEDULE ASSIGNMENTS POLICIES
CREATE POLICY "Admins can manage assignments"
ON public.schedule_assignments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.shift_periods p
    WHERE p.id = schedule_assignments.period_id
      AND public.is_store_admin(p.store_id)
  )
);

CREATE POLICY "Staff can view published schedule assignments"
ON public.schedule_assignments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.shift_periods p
    WHERE p.id = schedule_assignments.period_id
      AND public.is_store_member(p.store_id)
  )
);
