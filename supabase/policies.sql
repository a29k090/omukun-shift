-- Supabase Row Level Security Policies for omukun Shift

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_assignments ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read store information
CREATE POLICY "Allow members to read store" ON public.stores
    FOR SELECT USING (auth.role() = 'authenticated');

-- Members policy
CREATE POLICY "Allow members to read store members" ON public.store_members
    FOR SELECT USING (auth.role() = 'authenticated');

-- Availability policy: Staff can insert/update their own availability
CREATE POLICY "Staff manage own availability" ON public.availability_entries
    FOR ALL USING (auth.uid() = member_id);

-- Managers policy for schedule assignments
CREATE POLICY "Managers manage assignments" ON public.schedule_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.store_members
            WHERE store_members.id = auth.uid() AND store_members.role = 'admin'
        )
    );
