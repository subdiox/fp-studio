// ===== 教育費データ（年額・万円） =====
// 出典の目安：文部科学省「子供の学習費調査(R3)」および国公私立大学の標準的な学費。
// 学習費総額（授業料・給食費・学校外活動費等を含む）をベースにした概算値。
// 幼児教育無償化・高校就学支援金などの制度は地域・所得で変動するため、ここでは
// 計画づくり用の「目安」として固定値を採用している（UIから個別に調整可能）。

import type { Child } from './types'

const NURSERY_ANNUAL = 35 // 認可保育園 0〜2歳の自己負担 概算
const KINDER = { public: 16.5, private: 30.9 } // 幼稚園 3〜5歳
const ELEMENTARY = { public: 35.3, private: 166.7 }
const JUNIOR = { public: 53.9, private: 143.6 }
const HIGH = { public: 51.3, private: 105.4 }

// 塾・予備校（学年別の年額・万円）
const JUKU_JUNIOR: Record<number, number> = { 9: 50, 10: 70, 11: 110 } // 中学受験塾（小4〜小6）
const JUKU_UNIV: Record<number, number> = { 15: 30, 16: 40, 17: 70 } // 大学受験塾・予備校（高1〜高3）

interface UnivCost {
  entrance: number // 入学金（初年度のみ）
  annual: number // 年間（授業料＋施設費等）
}
const UNIV: Record<'national' | 'privateHum' | 'privateSci', UnivCost> = {
  national: { entrance: 28.2, annual: 57.6 },
  privateHum: { entrance: 24.0, annual: 102.0 },
  privateSci: { entrance: 26.0, annual: 138.0 },
}
const UNIV_LIVING_ALONE_ANNUAL = 100 // 一人暮らしの仕送り・住居費 加算/年

export interface ChildEduCost {
  amount: number
  labels: string[] // 進学・イベントのラベル（複数同時もあり）
}

/** ある年の、その子ども1人にかかる教育費（万円）とライフイベントを返す */
export function childEducationCost(child: Child, year: number): ChildEduCost {
  const age = year - child.birthYear
  const labels: string[] = []
  if (age < 0) return { amount: 0, labels }
  let amount = 0

  // ---- 学校（年齢で進学段階を判定） ----
  if (age <= 5) {
    // 未就学：インター or 保育園・幼稚園
    if (child.preschool === 'international') {
      if (age >= child.interPreschoolFromAge) {
        amount += child.interPreschoolAnnual
        if (age === child.interPreschoolFromAge) labels.push(`${child.name} インター入園`)
      }
    } else if (age <= 2) {
      amount += NURSERY_ANNUAL
    } else {
      amount += KINDER[child.preschool]
      if (age === 3) labels.push(`${child.name} 入園`)
    }
  } else if (age <= 11) {
    amount += ELEMENTARY[child.elementary]
    if (age === 6) labels.push(`${child.name} 小学校入学`)
  } else if (age <= 14) {
    amount += JUNIOR[child.juniorHigh]
    if (age === 12) labels.push(`${child.name} 中学校入学`)
  } else if (age <= 17) {
    amount += HIGH[child.highSchool]
    if (age === 15) labels.push(`${child.name} 高校入学`)
  } else if (age <= 21) {
    if (child.university !== 'none') {
      const u = UNIV[child.university]
      const living = child.universityLivingAlone ? UNIV_LIVING_ALONE_ANNUAL : 0
      const entrance = age === 18 ? u.entrance : 0
      amount += u.annual + entrance + living
      if (age === 18) labels.push(`${child.name} 大学入学`)
    } else if (age === 18) {
      labels.push(`${child.name} 就職`)
    }
  } else if (age === 22) {
    labels.push(`${child.name} 独立`)
  }

  // ---- 塾・予備校（学校費に上乗せ） ----
  if (child.jukuJunior && JUKU_JUNIOR[age]) {
    amount += JUKU_JUNIOR[age]
    if (age === 9) labels.push(`${child.name} 中学受験塾`)
  }
  if (child.jukuUniv && JUKU_UNIV[age]) {
    amount += JUKU_UNIV[age]
    if (age === 15) labels.push(`${child.name} 大学受験塾`)
  }

  return { amount, labels }
}
