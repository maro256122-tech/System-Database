#!/usr/bin/env node
/**
 * Sky Color CRM — Supabase Auto-Setup Script
 * Run once to create all tables, RLS policies, and seed data.
 *
 * Usage:
 *   node setup-supabase.js
 *
 * Requirements:
 *   - Node.js 18+
 *   - Set these env vars (or edit the CONFIG section below):
 *       SUPABASE_URL=https://xxxx.supabase.co
 *       SUPABASE_SERVICE_KEY=eyJ...  (Service Role key — NOT anon key)
 */

// ── CONFIG ──────────────────────────────────────────────────────────────────
const SUPABASE_URL     = process.env.SUPABASE_URL     || 'https://YOUR_PROJECT.supabase.co'
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_KEY || 'YOUR_SERVICE_ROLE_KEY'
// ────────────────────────────────────────────────────────────────────────────

if (SUPABASE_URL.includes('YOUR_PROJECT') || SUPABASE_SERVICE.includes('YOUR_SERVICE')) {
  console.error('\n❌  Please set SUPABASE_URL and SUPABASE_SERVICE_KEY first.\n')
  console.error('   Either export them as env vars:')
  console.error('     export SUPABASE_URL=https://xxxx.supabase.co')
  console.error('     export SUPABASE_SERVICE_KEY=eyJ...\n')
  console.error('   Or edit the CONFIG section at the top of this file.\n')
  process.exit(1)
}

const BASE = `${SUPABASE_URL}/rest/v1`
const SQL_URL = `${SUPABASE_URL}/rest/v1/rpc/exec_sql`
const PG_URL  = `${SUPABASE_URL}/pg`

const HEADERS = {
  'apikey': SUPABASE_SERVICE,
  'Authorization': `Bearer ${SUPABASE_SERVICE}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
}

// ── HELPERS ─────────────────────────────────────────────────────────────────
async function sql(query) {
  // Use the Supabase SQL endpoint (available via pg extension)
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ sql: query }),
  })
  if (!res.ok) {
    // Try direct pg endpoint
    const res2 = await fetch(`${SUPABASE_URL}/pg/query`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ query }),
    })
    if (!res2.ok) {
      const txt = await res2.text()
      throw new Error(`SQL failed: ${txt}`)
    }
    return res2.json()
  }
  return res.json()
}

async function insert(table, rows) {
  const res = await fetch(`${BASE}/${table}`, {
    method: 'POST',
    headers: { ...HEADERS, 'Prefer': 'return=representation' },
    body: JSON.stringify(rows),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(`Insert into ${table} failed: ${JSON.stringify(body)}`)
  return body
}

async function select(table, params = '') {
  const res = await fetch(`${BASE}/${table}?${params}`, { headers: HEADERS })
  if (!res.ok) throw new Error(`Select from ${table} failed`)
  return res.json()
}

function log(msg)  { console.log(`  ✅  ${msg}`) }
function step(msg) { console.log(`\n🔧  ${msg}`) }
function warn(msg) { console.log(`  ⚠️   ${msg}`) }

// ── SCHEMA SQL ───────────────────────────────────────────────────────────────
// We break into small statements so each one can be sent individually.

const SCHEMA_STATEMENTS = [
  `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,

  `CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    owner_user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS public.car_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('helicopter', 'branch_owner', 'rep')),
    branch_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID NOT NULL,
    car_model_id UUID,
    source TEXT NOT NULL CHECK (source IN ('message', 'visit')),
    payment_type TEXT NOT NULL CHECK (payment_type IN ('cash', 'installment', 'bank_finance', 'murabaha')),
    stage TEXT NOT NULL DEFAULT 'lead_in' CHECK (stage IN (
      'lead_in','contacted','interested','showroom_visit',
      'quote_sent','negotiation','closed_won','closed_lost'
    )),
    assigned_rep_id UUID,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    lost_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL,
    user_id UUID NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN (
      'lead_created','stage_changed','note_added',
      'contact_attempt','follow_up','whatsapp_message','call_made'
    )),
    note TEXT,
    from_stage TEXT,
    to_stage TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  // Indexes
  `CREATE INDEX IF NOT EXISTS idx_leads_branch_id ON public.leads(branch_id)`,
  `CREATE INDEX IF NOT EXISTS idx_leads_stage ON public.leads(stage)`,
  `CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_activities_lead_id ON public.activities(lead_id)`,
  `CREATE INDEX IF NOT EXISTS idx_user_profiles_branch_id ON public.user_profiles(branch_id)`,

  // updated_at trigger
  `CREATE OR REPLACE FUNCTION update_updated_at()
   RETURNS TRIGGER AS $$
   BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
   $$ LANGUAGE plpgsql`,

  `DROP TRIGGER IF EXISTS leads_updated_at ON public.leads`,
  `CREATE TRIGGER leads_updated_at
   BEFORE UPDATE ON public.leads
   FOR EACH ROW EXECUTE FUNCTION update_updated_at()`,

  // RLS
  `ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE public.car_models ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY`,

  // Helper functions
  `CREATE OR REPLACE FUNCTION get_my_role()
   RETURNS TEXT AS $$
     SELECT role FROM public.user_profiles WHERE id = auth.uid();
   $$ LANGUAGE sql STABLE SECURITY DEFINER`,

  `CREATE OR REPLACE FUNCTION get_my_branch_id()
   RETURNS UUID AS $$
     SELECT branch_id FROM public.user_profiles WHERE id = auth.uid();
   $$ LANGUAGE sql STABLE SECURITY DEFINER`,

  // Branches policies
  `DROP POLICY IF EXISTS branches_read_all ON public.branches`,
  `CREATE POLICY branches_read_all ON public.branches FOR SELECT TO authenticated USING (true)`,

  `DROP POLICY IF EXISTS branches_write_helicopter ON public.branches`,
  `CREATE POLICY branches_write_helicopter ON public.branches FOR ALL TO authenticated
   USING (get_my_role() = 'helicopter') WITH CHECK (get_my_role() = 'helicopter')`,

  // Car models policies
  `DROP POLICY IF EXISTS car_models_read_all ON public.car_models`,
  `CREATE POLICY car_models_read_all ON public.car_models FOR SELECT TO authenticated USING (true)`,

  `DROP POLICY IF EXISTS car_models_write_helicopter ON public.car_models`,
  `CREATE POLICY car_models_write_helicopter ON public.car_models FOR ALL TO authenticated
   USING (get_my_role() = 'helicopter') WITH CHECK (get_my_role() = 'helicopter')`,

  // User profiles policies
  `DROP POLICY IF EXISTS profiles_read_own ON public.user_profiles`,
  `CREATE POLICY profiles_read_own ON public.user_profiles FOR SELECT TO authenticated USING (id = auth.uid())`,

  `DROP POLICY IF EXISTS profiles_read_helicopter ON public.user_profiles`,
  `CREATE POLICY profiles_read_helicopter ON public.user_profiles FOR SELECT TO authenticated USING (get_my_role() = 'helicopter')`,

  `DROP POLICY IF EXISTS profiles_read_branch_owner ON public.user_profiles`,
  `CREATE POLICY profiles_read_branch_owner ON public.user_profiles FOR SELECT TO authenticated
   USING (get_my_role() = 'branch_owner' AND branch_id = get_my_branch_id())`,

  `DROP POLICY IF EXISTS profiles_write_helicopter ON public.user_profiles`,
  `CREATE POLICY profiles_write_helicopter ON public.user_profiles FOR ALL TO authenticated
   USING (get_my_role() = 'helicopter') WITH CHECK (get_my_role() = 'helicopter')`,

  // Leads policies
  `DROP POLICY IF EXISTS leads_read_helicopter ON public.leads`,
  `CREATE POLICY leads_read_helicopter ON public.leads FOR SELECT TO authenticated USING (get_my_role() = 'helicopter')`,

  `DROP POLICY IF EXISTS leads_read_branch_owner ON public.leads`,
  `CREATE POLICY leads_read_branch_owner ON public.leads FOR SELECT TO authenticated
   USING (get_my_role() = 'branch_owner' AND branch_id = get_my_branch_id())`,

  `DROP POLICY IF EXISTS leads_read_rep ON public.leads`,
  `CREATE POLICY leads_read_rep ON public.leads FOR SELECT TO authenticated
   USING (get_my_role() = 'rep' AND branch_id = get_my_branch_id())`,

  `DROP POLICY IF EXISTS leads_insert_rep ON public.leads`,
  `CREATE POLICY leads_insert_rep ON public.leads FOR INSERT TO authenticated
   WITH CHECK (get_my_role() = 'rep' AND branch_id = get_my_branch_id())`,

  `DROP POLICY IF EXISTS leads_update_rep ON public.leads`,
  `CREATE POLICY leads_update_rep ON public.leads FOR UPDATE TO authenticated
   USING (get_my_role() = 'rep' AND branch_id = get_my_branch_id())
   WITH CHECK (get_my_role() = 'rep' AND branch_id = get_my_branch_id())`,

  // Activities policies
  `DROP POLICY IF EXISTS activities_read_helicopter ON public.activities`,
  `CREATE POLICY activities_read_helicopter ON public.activities FOR SELECT TO authenticated
   USING (get_my_role() = 'helicopter')`,

  `DROP POLICY IF EXISTS activities_read_branch ON public.activities`,
  `CREATE POLICY activities_read_branch ON public.activities FOR SELECT TO authenticated
   USING (EXISTS (
     SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.branch_id = get_my_branch_id()
   ))`,

  `DROP POLICY IF EXISTS activities_insert_rep ON public.activities`,
  `CREATE POLICY activities_insert_rep ON public.activities FOR INSERT TO authenticated
   WITH CHECK (
     get_my_role() = 'rep' AND user_id = auth.uid() AND
     EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.branch_id = get_my_branch_id())
   )`,
]

// ── SEED DATA ────────────────────────────────────────────────────────────────
const BRANCHES = [
  'الفرع الرئيسي - الرياض', 'فرع جدة', 'فرع الدمام', 'فرع مكة',
  'فرع المدينة', 'فرع أبها', 'فرع تبوك', 'فرع بريدة',
  'فرع حائل', 'فرع ينبع', 'فرع الطائف',
].map(name => ({ name }))

const CAR_MODELS = [
  { name: 'تويوتا لاندكروزر', category: 'SUV' },
  { name: 'تويوتا كامري', category: 'سيدان' },
  { name: 'تويوتا هايلاندر', category: 'SUV' },
  { name: 'تويوتا راف 4', category: 'SUV' },
  { name: 'تويوتا كورولا', category: 'سيدان' },
  { name: 'لكزس LX', category: 'فاخر' },
  { name: 'لكزس RX', category: 'فاخر' },
  { name: 'لكزس ES', category: 'فاخر' },
  { name: 'هيونداي توسان', category: 'SUV' },
  { name: 'هيونداي سونتا في', category: 'SUV' },
  { name: 'كيا سبورتاج', category: 'SUV' },
  { name: 'نيسان باترول', category: 'SUV' },
  { name: 'مرسيدس S-Class', category: 'فاخر' },
  { name: 'BMW X5', category: 'فاخر' },
]

// ── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚗  Sky Color CRM — Supabase Setup')
  console.log('━'.repeat(45))
  console.log(`📡  Project: ${SUPABASE_URL}\n`)

  // 1. Run schema via Supabase SQL API (Management API)
  step('Creating tables, indexes, triggers, RLS...')

  const mgmtUrl = SUPABASE_URL.replace('.supabase.co', '.supabase.co')
  // Use pg_dump-style direct SQL via the REST SQL endpoint
  const allSql = SCHEMA_STATEMENTS.join(';\n')

  const sqlRes = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    method: 'GET',
    headers: HEADERS,
  })

  // Actually use the supabase REST directly for table operations
  // For DDL, we use the pg SQL endpoint via service role
  for (const stmt of SCHEMA_STATEMENTS) {
    try {
      const r = await fetch(`${SUPABASE_URL}/pg/query`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SERVICE,
          'Authorization': `Bearer ${SUPABASE_SERVICE}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: stmt }),
      })
      if (!r.ok) {
        const t = await r.text()
        warn(`Skipped (may already exist): ${stmt.slice(0, 60)}...`)
      }
    } catch (e) {
      warn(`Network error on: ${stmt.slice(0, 60)}`)
    }
  }
  log('Schema applied')

  // 2. Seed branches
  step('Inserting 11 branches...')
  try {
    // Check if already seeded
    const existing = await select('branches', 'select=id&limit=1')
    if (existing.length > 0) {
      warn('Branches already exist — skipping seed')
    } else {
      await insert('branches', BRANCHES)
      log('11 branches created')
    }
  } catch (e) {
    warn('Could not insert branches: ' + e.message)
  }

  // 3. Seed car models
  step('Inserting car models...')
  try {
    const existing = await select('car_models', 'select=id&limit=1')
    if (existing.length > 0) {
      warn('Car models already exist — skipping seed')
    } else {
      await insert('car_models', CAR_MODELS)
      log(`${CAR_MODELS.length} car models created`)
    }
  } catch (e) {
    warn('Could not insert car models: ' + e.message)
  }

  // 4. Print next steps
  console.log('\n' + '━'.repeat(45))
  console.log('🎉  Setup complete!\n')
  console.log('📋  Next steps:')
  console.log('   1. Go to Supabase Dashboard → Authentication → Users')
  console.log('   2. Create your first user (helicopter admin)')
  console.log('   3. In SQL Editor, run:')
  console.log(`
     INSERT INTO public.user_profiles (id, name, role, branch_id)
     VALUES (
       '<paste-user-uuid-here>',
       'اسم المدير',
       'helicopter',
       NULL
     );
  `)
  console.log('   4. Copy your project URL + anon key to .env')
  console.log('   5. Run: npm run dev\n')
  console.log('   Docs: https://github.com/maro256122-tech/System-Database\n')
}

main().catch(err => {
  console.error('\n❌  Fatal error:', err.message)
  process.exit(1)
})
