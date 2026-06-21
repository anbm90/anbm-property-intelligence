'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import Sidebar from '@/components/ui/Sidebar'

export default function ReportPage() {
  const [images, setImages] = useState<File[]>([])
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<any>(null)
  const [previews, setPreviews] = useState<string[]>([])

  const handleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    setImages(files)
    setPreviews(files.map(f => URL.createObjectURL(f)))
  }

  const generateReport = async () => {
    if (images.length === 0 && !address) { alert('Upload images or enter an address'); return }
    setLoading(true)
    setReport(null)
    try {
      const fd = new FormData()
      images.forEach(img => fd.append('images', img))
      fd.append('address', address)
      const res = await fetch('/api/full-report', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.success) setReport(data.report)
      else alert('Report failed: ' + data.error)
    } catch { alert('Failed') }
    setLoading(false)
  }

  const sc = (s: number) => s >= 7 ? '#166534' : s >= 5 ? '#92400e' : '#991b1b'
  const sb = (s: number) => s >= 7 ? '#dcfce7' : s >= 5 ? '#fef9c3' : '#fee2e2'

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content" style={{ maxWidth: 900 }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Property Report</h1>
          <p style={{ fontSize: 14, color: '#888' }}>Upload listing images — AI generates a full assessment</p>
        </div>

        <div className="card">
          <div style={{ marginBottom: 12 }}>
            <label className="form-label">Address (optional)</label>
            <input className="form-input" value={address} onChange={e => setAddress(e.target.value)} placeholder="e.g. 12 Smith Street, Bexley NSW 2207" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label className="form-label">Listing images — add multiple</label>
            <input type="file" accept="image/*" multiple onChange={handleImages} style={{ display: 'none' }} id="img-input" />
            <label htmlFor="img-input" style={{ display: 'inline-block', background: '#d4a843', color: '#1a1a1a', padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              📸 Upload images
            </label>
            {previews.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                {previews.map((p, i) => <img key={i} src={p} style={{ width: 90, height: 70, objectFit: 'cover', borderRadius: 6, border: '1px solid #e8e8e8' }} />)}
                <div style={{ fontSize: 12, color: '#888', alignSelf: 'center' }}>{images.length} image{images.length > 1 ? 's' : ''}</div>
              </div>
            )}
          </div>
          <button className="btn-primary" onClick={generateReport} disabled={loading} style={{ fontSize: 15, padding: '12px 32px' }}>
            {loading ? '⏳ Generating...' : '🤖 Generate full report →'}
          </button>
        </div>

        {loading && (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Analysing property...</div>
            <div style={{ fontSize: 13, color: '#888' }}>Reading images, running financials, comparing strategies</div>
          </div>
        )}

        {report && (
          <div>
            <div style={{
              background: report.overall_verdict === 'BUY' ? 'linear-gradient(135deg, #14532d, #166534)' : report.overall_verdict === 'PASS' ? 'linear-gradient(135deg, #7f1d1d, #991b1b)' : 'linear-gradient(135deg, #1a1a2e, #16213e)',
              color: 'white', borderRadius: 12, padding: '1.5rem', marginBottom: 12
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>AI VERDICT</div>
                  <div style={{ fontSize: 30, fontWeight: 900 }}>{report.overall_verdict}</div>
                  <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>{report.verdict_summary}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>DEAL SCORE</div>
                  <div style={{ fontSize: 48, fontWeight: 900, color: '#d4a843', lineHeight: 1 }}>{report.deal_score}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>out of 100</div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>{report.detailed_reasoning}</div>
            </div>

            {report.property && (
              <div className="card">
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Property details</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                  {[
                    { label: 'Address', value: report.property.address },
                    { label: 'Type', value: report.property.type },
                    { label: 'Bedrooms', value: report.property.bedrooms },
                    { label: 'Bathrooms', value: report.property.bathrooms },
                    { label: 'Land size', value: report.property.land_sqm ? `${report.property.land_sqm}m²` : '—' },
                    { label: 'Asking price', value: report.property.asking_price ? `$${Number(report.property.asking_price).toLocaleString()}` : '—' },
                    { label: 'Zoning', value: report.property.zoning },
                    { label: 'Build year', value: report.property.build_year },
                  ].map(m => (
                    <div key={m.label} className="metric-card">
                      <div className="metric-label">{m.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{m.value ?? '—'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {report.scores && (
              <div className="card">
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Assessment scores</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {Object.entries(report.scores).map(([key, val]: [string, any]) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ fontSize: 12, color: '#666', width: 140, textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</div>
                      <div style={{ flex: 1, height: 8, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: 8, width: `${val * 10}%`, background: sc(val), borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 6px', borderRadius: 20, background: sb(val), color: sc(val), minWidth: 30, textAlign: 'center' }}>{val}/10</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12, marginBottom: 12 }}>
              {report.flip && (
                <div className="card" style={{ borderTop: '4px solid #d4a843', marginBottom: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>🔄 Flip</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: report.flip.profit > 0 ? '#166534' : '#991b1b', marginBottom: 4 }}>
                    {report.flip.profit > 0 ? '+' : ''}${Number(report.flip.profit).toLocaleString()}
                  </div>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>estimated profit</div>
                  {[['Buy price', `$${Number(report.flip.buy_price).toLocaleString()}`], ['Reno cost', `$${Number(report.flip.reno_cost).toLocaleString()}`], ['Sale price', `$${Number(report.flip.sale_price).toLocaleString()}`], ['ROI', `${report.flip.roi}%`], ['Timeline', report.flip.timeline]].map(([l, v]) => (
                    <div key={l as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, borderBottom: '1px solid #f5f5f5' }}>
                      <span style={{ color: '#888' }}>{l}</span><span style={{ fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                  {report.flip.notes && <div style={{ marginTop: 8, fontSize: 12, color: '#555', lineHeight: 1.5 }}>{report.flip.notes}</div>}
                </div>
              )}
              {report.hold && (
                <div className="card" style={{ borderTop: '4px solid #166534', marginBottom: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>🏠 Hold & rent</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#166534', marginBottom: 4 }}>{report.hold.gross_yield}% yield</div>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>gross rental yield</div>
                  {[['Weekly rent', `$${report.hold.weekly_rent}/wk`], ['Annual income', `$${Number(report.hold.annual_income).toLocaleString()}`], ['Net cashflow', `$${Number(report.hold.net_cashflow).toLocaleString()}/yr`], ['Equity yr 5', `$${Number(report.hold.equity_5yr).toLocaleString()}`], ['Equity yr 10', `$${Number(report.hold.equity_10yr).toLocaleString()}`]].map(([l, v]) => (
                    <div key={l as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, borderBottom: '1px solid #f5f5f5' }}>
                      <span style={{ color: '#888' }}>{l}</span><span style={{ fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                  {report.hold.notes && <div style={{ marginTop: 8, fontSize: 12, color: '#555', lineHeight: 1.5 }}>{report.hold.notes}</div>}
                </div>
              )}
              {report.develop && (
                <div className="card" style={{ borderTop: '4px solid #3b82f6', marginBottom: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>🏗️ Develop</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#1e40af', marginBottom: 4 }}>{report.develop.recommended}</div>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>best development play</div>
                  {[['DA type', report.develop.da_type], ['Est. cost', `$${Number(report.develop.cost).toLocaleString()}`], ['End value', `$${Number(report.develop.end_value).toLocaleString()}`], ['Profit', `$${Number(report.develop.profit).toLocaleString()}`], ['Timeline', report.develop.timeline]].map(([l, v]) => (
                    <div key={l as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, borderBottom: '1px solid #f5f5f5' }}>
                      <span style={{ color: '#888' }}>{l}</span><span style={{ fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                  {report.develop.notes && <div style={{ marginTop: 8, fontSize: 12, color: '#555', lineHeight: 1.5 }}>{report.develop.notes}</div>}
                </div>
              )}
            </div>

            {report.your_edge && (
              <div className="highlight-box">
                <div style={{ fontWeight: 700, fontSize: 15, color: 'white', marginBottom: 12 }}>⚡ Your builder advantage</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 12 }}>
                  {[
                    { label: 'Trade savings', value: `$${Number(report.your_edge.trade_savings).toLocaleString()}` },
                    { label: 'China savings', value: `$${Number(report.your_edge.china_savings).toLocaleString()}` },
                    { label: 'Total edge', value: `$${Number(report.your_edge.total_edge).toLocaleString()}` },
                    { label: 'Max offer (30% ROI)', value: `$${Number(report.your_edge.max_offer).toLocaleString()}` },
                  ].map(m => (
                    <div key={m.label}>
                      <div className="metric-label">{m.label}</div>
                      <div className="metric-value" style={{ fontSize: 18 }}>{m.value}</div>
                    </div>
                  ))}
                </div>
                {report.your_edge.max_push && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, padding: '10px 14px', background: 'rgba(255,255,255,0.08)', borderRadius: 8 }}><strong style={{ color: '#d4a843' }}>Max push:</strong> {report.your_edge.max_push}</div>}
              </div>
            )}

            {report.growth && (
              <div className="card">
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>📈 Growth & market</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  {[['Annual growth', report.growth.annual_growth], ['5yr forecast', report.growth.forecast_5yr], ['Vacancy rate', report.growth.vacancy_rate], ['Days on market', report.growth.days_on_market], ['Median price', report.growth.median_price], ['Rental demand', report.growth.rental_demand]].map(([l, v]) => (
                    <div key={l as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f5f5f5' }}>
                      <span style={{ fontSize: 13, color: '#666' }}>{l}</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{v ?? '—'}</span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 13, color: '#444', lineHeight: 1.7 }}>{report.growth.commentary}</div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div className="card" style={{ marginBottom: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: '#991b1b' }}>⚠ Risks</div>
                {report.risks?.map((r: string, i: number) => <div key={i} className="flag-box flag-danger" style={{ fontSize: 13 }}>{r}</div>)}
              </div>
              <div className="card" style={{ marginBottom: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: '#166534' }}>✓ Opportunities</div>
                {report.opportunities?.map((o: string, i: number) => <div key={i} className="flag-box flag-success" style={{ fontSize: 13 }}>{o}</div>)}
              </div>
            </div>

            {report.build_scope && (
              <div className="card">
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>🔨 Estimated build scope</div>
                <table className="data-table">
                  <thead><tr><th>Item</th><th>Your cost</th><th>Market cost</th><th>Saving</th></tr></thead>
                  <tbody>
                    {report.build_scope.map((item: any, i: number) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 500 }}>{item.item}</td>
                        <td style={{ color: '#166534', fontWeight: 600 }}>${Number(item.your_cost).toLocaleString()}</td>
                        <td style={{ color: '#888' }}>${Number(item.market_cost).toLocaleString()}</td>
                        <td style={{ color: '#166534' }}>${Number(item.saving).toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr style={{ background: '#fafafa', fontWeight: 700 }}>
                      <td>TOTAL</td>
                      <td style={{ color: '#166534' }}>${Number(report.build_scope.reduce((s: number, i: any) => s + i.your_cost, 0)).toLocaleString()}</td>
                      <td>${Number(report.build_scope.reduce((s: number, i: any) => s + i.market_cost, 0)).toLocaleString()}</td>
                      <td style={{ color: '#166534' }}>${Number(report.build_scope.reduce((s: number, i: any) => s + i.saving, 0)).toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Like what you see?</div>
              <div style={{ fontSize: 13, color: '#888', marginBottom: 14 }}>Save to your deal pipeline to track it</div>
              <button className="btn-gold" onClick={() => {
                if (report.property) {
                  const params = new URLSearchParams({ nickname: report.property.address?.split(',')[0] ?? '', address: report.property.address ?? '', asking_price: report.property.asking_price ?? '' })
                  window.location.href = `/properties/new?${params}`
                }
              }}>Save to pipeline →</button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
