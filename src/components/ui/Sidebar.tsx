'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const nav = [
  { href: '/report', label: 'Property Report', icon: '📊' },
  { href: '/dashboard', label: 'Dashboard', icon: '◈' },
  { href: '/properties', label: 'Properties', icon: '⌂' },
  { href: '/deal-pipeline', label: 'Deal Pipeline', icon: '◎' },
  { href: '/build-scope', label: 'Build Scope', icon: '⊞' },
  { href: '/flip-vs-hold', label: 'Flip vs Hold', icon: '⇅' },
  { href: '/trade-rates', label: 'Trade Rates', icon: '⚒' },
  { href: '/sourcing', label: 'China Sourcing', icon: '⊡' },
  { href: '/notes', label: 'Notes', icon: '✎' },
  { href: '/alerts', label: 'Alerts', icon: '◉' },
]

export default function Sidebar() {
  const path = usePathname()
  return (
    <aside className="sidebar">
      <div style={{ padding: '1.5rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#d4a843', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>A.N Building & Management</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>Property Intelligence</div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Lic. 494053C</div>
      </div>
      <nav style={{ padding: '0.75rem 0' }}>
        {nav.map(item => {
          const active = path === item.href || path.startsWith(item.href + '/')
          return (
            <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 1.25rem', fontSize: 13,
                fontWeight: active ? 600 : 400,
                color: active ? '#d4a843' : 'rgba(255,255,255,0.6)',
                background: active ? 'rgba(212,168,67,0.1)' : 'transparent',
                borderRight: active ? '3px solid #d4a843' : '3px solid transparent',
              }}>
                <span style={{ fontSize: 15, width: 20, textAlign: 'center' }}>{item.icon}</span>
                {item.label}
              </div>
            </Link>
          )
        })}
      </nav>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>ABN 22 692 915 218</div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Ramsgate Beach NSW 2217</div>
      </div>
    </aside>
  )
}