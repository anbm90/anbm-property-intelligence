'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calcStampDuty, calcFlip, calcHold, fmtCurrency, fmtPct } from '@/lib/calculations/finance'
import type { Property } from '@/types'
import Sidebar from '@/components/ui/Sidebar'

export default function FlipVsHoldPage() {
  const supabase = createClient()
  const [properties, setProperties] = useState<Property[]>([])
  const [selected, setSelected] = useState<string>('')
  const [buildCost, setBuildCost] = useState(0)
  const [saleEstimate, setSaleEstimate] = useState(0)
  const [weeklyRent, setWeeklyRent] = useState(0)
  const [buildWeeks, setBuildWeeks] = useState(12)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('properties').select('*').neq('status', 'archived').order('composite_score', { ascending: false })
      setProperties(data ?? [])
      if (data?.[0]) {
        setSelected(data[0].id)
        setSaleEstimate(data[0].estimated_value ? Math.round(data[0].estimated_value * 1.15) : 0)
        setWeeklyRent(data[0].rental_estimate_weekly ?? 0)
      }
      setLoading(false)
    }
    load()
  }, [])

  const property = properties.find(p => p.id === selected)
  const stamp = property ? calcStampDuty(property.purchase_price ?? 0).total : 0
  const totalIn = property ? (property.purchase_price ?? 0) + stamp + 3300 + buildCost : 0
  const depositPct = property?.deposit_pct ?? 20
  const interestRate = property?.interest_rate_pct ?? 6.49
  const growthRate = property?.suburb_annual_growth_pct ?? 6

  const flip = property && saleEstimate ? calcFlip(totalIn, saleEstimate, buildWeeks, depositPct) : null
  const hold = property && weeklyRent ? calcHold(
    property.purchase_price ?? 0, buildCost, weeklyRent,
    (property.purchase_price ?? 0) * (1 - depositPct / 100),
    interestRate, growthRate
  ) : null

  const inputStyle = { width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 7, fontSize: 13 }
  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 4 }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Flip vs Hold</h1>
          <p style={{ fontSize: 14, color: '#888', marginTop: 4 }}>Side-by-side financial comparison for any property</p>
        </div>

        {/* Property selector + inputs */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Select property</label>
              <select style={inputStyle} value={selected} onChange={e => {
                setSelected(e.target.value)
                const p = properties.find(x => x.id === e.target.value)
                if (p) {
                  setSaleEstimate(p.estimated_value ? Math.round(p.estimated_value * 1.15) : 0)
                  setWeeklyRent(p.rental_estimate_weekly ?? 0)
                }
              }}>
                {properties.map(p => <option key={p.id} value={p.id}>{p.nickname} — {p.suburb}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Build cost ($)</label>
              <input type="number" style={inputStyle} value={buildCost || ''} onChange={e => setBuildCost(Number(e.target.value))} />
            </div>
            <div>
              <label style={labelStyle}>Sale estimate ($)</label>
              <input type="number" style={inputStyle} value={saleEstimate || ''} onChange={e => setSaleEstimate(Number(e.target.value))} />
            </div>
            <div>
              <label style={labelStyle}>Weekly rent ($)</label>
              <input type="number" style={inputStyle} value={weeklyRent || ''} onChange={e => setWeeklyRent(Number(e.target.value))} />
            </div>
            <div>
              <label style={labelStyle}>Build weeks</label>
              <input type="number" style={inputStyle} value={buildWeeks} onChange={e => setBuildWeeks(Number(e.target.value))} />
            </div>
          </div>
        </div>

        {property && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* FLIP */}
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12, padding: '10px 16px', background: '#1a1a2e', color: 'white', borderRadius: 10 }}>
                🔄 Flip strategy
              </div>
              {flip ? (
                <div className="card">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                    {[
                      { label: 'Gross profit', value: fmtCurrency(flip.grossProfit), color: flip.grossProfit > 0 ? '#166534' : '#991b1b' },
                      { label: 'Net after tax', value: fmtCurrency(flip.netProfitAfterTax), color: flip.netProfitAfterTax > 0 ? '#166534' : '#991b1b' },
                      { label: 'ROI', value: fmtPct(flip.roi) },
                      { label: 'Annualised ROI', value: fmtPct(flip.annualisedROI) },
                      { label: 'Cash on cash', value: fmtPct(flip.cashOnCash) },
                      { label: 'Timeline', value: `${flip.months} months` },
                    ].map(m => (
                      <div key={m.label} className="metric-card">
                        <div className="metric-label">{m.label}</div>
                        <div className="metric-value" style={{ fontSize: 18, color: (m as any).color ?? '#1a1a1a' }}>{m.value}</div>
                      </div>
                    ))}
                  </div>
                  <div className={`flag-box flag-${flip.verdict === 'strong' ? 'success' : flip.verdict === 'ok' ? 'info' : 'warning'}`}>
                    {flip.verdict === 'strong' ? '🔥 Strong flip' : flip.verdict === 'ok' ? '✓ Workable' : '⚠ Marginal'}
                  </div>
                  {[
                    { label: 'Total in', value: fmtCurrency(flip.totalIn) },
                    { label: 'Sale price', value: fmtCurrency(flip.salePrice) },
                    { label: 'Agent + marketing', value: `- ${fmtCurrency(flip.agentCommission + flip.marketingCost)}` },
                    { label: 'CGT', value: `- ${fmtCurrency(flip.cgtEstimate)}` },
                  ].map((r, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f5f5f5', fontSize: 13 }}>
                      <span style={{ color: '#666' }}>{r.label}</span>
                      <span style={{ fontWeight: 500 }}>{r.value}</span>
                    </div>
                  ))}
                </div>
              ) : <div className="card" style={{ color: '#888', fontSize: 13 }}>Enter sale estimate to calculate</div>}
            </div>

            {/* HOLD */}
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12, padding: '10px 16px', background: '#166534', color: 'white', borderRadius: 10 }}>
                🏠 Hold strategy
              </div>
              {hold ? (
                <div className="card">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                    {[
                      { label: 'Gross yield', value: fmtPct(hold.grossYield) },
                      { label: 'Net yield', value: fmtPct(hold.netYield) },
                      { label: 'Net cashflow', value: `${fmtCurrency(hold.netAnnualCashflow)}/yr`, color: hold.netAnnualCashflow >= 0 ? '#166534' : '#991b1b' },
                      { label: 'Tax benefit', value: hold.negativelygearing ? `${fmtCurrency(hold.negativeGearingBenefit)}/yr` : 'N/A' },
                      { label: 'Equity yr 5', value: fmtCurrency(hold.equityYear5) },
                      { label: 'Equity yr 10', value: fmtCurrency(hold.equityYear10) },
                    ].map(m => (
                      <div key={m.label} className="metric-card">
                        <div className="metric-label">{m.label}</div>
                        <div className="metric-value" style={{ fontSize: 18, color: (m as any).color ?? '#1a1a1a' }}>{m.value}</div>
                      </div>
                    ))}
                  </div>
                  <div className={`flag-box flag-${hold.netAnnualCashflow >= 0 ? 'success' : hold.negativelygearing ? 'info' : 'warning'}`}>
                    {hold.netAnnualCashflow >= 0 ? '✓ Positively geared' : `Neg. geared — $${Math.round(Math.abs(hold.netAnnualCashflow) / 52)}/wk shortfall`}
                  </div>
                </div>
              ) : <div className="card" style={{ color: '#888', fontSize: 13 }}>Enter weekly rent to calculate</div>}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
