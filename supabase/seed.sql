-- =====================================================
-- SEED DATA FOR LOCAL DEVELOPMENT & TESTING
-- =====================================================

-- 1. SEED PROFILES
-- Passwords are hashed: "password123"
INSERT INTO profiles (id, username, full_name, role, emoji, password_hash)
VALUES
  ('c4228942-d6a0-4ff6-8367-932d20387ff1', 'admin@example.com', 'Admin User', 'admin', '👑', '$2b$10$zFeNYViJ/8Ba7/V8cUPBT.HxgN3qUd2v1c08GiUOTqTJFL3I//TWK'),
  ('d4228942-d6a0-4ff6-8367-932d20387ff2', 'dev@example.com', 'Developer User', 'developer', '💻', '$2b$10$zFeNYViJ/8Ba7/V8cUPBT.HxgN3qUd2v1c08GiUOTqTJFL3I//TWK'),
  ('e4228942-d6a0-4ff6-8367-932d20387ff3', 'pic@example.com', 'PIC User', 'user', '📋', '$2b$10$zFeNYViJ/8Ba7/V8cUPBT.HxgN3qUd2v1c08GiUOTqTJFL3I//TWK'),
  ('f4228942-d6a0-4ff6-8367-932d20387ff4', 'adv@example.com', 'Advertiser User', 'user', '📣', '$2b$10$zFeNYViJ/8Ba7/V8cUPBT.HxgN3qUd2v1c08GiUOTqTJFL3I//TWK')
ON CONFLICT (id) DO NOTHING;

-- 2. SEED EVENTS
INSERT INTO events (id, name, logo_url, status, created_by)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Marketing Webinar', NULL, 'active', 'c4228942-d6a0-4ff6-8367-932d20387ff1'),
  ('22222222-2222-2222-2222-222222222222', 'E-Course Launch', NULL, 'active', 'c4228942-d6a0-4ff6-8367-932d20387ff1')
ON CONFLICT (id) DO NOTHING;

-- 3. SEED BATCHES
INSERT INTO batches (id, event_id, name, start_date, end_date, price, notes)
VALUES
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Batch January', '2026-01-01', '2026-01-31', 150000, 'Initial test batch'),
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Batch February', '2026-02-01', '2026-02-28', 200000, 'Second test batch')
ON CONFLICT (id) DO NOTHING;

-- 4. SEED EVENT ASSIGNMENTS
INSERT INTO event_assignments (event_id, user_id, role)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'e4228942-d6a0-4ff6-8367-932d20387ff3', 'pic'),
  ('11111111-1111-1111-1111-111111111111', 'f4228942-d6a0-4ff6-8367-932d20387ff4', 'advertiser'),
  ('22222222-2222-2222-2222-222222222222', 'e4228942-d6a0-4ff6-8367-932d20387ff3', 'pic')
ON CONFLICT (event_id, user_id) DO NOTHING;

-- 5. SEED REPORTS
INSERT INTO reports (batch_id, user_id, report_date, leads_count, closing_count, ads_spent, tax_percentage, notes)
VALUES 
  ('33333333-3333-3333-3333-333333333333', 'f4228942-d6a0-4ff6-8367-932d20387ff4', '2026-01-05', 50, 12, 5000000.00, 11, 'Good conversion rate, targeting on point'),
  ('33333333-3333-3333-3333-333333333333', 'f4228942-d6a0-4ff6-8367-932d20387ff4', '2026-01-10', 70, 18, 7500000.00, 11, 'Increased budget, better results')
ON CONFLICT (id) DO NOTHING;
