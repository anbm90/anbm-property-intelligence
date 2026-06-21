'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/ui/Sidebar'
import Link from 'next/link'

export default function DealPipelinePage() {
  const supabase = createClient()
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('score')
  const [filterGrade, setFilterGrade] = useState('all')

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('properties').select('*').neq('status', 'archived')
      setProperties(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const fmtMoney = (n: number) => {
    if (!n) return '—'
    if (n >= 1000000) return '$' + (n/1000000).toFixed(2) + 'M'
    return '$' + Math.round(n/1000) + 'k'
  }

  const gradeColor = (g?: string) => {
    if (g === 'A') return { bg: '#dcfce7', color: '#166534' }
    if (g === 'B') return { bg: '#fef9c3', color: '#713f12' }
    if (g === 'C') return { bg: '#fee2e2', color: '#991b1b' }
    return { bg: '#f1f5f9', color: '#475569' }
  }

  const statusColor: Record<string, string> = {
    watching: '#94a3b8', analysing: '#3b82f6', offer: '#f59e0b',
    under_contract: '#8b5cf6', building: '#d4a843', complete: '#22c55e'
  }

  let filtered = [...properties]
  if (filterGrade !== 'all') filtered = filtered.filter(p => p.deal_grade === filterGrade)
  if (sortBy === 'score') filtered.sort((a, b) => (b.composite_score ?? 0) - (a.composite_score ?? 0))
  else if (sortBy === 'price') filtered.sort((a, b) => (a.purchase_price ?? 0) - (b.purchase_price ?? 0))

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700 }}>Deal pipeline</h1>
            <p style={{ fontSize: 14, color: '#888', marginTop: 4 }}>{properties.length} properties tracked</p>
          </div>
          <Link href="/properties/new"><button className="btn-gold">+ Add property</button></Link>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <select className="form-input" style={{ width: 160 }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="score">Sort: Score</option>
            <option value="price">Sort: Price</option>
          </select>
          <select className="form-input" style={{ width: 160 }} value={filterGrade} onChange={e => setFilterGrade(e.target.value)}>
            <option value="all">All grades</option>
            <option value="A">Grade A</option>
            <option value="B">Grade B</option>
            <option value="C">Grade C</option>
          </select>
          {['watching','analysing','offer','under_contract','building'].map(s => {
            const count = properties.filter(p => p.status === s).length
            if (!count) return null
            return <span key={s} style={{ fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 20, background: statusColor[s] + '22', color: statusColor[s] }}>{s.replace('_',' ')}: {count}</span>
          })}
        </div>

        {loading ? <div style={{ color: '#888' }}>Loading...</div> : filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>
            No properties — <Link href="/properties/new" style={{ color: '#d4a843', fontWeight: 600 }}>add your first deal</Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {filtered.map((p, i) => {
              const gc = gradeColor(p.deal_grade)
              const sc = statusColor[p.status] ?? '#888'
              return (
                <Link key={p.id} href={`/properties/${p.id}`} style={{ textDecoration: 'none' }}>
                  <div className="card" style={{ cursor: 'pointer', borderLeft: `4px solid ${sc}`, marginBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>#{i+1} {p.nickname}</div>
                        <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{p.suburb} · {p.property_type}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 22, fontWeight: 800 }}>{p.composite_score ?? '—'}</div>
                        {p.deal_grade && <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: gc.bg, color: gc.color }}>{p.deal_grade}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                      {p.purchase_price && <span style={{ fontSize: 12, color: '#555' }}>Buy: <strong>{fmtMoney(p.purchase_price)}</strong></span>}
                      {p.land_size_sqm && <span style={{ fontSize: 12, color: '#555' }}>{p.land_size_sqm}m²</span>}
                      {p.bedrooms && <span style={{ fontSize: 12, color: '#555' }}>{p.bedrooms}bd {p.bathrooms}ba</span>}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: sc + '22', color: sc }}>{p.status.replace('_',' ')}</span>
                      {p.dual_occ_eligible && <span style={{ fontSize: 11, color: '#166534' }}>✓ Dual occ</span>}
                      {p.flood_overlay && <span style={{ fontSize: 11, color: '#991b1b' }}>⚠ Flood</span>}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}