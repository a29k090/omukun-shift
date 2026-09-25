-- Seed script for omukun Shift

INSERT INTO public.stores (id, name, store_code)
VALUES ('00000000-0000-0000-0000-000000000001', 'omukun 渋谷店', 'OMK-7F2K9')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.store_members (id, store_id, display_name, role, color, hourly_rate)
VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '山田 太郎', 'admin', '#ef4444', 1200),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '佐藤 花子', 'staff', '#3b82f6', 1150)
ON CONFLICT (id) DO NOTHING;
