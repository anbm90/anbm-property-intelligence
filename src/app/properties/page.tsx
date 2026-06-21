'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/ui/Sidebar'
import Link from 'next/link'

export default function PropertiesPage() {
  const supabase = createClient()
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('properties').select('*').neq('status', 'archived').order('composite_score', { ascending: false }).then(({ data }) => {
      setProperties(data ?? [])
      setLoading(false)
    })
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

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700 }}>Properties</h1>
            <p style={{ fontSize: 14, color: '#888', marginTop: 4 }}>{properties.length} tracked</p>
          </div>
          <Link href="/properties/new"><button className="btn-gold">+ Add property</button></Link>
        </div>
        {loading ? <div style={{ color: '#888' }}>Loading...</div> : properties.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ color: '#888', marginBottom: 16 }}>No properties yet</div>
            <Link href="/properties/new"><button className="btn-primary">Add first property</button></Link>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th><th>Property</th><th>Grade</th><th>Score</th><th>Purchase</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {properties.map((p, i) => {
                const gc = gradeColor(p.deal_grade)
                return (
                  <tr key={p.id}>
                    <td style={{ fontSize: 18, fontWeight: 700, color: '#ddd' }}>{i+1}</td>
                    <td><div style={{ fontWeight: 600 }}>{p.nickname}</div><div style={{ fontSize: 12, color: '#888' }}>{p.suburb}</div></td>
                    <td>{p.deal_grade && <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: gc.bg, color: gc.color }}>{p.deal_grade}</span>}</td>
                    <td style={{ fontWeight: 700, fontSize: 16 }}>{p.composite_score ?? '—'}</td>
                    <td>{fmtMoney(p.purchase_price ?? p.asking_price)}</td>
                    <td style={{ fontSize: 12, color: '#888', textTransform: 'capitalize' }}>{p.status?.replace('_',' ')}</td>
                    <td><Link href={`/properties/${p.id}`}><button className="btn-outline" style={{ fontSize: 12, padding: '5px 12px' }}>View →</button></Link></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </main>
    </div>
  )
}
