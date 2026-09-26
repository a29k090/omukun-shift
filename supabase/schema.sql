-- Supabase Database Schema for omukun Shift

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Stores
CREATE TABLE IF NOT EXISTS public.stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    store_code TEXT UNIQUE NOT NULL,
    default_open_time TIME NOT NULL DEFAULT '09:00',
    default_close_time TIME NOT NULL DEFAULT '21:30',
    timezone TEXT DEFAULT 'Asia/Tokyo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Store Members (Profiles & Compensation & Constraints)
CREATE TABLE IF NOT EXISTS public.store_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    email TEXT,
    role TEXT CHECK (role IN ('admin', 'staff')) DEFAULT 'staff',
    color TEXT NOT NULL,
    pay_type TEXT CHECK (pay_type IN ('hourly', 'monthly')) DEFAULT 'hourly',
    hourly_rate NUMERIC(10, 2) DEFAULT 1100,
    monthly_salary NUMERIC(12, 2) DEFAULT NULL,
    min_monthly_hours NUMERIC(5, 1) DEFAULT 40,
    max_monthly_hours NUMERIC(5, 1) DEFAULT 100,
    min_shift_hours NUMERIC(4, 1) DEFAULT 3,
    status TEXT CHECK (status IN ('active', 'pending', 'inactive')) DEFAULT 'active',
    notes TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Month-Specific Work Hour Rule Overrides
CREATE TABLE IF NOT EXISTS public.staff_month_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID REFERENCES public.store_members(id) ON DELETE CASCADE,
    month_key TEXT NOT NULL,
    min_monthly_hours NUMERIC(5, 1),
    max_monthly_hours NUMERIC(5, 1),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(member_id, month_key)
);

-- Store Invitations
CREATE TABLE IF NOT EXISTS public.store_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    role TEXT CHECK (role IN ('admin', 'staff')) DEFAULT 'staff',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    max_uses INTEGER DEFAULT 1,
    use_count INTEGER DEFAULT 0,
    status TEXT CHECK (status IN ('active', 'revoked', 'expired')) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Monthly Shift Periods (Requests)
CREATE TABLE IF NOT EXISTS public.shift_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    month_key TEXT NOT NULL, -- e.g. '2026-10'
    status TEXT CHECK (status IN ('draft', 'open', 'closed', 'archived')) DEFAULT 'draft',
    deadline TIMESTAMP WITH TIME ZONE,
    operating_open_time TIME DEFAULT '09:00',
    operating_close_time TIME DEFAULT '21:30',
    message TEXT,
    published_at TIMESTAMP WITH TIME ZONE,
    published_by UUID REFERENCES public.store_members(id),
    closed_at TIMESTAMP WITH TIME ZONE,
    closed_by UUID REFERENCES public.store_members(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(store_id, month_key)
);

-- Shift Submissions Tracking
CREATE TABLE IF NOT EXISTS public.shift_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    period_id UUID REFERENCES public.shift_periods(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.store_members(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('not_started', 'in_progress', 'submitted')) DEFAULT 'not_started',
    submitted_at TIMESTAMP WITH TIME ZONE,
    last_edited_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(period_id, member_id)
);

-- Staffing Requirements & Overrides
CREATE TABLE IF NOT EXISTS public.staffing_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    rule_type TEXT CHECK (rule_type IN ('default', 'time_range', 'weekday', 'specific_date')) NOT NULL,
    date DATE,
    day_of_week INTEGER, -- 0=Sun, 1=Mon...6=Sat
    time_start TIME,
    time_end TIME,
    required_count INTEGER NOT NULL DEFAULT 2,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Staff Availability Submissions
CREATE TABLE IF NOT EXISTS public.availability_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID REFERENCES public.store_members(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    state TEXT CHECK (state IN ('unset', 'full', 'until', 'from', 'range', 'unavailable')) NOT NULL,
    start_time TIME,
    end_time TIME,
    notes TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(member_id, date)
);

-- Shift Presets
CREATE TABLE IF NOT EXISTS public.shift_presets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_minutes INTEGER DEFAULT 60,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shift Assignments (Final Schedule)
CREATE TABLE IF NOT EXISTS public.schedule_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    period_id UUID REFERENCES public.shift_periods(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.store_members(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_minutes INTEGER DEFAULT 60,
    preset_id UUID REFERENCES public.shift_presets(id) ON DELETE SET NULL,
    is_locked BOOLEAN DEFAULT FALSE,
    source TEXT DEFAULT 'manual',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
