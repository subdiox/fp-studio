import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Child, ContributionPhase, CustomExpense, Plan } from '../engine/types'
import { defaultPlan, makeChild, makeExpense, makePhase, normalizePlan } from './defaults'

interface PlanState {
  plan: Plan
  /** ネストした値をミューテーション風に更新する（structuredClone でimmutable担保） */
  update: (fn: (draft: Plan) => void) => void
  addChild: () => void
  removeChild: (id: string) => void
  updateChild: (id: string, fn: (c: Child) => void) => void
  addExpense: () => void
  removeExpense: (id: string) => void
  updateExpense: (id: string, fn: (e: CustomExpense) => void) => void
  addPhase: () => void
  removePhase: (id: string) => void
  updatePhase: (id: string, fn: (p: ContributionPhase) => void) => void
  reset: () => void
}

export const usePlanStore = create<PlanState>()(
  persist(
    (set) => ({
      plan: defaultPlan,
      update: (fn) =>
        set((s) => {
          const draft = structuredClone(s.plan)
          fn(draft)
          return { plan: draft }
        }),
      addChild: () =>
        set((s) => {
          const draft = structuredClone(s.plan)
          const n = draft.children.length + 1
          // 末子のおおよそ2年後に生まれる想定で初期値を設定
          const base = draft.children.length
            ? Math.max(...draft.children.map((c) => c.birthYear)) + 2
            : draft.startYear
          draft.children.push(makeChild(base, `第${n}子`))
          return { plan: draft }
        }),
      removeChild: (id) =>
        set((s) => {
          const draft = structuredClone(s.plan)
          draft.children = draft.children.filter((c) => c.id !== id)
          return { plan: draft }
        }),
      updateChild: (id, fn) =>
        set((s) => {
          const draft = structuredClone(s.plan)
          const child = draft.children.find((c) => c.id === id)
          if (child) fn(child)
          return { plan: draft }
        }),
      addExpense: () =>
        set((s) => {
          const draft = structuredClone(s.plan)
          draft.customExpenses.push(makeExpense())
          return { plan: draft }
        }),
      removeExpense: (id) =>
        set((s) => {
          const draft = structuredClone(s.plan)
          draft.customExpenses = draft.customExpenses.filter((e) => e.id !== id)
          return { plan: draft }
        }),
      updateExpense: (id, fn) =>
        set((s) => {
          const draft = structuredClone(s.plan)
          const ex = draft.customExpenses.find((e) => e.id === id)
          if (ex) fn(ex)
          return { plan: draft }
        }),
      addPhase: () =>
        set((s) => {
          const draft = structuredClone(s.plan)
          const last = draft.nisa.phases[draft.nisa.phases.length - 1]
          const from = last ? Math.min(last.toAge + 1, 99) : 30
          draft.nisa.phases.push(
            makePhase(
              from,
              Math.min(from + 10, 100),
              last ? last.nisaMonthly : 5,
              last ? last.spouseNisaMonthly : 0,
              last ? last.idecoMonthly : 0,
              last ? last.spouseIdecoMonthly : 0,
              last ? last.tokuteiMonthly : 0,
            ),
          )
          return { plan: draft }
        }),
      removePhase: (id) =>
        set((s) => {
          const draft = structuredClone(s.plan)
          draft.nisa.phases = draft.nisa.phases.filter((p) => p.id !== id)
          return { plan: draft }
        }),
      updatePhase: (id, fn) =>
        set((s) => {
          const draft = structuredClone(s.plan)
          const ph = draft.nisa.phases.find((p) => p.id === id)
          if (ph) fn(ph)
          return { plan: draft }
        }),
      reset: () => set({ plan: structuredClone(defaultPlan) }),
    }),
    {
      name: 'fp-studio-plan-v4',
      // 古い保存データを現行スキーマにマージ（入力を保持したまま新フィールドを補完）
      merge: (persisted, current) => ({
        ...current,
        plan: normalizePlan((persisted as { plan?: unknown } | undefined)?.plan),
      }),
    },
  ),
)
