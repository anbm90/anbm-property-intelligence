'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/ui/Sidebar'

export default function AlertsPage() {
  const supabase = createClient()
  const [criteria, setCriteria] = useState<any[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', suburbs: '', min_price: '', max_price: '', min_land_sqm: '', must_have_dual_occ: false, must_have_subdivision: false, min_score: '60' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('watchlist_criteria').select('*').eq('is_active', true).then(({ data }) => setCriteria(data ?? []))
  }, [])

  const saveCriteria = async () => {
    if (!form.name) return
    setSaving(true)
    await supabase.from('watchlist_criteria').insert({
      name: form.name,
      suburbs: form.suburbs ? form.suburbs.split(',').map((s: string) => s.trim()) : [],
      min_price: form.min_price ? Number(form.min_price) : null,
      max_price: form.max_price ? Number(form.max_price) : null,
      min_land_sqm: form.min_land_sqm ? Number(form.min_land_sqm) : null,
      must_have_dual_occ: form.must_have_dual_occ,
      must_have_subdivision: form.must_have_subdivision,
      min_score: Number(form.min_score),
      is_active: true,
    })
    const { data } = await supabase.from('watchlist_criteria').select('*').eq('is_active', true)
    setCriteria(data ?? [])
    setShowAdd(false)
    setSaving(false)
  }

  const inputStyle = { width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 7, fontSize: 13, background: 'white', color: '#1a1a1a' }
  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700 as const, color: '#888', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 4 }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="section-header" style={{ marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700 }}>Alerts & watchlist</h1>
            <p style={{ fontSize: 14, color: '#888', marginTop: 4 }}>Set your criteria — properties are scored against these automatically</p>
          </div>
          <button className="btn-gold" onClick={() => setShowAdd(true)}>+ Add criteria</button>
        </div>

        <div className="flag-box flag-info" style={{ marginBottom: 20 }}>
          <strong>How this works:</strong> Set your suburb, price range and must-haves. Every property you add is automatically checked and flagged on the dashboard if it matches.
        </div>

        {showAdd && (
          <div className="card" style={{ marginBottom: 16, border: '2px solid #d4a843' }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Add criteria</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div><label style={labelStyle}>Name *</label><input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Sans Souci R3 deals" /></div>
              <div><label style={labelStyle}>Suburbs (comma separated)</label><input style={inputStyle} value={form.suburbs} onChange={e => setForm(f => ({ ...f, suburbs: e.target.value }))} placeholder="Ramsgate, Sans Souci, Bexley" /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div><label style={labelStyle}>Min price ($)</label><input type="number" style={inputStyle} value={form.min_price} onChange={e => setForm(f => ({ ...f, min_price: e.target.value }))} /></div>
              <div><label style={labelStyle}>Max price ($)</label><input type="number" style={inputStyle} value={form.max_price} onChange={e => setForm(f => ({ ...f, max_price: e.target.value }))} /></div>
              <div><label style={labelStyle}>Min land (sqm)</label><input type="number" style={inputStyle} value={form.min_land_sqm} onChange={e => setForm(f => ({ ...f, min_land_sqm: e.target.value }))} /></div>
              <div><label style={labelStyle}>Min score</label><input type="number" style={inputStyle} value={form.min_score} onChange={e => setForm(f => ({ ...f, min_score: e.target.value }))} /></div>
            </div>
            <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}><input type="checkbox" checked={form.must_have_dual_occ} onChange={e => setForm(f => ({ ...f, must_have_dual_occ: e.target.checked }))} />Dual occ eligible</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}><input type="checkbox" checked={form.must_have_subdivision} onChange={e => setForm(f => ({ ...f, must_have_subdivision: e.target.checked }))} />Subdivision potential</label>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-primary" onClick={saveCriteria} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              <button className="btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        )}

        {criteria.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>No criteria set yet</div>
        ) : criteria.map(c => (
          <div key={c.id} className="card" style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{c.name}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {c.suburbs?.length > 0 && <span style={{ fontSize: 12, background: '#eff6ff', color: '#1e40af', padding: '2px 8px', borderRadius: 20 }}>📍 {c.suburbs.join(', ')}</span>}
                  {c.max_price && <span style={{ fontSize: 12, background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 20 }}>Up to ${(c.max_price/1000).toFixed(0)}k</span>}
                  {c.must_have_dual_occ && <span style={{ fontSize: 12, background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 20 }}>✓ Dual occ</span>}
                  {c.must_have_subdivision && <span style={{ fontSize: 12, background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 20 }}>✓ Subdivision</span>}
                  <span style={{ fontSize: 12, background: '#fef9c3', color: '#713f12', padding: '2px 8px', borderRadius: 20 }}>Score {c.min_score}+</span>
                </div>
              </div>
              <button onClick={() => { supabase.from('watchlist_criteria').update({ is_active: false }).eq('id', c.id); setCriteria(x => x.filter(i => i.id !== c.id)) }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
          </div>
        ))}
      </main>
    </div>
  )
}
