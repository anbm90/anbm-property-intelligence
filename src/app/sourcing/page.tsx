'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/ui/Sidebar'

export default function SourcingPage() {
  const supabase = createClient()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [freight, setFreight] = useState<any>(null)
  const [form, setForm] = useState({
    product_name: '', url: '', unit_price_aud: '', au_trade_price_aud: '',
    weight_kg: '', volume_cbm: '', customs_duty_pct: '5',
    quality_tier: 'mid', lead_time_days: '60', notes: '', unit: 'item'
  })

  useEffect(() => {
    supabase.from('sourcing_products').select('*').eq('is_active', true).order('created_at', { ascending: false }).then(({ data }) => {
      setProducts(data ?? [])
      setLoading(false)
    })
  }, [])

  const calcFreight = () => {
    const productCost = Number(form.unit_price_aud)
    const auPrice = Number(form.au_trade_price_aud)
    const cbm = Number(form.volume_cbm) || 0.1
    const kg = Number(form.weight_kg) || 10
    const dutyPct = Number(form.customs_duty_pct) || 5
    const seaFreight = Math.round(cbm * 2500)
    const duty = Math.round(productCost * (dutyPct / 100))
    const localDelivery = Math.round(kg * 0.8 + 150)
    const landed = productCost + seaFreight + duty + localDelivery
    const saving = auPrice - landed
    const savingPct = auPrice > 0 ? Math.round((saving / auPrice) * 100) : 0
    setFreight({ seaFreight, duty, localDelivery, landed, saving, savingPct })
  }

  const saveProduct = async () => {
    if (!form.product_name) return
    const landed = freight?.landed ?? Number(form.unit_price_aud)
    const au = Number(form.au_trade_price_aud)
    await supabase.from('sourcing_products').insert({
      product_name: form.product_name,
      url: form.url,
      unit_price_aud: Number(form.unit_price_aud),
      au_trade_price_aud: au,
      landed_cost_aud: landed,
      freight_cost_aud: freight?.seaFreight ?? 0,
      customs_duty_aud: freight?.duty ?? 0,
      customs_duty_pct: Number(form.customs_duty_pct),
      saving_pct: freight?.savingPct ?? 0,
      weight_kg: Number(form.weight_kg) || null,
      volume_cbm: Number(form.volume_cbm) || null,
      quality_tier: form.quality_tier as any,
      lead_time_days: Number(form.lead_time_days),
      notes: form.notes,
      unit: form.unit,
      is_active: true,
    })
    const { data } = await supabase.from('sourcing_products').select('*').eq('is_active', true).order('created_at', { ascending: false })
    setProducts(data ?? [])
    setShowAdd(false)
    setFreight(null)
    setForm({ product_name: '', url: '', unit_price_aud: '', au_trade_price_aud: '', weight_kg: '', volume_cbm: '', customs_duty_pct: '5', quality_tier: 'mid', lead_time_days: '60', notes: '', unit: 'item' })
  }

  const fmtMoney = (n: number) => n >= 1000 ? '$' + Math.round(n/1000) + 'k' : '$' + Math.round(n)
  const inp: any = { className: 'form-input' }
  const lbl: any = { className: 'form-label' }
  const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }
  const grid3 = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }

  const tierColor = (t: string) => {
    if (t === 'premium' || t === 'luxury') return { bg: '#fef9c3', color: '#713f12' }
    if (t === 'mid') return { bg: '#eff6ff', color: '#1e40af' }
    return { bg: '#f1f5f9', color: '#475569' }
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700 }}>China sourcing hub</h1>
            <p style={{ fontSize: 14, color: '#888', marginTop: 4 }}>Save products, calculate landed cost vs AU trade price</p>
          </div>
          <button className="btn-gold" onClick={() => setShowAdd(true)}>+ Add product</button>
        </div>

        {showAdd && (
          <div className="card" style={{ border: '2px solid #d4a843' }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Add sourced product</div>
            <div style={{ marginBottom: 10 }}>
              <label {...lbl}>Product name *</label>
              <input {...inp} value={form.product_name} onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))} placeholder="e.g. 600x1200 Porcelain tiles (matt finish)" />
            </div>
            <div style={grid2}>
              <div><label {...lbl}>Alibaba/1688 URL</label><input {...inp} value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} /></div>
              <div>
                <label {...lbl}>Unit</label>
                <select {...inp} value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                  {['item','sqm','lm','set','box','pallet'].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div style={grid3}>
              <div><label {...lbl}>China price AUD *</label><input {...inp} type="number" value={form.unit_price_aud} onChange={e => setForm(f => ({ ...f, unit_price_aud: e.target.value }))} placeholder="e.g. 8.50" /></div>
              <div><label {...lbl}>AU trade price AUD *</label><input {...inp} type="number" value={form.au_trade_price_aud} onChange={e => setForm(f => ({ ...f, au_trade_price_aud: e.target.value }))} placeholder="e.g. 45.00" /></div>
              <div><label {...lbl}>Customs duty %</label><input {...inp} type="number" value={form.customs_duty_pct} onChange={e => setForm(f => ({ ...f, customs_duty_pct: e.target.value }))} /></div>
            </div>
            <div style={grid3}>
              <div><label {...lbl}>Weight per unit (kg)</label><input {...inp} type="number" value={form.weight_kg} onChange={e => setForm(f => ({ ...f, weight_kg: e.target.value }))} /></div>
              <div><label {...lbl}>Volume per unit (CBM)</label><input {...inp} type="number" step="0.001" value={form.volume_cbm} onChange={e => setForm(f => ({ ...f, volume_cbm: e.target.value }))} placeholder="e.g. 0.003" /></div>
              <div><label {...lbl}>Lead time (days)</label><input {...inp} type="number" value={form.lead_time_days} onChange={e => setForm(f => ({ ...f, lead_time_days: e.target.value }))} /></div>
            </div>
            <div style={grid2}>
              <div>
                <label {...lbl}>Quality tier</label>
                <select {...inp} value={form.quality_tier} onChange={e => setForm(f => ({ ...f, quality_tier: e.target.value }))}>
                  {['budget','mid','premium','luxury'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div><label {...lbl}>Notes</label><input {...inp} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            </div>

            <button className="btn-outline" onClick={calcFreight} style={{ marginBottom: 12 }}>Calculate freight →</button>

            {freight && (
              <div className="highlight-box" style={{ marginBottom: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
                  {[
                    { label: 'Sea freight', value: fmtMoney(freight.seaFreight) },
                    { label: 'Customs duty', value: fmtMoney(freight.duty) },
                    { label: 'Local delivery', value: fmtMoney(freight.localDelivery) },
                    { label: 'Landed cost', value: fmtMoney(freight.landed) },
                    { label: 'AU trade price', value: fmtMoney(Number(form.au_trade_price_aud)) },
                    { label: 'You save', value: `${fmtMoney(freight.saving)} (${freight.savingPct}%)`, color: freight.saving > 0 ? '#86efac' : '#fca5a5' },
                  ].map(m => (
                    <div key={m.label}>
                      <div className="metric-label">{m.label}</div>
                      <div className="metric-value" style={{ fontSize: 16, color: (m as any).color ?? '#d4a843' }}>{m.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-primary" onClick={saveProduct}>Save product</button>
              <button className="btn-outline" onClick={() => { setShowAdd(false); setFreight(null) }}>Cancel</button>
            </div>
          </div>
        )}

        {loading ? <div style={{ color: '#888' }}>Loading...</div> : products.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>No products saved yet</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 16 }}>
              <div className="metric-card"><div className="metric-label">Products saved</div><div className="metric-value">{products.length}</div></div>
              <div className="metric-card"><div className="metric-label">Avg saving</div><div className="metric-value">{Math.round(products.reduce((s, p) => s + (p.saving_pct ?? 0), 0) / products.length)}%</div></div>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>China price</th>
                  <th>Landed cost</th>
                  <th>AU trade price</th>
                  <th>Saving</th>
                  <th>Quality</th>
                  <th>Lead time</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => {
                  const tc = tierColor(p.quality_tier)
                  return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.product_name}</div>
                        {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#d4a843' }}>View listing →</a>}
                        {p.notes && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{p.notes}</div>}
                      </td>
                      <td>${p.unit_price_aud}/{p.unit}</td>
                      <td>{fmtMoney(p.landed_cost_aud ?? 0)}</td>
                      <td>{fmtMoney(p.au_trade_price_aud ?? 0)}</td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#166534' }}>{p.saving_pct}%</div>
                        <div style={{ fontSize: 11, color: '#166534' }}>${Math.round((p.au_trade_price_aud ?? 0) - (p.landed_cost_aud ?? 0))} saved</div>
                      </td>
                      <td><span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: tc.bg, color: tc.color }}>{p.quality_tier}</span></td>
                      <td style={{ fontSize: 13, color: '#555' }}>{p.lead_time_days} days</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </>
        )}
      </main>
    </div>
  )
}