'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmtCurrency } from '@/lib/calculations/finance'
import type { Property } from '@/types'
import Sidebar from '@/components/ui/Sidebar'
import Link from 'next/link'

const STATUSES = ['watching', 'analysing', 'offer', 'under_contract', 'building', 'complete']
const STATUS_LABELS: Record<string, string> = {
  watching: 'Watching', analysing: 'Analysing', offer: 'Offer Made',
  under_contract: 'Under Contract', building: 'Building', complete: 'Complete'
}
const STATUS_COLORS: Record<string, string> = {
  watching: '#94a3b8', analysing: '#3b82f6', offer: '#f59e0b',
  under_contract: '#8b5cf6', building: '#d4a843', complete: '#22c55e'
}

export default function DealPipelinePage() {
  const supabase = createClient()
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'kanban' | 'list'>('list')
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

  const gradeColor = (g?: string) => {
    if (g === 'A') return { bg: '#dcfce7', color: '#166534' }
    if (g === 'B') return { bg: '#fef9c3', color: '#713f12' }
    if (g === 'C') return { bg: '#fee2e2', color: '#991b1b' }
    return { bg: '#f1f5f9', color: '#475569' }
  }

  let filtered = [...properties]
  if (filterGrade !== 'all') filtered = filtered.filter(p => p.deal_grade === filterGrade)
  if (sortBy === 'score') filtered.sort((a, b) => (b.composite_score ?? 0) - (a.composite_score ?? 0))
  else if (sortBy === 'price') filtered.sort((a, b) => (a.purchase_price ?? 0) - (b.purchase_price ?? 0))

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="section-header" style={{ marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700 }}>Deal pipeline</h1>
            <p style={{ fontSize: 14, color: '#888', marginTop: 4 }}>{properties.length} properties tracked</p>
          </div>
          <Link href="/properties/new"><button className="btn-gold">+ Add property</button></Link>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <select style={{ padding: '7px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13 }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="score">Sort: Score</option>
            <option value="price">Sort: Price</option>
          </select>
          <select style={{ padding: '7px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13 }} value={filterGrade} onChange={e => setFilterGrade(e.target.value)}>
            <option value="all">All grades</option>
            <option value="A">Grade A</option>
            <option value="B">Grade B</option>
            <option value="C">Grade C</option>
          </select>
          {/* Summary pills */}
          {STATUSES.map(s => {
            const count = properties.filter(p => p.status === s).length
            if (!count) return null
            return (
              <span key={s} style={{ fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 20, background: STATUS_COLORS[s] + '22', color: STATUS_COLORS[s] }}>
                {STATUS_LABELS[s]}: {count}
              </span>
            )
          })}
        </div>

        {loading ? (
          <div style={{ color: '#888', padding: '2rem' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>
            No properties yet — <Link href="/properties/new" style={{ color: '#d4a843', fontWeight: 600 }}>add your first deal</Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {filtered.map((p, i) => {
              const gc = gradeColor(p.deal_grade)
              const sc = STATUS_COLORS[p.status] ?? '#888'
              return (
                <Link key={p.id} href={`/properties/${p.id}`} style={{ textDecoration: 'none' }}>
                  <div className="card" style={{ cursor: 'pointer', transition: 'box-shadow 0.15s', borderLeft: `4px solid ${sc}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a1a' }}>#{i + 1} {p.nickname}</div>
                        <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{p.suburb} · {p.property_type}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#1a1a1a' }}>{p.composite_score ?? '—'}</div>
                        {p.deal_grade && (
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: gc.bg, color: gc.color }}>
                            {p.deal_grade}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                      {p.purchase_price && <span style={{ fontSize: 12, color: '#555' }}>Buy: <strong>{fmtCurrency(p.purchase_price)}</strong></span>}
                      {p.land_size_sqm && <span style={{ fontSize: 12, color: '#555' }}>{p.land_size_sqm}m²</span>}
                      {p.bedrooms && <span style={{ fontSize: 12, color: '#555' }}>{p.bedrooms}bd {p.bathrooms}ba</span>}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: sc + '22', color: sc }}>
                        {STATUS_LABELS[p.status]}
                      </span>
                      {p.recommended_strategy && (
                        <span style={{ fontSize: 11, color: '#888', textTransform: 'capitalize' }}>
                          {p.recommended_strategy.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                    {p.dual_occ_eligible && <div style={{ fontSize: 11, color: '#166534', marginTop: 6 }}>✓ Dual occ eligible</div>}
                    {p.subdivision_potential && <div style={{ fontSize: 11, color: '#166534' }}>✓ Subdivision potential</div>}
                    {p.flood_overlay && <div style={{ fontSize: 11, color: '#991b1b' }}>⚠ Flood overlay</div>}
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
