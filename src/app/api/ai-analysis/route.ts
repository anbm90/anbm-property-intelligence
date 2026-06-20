import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { Property } from '@/types'
import { calcStampDuty, calcMaxPush, fmtCurrency } from '@/lib/calculations/finance'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { property, buildCost, saleEstimate, weeklyRent, buildWeeks } = body as {
      property: Property
      buildCost: number
      saleEstimate: number
      weeklyRent: number
      buildWeeks: number
    }

    const stamp = calcStampDuty(property.purchase_price ?? 0).total
    const totalAcquisition = (property.purchase_price ?? 0) + stamp + 4100
    const maxPush = calcMaxPush(saleEstimate, buildCost, 20, buildWeeks)

    const prompt = `You are an elite Australian property development analyst for A.N Building & Management Pty Ltd, a licensed NSW building and construction company (Contractor Licence 494053C). The owner is Alex, a licensed builder/carpenter with a full trade network including his father (elite carpenter/PM), Peter (electrician), and painters — giving him ~20-25% labour cost advantage over market rates. Alex also sources premium materials direct from China, saving ~30-40% on materials.

Analyse this property deal and give a direct, no-bullshit verdict.

PROPERTY: ${property.nickname}
Address: ${property.address}, ${property.suburb} ${property.state}
Type: ${property.property_type ?? 'unknown'}
Land: ${property.land_size_sqm ?? 'unknown'} sqm | Floor: ${property.floor_area_sqm ?? 'unknown'} sqm
Beds/Baths: ${property.bedrooms ?? '?'}/${property.bathrooms ?? '?'}
Build year: ${property.build_year ?? 'unknown'}
Council: ${property.council ?? 'unknown'}

PLANNING
Zoning: ${property.zoning_code ?? 'unknown'} - ${property.zoning_description ?? ''}
FSR: ${property.fsr ?? 'unknown'} | Max height: ${property.max_height_m ?? 'unknown'}m
DA complexity: ${property.da_complexity ?? 'unknown'}
Dual occ eligible: ${property.dual_occ_eligible ? 'YES' : 'NO'}
Subdivision potential: ${property.subdivision_potential ? 'YES' : 'NO'}
Heritage: ${property.heritage_listed ? 'YES - FLAG' : 'No'}
Flood overlay: ${property.flood_overlay ? 'YES - FLAG' : 'No'}

MARKET DATA
Estimated value: ${fmtCurrency(property.estimated_value ?? 0)}
Last sold: ${fmtCurrency(property.last_sold_price ?? 0)} (${property.last_sold_date ?? 'unknown'})
Suburb median: ${fmtCurrency(property.median_suburb_price ?? 0)}
Annual growth: ${property.suburb_annual_growth_pct ?? 'unknown'}%
Weekly rent estimate: ${fmtCurrency(weeklyRent)}/wk
Vacancy rate: ${property.vacancy_rate_pct ?? 'unknown'}%

DEAL NUMBERS
Purchase price: ${fmtCurrency(property.purchase_price ?? 0)}
Stamp duty: ${fmtCurrency(stamp)}
Total acquisition: ${fmtCurrency(totalAcquisition)}
Build/reno cost: ${fmtCurrency(buildCost)}
Sale estimate: ${fmtCurrency(saleEstimate)}
Build timeline: ${buildWeeks} weeks

ALEX'S EDGE (competitive advantage)
- Trade labour saving vs market: ${fmtCurrency(maxPush.estimatedTradeSavings)}
- China materials saving: ${fmtCurrency(maxPush.estimatedChinaSourcingSavings)}
- Total edge: ${fmtCurrency(maxPush.totalEdge)}

SCORES (out of 10)
Structure: ${property.score_structure ?? 'N/A'}
Location: ${property.score_location ?? 'N/A'}
DA risk: ${property.score_da_risk ?? 'N/A'}
Access/site: ${property.score_access ?? 'N/A'}
Vendor motivation: ${property.score_vendor_motivation ?? 'N/A'}
Gut feel: ${property.score_gut ?? 'N/A'}
Growth potential: ${property.score_growth_potential ?? 'N/A'}
Reno complexity: ${property.score_renovation_complexity ?? 'N/A'}

Notes: ${property.notes ?? 'None'}

Respond in this exact JSON format only, no markdown:
{
  "strategy": "flip|hold|develop|subdivide|dual_occ|land_bank|pass",
  "confidence": 85,
  "verdict": "One punchy sentence verdict — be direct like you're talking to a builder",
  "reasoning": "2-3 sentences on why this strategy. Be specific about the numbers.",
  "max_push": "What Alex should push hardest on — specific negotiation or build angle to maximise profit. Be direct.",
  "risks": ["Risk 1", "Risk 2", "Risk 3"],
  "opportunities": ["Opportunity 1", "Opportunity 2", "Opportunity 3"],
  "flip_score": 72,
  "hold_score": 58,
  "develop_score": 45,
  "recommended_offer": 850000,
  "walk_away_price": 920000,
  "target_sale_price": 1150000
}`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const result = JSON.parse(text)

    return NextResponse.json({ success: true, analysis: result })
  } catch (err) {
    console.error('AI analysis error:', err)
    return NextResponse.json({ success: false, error: 'Analysis failed' }, { status: 500 })
  }
}
