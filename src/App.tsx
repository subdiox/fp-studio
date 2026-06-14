import { useMemo } from 'react'
import { ControlPanel } from './components/ControlPanel'
import { Dashboard } from './components/Dashboard'
import { simulate } from './engine/simulate'
import { usePlanStore } from './store/usePlanStore'
import { fmtOku } from './utils/format'

function Header({ onReset }: { onReset: () => void }) {
  const plan = usePlanStore((s) => s.plan)
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pine text-card-raised">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 3v18h18" strokeLinecap="round" />
              <path d="M7 14l3.5-4 3 2.5L20 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h1 className="font-display text-[17px] font-bold leading-tight tracking-wide text-ink">
              ライフプラン・シミュレーター
            </h1>
            <p className="text-[11px] leading-tight text-ink-faint">
              子育て・住宅・新NISA・老後までの生涯キャッシュフロー
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <div className="text-[10.5px] text-ink-faint">基準年</div>
            <div className="tnum font-display text-[15px] font-semibold text-ink">{plan.startYear}年</div>
          </div>
          <button
            onClick={onReset}
            className="rounded-lg border border-line bg-card-raised px-3 py-1.5 text-[12.5px] font-medium text-ink-soft transition-colors hover:border-ink-faint hover:text-ink"
          >
            初期値に戻す
          </button>
        </div>
      </div>
    </header>
  )
}

export default function App() {
  const plan = usePlanStore((s) => s.plan)
  const reset = usePlanStore((s) => s.reset)
  const result = useMemo(() => simulate(plan), [plan])

  return (
    <div className="min-h-screen">
      <Header
        onReset={() => {
          if (confirm('入力を初期値に戻しますか？')) reset()
        }}
      />
      <div className="grain mx-auto grid max-w-[1500px] grid-cols-1 gap-0 lg:grid-cols-[360px_1fr]">
        {/* Control panel */}
        <aside className="border-b border-line bg-card lg:sticky lg:top-[57px] lg:h-[calc(100vh-57px)] lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div className="px-5 py-4">
            <div className="mb-1 flex items-baseline justify-between">
              <h2 className="font-display text-[13px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                Plan Inputs
              </h2>
              <span className="tnum text-[11px] text-ink-faint">純資産 {fmtOku(result.endAssets)}</span>
            </div>
          </div>
          <ControlPanel />
          <div className="px-5 py-5 text-[10.5px] leading-relaxed text-ink-faint">
            年収は額面で入力し、所得税・住民税・社会保険料を自動控除して可処分所得に換算します
            （概算・目安）。教育費は文科省調査等を参考にした概算で、実際の制度・地域・選択により変動します。
            年金・退職金は受取額で入力してください。
          </div>
        </aside>

        {/* Dashboard */}
        <main className="min-w-0 px-5 py-6">
          <Dashboard result={result} plan={plan} />
        </main>
      </div>
    </div>
  )
}
