-- ANBM Property Intelligence Platform
-- Full Database Schema v1.0

-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ============================================================
-- PROPERTIES
-- ============================================================
create table properties (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- Identity
  nickname text not null,
  address text not null,
  suburb text,
  state text default 'NSW',
  postcode text,
  lat numeric(10,7),
  lng numeric(10,7),

  -- Property details (auto-filled from API)
  property_type text check (property_type in ('house','townhouse','unit','duplex','commercial','land','acreage')),
  land_size_sqm numeric,
  floor_area_sqm numeric,
  bedrooms int,
  bathrooms int,
  car_spaces int,
  build_year int,
  council text,
  council_rates_annual numeric,

  -- Zoning & planning (from NSW Planning Portal)
  zoning_code text,
  zoning_description text,
  fsr numeric,
  max_height_m numeric,
  lot_size_min_sqm numeric,
  dual_occ_eligible boolean,
  subdivision_potential boolean,
  heritage_listed boolean,
  flood_overlay boolean,
  bushfire_overlay boolean,
  acid_sulfate_soils boolean,
  da_complexity text check (da_complexity in ('exempt','complying','low','medium','high','prohibited')),

  -- Market data (from PropTrack/Domain API)
  last_sold_price numeric,
  last_sold_date date,
  estimated_value numeric,
  median_suburb_price numeric,
  median_price_sqm numeric,
  days_on_market_avg int,
  vendor_discount_pct numeric,
  rental_estimate_weekly numeric,
  vacancy_rate_pct numeric,
  suburb_annual_growth_pct numeric,

  -- Acquisition
  asking_price numeric,
  purchase_price numeric,
  stamp_duty numeric,
  legal_conveyancing numeric default 2500,
  building_inspection numeric default 800,
  pest_inspection numeric default 400,
  other_acquisition_costs numeric default 0,
  settlement_weeks int default 6,

  -- Finance
  deposit_pct numeric default 20,
  loan_amount numeric,
  interest_rate_pct numeric,
  loan_type text check (loan_type in ('principal_interest','interest_only','construction')) default 'construction',
  lender text,
  finance_approved boolean default false,

  -- Deal status & scoring
  status text check (status in ('watching','analysing','offer','under_contract','building','complete','archived')) default 'watching',
  deal_grade text check (deal_grade in ('A','B','C','D')),
  composite_score numeric,

  -- Scoring components (1-10 each)
  score_structure int check (score_structure between 1 and 10),
  score_location int check (score_location between 1 and 10),
  score_da_risk int check (score_da_risk between 1 and 10),
  score_access int check (score_access between 1 and 10),
  score_vendor_motivation int check (score_vendor_motivation between 1 and 10),
  score_gut int check (score_gut between 1 and 10),
  score_growth_potential int check (score_growth_potential between 1 and 10),
  score_renovation_complexity int check (score_renovation_complexity between 1 and 10),

  -- Decision
  recommended_strategy text check (recommended_strategy in ('flip','hold','develop','subdivide','dual_occ','land_bank','pass')),
  ai_analysis text,
  ai_confidence_pct numeric,

  -- Notes
  notes text,
  agent_name text,
  agent_phone text,
  agent_email text,
  inspection_date date,
  offer_expiry date
);

-- ============================================================
-- COMPARABLE SALES (per property)
-- ============================================================
create table property_comps (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid references properties(id) on delete cascade,
  address text,
  sold_price numeric,
  sold_date date,
  land_sqm numeric,
  floor_sqm numeric,
  bedrooms int,
  bathrooms int,
  price_per_sqm numeric,
  distance_m numeric,
  source text
);

-- ============================================================
-- TRADE RATES (your personal rates book)
-- ============================================================
create table trade_categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  sort_order int
);

insert into trade_categories (name, sort_order) values
  ('Carpentry & Building', 1),
  ('Electrical', 2),
  ('Plumbing', 3),
  ('Painting', 4),
  ('Tiling', 5),
  ('Concreting', 6),
  ('Roofing', 7),
  ('Plastering', 8),
  ('Landscaping', 9),
  ('Demolition', 10),
  ('Excavation', 11),
  ('Steel & Structural', 12),
  ('Waterproofing', 13),
  ('Insulation', 14),
  ('Glazing & Windows', 15),
  ('Cabinetry & Joinery', 16),
  ('Flooring', 17),
  ('Air Conditioning / HVAC', 18),
  ('Fire Protection', 19),
  ('Scaffolding', 20),
  ('Crane & Heavy Lift', 21),
  ('Surveying', 22),
  ('Certifier / BCA', 23),
  ('Architecture / Design', 24),
  ('Other', 25);

create table tradespeople (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  category_id uuid references trade_categories(id),

  -- Who
  name text not null,
  company text,
  phone text,
  email text,
  licence_number text,
  insurance_expiry date,
  abn text,

  -- Relationship
  relationship text check (relationship in ('family','mate','trusted_sub','preferred_sub','backup','one_off','unknown')) default 'unknown',
  priority int default 1 check (priority between 1 and 5), -- 1=first call, 5=last resort
  notes text,
  rating int check (rating between 1 and 5),
  last_used date,

  -- Availability
  typically_available boolean default true,
  lead_time_days int default 0,

  is_active boolean default true
);

-- Seed your team
insert into tradespeople (category_id, name, relationship, priority, notes, rating, typically_available) values
  ((select id from trade_categories where name='Carpentry & Building'), 'Dad', 'family', 1, 'Elite carpenter, project manager. First call always.', 5, true),
  ((select id from trade_categories where name='Carpentry & Building'), 'Alex (me)', 'family', 1, 'Owner/builder. Licensed contractor 494053C.', 5, true),
  ((select id from trade_categories where name='Electrical'), 'Peter', 'mate', 1, 'Co-director Drop King. First call for electrical.', 5, true),
  ((select id from trade_categories where name='Painting'), 'Mate (Painter)', 'mate', 1, 'Go-to painter.', 4, true);

create table trade_rates (
  id uuid primary key default uuid_generate_v4(),
  tradesperson_id uuid references tradespeople(id) on delete cascade,
  category_id uuid references trade_categories(id),

  -- Rate item
  item_name text not null,
  unit text not null, -- 'hr', 'sqm', 'lm', 'item', 'day', 'fixed'
  rate_low numeric not null,
  rate_mid numeric not null,
  rate_high numeric not null,
  notes text,
  last_updated date default current_date,
  is_your_rate boolean default false -- true = family/mate rate, false = market rate
);

-- 2026 NSW market rates (comprehensive)
insert into trade_rates (category_id, item_name, unit, rate_low, rate_mid, rate_high, notes) values
-- Carpentry & Building
((select id from trade_categories where name='Carpentry & Building'), 'Carpenter - labour only', 'hr', 85, 95, 120, '2026 NSW market'),
((select id from trade_categories where name='Carpentry & Building'), 'Framing - timber wall frame', 'sqm', 45, 65, 90, 'Supply & install'),
((select id from trade_categories where name='Carpentry & Building'), 'Roof framing - conventional', 'sqm', 55, 75, 100, 'Supply & install'),
((select id from trade_categories where name='Carpentry & Building'), 'Decking - hardwood', 'sqm', 180, 250, 380, 'Supply & install'),
((select id from trade_categories where name='Carpentry & Building'), 'Decking - treated pine', 'sqm', 120, 165, 220, 'Supply & install'),
((select id from trade_categories where name='Carpentry & Building'), 'Staircase - timber straight', 'item', 3500, 5500, 9000, 'Supply & install'),
((select id from trade_categories where name='Carpentry & Building'), 'Door installation - internal', 'item', 180, 280, 420, 'Labour only'),
((select id from trade_categories where name='Carpentry & Building'), 'Door installation - external', 'item', 350, 500, 800, 'Labour only'),
((select id from trade_categories where name='Carpentry & Building'), 'Skirting & architrave', 'lm', 18, 28, 45, 'Supply & install'),
((select id from trade_categories where name='Carpentry & Building'), 'Structural repairs', 'hr', 95, 115, 145, 'Complex work'),
((select id from trade_categories where name='Carpentry & Building'), 'Project manager day rate', 'day', 600, 850, 1200, 'Senior PM'),
-- Electrical
((select id from trade_categories where name='Electrical'), 'Electrician - labour only', 'hr', 110, 130, 165, '2026 NSW licensed'),
((select id from trade_categories where name='Electrical'), 'Full rewire - 3 bed house', 'fixed', 12000, 18000, 28000, 'Supply & install'),
((select id from trade_categories where name='Electrical'), 'Power point installation', 'item', 120, 180, 280, 'Supply & install'),
((select id from trade_categories where name='Electrical'), 'Light fitting installation', 'item', 80, 120, 200, 'Labour only'),
((select id from trade_categories where name='Electrical'), 'Switchboard upgrade', 'item', 1800, 3200, 5500, 'Supply & install'),
((select id from trade_categories where name='Electrical'), 'Safety switch installation', 'item', 350, 500, 750, 'Supply & install'),
((select id from trade_categories where name='Electrical'), 'Downlight installation', 'item', 90, 130, 200, 'Supply & install'),
((select id from trade_categories where name='Electrical'), 'Solar system 6.6kW', 'fixed', 5500, 7500, 11000, 'Supply & install'),
((select id from trade_categories where name='Electrical'), 'EV charger installation', 'item', 1200, 1800, 3000, 'Supply & install'),
-- Plumbing
((select id from trade_categories where name='Plumbing'), 'Plumber - labour only', 'hr', 110, 135, 170, '2026 NSW licensed'),
((select id from trade_categories where name='Plumbing'), 'Full bathroom rough-in', 'item', 2800, 4200, 6500, 'Labour only'),
((select id from trade_categories where name='Plumbing'), 'Hot water system - heat pump', 'item', 2200, 3500, 5500, 'Supply & install'),
((select id from trade_categories where name='Plumbing'), 'Hot water system - gas', 'item', 1800, 2800, 4200, 'Supply & install'),
((select id from trade_categories where name='Plumbing'), 'Toilet installation', 'item', 350, 500, 800, 'Labour only'),
((select id from trade_categories where name='Plumbing'), 'Basin installation', 'item', 280, 400, 650, 'Labour only'),
((select id from trade_categories where name='Plumbing'), 'Bath installation', 'item', 450, 700, 1200, 'Labour only'),
((select id from trade_categories where name='Plumbing'), 'Shower installation', 'item', 600, 950, 1600, 'Labour only'),
((select id from trade_categories where name='Plumbing'), 'Kitchen sink & tapware', 'item', 350, 550, 900, 'Labour only'),
((select id from trade_categories where name='Plumbing'), 'Sewer connection', 'item', 3500, 6000, 12000, 'Depends on depth'),
((select id from trade_categories where name='Plumbing'), 'Stormwater drainage', 'lm', 120, 180, 280, 'Excavation extra'),
-- Painting
((select id from trade_categories where name='Painting'), 'Painter - labour only', 'hr', 65, 85, 110, '2026 NSW'),
((select id from trade_categories where name='Painting'), 'Interior walls & ceiling - full prep', 'sqm', 18, 28, 42, 'Supply & install'),
((select id from trade_categories where name='Painting'), 'Interior walls only', 'sqm', 12, 18, 28, 'Supply & install'),
((select id from trade_categories where name='Painting'), 'Exterior - weatherboard', 'sqm', 28, 42, 65, 'Supply & install'),
((select id from trade_categories where name='Painting'), 'Exterior - render/brick', 'sqm', 18, 28, 42, 'Supply & install'),
((select id from trade_categories where name='Painting'), 'Doors & windows per unit', 'item', 120, 200, 350, 'Supply & install'),
((select id from trade_categories where name='Painting'), 'Fence painting', 'lm', 28, 42, 65, 'Supply & install'),
-- Tiling
((select id from trade_categories where name='Tiling'), 'Tiler - labour only', 'hr', 75, 95, 125, '2026 NSW'),
((select id from trade_categories where name='Tiling'), 'Floor tiles - standard format', 'sqm', 65, 95, 145, 'Labour only'),
((select id from trade_categories where name='Tiling'), 'Wall tiles - standard', 'sqm', 75, 110, 165, 'Labour only'),
((select id from trade_categories where name='Tiling'), 'Large format tiles 600x1200+', 'sqm', 110, 160, 240, 'Labour only'),
((select id from trade_categories where name='Tiling'), 'Bathroom full tile - medium', 'fixed', 3500, 5500, 9000, 'Labour only, excl tiles'),
((select id from trade_categories where name='Tiling'), 'Waterproofing - bathroom', 'item', 800, 1200, 2000, 'Membrane & cert'),
-- Concreting
((select id from trade_categories where name='Concreting'), 'Concrete slab - standard', 'sqm', 120, 180, 260, 'Supply & pour'),
((select id from trade_categories where name='Concreting'), 'Concrete driveway', 'sqm', 110, 160, 240, 'Supply & pour'),
((select id from trade_categories where name='Concreting'), 'Exposed aggregate driveway', 'sqm', 140, 200, 300, 'Supply & pour'),
((select id from trade_categories where name='Concreting'), 'Footings - strip', 'lm', 180, 280, 450, 'Excavation & pour'),
((select id from trade_categories where name='Concreting'), 'Retaining wall - concrete block', 'sqm', 280, 420, 650, 'Supply & install'),
-- Roofing
((select id from trade_categories where name='Roofing'), 'Colorbond roofing', 'sqm', 85, 130, 195, 'Supply & install'),
((select id from trade_categories where name='Roofing'), 'Concrete tile roofing', 'sqm', 95, 145, 210, 'Supply & install'),
((select id from trade_categories where name='Roofing'), 'Terracotta tile roofing', 'sqm', 120, 180, 280, 'Supply & install'),
((select id from trade_categories where name='Roofing'), 'Gutters & downpipes', 'lm', 55, 85, 135, 'Supply & install'),
((select id from trade_categories where name='Roofing'), 'Roof restoration', 'sqm', 35, 55, 90, 'Clean, repaint, repoint'),
((select id from trade_categories where name='Roofing'), 'Skylight installation', 'item', 1800, 3000, 5500, 'Supply & install'),
-- Plastering
((select id from trade_categories where name='Plastering'), 'Plasterboard supply & fix', 'sqm', 35, 55, 85, 'Boards only, no set'),
((select id from trade_categories where name='Plastering'), 'Plasterboard set & sand', 'sqm', 28, 42, 65, 'Labour only'),
((select id from trade_categories where name='Plastering'), 'Cornice installation', 'lm', 22, 35, 55, 'Supply & install'),
((select id from trade_categories where name='Plastering'), 'Render - external acrylic', 'sqm', 65, 95, 145, 'Supply & apply'),
((select id from trade_categories where name='Plastering'), 'Render - internal sand/cement', 'sqm', 55, 80, 120, 'Supply & apply'),
-- Landscaping
((select id from trade_categories where name='Landscaping'), 'Landscaper - labour only', 'hr', 65, 85, 110, '2026 NSW'),
((select id from trade_categories where name='Landscaping'), 'Turf supply & lay', 'sqm', 28, 42, 65, 'Supply & lay'),
((select id from trade_categories where name='Landscaping'), 'Garden beds - design & plant', 'sqm', 120, 200, 380, 'Supply & install'),
((select id from trade_categories where name='Landscaping'), 'Retaining wall - timber', 'lm', 280, 420, 700, 'Supply & install'),
((select id from trade_categories where name='Landscaping'), 'Pool installation - concrete', 'fixed', 65000, 95000, 160000, 'Supply & install'),
((select id from trade_categories where name='Landscaping'), 'Fencing - colorbond', 'lm', 120, 180, 280, 'Supply & install'),
((select id from trade_categories where name='Landscaping'), 'Fencing - timber paling', 'lm', 85, 130, 200, 'Supply & install'),
-- Demolition
((select id from trade_categories where name='Demolition'), 'Interior strip out', 'fixed', 3500, 6000, 12000, 'Per standard house'),
((select id from trade_categories where name='Demolition'), 'Full demolition - house', 'fixed', 18000, 28000, 55000, 'Incl removal'),
((select id from trade_categories where name='Demolition'), 'Wall removal - load bearing', 'item', 1800, 3200, 6000, 'Incl lintel & make good'),
((select id from trade_categories where name='Demolition'), 'Wall removal - non load bearing', 'item', 800, 1400, 2500, 'Incl make good'),
((select id from trade_categories where name='Demolition'), 'Asbestos removal - friable', 'sqm', 180, 280, 500, 'Licensed contractor'),
((select id from trade_categories where name='Demolition'), 'Asbestos removal - non-friable', 'sqm', 65, 110, 180, 'Licensed contractor'),
-- Excavation
((select id from trade_categories where name='Excavation'), 'Excavation - bulk earthworks', 'hr', 180, 250, 380, 'Machine + operator'),
((select id from trade_categories where name='Excavation'), 'Excavation - per m3 removed', 'item', 95, 150, 250, 'Incl truck & tip'),
((select id from trade_categories where name='Excavation'), 'Retaining wall footings', 'lm', 220, 350, 550, 'Excavation only'),
((select id from trade_categories where name='Excavation'), 'Pool excavation', 'fixed', 8000, 14000, 25000, 'Depends on rock'),
-- Cabinetry & Joinery
((select id from trade_categories where name='Cabinetry & Joinery'), 'Kitchen - budget flat pack', 'fixed', 4000, 7000, 12000, 'Supply & install'),
((select id from trade_categories where name='Cabinetry & Joinery'), 'Kitchen - mid custom', 'fixed', 15000, 28000, 55000, 'Supply & install'),
((select id from trade_categories where name='Cabinetry & Joinery'), 'Kitchen - high end custom', 'fixed', 45000, 80000, 180000, 'Incl stone bench'),
((select id from trade_categories where name='Cabinetry & Joinery'), 'Bathroom vanity - custom', 'item', 2800, 5500, 12000, 'Supply & install'),
((select id from trade_categories where name='Cabinetry & Joinery'), 'Wardrobe - walk in', 'fixed', 4500, 8000, 18000, 'Supply & install'),
((select id from trade_categories where name='Cabinetry & Joinery'), 'Laundry joinery', 'fixed', 1800, 3500, 7000, 'Supply & install'),
((select id from trade_categories where name='Cabinetry & Joinery'), 'Stone benchtop - engineered', 'lm', 650, 950, 1800, 'Supply & install'),
((select id from trade_categories where name='Cabinetry & Joinery'), 'Stone benchtop - natural', 'lm', 900, 1600, 3500, 'Supply & install'),
-- Flooring
((select id from trade_categories where name='Flooring'), 'Hybrid flooring supply & lay', 'sqm', 65, 95, 145, 'Good quality'),
((select id from trade_categories where name='Flooring'), 'Engineered timber supply & lay', 'sqm', 120, 185, 280, 'Premium'),
((select id from trade_categories where name='Flooring'), 'Solid hardwood supply & lay', 'sqm', 165, 250, 420, 'Premium'),
((select id from trade_categories where name='Flooring'), 'Carpet supply & lay', 'sqm', 45, 75, 130, 'Mid grade'),
((select id from trade_categories where name='Flooring'), 'Floor sanding & polish', 'sqm', 35, 55, 90, 'Existing timber'),
-- Air Conditioning
((select id from trade_categories where name='Air Conditioning / HVAC'), 'Split system - 2.5kW', 'item', 1200, 1800, 2800, 'Supply & install'),
((select id from trade_categories where name='Air Conditioning / HVAC'), 'Split system - 7kW', 'item', 2200, 3200, 5000, 'Supply & install'),
((select id from trade_categories where name='Air Conditioning / HVAC'), 'Ducted system - 3 bed', 'fixed', 8000, 14000, 22000, 'Supply & install'),
((select id from trade_categories where name='Air Conditioning / HVAC'), 'Ducted system - 5 bed', 'fixed', 14000, 22000, 38000, 'Supply & install'),
-- Glazing & Windows
((select id from trade_categories where name='Glazing & Windows'), 'Aluminium window - standard', 'item', 800, 1400, 2500, 'Supply & install'),
((select id from trade_categories where name='Glazing & Windows'), 'Double glazed window', 'item', 1400, 2200, 4000, 'Supply & install'),
((select id from trade_categories where name='Glazing & Windows'), 'Sliding door - aluminium', 'item', 2200, 3800, 7000, 'Supply & install'),
((select id from trade_categories where name='Glazing & Windows'), 'Shower screen - frameless', 'item', 1200, 2000, 3800, 'Supply & install'),
((select id from trade_categories where name='Glazing & Windows'), 'Glass pool fence - per panel', 'item', 650, 950, 1600, 'Supply & install'),
-- Professional fees
((select id from trade_categories where name='Surveying'), 'Boundary survey', 'fixed', 1800, 2800, 4500, 'Registered surveyor'),
((select id from trade_categories where name='Surveying'), 'Contour & detail survey', 'fixed', 2500, 4000, 7000, 'For DA'),
((select id from trade_categories where name='Certifier / BCA'), 'Private certifier - DA', 'fixed', 2500, 4000, 8000, 'Depends on project'),
((select id from trade_categories where name='Certifier / BCA'), 'Private certifier - CDC', 'fixed', 1500, 2500, 5000, 'Complying development'),
((select id from trade_categories where name='Architecture / Design'), 'Architect - concept design', 'fixed', 8000, 18000, 45000, '% of build cost'),
((select id from trade_categories where name='Architecture / Design'), 'Draftsperson - plans only', 'fixed', 3500, 7000, 15000, 'DA-ready drawings'),
((select id from trade_categories where name='Waterproofing'), 'Waterproofing - wet area', 'sqm', 65, 95, 145, 'Membrane & cert'),
((select id from trade_categories where name='Waterproofing'), 'Waterproofing - basement', 'sqm', 120, 200, 350, 'External membrane'),
((select id from trade_categories where name='Scaffolding'), 'Scaffolding - per week', 'fixed', 800, 1400, 2800, 'Standard house'),
((select id from trade_categories where name='Insulation'), 'Wall insulation - batts', 'sqm', 18, 28, 45, 'Supply & install'),
((select id from trade_categories where name='Insulation'), 'Ceiling insulation - batts', 'sqm', 22, 35, 55, 'Supply & install');

-- ============================================================
-- BUILD SCOPES (per property)
-- ============================================================
create table build_scopes (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid references properties(id) on delete cascade,
  created_at timestamptz default now(),
  name text default 'Main Scope',
  scenario text check (scenario in ('conservative','base','optimistic')) default 'base',
  notes text,
  is_active boolean default true
);

create table scope_line_items (
  id uuid primary key default uuid_generate_v4(),
  scope_id uuid references build_scopes(id) on delete cascade,
  category_id uuid references trade_categories(id),
  tradesperson_id uuid references tradespeople(id),
  trade_rate_id uuid references trade_rates(id),

  item_name text not null,
  unit text not null,
  quantity numeric not null default 1,
  rate numeric not null,
  total numeric generated always as (quantity * rate) stored,

  -- Sourcing
  sourcing text check (sourcing in ('trade_supply','china_direct','local_supplier','owner_supply')) default 'trade_supply',
  materials_cost numeric default 0,
  labour_cost numeric default 0,

  -- Scenario pricing
  rate_low numeric,
  rate_mid numeric,
  rate_high numeric,

  -- Timeline
  start_week int,
  duration_weeks int default 1,
  trade_sequence int,

  notes text,
  is_locked boolean default false
);

-- ============================================================
-- CHINA / INTERNATIONAL SOURCING
-- ============================================================
create table sourcing_suppliers (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  name text not null,
  platform text check (platform in ('alibaba','1688','made_in_china','direct','other')),
  url text,
  location text default 'China',
  category text,
  contact_name text,
  contact_wechat text,
  contact_email text,
  min_order_qty int,
  lead_time_days int,
  quality_rating int check (quality_rating between 1 and 5),
  reliability_rating int check (reliability_rating between 1 and 5),
  notes text,
  verified boolean default false,
  used_on_projects int default 0
);

create table sourcing_products (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  supplier_id uuid references sourcing_suppliers(id),
  category_id uuid references trade_categories(id),

  product_name text not null,
  description text,
  url text,
  photo_url text,

  -- China pricing
  unit_price_usd numeric,
  unit_price_aud numeric,
  moq int default 1,
  unit text,

  -- Freight estimate
  weight_kg numeric,
  volume_cbm numeric,
  freight_cost_aud numeric,
  customs_duty_pct numeric default 5,
  customs_duty_aud numeric,
  landed_cost_aud numeric,

  -- AU comparison
  au_trade_price_aud numeric,
  au_retail_price_aud numeric,
  saving_per_unit_aud numeric generated always as (au_trade_price_aud - landed_cost_aud) stored,
  saving_pct numeric,

  -- Quality
  quality_tier text check (quality_tier in ('budget','mid','premium','luxury')) default 'mid',
  quality_notes text,
  lead_time_days int,

  notes text,
  is_active boolean default true
);

-- ============================================================
-- FINANCIAL MODELS (per property, multiple scenarios)
-- ============================================================
create table financial_models (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid references properties(id) on delete cascade,
  created_at timestamptz default now(),
  scenario text check (scenario in ('conservative','base','optimistic')) default 'base',
  strategy text check (strategy in ('flip','hold','develop','subdivide','dual_occ')),

  -- ACQUISITION
  purchase_price numeric,
  stamp_duty numeric,
  legal_fees numeric default 2500,
  building_inspection numeric default 1200,
  other_acquisition numeric default 0,
  total_acquisition numeric,

  -- BUILD / RENO
  build_cost_labour numeric,
  build_cost_materials numeric,
  build_cost_contingency_pct numeric default 15,
  build_cost_total numeric,
  build_duration_weeks int,

  -- HOLDING COSTS
  loan_amount numeric,
  interest_rate_pct numeric,
  holding_weeks int,
  interest_cost numeric,
  council_rates numeric,
  insurance_construction numeric default 3000,
  other_holding numeric default 0,
  total_holding numeric,

  -- TOTAL IN
  total_cost_in numeric,

  -- FLIP OUTPUTS
  sale_price_estimate numeric,
  agent_commission_pct numeric default 2.0,
  agent_commission numeric,
  marketing_cost numeric default 8000,
  conveyancing_sale numeric default 1800,
  total_sale_costs numeric,
  net_proceeds numeric,
  gross_profit numeric,
  net_profit_before_tax numeric,
  cgt_estimate numeric,
  net_profit_after_tax numeric,
  roi_pct numeric,
  annualised_roi_pct numeric,
  cash_on_cash_return_pct numeric,

  -- HOLD / RENT OUTPUTS
  weekly_rent numeric,
  annual_gross_rent numeric,
  vacancy_allowance_pct numeric default 4,
  property_management_pct numeric default 7,
  maintenance_annual numeric default 3000,
  insurance_landlord_annual numeric default 2000,
  net_annual_rent numeric,
  gross_yield_pct numeric,
  net_yield_pct numeric,
  negative_gearing_benefit_annual numeric,
  equity_year_1 numeric,
  equity_year_5 numeric,
  equity_year_10 numeric,

  -- MAX PUSH (what Alex should hustle toward)
  max_allowable_purchase_price numeric,
  max_build_budget numeric,
  min_required_sale_price numeric,
  breakeven_price numeric,
  target_profit_30pct numeric,
  target_profit_50pct numeric,

  notes text
);

-- ============================================================
-- DEAL NOTES & HISTORY
-- ============================================================
create table deal_notes (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid references properties(id) on delete cascade,
  created_at timestamptz default now(),
  type text check (type in ('inspection','offer','negotiation','finance','legal','build','general','alert')) default 'general',
  title text,
  body text not null,
  action_required boolean default false,
  action_due date
);

-- ============================================================
-- WATCHLIST / ALERTS
-- ============================================================
create table watchlist_criteria (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  name text not null,
  suburbs text[], -- array of suburbs
  property_types text[],
  min_land_sqm numeric,
  max_price numeric,
  min_price numeric,
  zoning_codes text[],
  must_have_dual_occ boolean,
  must_have_subdivision boolean,
  min_score numeric default 60,
  is_active boolean default true,
  alert_email boolean default true,
  last_checked timestamptz
);

-- ============================================================
-- SUBURB MARKET DATA (cached)
-- ============================================================
create table suburb_market_data (
  id uuid primary key default uuid_generate_v4(),
  updated_at timestamptz default now(),
  suburb text not null,
  state text default 'NSW',
  postcode text,
  property_type text,
  median_price numeric,
  median_price_sqm numeric,
  annual_growth_pct numeric,
  five_yr_growth_pct numeric,
  ten_yr_growth_pct numeric,
  gross_yield_pct numeric,
  vacancy_rate_pct numeric,
  days_on_market_avg int,
  auction_clearance_pct numeric,
  total_listings int,
  infrastructure_score int,
  liveability_score int,
  unique (suburb, state, property_type)
);

-- ============================================================
-- RLS POLICIES
-- ============================================================
alter table properties enable row level security;
alter table property_comps enable row level security;
alter table tradespeople enable row level security;
alter table trade_rates enable row level security;
alter table trade_categories enable row level security;
alter table build_scopes enable row level security;
alter table scope_line_items enable row level security;
alter table sourcing_suppliers enable row level security;
alter table sourcing_products enable row level security;
alter table financial_models enable row level security;
alter table deal_notes enable row level security;
alter table watchlist_criteria enable row level security;
alter table suburb_market_data enable row level security;

-- For now single-user: all authenticated users get full access
create policy "Authenticated full access" on properties for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on property_comps for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on tradespeople for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on trade_rates for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on trade_categories for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on build_scopes for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on scope_line_items for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on sourcing_suppliers for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on sourcing_products for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on financial_models for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on deal_notes for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on watchlist_criteria for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on suburb_market_data for all using (auth.role() = 'authenticated');

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_properties_status on properties(status);
create index idx_properties_suburb on properties(suburb);
create index idx_properties_score on properties(composite_score desc);
create index idx_scope_items_scope on scope_line_items(scope_id);
create index idx_trade_rates_category on trade_rates(category_id);
create index idx_sourcing_products_category on sourcing_products(category_id);
create index idx_financial_models_property on financial_models(property_id);
create index idx_deal_notes_property on deal_notes(property_id);
