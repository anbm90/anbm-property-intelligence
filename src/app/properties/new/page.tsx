'use client'
export const dynamic = 'force-dynamic'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { calcStampDuty, calcCompositeScore, calcMaxPush, fmtCurrency } from '@/lib/calculations/finance'
import type { Property, PropertyLookupResult } from '@/types'
import Sidebar from '@/components/ui/Sidebar'

const scores = [
  { key: 'score_structure', label: 'Structural condition', help: '10 = near new, 1 = falling down' },
  { key: 'score_location', label: 'Location / suburb demand', help: '10 = blue chip, 1 = nobody wants it' },
  { key: 'score_da_risk', label: 'DA / planning simplicity', help: '10 = exempt dev, 1 = prohibited' },
  { key: 'score_access', label: 'Site access & workability', help: '10 = flat easy access, 1 = nightmare site' },
  { key: 'score_vendor_motivation', label: 'Vendor motivation', help: '10 = desperate to sell, 1 = fishing' },
  { key: 'score_gut', label: 'Gut feel', help: '10 = this is the one, 1 = something is off' },
  { key: 'score_growth_potential', label: 'Growth potential', help: '10 = infrastructure boom area, 1 = declining' },
  { key: 'score_renovation_complexity', label: 'Reno simplicity', help: '10 = cosmetic only, 1 = full rebuild' },
]

export default function NewPropertyPage() {
  const router = useRouter()
  const supabase = createClient()
  const [searchAddress, setSearchAddress] = useState('')
  const [lookupLoading, setLookupLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [aiResult, setAiResult] = useState<any>(null)

  const [form, setForm] = useState<Partial<Property>>({
    status: 'watching',
    deposit_pct: 20,
    interest_rate_pct: 6.49,
    legal_conveyancing: 2500,
    building_inspection: 800,
    pest_inspection: 400,
    score_structure: 5,
    score_location: 5,
    score_da_risk: 5,
    score_access: 5,
    score_vendor_motivation: 5,
    score_gut: 5,
    score_growth_potential: 5,
    score_renovation_complexity: 5,
  })

  const [buildCost, setBuildCost] = useState(0)
  const [saleEstimate, setSaleEstimate] = useState(0)
  const [weeklyRent, setWeeklyRent] = useState(0)
  const [buildWeeks, setBuildWeeks] = useState(12)

  const set = (key: string, val: any) => setForm(f => ({ ...f, [key]: val }))
  const [scanLoading, setScanLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setScanLoading(true)
    try {
      const fd = new FormData()
      fd.append("image", file)
      const res = await fetch("/api/property/scan-listing", { method: "POST", body: fd })
      const data = await res.json()
      if (data.success && data.data) {
        const d = data.data
        setForm(f => ({
          ...f,
          address: d.address ?? f.address,
          suburb: d.suburb ?? f.suburb,
          asking_price: d.asking_price ?? f.asking_price,
          purchase_price: d.asking_price ?? f.purchase_price,
          property_type: d.property_type ?? f.property_type,
          bedrooms: d.bedrooms ?? f.bedrooms,
          bathrooms: d.bathrooms ?? f.bathrooms,
          land_size_sqm: d.land_size_sqm ?? f.land_size_sqm,
          agent_name: d.agent_name ?? f.agent_name,
          nickname: d.address ? d.address.split(",")[0] : f.nickname,
        }))
      }
    } catch { alert("Scan failed") }
    setScanLoading(false)
  }

  // Address auto-lookup
  const handleLookup = async () => {
    if (!searchAddress.trim()) return
    setLookupLoading(true)
    try {
      const res = await fetch('/api/property/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: searchAddress }),
      })
      const data = await res.json()
      if (data.success && data.property) {
        const p = data.property as PropertyLookupResult
        setForm(f => ({
          ...f,
          address: p.address,
          suburb: p.suburb,
          state: p.state,
          postcode: p.postcode,
          lat: p.lat,
          lng: p.lng,
          property_type: p.property_type,
          land_size_sqm: p.land_size_sqm,
          bedrooms: p.bedrooms,
          bathrooms: p.bathrooms,
          car_spaces: p.car_spaces,
          build_year: p.build_year,
          council: p.council,
          zoning_code: p.zoning_code,
          zoning_description: p.zoning_description,
          fsr: p.fsr,
          max_height_m: p.max_height_m,
          dual_occ_eligible: p.dual_occ_eligible,
          subdivision_potential: p.subdivision_potential,
          heritage_listed: p.heritage_listed,
          flood_overlay: p.flood_overlay,
          estimated_value: p.estimated_value,
          last_sold_price: p.last_sold_price,
          last_sold_date: p.last_sold_date,
          median_suburb_price: p.median_suburb_price,
          rental_estimate_weekly: p.rental_estimate_weekly,
          vacancy_rate_pct: p.vacancy_rate_pct,
          suburb_annual_growth_pct: p.suburb_annual_growth_pct,
        }))
        if (p.rental_estimate_weekly) setWeeklyRent(p.rental_estimate_weekly)
        if (p.estimated_value) setSaleEstimate(Math.round(p.estimated_value * 1.15))
      }
    } catch (e) {
      alert('Lookup failed — fill in manually')
    }
    setLookupLoading(false)
  }

  // Stamp duty auto-calc
  const stamp = form.purchase_price ? calcStampDuty(form.purchase_price).total : 0
  const totalIn = (form.purchase_price ?? 0) + stamp + (form.legal_conveyancing ?? 2500) +
    (form.building_inspection ?? 800) + (form.pest_inspection ?? 400) + buildCost

  const maxPush = form.purchase_price && saleEstimate
    ? calcMaxPush(saleEstimate, buildCost, form.deposit_pct ?? 20, buildWeeks)
    : null

  const { score, grade } = calcCompositeScore({
    structure: form.score_structure,
    location: form.score_location,
    da_risk: form.score_da_risk,
    access: form.score_access,
    vendor_motivation: form.score_vendor_motivation,
    gut: form.score_gut,
    growth_potential: form.score_growth_potential,
    renovation_complexity: form.score_renovation_complexity,
  })

  // Run AI analysis
  const runAI = async () => {
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property: { ...form, purchase_price: form.purchase_price ?? 0 },
          buildCost,
          saleEstimate,
          weeklyRent,
          buildWeeks,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setAiResult(data.analysis)
        set('recommended_strategy', data.analysis.strategy)
        set('ai_analysis', data.analysis.reasoning)
        set('ai_confidence_pct', data.analysis.confidence)
      }
    } catch {
      alert('AI analysis failed — check your API key')
    }
    setAiLoading(false)
  }

  // Save
  const handleSave = async () => {
    if (!form.nickname || !form.address) {
      alert('Add a nickname and address first')
      return
    }
    setSaving(true)
    const { data, error } = await supabase.from('properties').insert({
      ...form,
      stamp_duty: stamp,
      composite_score: score,
      deal_grade: grade,
    }).select().single()

    if (error) {
      alert('Save failed: ' + error.message)
      setSaving(false)
      return
    }

    // Save financial model
    if (data && form.purchase_price) {
      await supabase.from('financial_models').insert({
        property_id: data.id,
        scenario: 'base',
        strategy: form.recommended_strategy ?? 'flip',
        purchase_price: form.purchase_price,
        stamp_duty: stamp,
        legal_fees: form.legal_conveyancing ?? 2500,
        building_inspection: form.building_inspection ?? 800,
        other_acquisition: 0,
        total_acquisition: (form.purchase_price ?? 0) + stamp + (form.legal_conveyancing ?? 2500) + (form.building_inspection ?? 800),
        build_cost_total: buildCost,
        build_duration_weeks: buildWeeks,
        loan_amount: (form.purchase_price ?? 0) * ((100 - (form.deposit_pct ?? 20)) / 100),
        interest_rate_pct: form.interest_rate_pct ?? 6.49,
        holding_weeks: buildWeeks + 6,
        total_cost_in: totalIn,
        sale_price_estimate: saleEstimate,
        weekly_rent: weeklyRent,
        max_allowable_purchase_price: maxPush?.maxPurchasePriceFor30pctROI ?? 0,
        breakeven_price: maxPush?.minSalePriceToBreakeven ?? 0,
        target_profit_30pct: maxPush?.minSalePriceFor30pctROI ?? 0,
        target_profit_50pct: maxPush?.minSalePriceFor50pctROI ?? 0,
      })
    }

    router.push(`/properties/${data.id}`)
  }

  const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, background: 'white', color: '#1a1a1a' }
  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 5 }
  const gridStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }
  const grid3Style = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content" style={{ maxWidth: 900 }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Add property</h1>
          <p style={{ fontSize: 14, color: '#888' }}>Type an address and hit Lookup — we pull the rest automatically</p>
        </div>

        {/* Screenshot scan */}
        <div className="card" style={{ marginBottom: 16, borderStyle: "dashed", borderColor: "#d4a843" }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>📸 Scan listing screenshot</div>
          <div style={{ fontSize: 13, color: "#888", marginBottom: 10 }}>Drop a screenshot from Domain, REA, or anywhere — AI reads the address, price, beds, baths automatically</div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleScan} />
          <button className="btn-outline" onClick={() => fileRef.current?.click()} disabled={scanLoading}>
            {scanLoading ? "Scanning..." : "Upload screenshot →"}
          </button>
        </div>

        {/* Address lookup */}
        <div className="card" style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Address lookup</label>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              placeholder="e.g. 12 Smith Street, Bexley NSW"
              value={searchAddress}
              onChange={e => setSearchAddress(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLookup()}
            />
            <button className="btn-gold" onClick={handleLookup} disabled={lookupLoading} style={{ whiteSpace: 'nowrap' }}>
              {lookupLoading ? 'Looking up...' : 'Lookup →'}
            </button>
          </div>
          {form.address && (
            <div className="flag-box flag-success" style={{ marginTop: 10, marginBottom: 0 }}>
              Found: {form.address} · {form.zoning_code && `Zoning: ${form.zoning_code}`}
              {form.dual_occ_eligible && ' · ✓ Dual occ'}
              {form.subdivision_potential && ' · ✓ Subdivision potential'}
              {form.flood_overlay && ' · ⚠ Flood overlay'}
              {form.heritage_listed && ' · ⚠ Heritage'}
            </div>
          )}
        </div>

        {/* Basic details */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, color: '#1a1a1a' }}>Property details</div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Deal nickname *</label>
            <input style={inputStyle} placeholder="e.g. Ramsgate corner block" value={form.nickname ?? ''} onChange={e => set('nickname', e.target.value)} />
          </div>
          <div style={{ ...gridStyle, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Full address</label>
              <input style={inputStyle} value={form.address ?? ''} onChange={e => set('address', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Suburb</label>
              <input style={inputStyle} value={form.suburb ?? ''} onChange={e => set('suburb', e.target.value)} />
            </div>
          </div>
          <div style={{ ...grid3Style, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Property type</label>
              <select style={inputStyle} value={form.property_type ?? ''} onChange={e => set('property_type', e.target.value)}>
                <option value="">Select</option>
                {['house', 'townhouse', 'unit', 'duplex', 'commercial', 'land', 'acreage'].map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Land size (sqm)</label>
              <input type="number" style={inputStyle} value={form.land_size_sqm ?? ''} onChange={e => set('land_size_sqm', Number(e.target.value))} />
            </div>
            <div>
              <label style={labelStyle}>Floor area (sqm)</label>
              <input type="number" style={inputStyle} value={form.floor_area_sqm ?? ''} onChange={e => set('floor_area_sqm', Number(e.target.value))} />
            </div>
          </div>
          <div style={{ ...grid3Style }}>
            <div>
              <label style={labelStyle}>Beds</label>
              <input type="number" style={inputStyle} value={form.bedrooms ?? ''} onChange={e => set('bedrooms', Number(e.target.value))} />
            </div>
            <div>
              <label style={labelStyle}>Baths</label>
              <input type="number" style={inputStyle} value={form.bathrooms ?? ''} onChange={e => set('bathrooms', Number(e.target.value))} />
            </div>
            <div>
              <label style={labelStyle}>Cars</label>
              <input type="number" style={inputStyle} value={form.car_spaces ?? ''} onChange={e => set('car_spaces', Number(e.target.value))} />
            </div>
          </div>
        </div>

        {/* Financials */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Financials</div>
          <div style={{ ...gridStyle, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Asking price ($)</label>
              <input type="number" style={inputStyle} value={form.asking_price ?? ''} onChange={e => set('asking_price', Number(e.target.value))} />
            </div>
            <div>
              <label style={labelStyle}>Your purchase price ($)</label>
              <input type="number" style={inputStyle} value={form.purchase_price ?? ''} onChange={e => set('purchase_price', Number(e.target.value))} />
            </div>
          </div>

          {form.purchase_price ? (
            <div className="flag-box flag-info" style={{ marginBottom: 12 }}>
              Stamp duty (NSW 2026): <strong>{fmtCurrency(stamp)}</strong> · Total acquisition: <strong>{fmtCurrency((form.purchase_price ?? 0) + stamp + 3700)}</strong>
            </div>
          ) : null}

          <div style={{ ...grid3Style, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Build / reno cost ($)</label>
              <input type="number" style={inputStyle} value={buildCost || ''} onChange={e => setBuildCost(Number(e.target.value))} />
            </div>
            <div>
              <label style={labelStyle}>Build timeline (weeks)</label>
              <input type="number" style={inputStyle} value={buildWeeks} onChange={e => setBuildWeeks(Number(e.target.value))} />
            </div>
            <div>
              <label style={labelStyle}>Deposit (%)</label>
              <input type="number" style={inputStyle} value={form.deposit_pct ?? 20} onChange={e => set('deposit_pct', Number(e.target.value))} />
            </div>
          </div>
          <div style={{ ...gridStyle, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Interest rate (%)</label>
              <input type="number" step="0.01" style={inputStyle} value={form.interest_rate_pct ?? 6.49} onChange={e => set('interest_rate_pct', Number(e.target.value))} />
            </div>
            <div>
              <label style={labelStyle}>Est. sell / end value ($)</label>
              <input type="number" style={inputStyle} value={saleEstimate || ''} onChange={e => setSaleEstimate(Number(e.target.value))} />
            </div>
          </div>
          <div style={gridStyle}>
            <div>
              <label style={labelStyle}>Weekly rent estimate ($)</label>
              <input type="number" style={inputStyle} value={weeklyRent || ''} onChange={e => setWeeklyRent(Number(e.target.value))} />
            </div>
            <div>
              <label style={labelStyle}>Deal status</label>
              <select style={inputStyle} value={form.status} onChange={e => set('status', e.target.value)}>
                {['watching', 'analysing', 'offer', 'under_contract', 'building', 'complete'].map(s => (
                  <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Max push (live calc) */}
        {maxPush && (
          <div className="highlight-box" style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'white', marginBottom: 14 }}>
              Max push — what you should be hustling toward
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
              {[
                { label: 'Max buy @ 20% ROI', value: fmtCurrency(maxPush.maxPurchasePriceFor20pctROI) },
                { label: 'Max buy @ 30% ROI', value: fmtCurrency(maxPush.maxPurchasePriceFor30pctROI) },
                { label: 'Max buy @ 50% ROI', value: fmtCurrency(maxPush.maxPurchasePriceFor50pctROI) },
                { label: 'Breakeven sale', value: fmtCurrency(maxPush.minSalePriceToBreakeven) },
                { label: 'Target sale (30%)', value: fmtCurrency(maxPush.minSalePriceFor30pctROI) },
                { label: 'Target sale (50%)', value: fmtCurrency(maxPush.minSalePriceFor50pctROI) },
                { label: 'Trade savings', value: fmtCurrency(maxPush.estimatedTradeSavings), sub: '~22% off market' },
                { label: 'China sourcing save', value: fmtCurrency(maxPush.estimatedChinaSourcingSavings), sub: '~35% on materials' },
                { label: 'Your total edge', value: fmtCurrency(maxPush.totalEdge), sub: 'vs full market price' },
              ].map(m => (
                <div key={m.label}>
                  <div className="metric-label">{m.label}</div>
                  <div className="metric-value">{m.value}</div>
                  {m.sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{m.sub}</div>}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(255,255,255,0.06)', borderRadius: 8, fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
              <strong style={{ color: '#d4a843' }}>Best case:</strong> {fmtCurrency(maxPush.bestCaseProfit)} &nbsp;|&nbsp;
              <strong style={{ color: '#d4a843' }}>Realistic:</strong> {fmtCurrency(maxPush.realisticProfit)} &nbsp;|&nbsp;
              <strong style={{ color: '#888' }}>Worst case:</strong> {fmtCurrency(maxPush.worstCaseProfit)}
            </div>
          </div>
        )}

        {/* Scoring */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Deal scoring</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Rate each factor 1–10</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#1a1a1a' }}>{score}</div>
              <div style={{
                fontSize: 13, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
                background: grade === 'A' ? '#dcfce7' : grade === 'B' ? '#fef9c3' : grade === 'C' ? '#fee2e2' : '#f1f5f9',
                color: grade === 'A' ? '#166534' : grade === 'B' ? '#713f12' : grade === 'C' ? '#991b1b' : '#475569',
              }}>Grade {grade}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {scores.map(s => (
              <div key={s.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>{s.label}</label>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>
                    {(form as any)[s.key] ?? 5}
                  </span>
                </div>
                <input
                  type="range" min="1" max="10" step="1"
                  style={{ width: '100%' }}
                  value={(form as any)[s.key] ?? 5}
                  onChange={e => set(s.key, Number(e.target.value))}
                />
                <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{s.help}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Planning flags */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Planning & overlays</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
            {[
              { key: 'dual_occ_eligible', label: 'Dual occ eligible' },
              { key: 'subdivision_potential', label: 'Subdivision potential' },
              { key: 'heritage_listed', label: 'Heritage listed ⚠' },
              { key: 'flood_overlay', label: 'Flood overlay ⚠' },
              { key: 'bushfire_overlay', label: 'Bushfire overlay ⚠' },
              { key: 'acid_sulfate_soils', label: 'Acid sulfate soils ⚠' },
            ].map(f => (
              <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#444', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={(form as any)[f.key] ?? false}
                  onChange={e => set(f.key, e.target.checked)}
                />
                {f.label}
              </label>
            ))}
          </div>

          <div style={{ ...gridStyle, marginTop: 14 }}>
            <div>
              <label style={labelStyle}>Zoning code</label>
              <input style={inputStyle} value={form.zoning_code ?? ''} onChange={e => set('zoning_code', e.target.value)} placeholder="e.g. R2" />
            </div>
            <div>
              <label style={labelStyle}>DA complexity</label>
              <select style={inputStyle} value={form.da_complexity ?? ''} onChange={e => set('da_complexity', e.target.value)}>
                <option value="">Unknown</option>
                {['exempt', 'complying', 'low', 'medium', 'high', 'prohibited'].map(d => (
                  <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="card" style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Notes (inspection findings, agent intel, observations)</label>
          <textarea
            style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
            value={form.notes ?? ''}
            onChange={e => set('notes', e.target.value)}
            placeholder="What did you see on site? What's the vendor's story? Any red flags or opportunities?"
          />
          <div style={{ ...grid3Style, marginTop: 12 }}>
            <div>
              <label style={labelStyle}>Agent name</label>
              <input style={inputStyle} value={form.agent_name ?? ''} onChange={e => set('agent_name', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Agent phone</label>
              <input style={inputStyle} value={form.agent_phone ?? ''} onChange={e => set('agent_phone', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Inspection date</label>
              <input type="date" style={inputStyle} value={form.inspection_date ?? ''} onChange={e => set('inspection_date', e.target.value)} />
            </div>
          </div>
        </div>

        {/* AI Analysis */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>AI deal analysis</div>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 14 }}>
            Runs all your numbers through Claude — flip vs hold recommendation, max push strategy, risks and opportunities
          </div>
          <button className="btn-primary" onClick={runAI} disabled={aiLoading || !form.purchase_price}>
            {aiLoading ? 'Analysing...' : 'Run AI analysis →'}
          </button>

          {aiResult && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
                {[
                  { label: 'Recommended strategy', value: aiResult.strategy?.toUpperCase().replace('_', ' ') },
                  { label: 'Confidence', value: `${aiResult.confidence}%` },
                  { label: 'Recommended offer', value: aiResult.recommended_offer ? fmtCurrency(aiResult.recommended_offer) : '—' },
                  { label: 'Walk away at', value: aiResult.walk_away_price ? fmtCurrency(aiResult.walk_away_price) : '—' },
                  { label: 'Target sale', value: aiResult.target_sale_price ? fmtCurrency(aiResult.target_sale_price) : '—' },
                ].map(m => (
                  <div key={m.label} className="metric-card">
                    <div className="metric-label">{m.label}</div>
                    <div className="metric-value" style={{ fontSize: 18 }}>{m.value}</div>
                  </div>
                ))}
              </div>

              <div className="flag-box flag-info" style={{ marginBottom: 10 }}>
                <strong>Verdict:</strong> {aiResult.verdict}
              </div>
              <div style={{ fontSize: 13, color: '#555', marginBottom: 12, lineHeight: 1.6 }}>
                {aiResult.reasoning}
              </div>

              {aiResult.max_push && (
                <div className="flag-box flag-success" style={{ marginBottom: 10 }}>
                  <strong>Max push:</strong> {aiResult.max_push}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: '#991b1b' }}>Risks</div>
                  {aiResult.risks?.map((r: string, i: number) => (
                    <div key={i} className="flag-box flag-danger" style={{ fontSize: 12 }}>{r}</div>
                  ))}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: '#166534' }}>Opportunities</div>
                  {aiResult.opportunities?.map((o: string, i: number) => (
                    <div key={i} className="flag-box flag-success" style={{ fontSize: 12 }}>{o}</div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Save */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn-gold" onClick={handleSave} disabled={saving} style={{ fontSize: 15, padding: '12px 32px' }}>
            {saving ? 'Saving...' : 'Save property →'}
          </button>
          <button className="btn-outline" onClick={() => router.back()}>Cancel</button>
        </div>
      </main>
    </div>
  )
}
