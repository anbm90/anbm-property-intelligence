import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const images = formData.getAll('images') as File[]
    const address = formData.get('address') as string

    const imageContent: any[] = []
    for (const img of images) {
      const bytes = await img.arrayBuffer()
      const base64 = Buffer.from(bytes).toString('base64')
      const mediaType = img.type as 'image/jpeg' | 'image/png' | 'image/webp'
      imageContent.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } })
    }

    const prompt = `You are an elite Australian property development analyst. The client is Alex, a licensed NSW builder (Lic 494053C) with full trade network: Dad (elite carpenter/PM), Peter (electrician), mate (painter). He sources materials from China at 30-40% below AU trade price. His labour costs are ~22% below market.

${address ? `Property address: ${address}` : ''}
${imageContent.length > 0 ? `${imageContent.length} listing image(s) provided - extract all visible information including address, price, features, condition.` : ''}

Generate a COMPREHENSIVE property assessment report. Return ONLY this JSON structure, no markdown:

{
  "overall_verdict": "BUY or PASS or MAYBE",
  "deal_score": 72,
  "verdict_summary": "One punchy sentence",
  "detailed_reasoning": "3-4 sentences explaining the verdict with specific numbers",
  
  "property": {
    "address": "extracted address",
    "type": "house/townhouse/unit/duplex",
    "bedrooms": 3,
    "bathrooms": 2,
    "land_sqm": 450,
    "floor_sqm": 180,
    "asking_price": 950000,
    "zoning": "R2",
    "build_year": 1975,
    "council": "Georges River"
  },

  "scores": {
    "location_quality": 7,
    "growth_potential": 8,
    "structural_condition": 5,
    "renovation_potential": 8,
    "rental_demand": 7,
    "development_potential": 6,
    "vendor_motivation": 6,
    "value_vs_market": 7
  },

  "flip": {
    "buy_price": 920000,
    "reno_cost": 85000,
    "sale_price": 1150000,
    "profit": 105000,
    "roi": 11,
    "timeline": "6-8 months",
    "notes": "Specific advice on what to renovate and what to leave"
  },

  "hold": {
    "weekly_rent": 650,
    "annual_income": 33800,
    "gross_yield": 3.5,
    "net_cashflow": -8000,
    "equity_5yr": 280000,
    "equity_10yr": 520000,
    "notes": "Rental market commentary and hold strategy advice"
  },

  "develop": {
    "recommended": "Dual occupancy",
    "da_type": "CDC complying",
    "cost": 280000,
    "end_value": 1650000,
    "profit": 380000,
    "timeline": "18-24 months",
    "notes": "Development feasibility notes"
  },

  "your_edge": {
    "trade_savings": 18700,
    "china_savings": 12500,
    "total_edge": 31200,
    "max_offer": 895000,
    "max_push": "Specific negotiation strategy — what to push on, what lever to pull"
  },

  "growth": {
    "annual_growth": "6.2% pa (10yr avg)",
    "forecast_5yr": "Strong — infrastructure pipeline, population growth",
    "vacancy_rate": "1.8% (very tight)",
    "days_on_market": "22 days avg",
    "median_price": "$1.05M houses",
    "rental_demand": "High — proximity to stations, schools",
    "commentary": "3-4 sentences on suburb fundamentals, what's driving growth, any risks to the market"
  },

  "risks": [
    "Specific risk 1 with detail",
    "Specific risk 2 with detail",
    "Specific risk 3 with detail"
  ],

  "opportunities": [
    "Specific opportunity 1 with detail",
    "Specific opportunity 2 with detail", 
    "Specific opportunity 3 with detail"
  ],

  "build_scope": [
    { "item": "Kitchen renovation", "your_cost": 18000, "market_cost": 28000, "saving": 10000 },
    { "item": "Bathroom (x2)", "your_cost": 14000, "market_cost": 22000, "saving": 8000 },
    { "item": "Flooring - hybrid timber", "your_cost": 8500, "market_cost": 13000, "saving": 4500 },
    { "item": "Paint - interior & exterior", "your_cost": 6500, "market_cost": 12000, "saving": 5500 },
    { "item": "Electrical upgrade", "your_cost": 4500, "market_cost": 8000, "saving": 3500 },
    { "item": "Landscaping & fence", "your_cost": 8000, "market_cost": 14000, "saving": 6000 }
  ]
}`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: [
          ...imageContent,
          { type: 'text', text: prompt }
        ]
      }]
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const report = JSON.parse(text.replace(/```json|```/g, '').trim())
    return NextResponse.json({ success: true, report })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Report generation failed' }, { status: 500 })
  }
}