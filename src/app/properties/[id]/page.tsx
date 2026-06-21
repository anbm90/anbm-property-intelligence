'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/ui/Sidebar'

export default function PropertyDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [property, setProperty] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('properties').select('*').eq('id', id).single()
      setProperty(data)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <div className="app-shell"><Sidebar /><main className="main-content">Loading...</main></div>
  if (!property) return <div className="app-shell"><Sidebar /><main className="main-content">Not found</main></div>

  const fmtMoney = (n: number) => {
    if (!n) return '—'
    if (n >= 1000000) return '$' + (n/1000000).toFixed(2) + 'M'
    if (n >= 1000) return '$' + Math.round(n/1000) + 'k'
    return '$' + n
  }

  const stamp = property.stamp_duty ?? 0
  const totalIn = (property.purchase_price ?? 0) + stamp + (property.legal_conveyancing ?? 2500) + (property.building_inspection ?? 800)

  const gradeColor = (g: string) => {
    if (g === 'A') return { bg: '#dcfce7', color: '#166534' }
    if (g === 'B') return { bg: '#fef9c3', color: '#713f12' }
    if (g === 'C') return { bg: '#fee2e2', color: '#991b1b' }
    return { bg: '#f1f5f9', color: '#475569' }
  }
  const gc = gradeColor(property.deal_grade)

  const tabs = ['overview', 'financials', 'notes']

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content" style={{ maxWidth: 920 }}>
        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <button className="btn-outline" style={{ fontSize: 12, padding: '5px 12px', marginBottom: 12 }} onClick={() => router.push('/dashboard')}>← Back</button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>{property.nickname}</h1>
              <div style={{ fontSize: 14, color: '#888' }}>{property.address}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                {property.property_type && <span style={{ fontSize: 12, background: '#f1f5f9', color: '#475569', padding: '3px 10px', borderRadius: 20 }}>{property.property_type}</span>}
                {property.land_size_sqm && <span style={{ fontSize: 12, background: '#f1f5f9', color: '#475569', padding: '3px 10px', borderRadius: 20 }}>{property.land_size_sqm}m²</span>}
                {property.bedrooms && <span style={{ fontSize: 12, background: '#f1f5f9', color: '#475569', padding: '3px 10px', borderRadius: 20 }}>{property.bedrooms}bd {property.bathrooms}ba</span>}
                {property.zoning_code && <span style={{ fontSize: 12, background: '#e0f2fe', color: '#0369a1', padding: '3px 10px', borderRadius: 20 }}>{property.zoning_code}</span>}
                {property.dual_occ_eligible && <span style={{ fontSize: 12, background: '#dcfce7', color: '#166534', padding: '3px 10px', borderRadius: 20 }}>✓ Dual occ</span>}
                {property.subdivision_potential && <span style={{ fontSize: 12, background: '#dcfce7', color: '#166534', padding: '3px 10px', borderRadius: 20 }}>✓ Subdivision</span>}
                {property.flood_overlay && <span style={{ fontSize: 12, background: '#fee2e2', color: '#991b1b', padding: '3px 10px', borderRadius: 20 }}>⚠ Flood</span>}
                {property.heritage_listed && <span style={{ fontSize: 12, background: '#fee2e2', color: '#991b1b', padding: '3px 10px', borderRadius: 20 }}>⚠ Heritage</span>}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 32, fontWeight: 800 }}>{property.composite_score ?? '—'}</div>
              {property.deal_grade && <span style={{ fontSize: 14, fontWeight: 700, padding: '4px 14px', borderRadius: 20, background: gc.bg, color: gc.color }}>Grade {property.deal_grade}</span>}
            </div>
          </div>
        </div>

        {/* Key numbers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Asking price', value: fmtMoney(property.asking_price) },
            { label: 'Purchase price', value: fmtMoney(property.purchase_price) },
            { label: 'Stamp duty', value: fmtMoney(stamp) },
            { label: 'Total in', value: fmtMoney(totalIn) },
            { label: 'Weekly rent est.', value: property.rental_estimate_weekly ? `$${property.rental_estimate_weekly}/wk` : '—' },
            { label: 'Growth rate', value: property.suburb_annual_growth_pct ? `${property.suburb_annual_growth_pct}%` : '—' },
          ].map(m => (
            <div key={m.label} className="metric-card">
              <div className="metric-label">{m.label}</div>
              <div className="metric-value" style={{ fontSize: 18 }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#f5f5f0', padding: 4, borderRadius: 10, width: 'fit-content' }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              padding: '8px 20px', borderRadius: 8, fontSize: 14, border: 'none', cursor: 'pointer',
              fontWeight: activeTab === t ? 600 : 400,
              background: activeTab === t ? '#1a1a2e' : 'transparent',
              color: activeTab === t ? 'white' : '#666',
            }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
          ))}
        </div>

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div>
            <div className="card">
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Scores</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  ['Structure', property.score_structure],
                  ['Location', property.score_location],
                  ['DA risk', property.score_da_risk],
                  ['Site access', property.score_access],
                  ['Vendor motivation', property.score_vendor_motivation],
                  ['Gut feel', property.score_gut],
                  ['Growth potential', property.score_growth_potential],
                  ['Reno complexity', property.score_renovation_complexity],
                ].map(([label, val]) => (
                  <div key={label as string} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: 12, color: '#666', width: 130 }}>{label}</div>
                    <div style={{ flex: 1, height: 6, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: 6, width: `${(Number(val) / 10) * 100}%`, background: Number(val) >= 7 ? '#22c55e' : Number(val) >= 4 ? '#f59e0b' : '#ef4444', borderRadius: 3 }} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14, minWidth: 24, textAlign: 'right' }}>{val ?? '—'}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Planning</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {[
                  ['Zoning', property.zoning_code],
                  ['DA complexity', property.da_complexity],
                  ['Council', property.council],
                  ['Suburb growth', property.suburb_annual_growth_pct ? `${property.suburb_annual_growth_pct}%` : null],
                  ['Status', property.status],
                  ['Strategy', property.recommended_strategy],
                ].map(([label, val]) => (
                  <div key={label as string} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{(val as string) ?? '—'}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* FINANCIALS */}
        {activeTab === 'financials' && (
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Acquisition breakdown</div>
            {[
              ['Purchase price', fmtMoney(property.purchase_price)],
              ['Stamp duty (NSW 2026)', fmtMoney(stamp)],
              ['Legal & conveyancing', fmtMoney(property.legal_conveyancing ?? 2500)],
              ['Building inspection', fmtMoney(property.building_inspection ?? 800)],
              ['TOTAL ACQUISITION', fmtMoney(totalIn)],
            ].map(([label, val], i) => (
              <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f5f5f5' }}>
                <span style={{ fontSize: 13, fontWeight: i === 4 ? 700 : 400, color: i === 4 ? '#1a1a1a' : '#666' }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: i === 4 ? 700 : 500 }}>{val}</span>
              </div>
            ))}
            <div style={{ marginTop: 16, padding: '12px 14px', background: '#f9f9f9', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Finance</div>
              <div style={{ fontSize: 13 }}>Deposit: {property.deposit_pct}% · Interest rate: {property.interest_rate_pct}%</div>
              <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>Loan amount: {fmtMoney((property.purchase_price ?? 0) * (1 - (property.deposit_pct ?? 20) / 100))}</div>
            </div>
          </div>
        )}

        {/* NOTES */}
        {activeTab === 'notes' && (
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Notes</div>
            {property.notes ? (
              <div style={{ fontSize: 14, color: '#444', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{property.notes}</div>
            ) : (
              <div style={{ color: '#888', fontSize: 13 }}>No notes added</div>
            )}
            {property.agent_name && (
              <div style={{ marginTop: 16, padding: '12px 14px', background: '#f9f9f9', borderRadius: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Agent</div>
                <div style={{ fontSize: 13, color: '#555' }}>{property.agent_name}</div>
                {property.agent_phone && <div style={{ fontSize: 13, color: '#555' }}>{property.agent_phone}</div>}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}