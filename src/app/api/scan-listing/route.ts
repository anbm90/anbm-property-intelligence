import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('image') as File
    if (!file) return NextResponse.json({ error: 'No image' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const mediaType = file.type as 'image/jpeg' | 'image/png' | 'image/webp'

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: `Extract all property listing details from this screenshot. Return ONLY JSON, no markdown:
{
  "address": "full street address",
  "suburb": "suburb",
  "state": "NSW",
  "postcode": "postcode",
  "asking_price": 950000,
  "property_type": "house",
  "bedrooms": 3,
  "bathrooms": 2,
  "car_spaces": 1,
  "land_size_sqm": 450,
  "floor_area_sqm": 180,
  "agent_name": "name",
  "agent_phone": "phone",
  "notes": "key points from description"
}` }
        ]
      }]
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const clean = text.replace(/```json|```/g, '').trim()
    const data = JSON.parse(clean)
    return NextResponse.json({ success: true, data })
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Scan failed' }, { status: 500 })
  }
}