'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/ui/Sidebar'

export default function NewPropertyPage() {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [form, setForm] = useState({
    nickname: '', address: '', suburb: '', state: 'NSW', postcode: '',
    property_type: 'house', land_size_sqm: '', floor_area_sqm: '',
    bedrooms: '', bathrooms: '', car_spaces: '',
    asking_price: '', purchase_price: '',
    deposit_pct: '20', interest_rate_pct: '6.49',
    legal_conveyancing: '2500', building_inspection: '800',
    status: 'watching', notes: '',
    agent_name: '', agent_phone: '',
    score_structure: '5', score_location: '5', score_da_risk: '5',
    score_access: '5', score_vendor_motivation: '5', score_gut: '5',
    score_growth_potential: '5', score_renovation_complexity: '5',
    dual_occ_eligible: false, subdivision_potential: false,
    heritage_listed: false, flood_overlay: false,
    zoning_code: '', da_complexity: '',
    rental_estimate_weekly: '', suburb_annual_growth_pct: '',
  })

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setScanning(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await fetch('/api/scan-listing', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.success && data.data) {
        const d = data.data
        setForm(f => ({ ...f,
          address: d.address ?? f.address,
          suburb: d.suburb ?? f.suburb,
          state: d.state ?? f.state,
          postcode: d.postcode ?? f.postcode,
          asking_price: d.asking_price ? String(d.asking_price) : f.asking_price,
          purchase_price: d.asking_price ? String(d.asking_price) : f.purchase_price,
          property_type: d.property_type ?? f.property_type,
          bedrooms: d.bedrooms ? String(d.bedrooms) : f.bedrooms,
          bathrooms: d.bathrooms ? String(d.bathrooms) : f.bathrooms,
          car_spaces: d.car_spaces ? String(d.car_spaces) : f.car_spaces,
          land_size_sqm: d.land_size_sqm ? String(d.land_size_sqm) : f.land_size_sqm,
          floor_area_sqm: d.floor_area_sqm ? String(d.floor_area_sqm) : f.floor_area_sqm,
          agent_name: d.agent_name ?? f.agent_name,
          agent_phone: d.agent_phone ?? f.agent_phone,
          notes: d.notes ?? f.notes,
          nickname: d.address ? d.address.split(',')[0] : f.nickname,
        }))
      } else {
        alert('Could not read the image — fill in manually')
      }
    } catch {
      alert('Scan failed — fill in manually')
    }
    setScanning(false)
  }

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

  const calcScore = () => {
    const scores = [
      Number(form.score_structure) * 0.15,
      Number(form.score_location) * 0.20,
      Number(form.score_da_risk) * 0.15,
      Number(form.score_access) * 0.08,
      Number(form.score_vendor_motivation) * 0.10,
      Number(form.score_gut) * 0.12,
      Number(form.score_growth_potential) * 0.12,
      Number(form.score_renovation_complexity) * 0.08,
    ]
    return Math.round(scores.reduce((a, b) => a + b, 0) * 10)
  }

  const getGrade = (score: number) => {
    if (score >= 75) return 'A'
    if (score >= 55) return 'B'
    if (score >= 35) return 'C'
    return 'D'
  }

  const fmtMoney = (n: number) => n >= 1000000 ? '$' + (n/1000000).toFixed(2) + 'M' : '$' + Math.round(n/1000) + 'k'

  const price = Number(form.purchase_price) || Number(form.asking_price) || 0
  const stamp = calcStampDuty(price)
  const score = calcScore()
  const grade = getGrade(score)

  const handleSave = async () => {
    if (!form.nickname || !form.address) { alert('Add a nickname and address'); return }
    setSaving(true)
    const { error } = await supabase.from('properties').insert({
      nickname: form.nickname,
      address: form.address,
      suburb: form.suburb,
      state: form.state,
      postcode: form.postcode,
      property_type: form.property_type as any,
      land_size_sqm: Number(form.land_size_sqm) || null,
      floor_area_sqm: Number(form.floor_area_sqm) || null,
      bedrooms: Number(form.bedrooms) || null,
      bathrooms: Number(form.bathrooms) || null,
      car_spaces: Number(form.car_spaces) || null,
      asking_price: Number(form.asking_price) || null,
      purchase_price: Number(form.purchase_price) || null,
      stamp_duty: stamp,
      deposit_pct: Number(form.deposit_pct),
      interest_rate_pct: Number(form.interest_rate_pct),
      legal_conveyancing: Number(form.legal_conveyancing),
      building_inspection: Number(form.building_inspection),
      status: form.status as any,
      notes: form.notes,
      agent_name: form.agent_name,
      agent_phone: form.agent_phone,
      score_structure: Number(form.score_structure),
      score_location: Number(form.score_location),
      score_da_risk: Number(form.score_da_risk),
      score_access: Number(form.score_access),
      score_vendor_motivation: Number(form.score_vendor_motivation),
      score_gut: Number(form.score_gut),
      score_growth_potential: Number(form.score_growth_potential),
      score_renovation_complexity: Number(form.score_renovation_complexity),
      composite_score: score,
      deal_grade: grade,
      dual_occ_eligible: form.dual_occ_eligible,
      subdivision_potential: form.subdivision_potential,
      heritage_listed: form.heritage_listed,
      flood_overlay: form.flood_overlay,
      zoning_code: form.zoning_code,
      da_complexity: form.da_complexity as any || null,
      rental_estimate_weekly: Number(form.rental_estimate_weekly) || null,
      suburb_annual_growth_pct: Number(form.suburb_annual_growth_pct) || null,
    })
    if (error) { alert('Error: ' + error.message); setSaving(false); return }
    router.push('/dashboard')
  }

  const inp = { className: 'form-input' }
  const lbl = { className: 'form-label' }
  const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }
  const grid3 = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }

  const scores = [
    { key: 'score_structure', label: 'Structural condition', help: '10=near new, 1=falling down' },
    { key: 'score_location', label: 'Location / demand', help: '10=blue chip, 1=nobody wants it' },
    { key: 'score_da_risk', label: 'DA simplicity', help: '10=exempt dev, 1=prohibited' },
    { key: 'score_access', label: 'Site access', help: '10=easy flat access, 1=nightmare' },
    { key: 'score_vendor_motivation', label: 'Vendor motivation', help: '10=desperate to sell, 1=fishing' },
    { key: 'score_gut', label: 'Gut feel', help: '10=this is the one, 1=something is off' },
    { key: 'score_growth_potential', label: 'Growth potential', help: '10=boom area, 1=declining' },
    { key: 'score_renovation_complexity', label: 'Reno simplicity', help: '10=cosmetic only, 1=full rebuild' },
  ]

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content" style={{ maxWidth: 860 }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Add property</h1>
          <p style={{ fontSize: 14, color: '#888' }}>Upload a screenshot or fill in manually</p>
        </div>

        {/* Screenshot scan */}
        <div className="card" style={{ borderStyle: 'dashed', borderColor: '#d4a843', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>📸 Scan listing screenshot</div>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>Upload a Domain or REA screenshot — AI reads the address, price, beds, baths automatically</div>
          <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} id="scan-input" onChange={handleScan} />
          <label htmlFor="scan-input" style={{
            background: scanning ? '#888' : '#d4a843',
            color: '#1a1a1a', padding: '10px 20px', borderRadius: 8,
            fontSize: 14, fontWeight: 600, cursor: scanning ? 'not-allowed' : 'pointer', display: 'inline-block'
          }}>
            {scanning ? 'Scanning...' : 'Upload screenshot →'}
          </label>
        </div>

        {/* Property details */}
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Property details</div>
          <div style={{ marginBottom: 12 }}>
            <label {...lbl}>Deal nickname *</label>
            <input {...inp} placeholder="e.g. Ramsgate corner block" value={form.nickname} onChange={e => set('nickname', e.target.value)} />
          </div>
          <div style={grid2}>
            <div><label {...lbl}>Full address *</label><input {...inp} value={form.address} onChange={e => set('address', e.target.value)} /></div>
            <div><label {...lbl}>Suburb</label><input {...inp} value={form.suburb} onChange={e => set('suburb', e.target.value)} /></div>
          </div>
          <div style={grid3}>
            <div>
              <label {...lbl}>Property type</label>
              <select {...inp} value={form.property_type} onChange={e => set('property_type', e.target.value)}>
                {['house','townhouse','unit','duplex','commercial','land','acreage'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label {...lbl}>Land size (sqm)</label><input {...inp} type="number" value={form.land_size_sqm} onChange={e => set('land_size_sqm', e.target.value)} /></div>
            <div><label {...lbl}>Floor area (sqm)</label><input {...inp} type="number" value={form.floor_area_sqm} onChange={e => set('floor_area_sqm', e.target.value)} /></div>
          </div>
          <div style={grid3}>
            <div><label {...lbl}>Beds</label><input {...inp} type="number" value={form.bedrooms} onChange={e => set('bedrooms', e.target.value)} /></div>
            <div><label {...lbl}>Baths</label><input {...inp} type="number" value={form.bathrooms} onChange={e => set('bathrooms', e.target.value)} /></div>
            <div><label {...lbl}>Cars</label><input {...inp} type="number" value={form.car_spaces} onChange={e => set('car_spaces', e.target.value)} /></div>
          </div>
        </div>

        {/* Financials */}
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Financials</div>
          <div style={grid2}>
            <div><label {...lbl}>Asking price ($)</label><input {...inp} type="number" value={form.asking_price} onChange={e => set('asking_price', e.target.value)} /></div>
            <div><label {...lbl}>Your purchase price ($)</label><input {...inp} type="number" value={form.purchase_price} onChange={e => set('purchase_price', e.target.value)} /></div>
          </div>
          {price > 0 && (
            <div className="flag-box flag-info" style={{ marginBottom: 12 }}>
              Stamp duty (NSW 2026): <strong>${stamp.toLocaleString()}</strong> · Total acquisition: <strong>{fmtMoney(price + stamp + 3300)}</strong>
            </div>
          )}
          <div style={grid3}>
            <div><label {...lbl}>Deposit (%)</label><input {...inp} type="number" value={form.deposit_pct} onChange={e => set('deposit_pct', e.target.value)} /></div>
            <div><label {...lbl}>Interest rate (%)</label><input {...inp} type="number" step="0.01" value={form.interest_rate_pct} onChange={e => set('interest_rate_pct', e.target.value)} /></div>
            <div><label {...lbl}>Weekly rent est. ($)</label><input {...inp} type="number" value={form.rental_estimate_weekly} onChange={e => set('rental_estimate_weekly', e.target.value)} /></div>
          </div>
        </div>

        {/* Scoring */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Deal scoring</div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{score}/100</div>
              <span style={{ fontSize: 13, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
                background: grade === 'A' ? '#dcfce7' : grade === 'B' ? '#fef9c3' : grade === 'C' ? '#fee2e2' : '#f1f5f9',
                color: grade === 'A' ? '#166534' : grade === 'B' ? '#713f12' : grade === 'C' ? '#991b1b' : '#475569'
              }}>Grade {grade}</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {scores.map(s => (
              <div key={s.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#666' }}>{s.label}</label>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>{(form as any)[s.key]}</span>
                </div>
                <input type="range" min="1" max="10" style={{ width: '100%' }} value={(form as any)[s.key]} onChange={e => set(s.key, e.target.value)} />
                <div style={{ fontSize: 11, color: '#aaa' }}>{s.help}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Planning */}
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Planning & overlays</div>
          <div style={grid2}>
            <div><label {...lbl}>Zoning code</label><input {...inp} placeholder="e.g. R2" value={form.zoning_code} onChange={e => set('zoning_code', e.target.value)} /></div>
            <div>
              <label {...lbl}>DA complexity</label>
              <select {...inp} value={form.da_complexity} onChange={e => set('da_complexity', e.target.value)}>
                <option value="">Unknown</option>
                {['exempt','complying','low','medium','high','prohibited'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {[
              { key: 'dual_occ_eligible', label: 'Dual occ eligible' },
              { key: 'subdivision_potential', label: 'Subdivision potential' },
              { key: 'heritage_listed', label: 'Heritage listed ⚠' },
              { key: 'flood_overlay', label: 'Flood overlay ⚠' },
            ].map(f => (
              <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={(form as any)[f.key]} onChange={e => set(f.key, e.target.checked)} />
                {f.label}
              </label>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Notes & agent</div>
          <div style={{ marginBottom: 12 }}>
            <label {...lbl}>Notes</label>
            <textarea className="form-input" style={{ minHeight: 80, resize: 'vertical' }} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="What did you see? What's the story? Any red flags?" />
          </div>
          <div style={grid2}>
            <div><label {...lbl}>Agent name</label><input {...inp} value={form.agent_name} onChange={e => set('agent_name', e.target.value)} /></div>
            <div><label {...lbl}>Agent phone</label><input {...inp} value={form.agent_phone} onChange={e => set('agent_phone', e.target.value)} /></div>
          </div>
          <div>
            <label {...lbl}>Status</label>
            <select {...inp} value={form.status} onChange={e => set('status', e.target.value)}>
              {['watching','analysing','offer','under_contract','building','complete'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn-gold" onClick={handleSave} disabled={saving} style={{ fontSize: 15, padding: '12px 32px' }}>
            {saving ? 'Saving...' : 'Save property →'}
          </button>
          <button className="btn-outline" onClick={() => router.back()}>Cancel</button>
        </div>
      </main>
    </div>
  )
}
