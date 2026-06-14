// ===== ライフプラン・シミュレーションのコアエンジン =====
import { childEducationCost } from './education'
import { CAPITAL_GAINS_TAX, disposableFromGross, estimatePension } from './tax'
import { IDECO_UNLOCK_AGE, NISA, type CustomExpense, type Earner, type Plan, type SimResult, type YearRow } from './types'

/** 元利均等返済の年間返済額（万円）。principal=借入額, rate=%/年, years=返済期間 */
export function annualMortgagePayment(principal: number, rate: number, years: number): number {
  if (principal <= 0 || years <= 0) return 0
  const r = rate / 100 / 12
  const n = years * 12
  if (r === 0) return principal / years
  const monthly = (principal * r) / (1 - Math.pow(1 + r, -n))
  return monthly * 12
}

interface SellResult {
  gross: number // 売却額（評価額の減少分）
  tax: number // 課税額
  net: number // 手取り（現金として受け取る額）
  value: number // 売却後の評価額
  principal: number // 売却後の簿価
}

/** 特定口座から手取り netTarget を得るために売却する。売却益に約20%課税 */
function sellTaxable(value: number, principal: number, netTarget: number): SellResult {
  if (value <= 0 || netTarget <= 0) return { gross: 0, tax: 0, net: 0, value, principal }
  const gainRatio = Math.max(0, (value - principal) / value)
  const netPerYen = 1 - gainRatio * CAPITAL_GAINS_TAX
  const maxNet = value * netPerYen // 全部売ったときの手取り
  const net = Math.min(netTarget, maxNet)
  const gross = Math.min(netPerYen > 0 ? net / netPerYen : value, value)
  const tax = gross * gainRatio * CAPITAL_GAINS_TAX
  const principalPortion = principal * (gross / value)
  return { gross, tax, net: gross - tax, value: value - gross, principal: principal - principalPortion }
}

/** NISAから売却（非課税）。売却額＝手取り */
function sellTaxFree(value: number, principal: number, netTarget: number): SellResult {
  if (value <= 0 || netTarget <= 0) return { gross: 0, tax: 0, net: 0, value, principal }
  const gross = Math.min(netTarget, value)
  const principalPortion = principal * (gross / value)
  return { gross, tax: 0, net: gross, value: value - gross, principal: principal - principalPortion }
}

/** 給与（手取り）。退職年齢に達すると0。idecoAnnual は所得控除として手取りを増やす */
function earnerSalary(e: Earner, year: number, startYear: number, idecoAnnual: number): number {
  if (!e.enabled) return 0
  const age = year - e.birthYear
  if (age >= e.retireAge) return 0
  const t = year - startYear
  const gross = e.annualIncome * Math.pow(1 + e.incomeGrowth / 100, t)
  return disposableFromGross(gross, age, idecoAnnual) // 額面 → 手取り（可処分, iDeCo控除込み）
}

/** 年金（受給開始年齢以降、生涯支給）。autoPension のときは年収から概算 */
function earnerPension(e: Earner, year: number): number {
  if (!e.enabled) return 0
  const age = year - e.birthYear
  if (age < e.pensionStartAge) return 0
  return e.autoPension ? estimatePension(e.annualIncome, e.retireAge) : e.pensionAnnual
}

/** その年・本人年齢における1つのカスタム支出の発生額（万円） */
function customExpenseCost(ex: CustomExpense, selfAge: number, t: number, inflation: number): number {
  const inflateFactor = ex.inflate ? Math.pow(1 + inflation / 100, t) : 1
  if (ex.kind === 'spot') {
    if (selfAge < ex.startAge) return 0
    const every = ex.everyYears > 1 ? ex.everyYears : 0
    if (every === 0) {
      return selfAge === ex.startAge ? ex.amount * inflateFactor : 0
    }
    if (selfAge > ex.endAge) return 0
    return (selfAge - ex.startAge) % every === 0 ? ex.amount * inflateFactor : 0
  }
  if (selfAge < ex.startAge || selfAge > ex.endAge) return 0
  const annual = ex.kind === 'monthly' ? ex.amount * 12 : ex.amount
  return annual * inflateFactor
}

function earnerSeverance(e: Earner, year: number): number {
  if (!e.enabled) return 0
  const age = year - e.birthYear
  return age === e.retireAge ? e.severancePay : 0
}

export function simulate(plan: Plan): SimResult {
  const { startYear } = plan
  const selfBirth = plan.self.birthYear
  const selfAgeStart = startYear - selfBirth
  const years = Math.max(1, plan.endAge - selfAgeStart + 1)

  // 住宅ローンの年間返済額（購入モードのとき）
  const loanPrincipal = Math.max(0, plan.housing.own.price - plan.housing.own.downPayment)
  const annualLoan = annualMortgagePayment(loanPrincipal, plan.housing.own.loanRate, plan.housing.own.loanYears)

  const sp = plan.spouse.enabled
  let cash = plan.initialCash // 現金・預金は世帯共通
  // NISAは本人・配偶者それぞれ別枠（各 NISA.LIFETIME_TOTAL=1,800万）。既存資産も本人/配偶者で分けて保持
  let selfNisaValue = plan.initialNisaValue
  let selfNisaPrincipal = plan.initialNisaPrincipal
  let spouseNisaValue = sp ? plan.spouseInitialNisaValue : 0
  let spouseNisaPrincipal = sp ? plan.spouseInitialNisaPrincipal : 0
  // iDeCoも本人・配偶者それぞれ別口座（65歳まで引き出せない）
  let selfIdecoValue = plan.initialIdecoValue
  let spouseIdecoValue = sp ? plan.spouseInitialIdecoValue : 0
  // 特定口座は枠の制約がないため世帯で合算して保持
  let tokuteiValue = plan.initialTokuteiValue + (sp ? plan.spouseInitialTokuteiValue : 0)
  let tokuteiPrincipal = plan.initialTokuteiPrincipal + (sp ? plan.spouseInitialTokuteiPrincipal : 0)

  const rows: YearRow[] = []

  for (let i = 0; i < years; i++) {
    const year = startYear + i
    const selfAge = year - selfBirth
    const spouseAge = plan.spouse.enabled ? year - plan.spouse.birthYear : null
    const t = i // 経過年数
    const events: string[] = []

    // ---- 当年の積立プラン（年齢が該当する最初の区間）。iDeCo拠出は年齢65未満のみ ----
    const phase = plan.nisa.phases.find((p) => selfAge >= p.fromAge && selfAge <= p.toAge)
    const selfIdecoAnnual = phase && selfAge < IDECO_UNLOCK_AGE ? phase.idecoMonthly * 12 : 0
    const spouseIdecoAnnual =
      phase && plan.spouse.enabled && spouseAge !== null && spouseAge < IDECO_UNLOCK_AGE
        ? phase.spouseIdecoMonthly * 12
        : 0

    // ---- 収入（iDeCo掛金は所得控除として手取りを押し上げる） ----
    const salaryIncome =
      earnerSalary(plan.self, year, startYear, selfIdecoAnnual) +
      earnerSalary(plan.spouse, year, startYear, spouseIdecoAnnual)
    const pensionIncome = earnerPension(plan.self, year) + earnerPension(plan.spouse, year)
    const income = salaryIncome + pensionIncome
    const severance = earnerSeverance(plan.self, year) + earnerSeverance(plan.spouse, year)
    if (earnerSeverance(plan.self, year) > 0) events.push(`${plan.self.name} 退職`)
    if (earnerSeverance(plan.spouse, year) > 0) events.push(`${plan.spouse.name} 退職`)
    if (plan.self.enabled && selfAge === plan.self.pensionStartAge) events.push(`${plan.self.name} 年金開始`)

    // ---- 生活費（インフレ反映） ----
    const livingCost = plan.monthlyBasic * 12 * Math.pow(1 + plan.inflation / 100, t)

    // ---- 住居費 ----
    let housingCost = 0
    let downPaymentThisYear = 0
    if (plan.housing.mode === 'rent') {
      const m = plan.housing.rent
      const monthly = m.monthly * Math.pow(1 + m.increaseRate / 100, t)
      housingCost = monthly * 12
      if (m.renewalEveryYears > 0 && i > 0 && i % m.renewalEveryYears === 0) {
        housingCost += monthly // 更新料 = 家賃1ヶ月
      }
    } else {
      const o = plan.housing.own
      if (year < o.purchaseYear) {
        housingCost = o.rentBeforePurchase * 12
      } else {
        const sinceBuy = year - o.purchaseYear
        if (sinceBuy < o.loanYears) housingCost += annualLoan
        housingCost += o.maintenanceAnnual
        if (year === o.purchaseYear) {
          downPaymentThisYear = o.downPayment
          events.push('住宅購入')
        }
        if (sinceBuy === o.loanYears && o.loanYears > 0) events.push('ローン完済')
      }
    }

    // ---- 教育費 ----
    let educationCost = 0
    for (const child of plan.children) {
      const c = childEducationCost(child, year)
      educationCost += c.amount
      for (const l of c.labels) events.push(l)
    }

    // ---- 旅行費 ----
    let travelCost = 0
    if (selfAge <= plan.travel.untilPrimaryAge) {
      travelCost += plan.travel.annualBudget
      if (plan.travel.bigTripEveryYears > 0 && i > 0 && i % plan.travel.bigTripEveryYears === 0) {
        travelCost += plan.travel.bigTripCost
        events.push('大型旅行')
      }
    }

    // ---- カスタム支出 ----
    let otherCost = 0
    for (const ex of plan.customExpenses) {
      const c = customExpenseCost(ex, selfAge, t, plan.inflation)
      if (c > 0) {
        otherCost += c
        if (ex.kind === 'spot') events.push(ex.name)
      }
    }

    const expenseTotal = livingCost + housingCost + educationCost + travelCost + otherCost
    const netCashflow = income + severance - expenseTotal

    // ---- 現金フロー（投資前） ----
    let cashAfterFlow = cash + netCashflow - downPaymentThisYear

    // ---- 投資（成長 → 積立 → 取り崩し） ----
    const r = plan.nisa.expectedReturn / 100
    selfNisaValue *= 1 + r
    spouseNisaValue *= 1 + r
    selfIdecoValue *= 1 + r
    spouseIdecoValue *= 1 + r
    tokuteiValue *= 1 + r

    // 当年の積立。iDeCo（本人→配偶者）→ NISA（本人→配偶者・各1,800万枠, 超過は特定）→ 特定口座 の順に現金の範囲で充当。
    let selfIdecoC = 0
    let spouseIdecoC = 0
    let selfNisaC = 0
    let spouseNisaC = 0
    let tokuteiContribution = 0
    if (phase) {
      let affordable = Math.max(0, cashAfterFlow)
      // iDeCo（65歳以降は拠出しない＝selfIdecoAnnual/spouseIdecoAnnual が0）
      selfIdecoC = Math.min(selfIdecoAnnual, affordable)
      affordable -= selfIdecoC
      spouseIdecoC = Math.min(spouseIdecoAnnual, affordable)
      affordable -= spouseIdecoC

      // NISA: 各自の枠（1,800万）まで。超えた希望分は特定口座へ
      const selfRoom = Math.max(0, NISA.LIFETIME_TOTAL - selfNisaPrincipal)
      const spouseRoom = Math.max(0, NISA.LIFETIME_TOTAL - spouseNisaPrincipal)
      const wantSelfNisa = phase.nisaMonthly * 12
      const wantSpouseNisa = plan.spouse.enabled ? phase.spouseNisaMonthly * 12 : 0
      const selfNisaWanted = Math.min(wantSelfNisa, selfRoom)
      const spouseNisaWanted = Math.min(wantSpouseNisa, spouseRoom)
      const overflow = wantSelfNisa - selfNisaWanted + (wantSpouseNisa - spouseNisaWanted)
      const wantTokutei = phase.tokuteiMonthly * 12 + overflow

      selfNisaC = Math.min(selfNisaWanted, affordable)
      affordable -= selfNisaC
      spouseNisaC = Math.min(spouseNisaWanted, affordable)
      affordable -= spouseNisaC
      tokuteiContribution = Math.min(wantTokutei, affordable)

      const selfBefore = selfNisaPrincipal
      const spouseBefore = spouseNisaPrincipal
      selfIdecoValue += selfIdecoC
      spouseIdecoValue += spouseIdecoC
      selfNisaValue += selfNisaC
      selfNisaPrincipal += selfNisaC
      spouseNisaValue += spouseNisaC
      spouseNisaPrincipal += spouseNisaC
      tokuteiValue += tokuteiContribution
      tokuteiPrincipal += tokuteiContribution
      if (selfBefore < NISA.LIFETIME_TOTAL && selfNisaPrincipal >= NISA.LIFETIME_TOTAL) {
        events.push('本人NISA枠 上限')
      }
      if (plan.spouse.enabled && spouseBefore < NISA.LIFETIME_TOTAL && spouseNisaPrincipal >= NISA.LIFETIME_TOTAL) {
        events.push('配偶者NISA枠 上限')
      }
    }
    const contribution = selfIdecoC + spouseIdecoC + selfNisaC + spouseNisaC + tokuteiContribution
    let cashAfterContribution = cashAfterFlow - contribution

    // ---- 取り崩し（現金不足分を補填）。特定口座（課税）→ NISA → iDeCo の順に売却 ----
    // iDeCoは65歳まで引き出せないため、それ以降のみ取り崩し対象。現金も投資も尽きて初めて資金ショート。
    let drawdown = 0
    let drawdownTax = 0
    if (cashAfterContribution < 0) {
      let need = -cashAfterContribution
      if (need > 0 && tokuteiValue > 0) {
        const s = sellTaxable(tokuteiValue, tokuteiPrincipal, need)
        tokuteiValue = s.value
        tokuteiPrincipal = s.principal
        cashAfterContribution += s.net
        drawdown += s.gross
        drawdownTax += s.tax
        need -= s.net
      }
      if (need > 0 && selfNisaValue > 0) {
        const s = sellTaxFree(selfNisaValue, selfNisaPrincipal, need)
        selfNisaValue = s.value
        selfNisaPrincipal = s.principal
        cashAfterContribution += s.net
        drawdown += s.gross
        need -= s.net
      }
      if (need > 0 && spouseNisaValue > 0) {
        const s = sellTaxFree(spouseNisaValue, spouseNisaPrincipal, need)
        spouseNisaValue = s.value
        spouseNisaPrincipal = s.principal
        cashAfterContribution += s.net
        drawdown += s.gross
        need -= s.net
      }
      // iDeCo（65歳以降のみ。受取税は退職所得控除等でほぼ非課税とみなし簡略化）
      if (need > 0 && selfAge >= IDECO_UNLOCK_AGE && selfIdecoValue > 0) {
        const s = sellTaxFree(selfIdecoValue, 0, need)
        selfIdecoValue = s.value
        cashAfterContribution += s.net
        drawdown += s.gross
        need -= s.net
      }
      if (need > 0 && spouseAge !== null && spouseAge >= IDECO_UNLOCK_AGE && spouseIdecoValue > 0) {
        const s = sellTaxFree(spouseIdecoValue, 0, need)
        spouseIdecoValue = s.value
        cashAfterContribution += s.net
        drawdown += s.gross
        need -= s.net
      }
    }
    if (drawdown > 0 && (i === 0 || rows[i - 1].drawdown === 0)) {
      events.push('取り崩し開始')
    }

    cash = cashAfterContribution
    const nisaValue = selfNisaValue + spouseNisaValue
    const nisaPrincipal = selfNisaPrincipal + spouseNisaPrincipal
    const idecoValue = selfIdecoValue + spouseIdecoValue
    const invest = nisaValue + tokuteiValue + idecoValue

    rows.push({
      year,
      selfAge,
      spouseAge,
      income,
      salaryIncome,
      pensionIncome,
      severance,
      livingCost,
      housingCost,
      educationCost,
      travelCost,
      otherCost,
      expenseTotal,
      nisaContribution: contribution,
      drawdown,
      drawdownTax,
      netCashflow,
      cashBalance: cash,
      investmentBalance: invest,
      nisaBalance: nisaValue,
      selfNisaBalance: selfNisaValue,
      spouseNisaBalance: spouseNisaValue,
      idecoBalance: idecoValue,
      tokuteiBalance: tokuteiValue,
      nisaPrincipalUsed: nisaPrincipal,
      totalAssets: cash + invest,
      events,
    })
  }

  // ---- サマリー集計 ----
  let peakAssets = -Infinity
  let minCash = Infinity
  let minCashYear = startYear
  let firstNegativeYear: number | null = null
  for (const r of rows) {
    if (r.totalAssets > peakAssets) peakAssets = r.totalAssets
    if (r.cashBalance < minCash) {
      minCash = r.cashBalance
      minCashYear = r.year
    }
    if (firstNegativeYear === null && r.cashBalance < 0) firstNegativeYear = r.year
  }

  return {
    rows,
    peakAssets: peakAssets === -Infinity ? 0 : peakAssets,
    minCashAfterStart: minCash === Infinity ? 0 : minCash,
    minCashYear,
    endAssets: rows.length ? rows[rows.length - 1].totalAssets : 0,
    firstNegativeYear,
    nisaLifetimeUsed: rows.length ? rows[rows.length - 1].nisaPrincipalUsed : 0,
  }
}
