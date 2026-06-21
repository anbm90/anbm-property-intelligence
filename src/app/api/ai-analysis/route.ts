import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const { property, buildCost, saleEstimate, weeklyRent } = await req.json()

    const prompt = `You are an elite Australian property development analyst for A.N Building & Management Pty Ltd. Alex is a licensed builder/carpenter with his own trade network (Dad=carpenter/PM, Peter=electrician, mate=painter) giving ~22% labour savings. He sources materials from China saving ~35%.

Analyse this property deal and give a direct verdict.

PROPERTY: ${property.nickname}
Address: ${property.address}, ${property.suburb} ${property.state}
Type: ${property.property_type} | Land: ${property.land_size_sqm}sqm | Floor: ${property.floor_area_sqm}sqm
Beds/Baths: ${property.bedrooms}/${property.bathrooms}
Zoning: ${property.zoning_code} | DA complexity: ${property.da_complexity}
Dual occ: ${property.dual_occ_eligible ? 'YES' : 'NO'} | Subdivision: ${property.subdivision_potential ? 'YES' : 'NO'}
Heritage: ${property.heritage_listed ? 'YES WARNING' : 'No'} | Flood: ${property.flood_overlay ? 'YES WARNING' : 'No'}

FINANCIALS
Purchase price: $${property.purchase_price}
Build/reno cost: $${buildCost}
Sale estimate: $${saleEstimate}
Weekly rent estimate: $${weeklyRent}
Suburb growth rate: ${property.suburb_annual_growth_pct}%

SCORES (1-10)
Structure: ${property.score_structure} | Location: ${property.score_location} | DA risk: ${property.score_da_risk}
Access: ${property.score_access} | Vendor motivation: ${property.score_vendor_motivation} | Gut: ${property.score_gut}

Notes: ${property.notes}

Return ONLY this JSON, no markdown:
{
  "strategy": "flip or hold or develop or pass",
  "confidence": 85,
  "verdict": "One punchy sentence — talk like you're talking to a builder",
  "reasoning": "2-3 sentences on why. Be specific about numbers.",
  "max_push": "What Alex should push hardest on to maximise profit. Be direct.",
  "recommended_offer": 850000,
  "walk_away_price": 920000,
  "target_sale_price": 1150000,
  "risks": ["Risk 1", "Risk 2", "Risk 3"],
  "opportunities": ["Opportunity 1", "Opportunity 2", "Opportunity 3"]
}`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const result = JSON.parse(text.replace(/```json|```/g, '').trim())
    return NextResponse.json({ success: true, analysis: result })
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Analysis failed' }, { status: 500 })
  }
}