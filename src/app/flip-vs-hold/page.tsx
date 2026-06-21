'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/ui/Sidebar'

export default function FlipVsHoldPage() {
  const supabase = createClient()
  const [properties, setProperties] = useState<any[]>([])
  const [selected, setSelected] = useState('')
  const [buildCost, setBuildCost] = useState('')
  const [saleEstimate, setSaleEstimate] = useState('')
  const [weeklyRent, setWeeklyRent] = useState('')
  const [buildWeeks, setBuildWeeks] = useState('12')

  useEffect(() => {
    supabase.from('properties').select('*').neq('status', 'archived').order('composite_score', { ascending: false }).then(({ data }) => {
      setProperties(data ?? [])
      if (data?.[0]) {
        setSelected(data[0].id)
        if (data[0].rental_estimate_weekly) setWeeklyRent(String(data[0].rental_estimate_weekly))
      }
    })
  }, [])

  const property = properties.find(p => p.id === selected)

  const calcStampDuty = (price: number) => {
    if (!price) return 0
    let duty = 0
    if (price <= 16000) duty = price * 0.0125
    else if (price <= 35000) duty = 200 + (price - 16000) * 0.015
    else if (price <= 93000) duty = 485 + (price - 35000) * 0.0175
    else if (price <= 351000) duty = 1500 + (price - 93000) * 0.035
    else if (price <= 1168000) duty = 10530 + (price - 351000) * 0.045
    else if (price <= 3505000) duty = 47295 + (price - 1168000) * 0.055
    else duty = 175810 + (price - 3505000) * 0.07
    return Math.round(duty)
  }

  const price = property?.purchase_price ?? 0
  const stamp = calcStampDuty(price)
  const deposit = price * ((property?.deposit_pct ?? 20) / 100)
  const loanAmount = price - deposit
  const interestRate = property?.interest_rate_pct ?? 6.49
  const weeks = Number(buildWeeks)
  const build = Number(buildCost)
  const sale = Number(saleEstimate)
  const rent = Number(weeklyRent)
  const growthRate = property?.suburb_annual_growth_pct ?? 6

  // Total in
  const totalIn = price + stamp + 2500 + 800 + build
  // Holding costs
  const interestCost = Math.round(loanAmount * (interestRate / 100) / 52 * (weeks + 6))
  const totalInWithHolding = totalIn + interestCost

  // FLIP
  const agentFee = Math.round(sale * 0.02)
  const marketing = 8000
  const conveyancing = 1800
  const saleCosts = agentFee + marketing + conveyancing
  const grossProfit = sale - totalInWithHolding - saleCosts
  const cgt = Math.max(0, Math.round(grossProfit * 0.5 * 0.47))
  const netProfit = grossProfit - cgt
  const roi = totalInWithHolding > 0 ? Math.round((grossProfit / totalInWithHolding) * 1000) / 10 : 0
  const months = weeks / 4.33
  const annualisedRoi = months > 0 ? Math.round((roi / months) * 12 * 10) / 10 : 0

  // HOLD
  const annualRent = rent * 52
  const vacancyLoss = Math.round(annualRent * 0.04)
  const mgmt = Math.round((annualRent - vacancyLoss) * 0.07)
  const maintenance = 3000
  const insurance = 2000
  const council = 1800
  const annualInterest = Math.round(loanAmount * (interestRate / 100))
  const netCashflow = Math.round(annualRent - vacancyLoss - mgmt - maintenance - insurance - council - annualInterest)
  const grossYield = price > 0 ? Math.round((annualRent / price) * 1000) / 10 : 0
  const totalValue = price + build
  const equity5 = Math.round(totalValue * Math.pow(1 + growthRate / 100, 5) - loanAmount)
  const equity10 = Math.round(totalValue * Math.pow(1 + growthRate / 100, 10) - loanAmount)

  const fmtMoney = (n: number) => {
    if (!n && n !== 0) return '—'
    if (Math.abs(n) >= 1000000) return '$' + (n/1000000).toFixed(2) + 'M'
    if (Math.abs(n) >= 1000) return '$' + Math.round(n/1000) + 'k'
    return '$' + n
  }

  const inp = { className: 'form-input' }
  const lbl = { className: 'form-label' }

  const flipVerdict = roi >= 25 ? '🔥 Strong flip' : roi >= 15 ? '✓ Workable' : roi >= 8 ? '⚠ Marginal' : '✗ Doesn\'t stack up'
  const flipColor = roi >= 25 ? 'flag-success' : roi >= 15 ? 'flag-info' : roi >= 8 ? 'flag-warning' : 'flag-danger'
  const holdVerdict = netCashflow >= 0 ? '✓ Positively geared' : `Neg. geared — $${Math.round(Math.abs(netCashflow)/52)}/wk shortfall`
  const holdColor = netCashflow >= 0 ? 'flag-success' : 'flag-warning'

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Flip vs Hold</h1>
          <p style={{ fontSize: 14, color: '#888', marginTop: 4 }}>Side-by-side financial comparison</p>
        </div>

        {/* Inputs */}
        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label {...lbl}>Property</label>
              <select {...inp} value={selected} onChange={e => {
                setSelected(e.target.value)
                const p = properties.find(x => x.id === e.target.value)
                if (p?.rental_estimate_weekly) setWeeklyRent(String(p.rental_estimate_weekly))
              }}>
                {properties.map(p => <option key={p.id} value={p.id}>{p.nickname}</option>)}
              </select>
            </div>
            <div><label {...lbl}>Build cost ($)</label><input {...inp} type="number" value={buildCost} onChange={e => setBuildCost(e.target.value)} /></div>
            <div><label {...lbl}>Sale estimate ($)</label><input {...inp} type="number" value={saleEstimate} onChange={e => setSaleEstimate(e.target.value)} /></div>
            <div><label {...lbl}>Weekly rent ($)</label><input {...inp} type="number" value={weeklyRent} onChange={e => setWeeklyRent(e.target.value)} /></div>
            <div><label {...lbl}>Build weeks</label><input {...inp} type="number" value={buildWeeks} onChange={e => setBuildWeeks(e.target.value)} /></div>
          </div>
        </div>

        {property && (
          <>
            {/* Total in summary */}
            <div className="highlight-box" style={{ marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
                {[
                  { label: 'Purchase price', value: fmtMoney(price) },
                  { label: 'Stamp duty', value: fmtMoney(stamp) },
                  { label: 'Build cost', value: fmtMoney(build) },
                  { label: 'Interest cost', value: fmtMoney(interestCost) },
                  { label: 'TOTAL IN', value: fmtMoney(totalInWithHolding) },
                ].map(m => (
                  <div key={m.label}>
                    <div className="metric-label">{m.label}</div>
                    <div className="metric-value" style={{ fontSize: 18 }}>{m.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* FLIP */}
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12, padding: '10px 16px', background: '#1a1a2e', color: 'white', borderRadius: 10 }}>🔄 Flip</div>
                {sale ? (
                  <div className="card" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                      {[
                        { label: 'Gross profit', value: fmtMoney(grossProfit), color: grossProfit > 0 ? '#166534' : '#991b1b' },
                        { label: 'Net after CGT', value: fmtMoney(netProfit), color: netProfit > 0 ? '#166534' : '#991b1b' },
                        { label: 'ROI', value: `${roi}%` },
                        { label: 'Annualised ROI', value: `${annualisedRoi}%` },
                        { label: 'CGT estimate', value: fmtMoney(cgt) },
                        { label: 'Timeline', value: `${Math.round(months)} months` },
                      ].map(m => (
                        <div key={m.label} className="metric-card">
                          <div className="metric-label">{m.label}</div>
                          <div className="metric-value" style={{ fontSize: 17, color: (m as any).color ?? '#1a1a1a' }}>{m.value}</div>
                        </div>
                      ))}
                    </div>
                    <div className={`flag-box ${flipColor}`}>{flipVerdict}</div>
                    {[
                      ['Total in', fmtMoney(totalInWithHolding)],
                      ['Sale price', fmtMoney(sale)],
                      ['Agent + marketing', `- ${fmtMoney(saleCosts)}`],
                      ['Gross profit', fmtMoney(grossProfit)],
                      ['CGT (50% discount)', `- ${fmtMoney(cgt)}`],
                      ['Net profit', fmtMoney(netProfit)],
                    ].map(([label, val], i) => (
                      <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f5f5f5', fontSize: 13 }}>
                        <span style={{ color: '#666' }}>{label}</span>
                        <span style={{ fontWeight: i === 5 ? 700 : 500 }}>{val}</span>
                      </div>
                    ))}
                  </div>
                ) : <div className="card" style={{ color: '#888', fontSize: 13, marginBottom: 0 }}>Enter sale estimate above</div>}
              </div>

              {/* HOLD */}
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12, padding: '10px 16px', background: '#166534', color: 'white', borderRadius: 10 }}>🏠 Hold</div>
                {rent ? (
                  <div className="card" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                      {[
                        { label: 'Gross yield', value: `${grossYield}%` },
                        { label: 'Net cashflow', value: `${fmtMoney(netCashflow)}/yr`, color: netCashflow >= 0 ? '#166534' : '#991b1b' },
                        { label: 'Equity yr 5', value: fmtMoney(equity5) },
                        { label: 'Equity yr 10', value: fmtMoney(equity10) },
                      ].map(m => (
                        <div key={m.label} className="metric-card">
                          <div className="metric-label">{m.label}</div>
                          <div className="metric-value" style={{ fontSize: 17, color: (m as any).color ?? '#1a1a1a' }}>{m.value}</div>
                        </div>
                      ))}
                    </div>
                    <div className={`flag-box ${holdColor}`}>{holdVerdict}</div>
                    {[
                      ['Annual gross rent', fmtMoney(annualRent)],
                      ['Vacancy (4%)', `- ${fmtMoney(vacancyLoss)}`],
                      ['Property mgmt (7%)', `- ${fmtMoney(mgmt)}`],
                      ['Maintenance + insurance', `- ${fmtMoney(maintenance + insurance)}`],
                      ['Council rates', `- ${fmtMoney(council)}`],
                      ['Interest cost', `- ${fmtMoney(annualInterest)}`],
                      ['Net cashflow', fmtMoney(netCashflow)],
                    ].map(([label, val], i) => (
                      <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f5f5f5', fontSize: 13 }}>
                        <span style={{ color: '#666' }}>{label}</span>
                        <span style={{ fontWeight: i === 6 ? 700 : 500, color: i === 6 ? (netCashflow >= 0 ? '#166534' : '#991b1b') : '#1a1a1a' }}>{val}</span>
                      </div>
                    ))}
                  </div>
                ) : <div className="card" style={{ color: '#888', fontSize: 13, marginBottom: 0 }}>Enter weekly rent above</div>}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}