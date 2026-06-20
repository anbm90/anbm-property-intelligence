'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calcCompositeScore, fmtCurrency } from '@/lib/calculations/finance'
import type { Property } from '@/types'
import Sidebar from '@/components/ui/Sidebar'
import Link from 'next/link'

export default function DashboardPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('properties')
        .select('*')
        .neq('status', 'archived')
        .order('composite_score', { ascending: false })
      setProperties(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const watching = properties.filter(p => p.status === 'watching').length
  const active = properties.filter(p => ['analysing', 'offer', 'under_contract', 'building'].includes(p.status)).length
  const gradeA = properties.filter(p => p.deal_grade === 'A').length
  const totalPipelineValue = properties.reduce((sum, p) => sum + (p.purchase_price ?? p.asking_price ?? 0), 0)

  const gradeColor = (g?: string) => {
    if (g === 'A') return { bg: '#dcfce7', color: '#166534' }
    if (g === 'B') return { bg: '#fef9c3', color: '#713f12' }
    if (g === 'C') return { bg: '#fee2e2', color: '#991b1b' }
    return { bg: '#f1f5f9', color: '#475569' }
  }

  const statusLabel = (s: string) => {
    const map: { [k: string]: string } = {
      watching: 'Watching', analysing: 'Analysing', offer: 'Offer Made',
      under_contract: 'Under Contract', building: 'Building', complete: 'Complete'
    }
    return map[s] ?? s
  }

  const statusColor = (s: string) => {
    if (s === 'building') return '#1a1a2e'
    if (s === 'under_contract') return '#166534'
    if (s === 'offer') return '#92400e'
    return '#888'
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1a1a1a', marginBottom: 4 }}>
            Deal Dashboard
          </h1>
          <p style={{ fontSize: 14, color: '#888' }}>
            {new Date().toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Summary metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: '2rem' }}>
          {[
            { label: 'Properties tracked', value: properties.length, sub: 'active pipeline' },
            { label: 'Watching', value: watching, sub: 'need analysis' },
            { label: 'Active deals', value: active, sub: 'offer/building' },
            { label: 'Grade A deals', value: gradeA, sub: 'top prospects' },
            { label: 'Pipeline value', value: fmtCurrency(totalPipelineValue), sub: 'combined purchase' },
          ].map(m => (
            <div key={m.label} className="metric-card">
              <div className="metric-label">{m.label}</div>
              <div className="metric-value">{m.value}</div>
              <div className="metric-sub">{m.sub}</div>
            </div>
          ))}
        </div>

        {/* Deal ranking table */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div className="section-header">
            <div>
              <div className="section-title">Deal rankings</div>
              <div className="section-sub">Best to worst by composite score</div>
            </div>
            <Link href="/properties/new">
              <button className="btn-gold">+ Add property</button>
            </Link>
          </div>

          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>Loading...</div>
          ) : properties.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>⌂</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>No properties yet</div>
              <div style={{ fontSize: 14, color: '#888', marginBottom: 20 }}>Add your first deal to start analysing</div>
              <Link href="/properties/new">
                <button className="btn-primary">Add first property</button>
              </Link>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Property</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Grade</th>
                  <th>Score</th>
                  <th>Purchase</th>
                  <th>Strategy</th>
                  <th style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {properties.map((p, i) => {
                  const gc = gradeColor(p.deal_grade)
                  return (
                    <tr key={p.id} style={{ cursor: 'pointer' }}>
                      <td style={{ fontSize: 18, fontWeight: 700, color: '#ddd' }}>{i + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#1a1a1a' }}>{p.nickname}</div>
                        <div style={{ fontSize: 12, color: '#888' }}>{p.suburb} {p.state}</div>
                      </td>
                      <td style={{ fontSize: 13, color: '#555', textTransform: 'capitalize' }}>
                        {p.property_type ?? '—'}
                      </td>
                      <td>
                        <span style={{ fontSize: 12, fontWeight: 600, color: statusColor(p.status) }}>
                          {statusLabel(p.status)}
                        </span>
                      </td>
                      <td>
                        {p.deal_grade ? (
                          <span className="status-badge" style={{ background: gc.bg, color: gc.color, fontSize: 13 }}>
                            {p.deal_grade}
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1a1a', minWidth: 32 }}>
                            {p.composite_score ?? '—'}
                          </div>
                          {p.composite_score && (
                            <div className="score-bar-track" style={{ width: 60 }}>
                              <div className="score-bar-fill" style={{
                                width: `${p.composite_score}%`,
                                background: p.composite_score >= 75 ? '#22c55e' : p.composite_score >= 55 ? '#f59e0b' : '#ef4444'
                              }} />
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ fontWeight: 500 }}>
                        {fmtCurrency(p.purchase_price ?? p.asking_price ?? 0)}
                      </td>
                      <td style={{ fontSize: 12, color: '#555', textTransform: 'capitalize' }}>
                        {p.recommended_strategy?.replace('_', ' ') ?? '—'}
                      </td>
                      <td>
                        <Link href={`/properties/${p.id}`}>
                          <button className="btn-outline" style={{ fontSize: 12, padding: '6px 12px' }}>View →</button>
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Quick flags */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Flags to action</div>
            {properties.filter(p => p.flood_overlay || p.heritage_listed || p.da_complexity === 'high').length === 0 ? (
              <div style={{ color: '#888', fontSize: 13 }}>No flags — all clear</div>
            ) : (
              properties.filter(p => p.flood_overlay || p.heritage_listed || p.da_complexity === 'high').map(p => (
                <div key={p.id} className="flag-box flag-warning">
                  <strong>{p.nickname}</strong> —
                  {p.flood_overlay ? ' flood overlay' : ''}
                  {p.heritage_listed ? ' heritage listed' : ''}
                  {p.da_complexity === 'high' ? ' high DA complexity' : ''}
                </div>
              ))
            )}
          </div>

          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Best opportunities</div>
            {properties.filter(p => (p.composite_score ?? 0) >= 70).length === 0 ? (
              <div style={{ color: '#888', fontSize: 13 }}>No Grade A deals yet</div>
            ) : (
              properties.filter(p => (p.composite_score ?? 0) >= 70).slice(0, 3).map(p => (
                <div key={p.id} className="flag-box flag-success">
                  <strong>{p.nickname}</strong> — Score {p.composite_score}/100 · {p.suburb}
                  {p.dual_occ_eligible ? ' · Dual occ eligible' : ''}
                  {p.subdivision_potential ? ' · Subdivision potential' : ''}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
