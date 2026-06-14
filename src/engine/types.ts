// ===== ライフプラン・シミュレーション 型定義 =====
// 金額の単位はすべて「万円」。年次（1年刻み）でシミュレーションする。

export type EduChoice = 'public' | 'private'
export type PreschoolChoice = 'public' | 'private' | 'international'
export type UnivChoice = 'none' | 'national' | 'privateHum' | 'privateSci'
export type HousingMode = 'rent' | 'own'

/** カスタム支出の種別 */
export type ExpenseKind = 'monthly' | 'yearly' | 'spot'

export interface CustomExpense {
  id: string
  name: string
  amount: number // 万円（monthly=月額 / yearly=年額 / spot=1回あたり）
  kind: ExpenseKind
  startAge: number // 本人が何歳から（spot=最初の発生年齢）
  endAge: number // 本人が何歳まで（monthly/yearly のみ）
  everyYears: number // spot のとき何年ごとに繰り返すか（0/1=1回のみ）
  inflate: boolean // 物価上昇率を反映するか
}

export interface Child {
  id: string
  name: string
  birthYear: number
  preschool: PreschoolChoice // 未就学：公立/私立（保育園・幼稚園）or インター
  interPreschoolAnnual: number // インターの年額・万円
  interPreschoolFromAge: number // インターに通い始める年齢
  elementary: EduChoice
  juniorHigh: EduChoice
  highSchool: EduChoice
  university: UnivChoice
  universityLivingAlone: boolean // 大学から一人暮らし（仕送り加算）
  jukuJunior: boolean // 中学受験の塾（小4〜小6）
  jukuUniv: boolean // 大学受験の塾・予備校（高1〜高3）
}

export interface Earner {
  enabled: boolean
  name: string
  birthYear: number
  annualIncome: number // 額面年収（賞与込み）・万円。税・社会保険料は自動控除
  incomeGrowth: number // 昇給率 %/年（退職まで）
  retireAge: number // この年齢で退職（給与停止・退職金受取）
  severancePay: number // 退職金・万円
  autoPension: boolean // 年金を年収から自動計算するか
  pensionAnnual: number // 想定年金 年額・万円（手動時。autoPension=false のとき使用）
  pensionStartAge: number // 受給開始年齢
}

export interface HousingPlan {
  mode: HousingMode
  rent: {
    monthly: number // 家賃 月額・万円
    renewalEveryYears: number // 更新周期（年）。更新料=家賃1ヶ月
    increaseRate: number // 家賃上昇率 %/年
  }
  own: {
    purchaseYear: number
    price: number // 物件価格・万円
    downPayment: number // 頭金・万円
    loanRate: number // 住宅ローン金利 %/年
    loanYears: number // 返済期間（年）
    maintenanceAnnual: number // 固定資産税＋管理費・修繕積立 年額・万円
    rentBeforePurchase: number // 購入前の家賃 月額・万円
  }
}

export interface TravelPlan {
  annualBudget: number // 毎年の旅行予算・万円
  bigTripEveryYears: number // 大型海外旅行の周期（年, 0=なし）
  bigTripCost: number // 大型旅行1回の費用・万円
  untilPrimaryAge: number // 主たる稼ぎ手が何歳になるまで旅行するか
}

/** 積立プランの1区間（本人年齢 fromAge〜toAge の間、毎月この金額を積み立てる） */
export interface ContributionPhase {
  id: string
  fromAge: number // 本人年齢から
  toAge: number // 本人年齢まで（含む）
  nisaMonthly: number // 本人の新NISAへの月額・万円
  spouseNisaMonthly: number // 配偶者の新NISAへの月額・万円
  idecoMonthly: number // 本人のiDeCoへの月額・万円
  spouseIdecoMonthly: number // 配偶者のiDeCoへの月額・万円
  tokuteiMonthly: number // 特定口座（世帯）への月額・万円
}

export interface NisaPlan {
  phases: ContributionPhase[] // 積立プラン（期間ごとに金額を設定）
  expectedReturn: number // 想定利回り %/年（両口座共通）
}

export interface Plan {
  startYear: number
  endAge: number // 主たる稼ぎ手がこの年齢になるまでシミュレーション
  inflation: number // 物価上昇率 %/年（生活費に適用）
  self: Earner
  spouse: Earner
  children: Child[]
  monthlyBasic: number // 基本生活費 月額・万円（住居費を除く）
  housing: HousingPlan
  travel: TravelPlan
  customExpenses: CustomExpense[]
  nisa: NisaPlan
  initialCash: number // 現在の現金・預金（世帯）・万円
  // ↓ 本人の口座
  initialNisaValue: number // 本人の現在のNISA評価額・万円
  initialNisaPrincipal: number // 本人の現在のNISA簿価・万円
  initialTokuteiValue: number // 本人の現在の特定口座 評価額・万円
  initialTokuteiPrincipal: number // 本人の現在の特定口座 簿価・万円
  // ↓ 配偶者の口座
  spouseInitialNisaValue: number // 配偶者の現在のNISA評価額・万円
  spouseInitialNisaPrincipal: number // 配偶者の現在のNISA簿価・万円
  spouseInitialTokuteiValue: number // 配偶者の現在の特定口座 評価額・万円
  spouseInitialTokuteiPrincipal: number // 配偶者の現在の特定口座 簿価・万円
  initialIdecoValue: number // 本人の現在のiDeCo評価額・万円
  spouseInitialIdecoValue: number // 配偶者の現在のiDeCo評価額・万円
}

export interface YearRow {
  year: number
  selfAge: number
  spouseAge: number | null
  income: number // 給与＋年金（可処分）
  salaryIncome: number // うち給与（退職で0になる）
  pensionIncome: number // うち年金（生涯支給）
  severance: number // 退職金（その年のみ）
  livingCost: number
  housingCost: number
  educationCost: number
  travelCost: number
  otherCost: number // カスタム支出の合計
  expenseTotal: number // 生活＋住居＋教育＋旅行＋その他（投資積立は含まない）
  nisaContribution: number // その年に投資（NISA＋特定口座）へ積み立てた額
  drawdown: number // その年に投資から取り崩した額（売却額）
  drawdownTax: number // 取り崩し時に特定口座で課税された額
  netCashflow: number // income + severance - expenseTotal（投資積立前の年間収支）
  cashBalance: number // 現金・預金残高
  investmentBalance: number // 投資評価額 合計（NISA＋特定口座）
  nisaBalance: number // NISA評価額（本人＋配偶者）
  selfNisaBalance: number // 本人NISA 評価額
  spouseNisaBalance: number // 配偶者NISA 評価額
  idecoBalance: number // iDeCo評価額（本人＋配偶者）
  tokuteiBalance: number // 特定口座 評価額
  nisaPrincipalUsed: number // NISA簿価 累計（本人＋配偶者）
  totalAssets: number // 現金＋投資
  events: string[]
}

export interface SimResult {
  rows: YearRow[]
  // サマリー
  peakAssets: number
  minCashAfterStart: number // シミュレーション中の現金残高の最小値
  minCashYear: number
  endAssets: number
  firstNegativeYear: number | null // 純資産（現金）が初めてマイナスになる年
  nisaLifetimeUsed: number // 最終的に使ったNISA簿価
}

export const NISA = {
  ANNUAL_TSUMITATE: 120, // 万円/年
  ANNUAL_GROWTH: 240,
  LIFETIME_TOTAL: 1800,
  LIFETIME_GROWTH: 1200,
} as const

/** iDeCo は原則この年齢まで引き出せない（ここでは受給開始＝65歳とする） */
export const IDECO_UNLOCK_AGE = 65
