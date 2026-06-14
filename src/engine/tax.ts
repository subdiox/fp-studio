// ===== 額面年収 → 手取り（可処分所得）への変換 =====
// 日本の給与所得者を想定した概算。計画づくり用の目安であり、配偶者控除・扶養控除・
// 各種税額控除や自治体差・賞与の社会保険料区分などは簡略化している。
// 入出力は「万円」、内部計算は「円」。

/** 上場株式等の譲渡益課税（所得税15%＋復興2.1%＋住民税5%） */
export const CAPITAL_GAINS_TAX = 0.20315

/** 給与所得控除（2020年以降, 円） */
function employmentIncomeDeduction(gross: number): number {
  if (gross <= 1_625_000) return 550_000
  if (gross <= 1_800_000) return gross * 0.4 - 100_000
  if (gross <= 3_600_000) return gross * 0.3 + 80_000
  if (gross <= 6_600_000) return gross * 0.2 + 440_000
  if (gross <= 8_500_000) return gross * 0.1 + 1_100_000
  return 1_950_000 // 上限
}

/** 社会保険料（従業員負担, 円）。厚生年金・健康保険・介護保険(40歳〜)・雇用保険の概算 */
function socialInsurance(gross: number, age: number): number {
  // 厚生年金: 9.15%、標準報酬月額の上限65万円 → 年間ベース上限780万円
  const pension = Math.min(gross, 7_800_000) * 0.0915
  // 健康保険: 約5%（協会けんぽ・従業員負担）、上限あり。介護保険(40歳〜)は+0.8%
  const kaigo = age >= 40 ? 0.008 : 0
  const health = Math.min(gross, 16_680_000) * (0.05 + kaigo)
  // 雇用保険: 0.6%
  const koyo = gross * 0.006
  return pension + health + koyo
}

/** 所得税（復興特別所得税2.1%込み, 円） */
function incomeTax(taxable: number): number {
  const t = Math.floor(Math.max(0, taxable) / 1000) * 1000
  let tax: number
  if (t <= 1_950_000) tax = t * 0.05
  else if (t <= 3_300_000) tax = t * 0.1 - 97_500
  else if (t <= 6_950_000) tax = t * 0.2 - 427_500
  else if (t <= 9_000_000) tax = t * 0.23 - 636_000
  else if (t <= 18_000_000) tax = t * 0.33 - 1_536_000
  else if (t <= 40_000_000) tax = t * 0.4 - 2_796_000
  else tax = t * 0.45 - 4_796_000
  return Math.max(0, tax) * 1.021
}

/** 住民税（所得割10%＋均等割, 円） */
function residentTax(employmentIncome: number, social: number): number {
  const taxable = Math.max(0, employmentIncome - social - 430_000) // 基礎控除43万
  const income = Math.floor(taxable / 1000) * 1000 * 0.1
  return Math.max(0, income) + 5_000 // 均等割 約5,000円
}

/**
 * 額面年収（万円）と年齢から、手取り（可処分所得・万円）を返す。
 * idecoAnnualMan を渡すと小規模企業共済等掛金控除として課税所得から差し引く（iDeCoの節税効果）。
 * 返す手取りは「税・社会保険料を引いた額」で、iDeCo掛金そのものは含めない（掛金は別途現金から拠出）。
 */
export function disposableFromGross(grossMan: number, age: number, idecoAnnualMan = 0): number {
  const gross = grossMan * 10000
  if (gross <= 0) return 0
  const ideco = Math.max(0, idecoAnnualMan) * 10000
  const employmentIncome = gross - employmentIncomeDeduction(gross) // 給与所得
  const social = socialInsurance(gross, age)
  const taxableIncome = employmentIncome - social - ideco - 480_000 // 基礎控除48万＋iDeCo控除
  const itax = incomeTax(taxableIncome)
  const rtax = residentTax(employmentIncome - ideco, social)
  const disposable = gross - social - itax - rtax
  return Math.max(0, disposable) / 10000
}

/** 手取り率（参考表示用） */
export function takeHomeRate(grossMan: number, age: number): number {
  if (grossMan <= 0) return 0
  return disposableFromGross(grossMan, age) / grossMan
}

// ===== 公的年金の概算（年額・万円） =====
// 老齢基礎年金（満額）＋ 老齢厚生年金（報酬比例部分）のざっくり推定。
// 厚生年金 ≒ 平均年収 × 5.481/1000 × 加入月数 → 年収(万円) × 0.005481 × 加入年数。
// 加入年数は「22歳から退職まで」、年収は標準報酬の上限(月65万≒年780万)でクリップ。
// 計画用の目安であり、実際は加入期間・賞与・制度改定・繰上/繰下げ等で変動する。

const BASIC_PENSION_FULL = 81.6 // 老齢基礎年金 満額（2024年度, 万円/年）
const KOSEI_RATE = 0.005481
const KOSEI_INCOME_CAP = 780 // 厚生年金の対象年収の上限（万円）

/** 額面年収（万円）と退職年齢から、公的年金の年額（万円）を概算 */
export function estimatePension(annualIncomeMan: number, retireAge: number): number {
  if (annualIncomeMan <= 0) return BASIC_PENSION_FULL // 収入なし→基礎年金のみ（第3号など）
  const years = Math.max(0, Math.min(48, retireAge - 22)) // 22歳から退職まで
  const base = Math.min(annualIncomeMan, KOSEI_INCOME_CAP)
  const kosei = base * KOSEI_RATE * years
  return BASIC_PENSION_FULL + kosei
}
