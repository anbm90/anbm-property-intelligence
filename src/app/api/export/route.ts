import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { scope_id, property_id } = await req.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const [scopeRes, propRes] = await Promise.all([
      supabase.from('build_scopes').select('*, scope_line_items(*, trade_categories(name), tradespeople(name))').eq('id', scope_id).single(),
      supabase.from('properties').select('*').eq('id', property_id).single(),
    ])

    const scope = scopeRes.data
    const property = propRes.data
    if (!scope || !property) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const items = scope.scope_line_items ?? []
    const total = items.reduce((s: number, i: any) => s + (i.quantity * i.rate), 0)

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Scope of Works — ${property.nickname}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1a1a; margin: 0; padding: 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 3px solid #1a1a2e; padding-bottom: 20px; }
  .company { font-size: 11px; color: #888; }
  .company strong { font-size: 16px; color: #1a1a2e; display: block; margin-bottom: 4px; }
  .doc-title { font-size: 22px; font-weight: 800; color: #1a1a2e; }
  .property-info { background: #f9f9f9; padding: 16px; border-radius: 8px; margin-bottom: 24px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
  .info-item label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.06em; display: block; margin-bottom: 2px; }
  .info-item strong { font-size: 14px; color: #1a1a1a; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #1a1a2e; color: white; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; }
  td { padding: 9px 12px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
  tr:nth-child(even) td { background: #fafafa; }
  .total-row td { background: #1a1a2e; color: white; font-weight: 700; font-size: 15px; padding: 12px; }
  .footer { margin-top: 30px; padding-top: 16px; border-top: 1px solid #e8e8e8; font-size: 11px; color: #888; display: flex; justify-content: space-between; }
  .gold { color: #d4a843; }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="doc-title">Scope of Works</div>
    <div style="font-size: 14px; color: #888; margin-top: 4px;">${scope.name} · ${scope.scenario}</div>
  </div>
  <div class="company">
    <strong>A.N Building & Management Pty Ltd</strong>
    ABN: 22 692 915 218 | Lic: 494053C<br>
    Ramsgate Beach NSW 2217<br>
    alex@anbm.com.au | 0411 493 934
  </div>
</div>

<div class="property-info">
  <div class="info-item"><label>Property</label><strong>${property.nickname}</strong></div>
  <div class="info-item"><label>Address</label><strong>${property.address}</strong></div>
  <div class="info-item"><label>Date</label><strong>${new Date().toLocaleDateString('en-AU')}</strong></div>
  <div class="info-item"><label>Purchase price</label><strong>${property.purchase_price ? '$' + property.purchase_price.toLocaleString() : '—'}</strong></div>
  <div class="info-item"><label>Property type</label><strong>${property.property_type ?? '—'}</strong></div>
  <div class="info-item"><label>Land size</label><strong>${property.land_size_sqm ? property.land_size_sqm + ' sqm' : '—'}</strong></div>
</div>

<table>
  <thead>
    <tr>
      <th>#</th>
      <th>Item / Description</th>
      <th>Trade / Category</th>
      <th>Who</th>
      <th>Unit</th>
      <th style="text-align:right">Qty</th>
      <th style="text-align:right">Rate</th>
      <th style="text-align:right">Total</th>
    </tr>
  </thead>
  <tbody>
    ${items.map((item: any, i: number) => `
    <tr>
      <td style="color:#aaa;font-size:11px">${i + 1}</td>
      <td><strong>${item.item_name}</strong>${item.notes ? '<br><span style="color:#888;font-size:11px">' + item.notes + '</span>' : ''}</td>
      <td style="font-size:12px;color:#666">${item.trade_categories?.name ?? '—'}</td>
      <td style="font-size:12px;color:#666">${item.tradespeople?.name ?? 'Market rate'}</td>
      <td style="font-size:12px;color:#888">${item.unit}</td>
      <td style="text-align:right">${item.quantity}</td>
      <td style="text-align:right">$${item.rate.toLocaleString()}</td>
      <td style="text-align:right;font-weight:600">$${(item.quantity * item.rate).toLocaleString()}</td>
    </tr>`).join('')}
    <tr class="total-row">
      <td colspan="7">TOTAL SCOPE ESTIMATE</td>
      <td style="text-align:right">$${total.toLocaleString()}</td>
    </tr>
  </tbody>
</table>

<div style="background:#fffbeb;border:1px solid #f59e0b;border-radius:8px;padding:12px 16px;font-size:12px;color:#92400e;margin-bottom:16px">
  <strong>Note:</strong> This scope of works is an estimate only. Final costs subject to site inspection, material pricing at time of order, and trade availability. A 15% contingency is recommended.
</div>

<div class="footer">
  <div>A.N Building & Management Pty Ltd · Contractor Licence 494053C · Generated ${new Date().toLocaleDateString('en-AU')}</div>
  <div class="gold">anbm.com.au</div>
</div>
</body>
</html>`

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="scope-${property.nickname.replace(/\s+/g, '-')}.html"`,
      }
    })
  } catch (err) {
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
