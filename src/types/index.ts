// ============================================================
// ANBM Property Intelligence - Type Definitions
// ============================================================

export type PropertyType = 'house' | 'townhouse' | 'unit' | 'duplex' | 'commercial' | 'land' | 'acreage'
export type PropertyStatus = 'watching' | 'analysing' | 'offer' | 'under_contract' | 'building' | 'complete' | 'archived'
export type DealGrade = 'A' | 'B' | 'C' | 'D'
export type Strategy = 'flip' | 'hold' | 'develop' | 'subdivide' | 'dual_occ' | 'land_bank' | 'pass'
export type Scenario = 'conservative' | 'base' | 'optimistic'
export type DaComplexity = 'exempt' | 'complying' | 'low' | 'medium' | 'high' | 'prohibited'
export type Relationship = 'family' | 'mate' | 'trusted_sub' | 'preferred_sub' | 'backup' | 'one_off' | 'unknown'
export type SourcingPlatform = 'alibaba' | '1688' | 'made_in_china' | 'direct' | 'other'
export type QualityTier = 'budget' | 'mid' | 'premium' | 'luxury'
export type NoteType = 'inspection' | 'offer' | 'negotiation' | 'finance' | 'legal' | 'build' | 'general' | 'alert'

// ============================================================
// PROPERTY
// ============================================================
export interface Property {
  id: string
  created_at: string
  updated_at: string
  nickname: string
  address: string
  suburb: string
  state: string
  postcode: string
  lat?: number
  lng?: number

  // Property details
  property_type?: PropertyType
  land_size_sqm?: number
  floor_area_sqm?: number
  bedrooms?: number
  bathrooms?: number
  car_spaces?: number
  build_year?: number
  council?: string
  council_rates_annual?: number

  // Zoning & planning
  zoning_code?: string
  zoning_description?: string
  fsr?: number
  max_height_m?: number
  lot_size_min_sqm?: number
  dual_occ_eligible?: boolean
  subdivision_potential?: boolean
  heritage_listed?: boolean
  flood_overlay?: boolean
  bushfire_overlay?: boolean
  da_complexity?: DaComplexity

  // Market data
  last_sold_price?: number
  last_sold_date?: string
  estimated_value?: number
  median_suburb_price?: number
  median_price_sqm?: number
  days_on_market_avg?: number
  vendor_discount_pct?: number
  rental_estimate_weekly?: number
  vacancy_rate_pct?: number
  suburb_annual_growth_pct?: number

  // Acquisition
  asking_price?: number
  purchase_price?: number
  stamp_duty?: number
  legal_conveyancing?: number
  building_inspection?: number
  pest_inspection?: number
  other_acquisition_costs?: number
  settlement_weeks?: number

  // Finance
  deposit_pct?: number
  loan_amount?: number
  interest_rate_pct?: number
  loan_type?: string
  lender?: string
  finance_approved?: boolean

  // Deal status
  status: PropertyStatus
  deal_grade?: DealGrade
  composite_score?: number

  // Scoring
  score_structure?: number
  score_location?: number
  score_da_risk?: number
  score_access?: number
  score_vendor_motivation?: number
  score_gut?: number
  score_growth_potential?: number
  score_renovation_complexity?: number

  // Decision
  recommended_strategy?: Strategy
  ai_analysis?: string
  ai_confidence_pct?: number

  notes?: string
  agent_name?: string
  agent_phone?: string
  agent_email?: string
  inspection_date?: string
  offer_expiry?: string
}

// ============================================================
// TRADES
// ============================================================
export interface TradeCategory {
  id: string
  name: string
  sort_order: number
}

export interface Tradesperson {
  id: string
  created_at: string
  category_id: string
  name: string
  company?: string
  phone?: string
  email?: string
  licence_number?: string
  insurance_expiry?: string
  abn?: string
  relationship: Relationship
  priority: number
  notes?: string
  rating?: number
  last_used?: string
  typically_available: boolean
  lead_time_days: number
  is_active: boolean
  trade_categories?: TradeCategory
}

export interface TradeRate {
  id: string
  tradesperson_id?: string
  category_id: string
  item_name: string
  unit: string
  rate_low: number
  rate_mid: number
  rate_high: number
  notes?: string
  last_updated: string
  is_your_rate: boolean
  trade_categories?: TradeCategory
  tradespeople?: Tradesperson
}

// ============================================================
// BUILD SCOPE
// ============================================================
export interface BuildScope {
  id: string
  property_id: string
  created_at: string
  name: string
  scenario: Scenario
  notes?: string
  is_active: boolean
  scope_line_items?: ScopeLineItem[]
}

export interface ScopeLineItem {
  id: string
  scope_id: string
  category_id?: string
  tradesperson_id?: string
  trade_rate_id?: string
  item_name: string
  unit: string
  quantity: number
  rate: number
  total: number
  sourcing: string
  materials_cost: number
  labour_cost: number
  rate_low?: number
  rate_mid?: number
  rate_high?: number
  start_week?: number
  duration_weeks: number
  trade_sequence?: number
  notes?: string
  is_locked: boolean
  trade_categories?: TradeCategory
  tradespeople?: Tradesperson
}

// ============================================================
// FINANCIAL MODEL
// ============================================================
export interface FinancialModel {
  id: string
  property_id: string
  created_at: string
  scenario: Scenario
  strategy: Strategy

  // Acquisition
  purchase_price: number
  stamp_duty: number
  legal_fees: number
  building_inspection: number
  other_acquisition: number
  total_acquisition: number

  // Build
  build_cost_labour: number
  build_cost_materials: number
  build_cost_contingency_pct: number
  build_cost_total: number
  build_duration_weeks: number

  // Holding
  loan_amount: number
  interest_rate_pct: number
  holding_weeks: number
  interest_cost: number
  council_rates: number
  insurance_construction: number
  other_holding: number
  total_holding: number

  // Total in
  total_cost_in: number

  // Flip
  sale_price_estimate: number
  agent_commission_pct: number
  agent_commission: number
  marketing_cost: number
  conveyancing_sale: number
  total_sale_costs: number
  net_proceeds: number
  gross_profit: number
  net_profit_before_tax: number
  cgt_estimate: number
  net_profit_after_tax: number
  roi_pct: number
  annualised_roi_pct: number
  cash_on_cash_return_pct: number

  // Hold
  weekly_rent: number
  annual_gross_rent: number
  vacancy_allowance_pct: number
  property_management_pct: number
  maintenance_annual: number
  insurance_landlord_annual: number
  net_annual_rent: number
  gross_yield_pct: number
  net_yield_pct: number
  negative_gearing_benefit_annual: number
  equity_year_1: number
  equity_year_5: number
  equity_year_10: number

  // Max push
  max_allowable_purchase_price: number
  max_build_budget: number
  min_required_sale_price: number
  breakeven_price: number
  target_profit_30pct: number
  target_profit_50pct: number

  notes?: string
}

// ============================================================
// SOURCING
// ============================================================
export interface SourcingSupplier {
  id: string
  created_at: string
  name: string
  platform?: SourcingPlatform
  url?: string
  location: string
  category?: string
  contact_name?: string
  contact_wechat?: string
  contact_email?: string
  min_order_qty?: number
  lead_time_days?: number
  quality_rating?: number
  reliability_rating?: number
  notes?: string
  verified: boolean
  used_on_projects: number
}

export interface SourcingProduct {
  id: string
  created_at: string
  supplier_id?: string
  category_id?: string
  product_name: string
  description?: string
  url?: string
  photo_url?: string
  unit_price_usd?: number
  unit_price_aud?: number
  moq: number
  unit?: string
  weight_kg?: number
  volume_cbm?: number
  freight_cost_aud?: number
  customs_duty_pct: number
  customs_duty_aud?: number
  landed_cost_aud?: number
  au_trade_price_aud?: number
  au_retail_price_aud?: number
  saving_per_unit_aud?: number
  saving_pct?: number
  quality_tier: QualityTier
  quality_notes?: string
  lead_time_days?: number
  notes?: string
  is_active: boolean
  sourcing_suppliers?: SourcingSupplier
}

// ============================================================
// CALCULATIONS (client-side)
// ============================================================
export interface StampDutyResult {
  duty: number
  breakdown: string
  foreign_surcharge: number
  total: number
}

export interface FinancialSummary {
  totalIn: number
  flipProfit: number
  flipROI: number
  flipAnnualisedROI: number
  holdYieldGross: number
  holdYieldNet: number
  maxPurchasePrice: number
  breakeven: number
  minSalePriceFor30pctROI: number
  minSalePriceFor50pctROI: number
  recommendation: Strategy
  confidence: number
}

export interface TradeScenario {
  tradesperson: string
  relationship: Relationship
  totalCost: number
  savingVsMarket: number
  availableNow: boolean
}

// ============================================================
// API RESPONSES
// ============================================================
export interface PropertyLookupResult {
  address: string
  suburb: string
  state: string
  postcode: string
  lat: number
  lng: number
  land_size_sqm?: number
  property_type?: PropertyType
  bedrooms?: number
  bathrooms?: number
  car_spaces?: number
  build_year?: number
  council?: string
  zoning_code?: string
  zoning_description?: string
  fsr?: number
  max_height_m?: number
  dual_occ_eligible?: boolean
  subdivision_potential?: boolean
  heritage_listed?: boolean
  flood_overlay?: boolean
  da_complexity?: string
  estimated_value?: number
  last_sold_price?: number
  last_sold_date?: string
  median_suburb_price?: number
  rental_estimate_weekly?: number
  vacancy_rate_pct?: number
  suburb_annual_growth_pct?: number
}

export interface AIAnalysisResult {
  strategy: Strategy
  confidence: number
  reasoning: string
  risks: string[]
  opportunities: string[]
  maxPush: string
  verdict: string
}
