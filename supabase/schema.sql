-- Supabase Database Schema for omukun Shift

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Stores
CREATE TABLE IF NOT EXISTS public.stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    store_code TEXT UNIQUE NOT NULL,
    default_open_time TIME NOT NULL DEFAULT '09:00',
    default_close_time TIME NOT NULL DEFAULT '21:30',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Store Members (Profiles & Roles)
CREATE TABLE IF NOT EXISTS public.store_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    role TEXT CHECK (role IN ('admin', 'staff')) DEFAULT 'staff',
    color TEXT NOT NULL,
    hourly_rate NUMERIC(10, 2) DEFAULT 1100,
    min_monthly_hours NUMERIC(5, 1) DEFAULT 40,
    max_monthly_hours NUMERIC(5, 1) DEFAULT 100,
    status TEXT CHECK (status IN ('active', 'pending', 'inactive')) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Monthly Shift Periods
CREATE TABLE IF NOT EXISTS public.shift_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    month_key TEXT NOT NULL, -- e.g. '2026-10'
    status TEXT CHECK (status IN ('draft', 'open', 'closed', 'archived')) DEFAULT 'draft',
    deadline TIMESTAMP WITH TIME ZONE,
    message TEXT,
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
    break_minutes INTEGER DEFAULT 60
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
