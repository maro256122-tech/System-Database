-- ============================================================
-- Sky Color CRM — Supabase Schema + RLS Policies
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- Branches
CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Car Models
CREATE TABLE public.car_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User Profiles (extends auth.users)
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('helicopter', 'branch_owner', 'rep')),
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Leads
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  car_model_id UUID REFERENCES public.car_models(id) ON DELETE SET NULL,
  source TEXT NOT NULL CHECK (source IN ('message', 'visit')),
  payment_type TEXT NOT NULL CHECK (payment_type IN ('cash', 'installment', 'bank_finance', 'murabaha')),
  stage TEXT NOT NULL DEFAULT 'lead_in' CHECK (stage IN (
    'lead_in',
    'contacted',
    'interested',
    'showroom_visit',
    'quote_sent',
    'negotiation',
    'closed_won',
    'closed_lost'
  )),
  assigned_rep_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  lost_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Activities (append-only log)
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'lead_created',
    'stage_changed',
    'note_added',
    'contact_attempt',
    'follow_up',
    'whatsapp_message',
    'call_made'
  )),
  note TEXT,
  from_stage TEXT,
  to_stage TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_leads_branch_id ON public.leads(branch_id);
CREATE INDEX idx_leads_stage ON public.leads(stage);
CREATE INDEX idx_leads_assigned_rep_id ON public.leads(assigned_rep_id);
CREATE INDEX idx_leads_created_at ON public.leads(created_at);
CREATE INDEX idx_activities_lead_id ON public.activities(lead_id);
CREATE INDEX idx_activities_created_at ON public.activities(created_at);
CREATE INDEX idx_user_profiles_branch_id ON public.user_profiles(branch_id);
CREATE INDEX idx_user_profiles_role ON public.user_profiles(role);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at on leads
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper function: get current user's branch_id
CREATE OR REPLACE FUNCTION get_my_branch_id()
RETURNS UUID AS $$
  SELECT branch_id FROM public.user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ---- BRANCHES ----

-- All authenticated users can read branches
CREATE POLICY "branches_read_all"
  ON public.branches FOR SELECT
  TO authenticated
  USING (true);

-- Only helicopter role can insert/update/delete branches
CREATE POLICY "branches_write_helicopter"
  ON public.branches FOR ALL
  TO authenticated
  USING (get_my_role() = 'helicopter')
  WITH CHECK (get_my_role() = 'helicopter');

-- ---- CAR MODELS ----

-- All authenticated users can read car models
CREATE POLICY "car_models_read_all"
  ON public.car_models FOR SELECT
  TO authenticated
  USING (true);

-- Only helicopter role can manage car models
CREATE POLICY "car_models_write_helicopter"
  ON public.car_models FOR ALL
  TO authenticated
  USING (get_my_role() = 'helicopter')
  WITH CHECK (get_my_role() = 'helicopter');

-- ---- USER PROFILES ----

-- Users can read their own profile
CREATE POLICY "profiles_read_own"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Helicopter can read all profiles
CREATE POLICY "profiles_read_helicopter"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (get_my_role() = 'helicopter');

-- Branch owners can read profiles in their branch
CREATE POLICY "profiles_read_branch_owner"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'branch_owner'
    AND branch_id = get_my_branch_id()
  );

-- Helicopter can manage all profiles
CREATE POLICY "profiles_write_helicopter"
  ON public.user_profiles FOR ALL
  TO authenticated
  USING (get_my_role() = 'helicopter')
  WITH CHECK (get_my_role() = 'helicopter');

-- ---- LEADS ----

-- Helicopter: read all leads
CREATE POLICY "leads_read_helicopter"
  ON public.leads FOR SELECT
  TO authenticated
  USING (get_my_role() = 'helicopter');

-- Branch owner: read only their branch leads
CREATE POLICY "leads_read_branch_owner"
  ON public.leads FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'branch_owner'
    AND branch_id = get_my_branch_id()
  );

-- Rep: read only their branch leads
CREATE POLICY "leads_read_rep"
  ON public.leads FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'rep'
    AND branch_id = get_my_branch_id()
  );

-- Rep: insert leads for their own branch only
CREATE POLICY "leads_insert_rep"
  ON public.leads FOR INSERT
  TO authenticated
  WITH CHECK (
    get_my_role() = 'rep'
    AND branch_id = get_my_branch_id()
  );

-- Rep: update leads in their own branch
CREATE POLICY "leads_update_rep"
  ON public.leads FOR UPDATE
  TO authenticated
  USING (
    get_my_role() = 'rep'
    AND branch_id = get_my_branch_id()
  )
  WITH CHECK (
    get_my_role() = 'rep'
    AND branch_id = get_my_branch_id()
  );

-- ---- ACTIVITIES ----

-- Helicopter: read all activities
CREATE POLICY "activities_read_helicopter"
  ON public.activities FOR SELECT
  TO authenticated
  USING (get_my_role() = 'helicopter');

-- Branch owner & rep: read activities for leads in their branch
CREATE POLICY "activities_read_branch"
  ON public.activities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_id
      AND l.branch_id = get_my_branch_id()
    )
  );

-- Rep: insert activities for leads in their branch
CREATE POLICY "activities_insert_rep"
  ON public.activities FOR INSERT
  TO authenticated
  WITH CHECK (
    get_my_role() = 'rep'
    AND user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_id
      AND l.branch_id = get_my_branch_id()
    )
  );

-- ============================================================
-- SEED DATA (for development/demo)
-- ============================================================

-- Insert car models
INSERT INTO public.car_models (name, category) VALUES
  ('تويوتا لاندكروزر', 'SUV'),
  ('تويوتا كامري', 'سيدان'),
  ('تويوتا هايلاندر', 'SUV'),
  ('تويوتا راف 4', 'SUV'),
  ('تويوتا كورولا', 'سيدان'),
  ('لكزس LX', 'فاخر'),
  ('لكزس RX', 'فاخر'),
  ('لكزس ES', 'فاخر'),
  ('هيونداي توسان', 'SUV'),
  ('هيونداي سونتا في', 'SUV'),
  ('كيا سبورتاج', 'SUV'),
  ('نيسان باترول', 'SUV'),
  ('مرسيدس S-Class', 'فاخر'),
  ('BMW X5', 'فاخر');

-- Insert branches
INSERT INTO public.branches (name) VALUES
  ('الفرع الرئيسي - الرياض'),
  ('فرع جدة'),
  ('فرع الدمام'),
  ('فرع مكة'),
  ('فرع المدينة'),
  ('فرع أبها'),
  ('فرع تبوك'),
  ('فرع بريدة'),
  ('فرع حائل'),
  ('فرع ينبع'),
  ('فرع الطائف');
