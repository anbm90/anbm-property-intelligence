'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/ui/Sidebar'
import type { Property } from '@/types'

const NOTE_TYPES = ['general', 'inspection', 'offer', 'negotiation', 'finance', 'legal', 'build', 'alert']
const TYPE_COLORS: Record<string, string> = {
  inspection: '#3b82f6', offer: '#f59e0b', negotiation: '#8b5cf6',
  finance: '#06b6d4', legal: '#ef4444', build: '#d4a843',
  alert: '#ef4444', general: '#6b7280',
}

export default function NotesPage() {
  const supabase = createClient()
  const [properties, setProperties] = useState<Property[]>([])
  const [notes, setNotes] = useState<any[]>([])
  const [selectedProperty, setSelectedProperty] = useState('all')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ property_id: '', type: 'general', title: '', body: '', action_required: false, action_due: '' })

  useEffect(() => {
    const load = async () => {
      const [propRes, noteRes] = await Promise.all([
        supabase.from('properties').select('id, nickname, suburb').neq('status', 'archived').order('composite_score', { ascending: false }),
        supabase.from('deal_notes').select('*, properties(nickname, suburb)').order('created_at', { ascending: false }),
      ])
      setProperties(propRes.data ?? [])
      setNotes(noteRes.data ?? [])
      if (propRes.data?.[0]) setForm(f => ({ ...f, property_id: propRes.data![0].id }))
      setLoading(false)
    }
    load()
  }, [])

  const saveNote = async () => {
    if (!form.property_id || !form.body) return
    await supabase.from('deal_notes').insert({
      property_id: form.property_id,
      type: form.type,
      title: form.title,
      body: form.body,
      action_required: form.action_required,
      action_due: form.action_due || null,
    })
    const { data } = await supabase.from('deal_notes').select('*, properties(nickname, suburb)').order('created_at', { ascending: false })
    setNotes(data ?? [])
    setShowAdd(false)
    setForm(f => ({ ...f, title: '', body: '', action_required: false, action_due: '' }))
  }

  const deleteNote = async (id: string) => {
    await supabase.from('deal_notes').delete().eq('id', id)
    setNotes(n => n.filter(x => x.id !== id))
  }

  const filtered = selectedProperty === 'all' ? notes : notes.filter(n => n.property_id === selectedProperty)
  const actionItems = notes.filter(n => n.action_required)

  const inputStyle = { width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 7, fontSize: 13, background: 'white', color: '#1a1a1a' }
  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700 as const, color: '#888', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 4 }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="section-header" style={{ marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700 }}>Notes & history</h1>
            <p style={{ fontSize: 14, color: '#888', marginTop: 4 }}>Full paper trail — inspections, offers, negotiations, finance</p>
          </div>
          <button className="btn-gold" onClick={() => setShowAdd(true)}>+ Add note</button>
        </div>

        {/* Action items */}
        {actionItems.length > 0 && (
          <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid #ef4444' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: '#991b1b' }}>⚡ Action required ({actionItems.length})</div>
            {actionItems.map(n => (
              <div key={n.id} style={{ padding: '6px 0', borderBottom: '1px solid #f5f5f5', fontSize: 13 }}>
                <strong>{n.properties?.nickname}</strong> — {n.title || n.body.substring(0, 60)}
                {n.action_due && <span style={{ color: '#ef4444', marginLeft: 8, fontSize: 12 }}>Due: {new Date(n.action_due).toLocaleDateString('en-AU')}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Add note */}
        {showAdd && (
          <div className="card" style={{ marginBottom: 16, border: '2px solid #d4a843' }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Add note</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={labelStyle}>Property</label>
                <select style={inputStyle} value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))}>
                  {properties.map(p => <option key={p.id} value={p.id}>{(p as any).nickname}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Type</label>
                <select style={inputStyle} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  {NOTE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Title</label>
                <input style={inputStyle} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Brief summary" />
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Note *</label>
              <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="What happened, what was said, what was agreed..." />
            </div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.action_required} onChange={e => setForm(f => ({ ...f, action_required: e.target.checked }))} />
                Action required
              </label>
              {form.action_required && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ ...labelStyle, marginBottom: 0, whiteSpace: 'nowrap' }}>Due date</label>
                  <input type="date" style={{ ...inputStyle, width: 160 }} value={form.action_due} onChange={e => setForm(f => ({ ...f, action_due: e.target.value }))} />
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-primary" onClick={saveNote}>Save note</button>
              <button className="btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* Filter */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
          <select style={{ padding: '7px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13 }} value={selectedProperty} onChange={e => setSelectedProperty(e.target.value)}>
            <option value="all">All properties</option>
            {properties.map(p => <option key={p.id} value={p.id}>{(p as any).nickname}</option>)}
          </select>
          <span style={{ fontSize: 13, color: '#888' }}>{filtered.length} notes</span>
        </div>

        {/* Notes list */}
        {loading ? (
          <div style={{ color: '#888' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>No notes yet</div>
        ) : (
          <div>
            {filtered.map(n => {
              const tc = TYPE_COLORS[n.type] ?? '#6b7280'
              return (
                <div key={n.id} className="card" style={{ marginBottom: 10, borderLeft: `4px solid ${tc}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: tc + '22', color: tc }}>
                        {n.type}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{n.properties?.nickname}</span>
                      {n.action_required && <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444' }}>⚡ Action required</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 11, color: '#aaa' }}>{new Date(n.created_at).toLocaleDateString('en-AU')}</span>
                      <button onClick={() => deleteNote(n.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16 }}>×</button>
                    </div>
                  </div>
                  {n.title && <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{n.title}</div>}
                  <div style={{ fontSize: 13, color: '#444', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{n.body}</div>
                  {n.action_due && <div style={{ fontSize: 12, color: '#ef4444', marginTop: 6 }}>Due: {new Date(n.action_due).toLocaleDateString('en-AU')}</div>}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
