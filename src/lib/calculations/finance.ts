// ============================================================
// ANBM Property Intelligence - Financial Calculations Engine
// All figures accurate for NSW 2026
// ============================================================

import type { FinancialModel, StampDutyResult, Strategy } from '@/types'

// ============================================================
// NSW STAMP DUTY 2026
// ============================================================
export function calcStampDuty(purchasePrice: number, isForeignBuyer = false): StampDutyResult {
  let duty = 0

  // NSW transfer duty thresholds 2026
  if (purchasePrice <= 16000) {
    duty = purchasePrice * 0.0125
  } else if (purchasePrice <= 35000) {
    duty = 200 + (purchasePrice - 16000) * 0.015
  } else if (purchasePrice <= 93000) {
    duty = 485 + (purchasePrice - 35000) * 0.0175
  } else if (purchasePrice <= 351000) {
    duty = 1500 + (purchasePrice - 93000) * 0.035
  } else if (purchasePrice <= 1168000) {
    duty = 10530 + (purchasePrice - 351000) * 0.045
  } else if (purchasePrice <= 3505000) {
    duty = 47295 + (purchasePrice - 1168000) * 0.055
  } else {
    duty = 175810 + (purchasePrice - 3505000) * 0.07
  }

  const foreignSurcharge = isForeignBuyer ? purchasePrice * 0.08 : 0

  return {
    duty: Math.round(duty),
    breakdown: formatStampDutyBreakdown(purchasePrice, duty),
    foreign_surcharge: Math.round(foreignSurcharge),
    total: Math.round(duty + foreignSurcharge),
  }
}

function formatStampDutyBreakdown(price: number, duty: number): string {
  return `Purchase price $${price.toLocaleString()} → NSW transfer duty $${Math.round(duty).toLocaleString()} (${((duty / price) * 100).toFixed(2)}% effective rate)`
}

// ============================================================
// ACQUISITION COSTS (total)
// ============================================================
export interface AcquisitionCosts {
  purchasePrice: number
  stampDuty: number
  legal: number
  buildingInspection: number
  pestInspection: number
  other: number
  total: number
}

export function calcAcquisitionCosts(
  purchasePrice: number,
  options: {
    legal?: number
    buildingInspection?: number
    pestInspection?: number
    other?: number
    isForeignBuyer?: boolean
  } = {}
): AcquisitionCosts {
  const stampDuty = calcStampDuty(purchasePrice, options.isForeignBuyer).total
  const legal = options.legal ?? 2500
  const buildingInspection = options.buildingInspection ?? 800
  const pestInspection = options.pestInspection ?? 400
  const other = options.other ?? 0

  return {
    purchasePrice,
    stampDuty,
    legal,
    buildingInspection,
    pestInspection,
    other,
    total: purchasePrice + stampDuty + legal + buildingInspection + pestInspection + other,
  }
}

// ============================================================
// HOLDING COSTS
// ============================================================
export interface HoldingCosts {
  loanAmount: number
  interestRate: number
  weeksHeld: number
  interestCost: number
  councilRates: number
  insuranceConstruction: number
  other: number
  total: number
}

export function calcHoldingCosts(
  purchasePrice: number,
  depositPct: number,
  interestRatePct: number,
  weeksHeld: number,
  options: {
    councilRates?: number
    insurance?: number
    other?: number
  } = {}
): HoldingCosts {
  const loanAmount = purchasePrice * (1 - depositPct / 100)
  const weeklyInterest = (loanAmount * (interestRatePct / 100)) / 52
  const interestCost = weeklyInterest * weeksHeld

  return {
    loanAmount: Math.round(loanAmount),
    interestRate: interestRatePct,
    weeksHeld,
    interestCost: Math.round(interestCost),
    councilRates: options.councilRates ?? 1800,
    insuranceConstruction: options.insurance ?? 3000,
    other: options.other ?? 0,
    total: Math.round(interestCost + (options.councilRates ?? 1800) + (options.insurance ?? 3000) + (options.other ?? 0)),
  }
}

// ============================================================
// FLIP ANALYSIS
// ============================================================
export interface FlipAnalysis {
  totalIn: number
  salePrice: number
  agentCommission: number
  marketingCost: number
  conveyancing: number
  totalSaleCosts: number
  netProceeds: number
  grossProfit: number
  cgtEstimate: number
  netProfitAfterTax: number
  roi: number
  annualisedROI: number
  cashOnCash: number
  months: number
  verdict: 'strong' | 'ok' | 'marginal' | 'pass'
}

export function calcFlip(
  totalIn: number,
  salePrice: number,
  buildWeeks: number,
  depositPct: number,
  options: {
    agentCommissionPct?: number
    marketingCost?: number
    conveyancing?: number
    cgDiscountEligible?: boolean // held > 12 months
  } = {}
): FlipAnalysis {
  const agentCommissionPct = options.agentCommissionPct ?? 2.0
  const marketingCost = options.marketingCost ?? 8000
  const conveyancing = options.conveyancing ?? 1800

  const agentCommission = Math.round(salePrice * (agentCommissionPct / 100))
  const totalSaleCosts = agentCommission + marketingCost + conveyancing
  const netProceeds = salePrice - totalSaleCosts
  const grossProfit = netProceeds - totalIn

  // CGT: 47% marginal tax, 50% discount if held >12 months
  const taxableGain = options.cgDiscountEligible ? grossProfit * 0.5 : grossProfit
  const cgtEstimate = Math.max(0, Math.round(taxableGain * 0.47))
  const netProfitAfterTax = grossProfit - cgtEstimate

  const depositAmount = totalIn * (depositPct / 100)
  const roi = totalIn > 0 ? (grossProfit / totalIn) * 100 : 0
  const months = buildWeeks / 4.33
  const annualisedROI = months > 0 ? (roi / months) * 12 : 0
  const cashOnCash = depositAmount > 0 ? (netProfitAfterTax / depositAmount) * 100 : 0

  let verdict: FlipAnalysis['verdict'] = 'pass'
  if (roi >= 25) verdict = 'strong'
  else if (roi >= 15) verdict = 'ok'
  else if (roi >= 8) verdict = 'marginal'

  return {
    totalIn,
    salePrice,
    agentCommission,
    marketingCost,
    conveyancing,
    totalSaleCosts,
    netProceeds,
    grossProfit: Math.round(grossProfit),
    cgtEstimate,
    netProfitAfterTax: Math.round(netProfitAfterTax),
    roi: Math.round(roi * 10) / 10,
    annualisedROI: Math.round(annualisedROI * 10) / 10,
    cashOnCash: Math.round(cashOnCash * 10) / 10,
    months: Math.round(months * 10) / 10,
    verdict,
  }
}

// ============================================================
// HOLD / RENT ANALYSIS
// ============================================================
export interface HoldAnalysis {
  weeklyRent: number
  annualGrossRent: number
  vacancyLoss: number
  propertyManagement: number
  maintenance: number
  insurance: number
  councilRates: number
  interestCost: number
  netAnnualCashflow: number
  grossYield: number
  netYield: number
  negativelygearing: boolean
  negativeGearingBenefit: number
  equityYear1: number
  equityYear5: number
  equityYear10: number
}

export function calcHold(
  purchasePrice: number,
  buildCost: number,
  weeklyRent: number,
  loanAmount: number,
  interestRatePct: number,
  annualGrowthPct: number,
  options: {
    vacancyPct?: number
    managementPct?: number
    maintenance?: number
    insurance?: number
    councilRates?: number
    marginalTaxRate?: number
  } = {}
): HoldAnalysis {
  const totalValue = purchasePrice + buildCost
  const annualGrossRent = weeklyRent * 52
  const vacancyPct = options.vacancyPct ?? 4
  const managementPct = options.managementPct ?? 7
  const marginalTaxRate = options.marginalTaxRate ?? 0.47

  const vacancyLoss = Math.round(annualGrossRent * (vacancyPct / 100))
  const effectiveRent = annualGrossRent - vacancyLoss
  const propertyManagement = Math.round(effectiveRent * (managementPct / 100))
  const maintenance = options.maintenance ?? 3000
  const insurance = options.insurance ?? 2000
  const councilRates = options.councilRates ?? 1800
  const interestCost = Math.round(loanAmount * (interestRatePct / 100))

  const totalExpenses = propertyManagement + maintenance + insurance + councilRates + interestCost
  const netAnnualCashflow = Math.round(effectiveRent - totalExpenses)
  const grossYield = Math.round((annualGrossRent / totalValue) * 1000) / 10
  const netYield = Math.round(((effectiveRent - (totalExpenses - interestCost)) / totalValue) * 1000) / 10

  const negativelygearing = netAnnualCashflow < 0
  const negativeGearingBenefit = negativelygearing
    ? Math.round(Math.abs(netAnnualCashflow) * marginalTaxRate)
    : 0

  // Equity projections (compound growth)
  const equity = (years: number) => {
    const futureValue = totalValue * Math.pow(1 + annualGrowthPct / 100, years)
    return Math.round(futureValue - loanAmount)
  }

  return {
    weeklyRent,
    annualGrossRent,
    vacancyLoss,
    propertyManagement,
    maintenance,
    insurance,
    councilRates,
    interestCost,
    netAnnualCashflow,
    grossYield,
    netYield,
    negativelygearing,
    negativeGearingBenefit,
    equityYear1: equity(1),
    equityYear5: equity(5),
    equityYear10: equity(10),
  }
}

// ============================================================
// MAX PUSH — WHAT ALEX SHOULD HUSTLE TOWARD
// ============================================================
export interface MaxPushAnalysis {
  // Purchase
  maxPurchasePriceFor20pctROI: number
  maxPurchasePriceFor30pctROI: number
  maxPurchasePriceFor50pctROI: number

  // Build
  maxBuildBudgetFor20pct: number
  maxBuildBudgetFor30pct: number

  // Sale targets
  minSalePriceToBreakeven: number
  minSalePriceFor20pctROI: number
  minSalePriceFor30pctROI: number
  minSalePriceFor50pctROI: number

  // Trade savings (using your team vs market)
  estimatedTradeSavings: number
  estimatedChinaSourcingSavings: number
  totalEdge: number

  // Potential
  bestCaseProfit: number
  realisticProfit: number
  worstCaseProfit: number
}

export function calcMaxPush(
  saleEstimate: number,
  buildCost: number,
  depositPct: number,
  buildWeeks: number,
  options: {
    agentCommissionPct?: number
    marketingCost?: number
    targetROIPct?: number
    tradeSavingsPct?: number // % saved vs full market rates using your trades
    chinaSourcingPct?: number // % saved on materials via China
  } = {}
): MaxPushAnalysis {
  const agentPct = options.agentCommissionPct ?? 2.0
  const marketing = options.marketingCost ?? 8000
  const conveyancing = 1800
  const saleCosts = saleEstimate * (agentPct / 100) + marketing + conveyancing

  // Net from sale after selling costs
  const netFromSale = saleEstimate - saleCosts

  // Work backwards: what can we pay (purchase + stamp + legals + holding) for target ROI?
  const calcMaxPurchaseForROI = (targetROI: number): number => {
    // netFromSale = totalIn * (1 + targetROI/100)
    // totalIn = purchase + stamp(purchase) + legals + buildCost + holding
    // Approximate stamp at 4.5% for mid-range
    // Iterate
    let p = netFromSale / (1 + targetROI / 100) - buildCost - 15000 // rough legals+holding
    for (let i = 0; i < 10; i++) {
      const stamp = calcStampDuty(p).total
      const acquisition = p + stamp + 2500 + 1200 + 400
      const holding = calcHoldingCosts(p, depositPct, 6.5, buildWeeks).total
      const totalIn = acquisition + buildCost + holding
      p = (netFromSale / (1 + targetROI / 100)) - totalIn + p
    }
    return Math.round(p / 1000) * 1000
  }

  const max20 = calcMaxPurchaseForROI(20)
  const max30 = calcMaxPurchaseForROI(30)
  const max50 = calcMaxPurchaseForROI(50)

  // Sale price targets (assuming some purchase price)
  const assumedPurchase = max30
  const stamp = calcStampDuty(assumedPurchase).total
  const baseAcquisition = assumedPurchase + stamp + 4100
  const baseHolding = calcHoldingCosts(assumedPurchase, depositPct, 6.5, buildWeeks).total
  const baseTotalIn = baseAcquisition + buildCost + baseHolding

  const minSaleBreakeven = Math.round((baseTotalIn + saleCosts) * 1.001)
  const minSale20 = Math.round(baseTotalIn * 1.20 + saleCosts)
  const minSale30 = Math.round(baseTotalIn * 1.30 + saleCosts)
  const minSale50 = Math.round(baseTotalIn * 1.50 + saleCosts)

  // Trade & China savings
  const tradeSavingsPct = options.tradeSavingsPct ?? 22 // ~22% savings using family/mate rates
  const chinaPct = options.chinaSourcingPct ?? 35 // ~35% savings on materials from China
  const materialsEstimate = buildCost * 0.40 // materials ~40% of build cost
  const labourEstimate = buildCost * 0.60

  const tradeSavings = Math.round(labourEstimate * (tradeSavingsPct / 100))
  const chinaSavings = Math.round(materialsEstimate * (chinaPct / 100))
  const totalEdge = tradeSavings + chinaSavings

  // Scenarios
  const bestCaseProfit = Math.round(saleEstimate * 1.08 - baseTotalIn * 0.90 - saleCosts + totalEdge)
  const realisticProfit = Math.round(saleEstimate - baseTotalIn - saleCosts + totalEdge)
  const worstCaseProfit = Math.round(saleEstimate * 0.93 - baseTotalIn * 1.15 - saleCosts)

  return {
    maxPurchasePriceFor20pctROI: max20,
    maxPurchasePriceFor30pctROI: max30,
    maxPurchasePriceFor50pctROI: max50,
    maxBuildBudgetFor20pct: Math.round(max20 * 0.25),
    maxBuildBudgetFor30pct: Math.round(max30 * 0.20),
    minSalePriceToBreakeven: minSaleBreakeven,
    minSalePriceFor20pctROI: minSale20,
    minSalePriceFor30pctROI: minSale30,
    minSalePriceFor50pctROI: minSale50,
    estimatedTradeSavings: tradeSavings,
    estimatedChinaSourcingSavings: chinaSavings,
    totalEdge,
    bestCaseProfit,
    realisticProfit,
    worstCaseProfit,
  }
}

// ============================================================
// COMPOSITE DEAL SCORE (0-100)
// ============================================================
export function calcCompositeScore(scores: {
  structure?: number
  location?: number
  da_risk?: number
  access?: number
  vendor_motivation?: number
  gut?: number
  growth_potential?: number
  renovation_complexity?: number
}): { score: number; grade: 'A' | 'B' | 'C' | 'D' } {
  const weights = {
    structure: 0.15,
    location: 0.20,
    da_risk: 0.15,
    access: 0.08,
    vendor_motivation: 0.10,
    gut: 0.12,
    growth_potential: 0.12,
    renovation_complexity: 0.08,
  }

  let weightedSum = 0
  let totalWeight = 0

  for (const [key, weight] of Object.entries(weights)) {
    const val = scores[key as keyof typeof scores]
    if (val !== undefined) {
      weightedSum += val * weight
      totalWeight += weight
    }
  }

  const raw = totalWeight > 0 ? (weightedSum / totalWeight) * 10 : 0
  const score = Math.round(raw)

  let grade: 'A' | 'B' | 'C' | 'D' = 'D'
  if (score >= 75) grade = 'A'
  else if (score >= 55) grade = 'B'
  else if (score >= 35) grade = 'C'

  return { score, grade }
}

// ============================================================
// FREIGHT / CHINA SOURCING CALCULATOR
// ============================================================
export interface FreightCalc {
  cbm: number
  seaFreightAUD: number
  customsDutyAUD: number
  localDeliveryAUD: number
  totalLandedCostAUD: number
  auTradePriceAUD: number
  savingAUD: number
  savingPct: number
  leadTimeWeeks: number
}

export function calcChineseFreight(
  productCostAUD: number,
  weightKg: number,
  volumeCbm: number,
  auTradePriceAUD: number,
  customsDutyPct = 5
): FreightCalc {
  // 2026 estimate: ~$2,200-2,800 AUD per CBM sea freight China→Sydney
  const ratePerCbm = 2500
  const seaFreightAUD = Math.round(volumeCbm * ratePerCbm)
  const customsDutyAUD = Math.round(productCostAUD * (customsDutyPct / 100))
  const localDeliveryAUD = Math.round(weightKg * 0.8 + 150) // rough local freight

  const totalLandedCostAUD = productCostAUD + seaFreightAUD + customsDutyAUD + localDeliveryAUD
  const savingAUD = auTradePriceAUD - totalLandedCostAUD
  const savingPct = Math.round((savingAUD / auTradePriceAUD) * 100)

  return {
    cbm: volumeCbm,
    seaFreightAUD,
    customsDutyAUD,
    localDeliveryAUD,
    totalLandedCostAUD: Math.round(totalLandedCostAUD),
    auTradePriceAUD,
    savingAUD: Math.round(savingAUD),
    savingPct,
    leadTimeWeeks: 10, // 4-6 production + 4 sea
  }
}

// ============================================================
// TRADE SCENARIO COMPARISON
// ============================================================
export interface TradeScenarioComparison {
  scenarios: {
    label: string
    tradesperson: string
    relationship: string
    totalLabourCost: number
    savingVsMarket: number
    savingPct: number
    available: boolean
    leadTimeDays: number
  }[]
  marketRate: number
  bestCase: number
  bestSaving: number
}

export function calcTradeScenarios(
  marketRateTotal: number,
  tradespeople: Array<{
    name: string
    relationship: string
    discountPct: number
    available: boolean
    leadTimeDays: number
  }>
): TradeScenarioComparison {
  const scenarios = tradespeople.map(t => {
    const cost = Math.round(marketRateTotal * (1 - t.discountPct / 100))
    return {
      label: t.name,
      tradesperson: t.name,
      relationship: t.relationship,
      totalLabourCost: cost,
      savingVsMarket: Math.round(marketRateTotal - cost),
      savingPct: t.discountPct,
      available: t.available,
      leadTimeDays: t.leadTimeDays,
    }
  })

  const available = scenarios.filter(s => s.available)
  const best = available.sort((a, b) => a.totalLabourCost - b.totalLabourCost)[0]

  return {
    scenarios,
    marketRate: marketRateTotal,
    bestCase: best?.totalLabourCost ?? marketRateTotal,
    bestSaving: best?.savingVsMarket ?? 0,
  }
}

// ============================================================
// FORMAT HELPERS
// ============================================================
export function fmtCurrency(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}k`
  return `$${Math.round(n).toLocaleString()}`
}

export function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`
}
