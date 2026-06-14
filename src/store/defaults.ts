import type { Child, ContributionPhase, CustomExpense, NisaPlan, Plan } from '../engine/types'

export const CURRENT_YEAR = 2026

let uid = 0
function genId(prefix: string): string {
  uid += 1
  return `${prefix}_${CURRENT_YEAR}_${uid}`
}

export function makePhase(
  fromAge: number,
  toAge: number,
  nisaMonthly: number,
  spouseNisaMonthly: number,
  idecoMonthly: number,
  spouseIdecoMonthly: number,
  tokuteiMonthly: number,
): ContributionPhase {
  return { id: genId('ph'), fromAge, toAge, nisaMonthly, spouseNisaMonthly, idecoMonthly, spouseIdecoMonthly, tokuteiMonthly }
}

export function makeChild(birthYear: number, name: string): Child {
  return {
    id: genId('c'),
    name,
    birthYear,
    preschool: 'public',
    interPreschoolAnnual: 200,
    interPreschoolFromAge: 1,
    elementary: 'public',
    juniorHigh: 'public',
    highSchool: 'public',
    university: 'national',
    universityLivingAlone: false,
    jukuJunior: false,
    jukuUniv: false,
  }
}

export function makeExpense(): CustomExpense {
  return {
    id: genId('e'),
    name: '新しい支出',
    amount: 5,
    kind: 'yearly',
    startAge: 40,
    endAge: 60,
    everyYears: 0,
    inflate: false,
  }
}

export const defaultPlan: Plan = {
  startYear: CURRENT_YEAR,
  endAge: 95,
  inflation: 1.0,
  self: {
    enabled: true,
    name: '本人',
    birthYear: 1990,
    annualIncome: 600,
    incomeGrowth: 1.5,
    retireAge: 65,
    severancePay: 1500,
    autoPension: true,
    pensionAnnual: 180,
    pensionStartAge: 65,
  },
  spouse: {
    enabled: true,
    name: '配偶者',
    birthYear: 1992,
    annualIncome: 400,
    incomeGrowth: 1.0,
    retireAge: 65,
    severancePay: 600,
    autoPension: true,
    pensionAnnual: 120,
    pensionStartAge: 65,
  },
  children: [
    {
      ...makeChild(2024, '第1子'),
      preschool: 'international',
      interPreschoolAnnual: 200,
      interPreschoolFromAge: 1,
      juniorHigh: 'private',
      highSchool: 'private',
      jukuJunior: true,
      jukuUniv: true,
    },
  ],
  monthlyBasic: 22,
  housing: {
    mode: 'rent',
    rent: { monthly: 12, renewalEveryYears: 2, increaseRate: 0 },
    own: {
      purchaseYear: CURRENT_YEAR + 4,
      price: 4500,
      downPayment: 500,
      loanRate: 1.0,
      loanYears: 35,
      maintenanceAnnual: 30,
      rentBeforePurchase: 12,
    },
  },
  travel: {
    annualBudget: 20,
    bigTripEveryYears: 5,
    bigTripCost: 60,
    untilPrimaryAge: 75,
  },
  customExpenses: [
    {
      id: 'e_seed_car',
      name: '車の買い替え',
      amount: 250,
      kind: 'spot',
      startAge: 38,
      endAge: 75,
      everyYears: 8,
      inflate: false,
    },
  ],
  nisa: {
    phases: [makePhase(30, 49, 5, 3, 2, 1, 0), makePhase(50, 64, 10, 5, 2, 1, 3)],
    expectedReturn: 4.0,
  },
  initialCash: 300,
  initialNisaValue: 100,
  initialNisaPrincipal: 80,
  initialTokuteiValue: 0,
  initialTokuteiPrincipal: 0,
  spouseInitialNisaValue: 60,
  spouseInitialNisaPrincipal: 50,
  spouseInitialTokuteiValue: 0,
  spouseInitialTokuteiPrincipal: 0,
  initialIdecoValue: 0,
  spouseInitialIdecoValue: 0,
}

/**
 * 保存済みデータ（古いスキーマを含む）を現行スキーマにマージする。
 * 不足フィールドは既定値で補い、ユーザーの入力を保持したまま新機能を有効化する。
 */
export function normalizePlan(raw: unknown): Plan {
  const base = structuredClone(defaultPlan)
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Record<string, any>
  return {
    ...base,
    ...r,
    self: { ...base.self, ...(r.self ?? {}) },
    spouse: { ...base.spouse, ...(r.spouse ?? {}) },
    housing: {
      mode: r.housing?.mode ?? base.housing.mode,
      rent: { ...base.housing.rent, ...(r.housing?.rent ?? {}) },
      own: { ...base.housing.own, ...(r.housing?.own ?? {}) },
    },
    travel: { ...base.travel, ...(r.travel ?? {}) },
    nisa: normalizeNisa(r.nisa, r.self?.birthYear, r.self?.retireAge),
    children: Array.isArray(r.children) ? r.children.map(normalizeChild) : base.children,
    customExpenses: Array.isArray(r.customExpenses)
      ? r.customExpenses.map(normalizeExpense)
      : base.customExpenses,
    // 配偶者の初期資産・iDeCoは旧データに無いので 0 で補完（既存の入力を変えない）
    spouseInitialNisaValue: r.spouseInitialNisaValue ?? 0,
    spouseInitialNisaPrincipal: r.spouseInitialNisaPrincipal ?? 0,
    spouseInitialTokuteiValue: r.spouseInitialTokuteiValue ?? 0,
    spouseInitialTokuteiPrincipal: r.spouseInitialTokuteiPrincipal ?? 0,
    initialIdecoValue: r.initialIdecoValue ?? 0,
    spouseInitialIdecoValue: r.spouseInitialIdecoValue ?? 0,
  }
}

function normalizeNisa(raw: any, selfBirthYear?: number, selfRetireAge?: number): NisaPlan {
  const base = structuredClone(defaultPlan.nisa)
  if (!raw || typeof raw !== 'object') return base
  const expectedReturn = raw.expectedReturn ?? base.expectedReturn
  // 旧スキーマ（単一の積立額＋積立終了年齢）を1区間のプランに変換
  let phases: ContributionPhase[]
  if (Array.isArray(raw.phases)) {
    phases = raw.phases.map((p: any) => ({
      id: p?.id ?? genId('ph'),
      fromAge: p?.fromAge ?? 30,
      toAge: p?.toAge ?? 65,
      nisaMonthly: p?.nisaMonthly ?? 0,
      spouseNisaMonthly: p?.spouseNisaMonthly ?? 0,
      idecoMonthly: p?.idecoMonthly ?? 0,
      spouseIdecoMonthly: p?.spouseIdecoMonthly ?? 0,
      tokuteiMonthly: p?.tokuteiMonthly ?? 0,
    }))
  } else {
    const fromAge = selfBirthYear ? CURRENT_YEAR - selfBirthYear : 30
    const toAge = raw.contributeUntilPrimaryAge ?? selfRetireAge ?? 65
    phases = [makePhase(fromAge, toAge, raw.monthlyContribution ?? 5, 0, 0, 0, raw.monthlyTokutei ?? 0)]
  }
  return { phases, expectedReturn }
}

function normalizeChild(raw: any): Child {
  const base = makeChild(raw?.birthYear ?? CURRENT_YEAR, raw?.name ?? '子')
  return {
    ...base,
    ...raw,
    id: raw?.id ?? base.id,
    // 旧スキーマ（nursery/kinder）からの補完
    preschool: raw?.preschool ?? (raw?.kinder === 'private' ? 'private' : 'public'),
    interPreschoolAnnual: raw?.interPreschoolAnnual ?? base.interPreschoolAnnual,
    interPreschoolFromAge: raw?.interPreschoolFromAge ?? base.interPreschoolFromAge,
    jukuJunior: raw?.jukuJunior ?? false,
    jukuUniv: raw?.jukuUniv ?? false,
  }
}

function normalizeExpense(raw: any): CustomExpense {
  const base = makeExpense()
  return { ...base, ...raw, id: raw?.id ?? base.id }
}
