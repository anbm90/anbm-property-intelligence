import { NextRequest, NextResponse } from 'next/server'

// NSW Planning Portal API + Google Maps geocoding
// Falls back to manual entry if APIs unavailable

export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json()
    if (!address) return NextResponse.json({ error: 'Address required' }, { status: 400 })

    const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    // Step 1: Geocode address
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address + ', Australia')}&key=${googleKey}&region=au&components=country:AU`
    const geocodeRes = await fetch(geocodeUrl)
    const geocodeData = await geocodeRes.json()

    if (!geocodeData.results?.length) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 })
    }

    const result = geocodeData.results[0]
    const components = result.address_components
    const location = result.geometry.location

    const getComponent = (type: string) =>
      components.find((c: { types: string[] }) => c.types.includes(type))?.long_name ?? ''

    const suburb = getComponent('locality') || getComponent('sublocality')
    const state = getComponent('administrative_area_level_1')
    const postcode = getComponent('postal_code')
    const streetNumber = getComponent('street_number')
    const streetName = getComponent('route')

    // Step 2: NSW Planning Portal - get zoning data
    // Using NSW Spatial Services API (public, no key needed)
    let zoningData: {
      zoning_code?: string
      zoning_description?: string
      fsr?: number
      max_height_m?: number
      dual_occ_eligible?: boolean
      subdivision_potential?: boolean
      heritage_listed?: boolean
      flood_overlay?: boolean
      da_complexity?: string
    } = {}
    try {
      const nsw_url = `https://api.apps1.nsw.gov.au/planning/viewersf/V1/ePlanningApi/layerintersect?type=Point&layers=epi&lon=${location.lng}&lat=${location.lat}`
      const nswRes = await fetch(nsw_url, {
        headers: { 'Accept': 'application/json' }
      })
      if (nswRes.ok) {
        const nswData = await nswRes.json()
        zoningData = parseNSWPlanningData(nswData)
      }
    } catch {
      // NSW API unavailable — graceful degradation
    }

    // Step 3: Flood/hazard overlays
    let overlayData: {
      flood_overlay?: boolean
      bushfire_overlay?: boolean
      acid_sulfate_soils?: boolean
    } = {}
    try {
      const floodUrl = `https://api.apps1.nsw.gov.au/planning/viewersf/V1/ePlanningApi/layerintersect?type=Point&layers=overlay&lon=${location.lng}&lat=${location.lat}`
      const floodRes = await fetch(floodUrl, { headers: { 'Accept': 'application/json' } })
      if (floodRes.ok) {
        const floodData = await floodRes.json()
        overlayData = parseNSWOverlayData(floodData)
      }
    } catch {
      // graceful degradation
    }

    // Step 4: PropTrack/Domain for market data (if key available)
    let marketData: {
      estimated_value?: number
      last_sold_price?: number
      last_sold_date?: string
      median_suburb_price?: number
      median_price_sqm?: number
      rental_estimate_weekly?: number
      vacancy_rate_pct?: number
      suburb_annual_growth_pct?: number
      days_on_market_avg?: number
      vendor_discount_pct?: number
    } = {}
    const proptrackKey = process.env.PROPTRACK_API_KEY
    if (proptrackKey) {
      try {
        const ptRes = await fetch(`${process.env.PROPTRACK_API_URL}/properties/suggest?q=${encodeURIComponent(address)}`, {
          headers: { 'Authorization': `Bearer ${proptrackKey}`, 'Accept': 'application/json' }
        })
        if (ptRes.ok) {
          const ptData = await ptRes.json()
          marketData = parsePropTrackData(ptData, suburb, state)
        }
      } catch {
        // PropTrack unavailable — show empty fields for manual entry
      }
    }

    const propertyData = {
      address: `${streetNumber} ${streetName}`.trim() || result.formatted_address,
      suburb,
      state: abbreviateState(state),
      postcode,
      lat: location.lat,
      lng: location.lng,
      formatted_address: result.formatted_address,
      ...zoningData,
      ...overlayData,
      ...marketData,
    }

    return NextResponse.json({ success: true, property: propertyData })
  } catch (err) {
    console.error('Property lookup error:', err)
    return NextResponse.json({ success: false, error: 'Lookup failed' }, { status: 500 })
  }
}

function parseNSWPlanningData(data: { layers?: Array<{ layerName?: string; results?: Array<{ layerAttributes?: { [key: string]: string } }> }> }) {
  const zoningLayer = data?.layers?.find((l: { layerName?: string }) =>
    l.layerName?.toLowerCase().includes('land use zone')
  )

  if (!zoningLayer?.results?.[0]) return {}

  const attrs = zoningLayer.results[0].layerAttributes ?? {}
  const zoningCode = attrs['ZONE_CODE'] ?? attrs['LZN_SYM'] ?? ''
  const zoningDesc = attrs['ZONE_NAME'] ?? attrs['LZN_LAB'] ?? ''

  // Determine DA complexity from zoning
  let da_complexity = 'medium'
  if (zoningCode.startsWith('RU') || zoningCode === 'E1' || zoningCode === 'E2') da_complexity = 'high'
  else if (zoningCode === 'R1' || zoningCode === 'R2') da_complexity = 'low'
  else if (zoningCode === 'R3' || zoningCode === 'R4') da_complexity = 'medium'
  else if (zoningCode.startsWith('B') || zoningCode.startsWith('MU')) da_complexity = 'medium'

  return {
    zoning_code: zoningCode,
    zoning_description: zoningDesc,
    dual_occ_eligible: ['R1', 'R2', 'R3', 'RU5'].includes(zoningCode),
    subdivision_potential: ['R1', 'R2', 'R3', 'R4', 'RU1', 'RU2'].includes(zoningCode),
    da_complexity,
  }
}

function parseNSWOverlayData(data: { layers?: Array<{ layerName?: string }> }) {
  const layers = data?.layers ?? []
  const layerNames = layers.map((l: { layerName?: string }) => (l.layerName ?? '').toLowerCase())

  return {
    flood_overlay: layerNames.some(n => n.includes('flood')),
    bushfire_overlay: layerNames.some(n => n.includes('bushfire') || n.includes('bush fire')),
    acid_sulfate_soils: layerNames.some(n => n.includes('acid sulfate') || n.includes('ass')),
  }
}

function parsePropTrackData(data: { properties?: Array<{ avm?: number; lastSalePrice?: number; lastSaleDate?: string }> }, suburb: string, state: string) {
  const prop = data?.properties?.[0]
  if (!prop) return {}

  return {
    estimated_value: prop.avm,
    last_sold_price: prop.lastSalePrice,
    last_sold_date: prop.lastSaleDate,
  }
}

function abbreviateState(state: string): string {
  const map: { [key: string]: string } = {
    'New South Wales': 'NSW',
    'Victoria': 'VIC',
    'Queensland': 'QLD',
    'Western Australia': 'WA',
    'South Australia': 'SA',
    'Tasmania': 'TAS',
    'Australian Capital Territory': 'ACT',
    'Northern Territory': 'NT',
  }
  return map[state] ?? state
}
