'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/ui/Sidebar'

export default function NotesPage() {
  const supabase = createClient()
  const [properties, setProperties] = useState<any[]>([])
  const [notes, setNotes] = useState<any[]>([])
  const [selectedProperty, setSelectedProperty] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ property_id: '', type: 'general', title: '', body: '', action_required: false, action_due: '' })

  useEffect(() => {
    const load = async () => {
      const [propRes, noteRes] = await Promise.all([
        supabase.from('properties').select('id, nickname').neq('status', 'archived').order('composite_score', { ascending: false }),
        supabase.from('deal_notes').select('*, properties(nickname)').order('created_at', { ascending: false }),
      ])
      setProperties(propRes.data ?? [])
      setNotes(noteRes.data ?? [])
      if (propRes.data?.[0]) setForm(f => ({ ...f, property_id: propRes.data![0].id }))
    }
    load()
  }, [])

  const saveNote = async () => {
    if (!form.property_id || !form.body) return
    await supabase.from('deal_notes').insert({ property_id: form.property_id, type: form.type, title: form.title, body: form.body, action_required: form.action_required, action_due: form.action_due || null })
    const { data } = await supabase.from('deal_notes').select('*, properties(nickname)').order('created_at', { ascending: false })
    setNotes(data ?? [])
    setShowAdd(false)
    setForm(f => ({ ...f, title: '', body: '', action_required: false, action_due: '' }))
  }

  const typeColors: Record<string, string> = { inspection: '#3b82f6', offer: '#f59e0b', negotiation: '#8b5cf6', finance: '#06b6d4', legal: '#ef4444', build: '#d4a843', alert: '#ef4444', general: '#6b7280' }
  const filtered = selectedProperty === 'all' ? notes : notes.filter(n => n.property_id === selectedProperty)
  const inp: any = { className: 'form-input' }
  const lbl: any = { className: 'form-label' }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700 }}>Notes & history</h1>
            <p style={{ fontSize: 14, color: '#888', marginTop: 4 }}>Full paper trail per deal</p>
          </div>
          <button className="btn-gold" onClick={() => setShowAdd(true)}>+ Add note</button>
        </div>

        {notes.filter(n => n.action_required).length > 0 && (
          <div className="card" style={{ borderLeft: '4px solid #ef4444', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: '#991b1b' }}>⚡ Action required</div>
            {notes.filter(n => n.action_required).map(n => (
              <div key={n.id} style={{ fontSize: 13, padding: '4px 0', borderBottom: '1px solid #f5f5f5' }}>
                <strong>{n.properties?.nickname}</strong> — {n.title || n.body.substring(0, 60)}
                {n.action_due && <span style={{ color: '#ef4444', marginLeft: 8, fontSize: 12 }}>Due: {new Date(n.action_due).toLocaleDateString('en-AU')}</span>}
              </div>
            ))}
          </div>
        )}

        {showAdd && (
          <div className="card" style={{ border: '2px solid #d4a843' }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Add note</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label {...lbl}>Property</label>
                <select {...inp} value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))}>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.nickname}</option>)}
                </select>
              </div>
              <div>
                <label {...lbl}>Type</label>
                <select {...inp} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  {['general','inspection','offer','negotiation','finance','legal','build','alert'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div><label {...lbl}>Title</label><input {...inp} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label {...lbl}>Note *</label>
              <textarea {...inp} style={{ minHeight: 80, resize: 'vertical' as const }} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.action_required} onChange={e => setForm(f => ({ ...f, action_required: e.target.checked }))} />
                Action required
              </label>
              {form.action_required && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label {...lbl} style={{ margin: 0 }}>Due</label>
                  <input type="date" {...inp} style={{ width: 160 }} value={form.action_due} onChange={e => setForm(f => ({ ...f, action_due: e.target.value }))} />
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-primary" onClick={saveNote}>Save</button>
              <button className="btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <select {...inp} style={{ width: 220 }} value={selectedProperty} onChange={e => setSelectedProperty(e.target.value)}>
            <option value="all">All properties</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.nickname}</option>)}
          </select>
          <span style={{ fontSize: 13, color: '#888', alignSelf: 'center' }}>{filtered.length} notes</span>
        </div>

        {filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>No notes yet</div>
        ) : filtered.map(n => {
          const tc = typeColors[n.type] ?? '#6b7280'
          return (
            <div key={n.id} className="card" style={{ borderLeft: `4px solid ${tc}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: tc + '22', color: tc }}>{n.type}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{n.properties?.nickname}</span>
                  {n.action_required && <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444' }}>⚡ Action</span>}
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#aaa' }}>{new Date(n.created_at).toLocaleDateString('en-AU')}</span>
                  <button onClick={async () => { await supabase.from('deal_notes').delete().eq('id', n.id); setNotes(x => x.filter(i => i.id !== n.id)) }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16 }}>×</button>
                </div>
              </div>
              {n.title && <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{n.title}</div>}
              <div style={{ fontSize: 13, color: '#444', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{n.body}</div>
              {n.action_due && <div style={{ fontSize: 12, color: '#ef4444', marginTop: 6 }}>Due: {new Date(n.action_due).toLocaleDateString('en-AU')}</div>}
            </div>
          )
        })}
      </main>
    </div>
  )
}