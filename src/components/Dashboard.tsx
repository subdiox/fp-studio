import { useMemo, useState } from 'react'
import type { Plan, SimResult, YearRow } from '../engine/types'
import { fmtMan, fmtManYen, fmtOku, fmtSigned } from '../utils/format'
import { AssetChart, C, CashflowChart, DrawdownChart, NisaChart } from './charts'
import { Card } from './ui'

function KpiCard({
  label,
  value,
  sub,
  accent,
  tone = 'normal',
}: {
  label: string
  value: string
  sub?: string
  accent: string
  tone?: 'normal' | 'good' | 'bad'
}) {
  const valueColor = tone === 'bad' ? C.clay : tone === 'good' ? C.pine : C.ink
  return (
    <Card raised className="relative overflow-hidden p-4">
      <span className="absolute left-0 top-0 h-full w-1" style={{ background: accent }} />
      <div className="pl-1.5">
        <div className="text-[11.5px] font-medium tracking-wide text-ink-faint">{label}</div>
        <div className="tnum mt-1.5 font-display text-[26px] font-semibold leading-none" style={{ color: valueColor }}>
          {value}
        </div>
        {sub && <div className="tnum mt-1.5 text-[11.5px] text-ink-faint">{sub}</div>}
      </div>
    </Card>
  )
}

function ChartCard({
  title,
  subtitle,
  legend,
  height,
  children,
}: {
  title: string
  subtitle?: string
  legend?: { name: string; color: string }[]
  height: number
  children: React.ReactNode
}) {
  return (
    <Card raised className="p-4">
      <div className="mb-1 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-[15px] font-semibold text-ink">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[11.5px] text-ink-faint">{subtitle}</p>}
        </div>
        {legend && (
          <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
            {legend.map((l) => (
              <span key={l.name} className="flex items-center gap-1.5 text-[11px] text-ink-soft">
                <span className="h-2 w-2 rounded-full" style={{ background: l.color }} />
                {l.name}
              </span>
            ))}
          </div>
        )}
      </div>
      <div style={{ height }}>{children}</div>
    </Card>
  )
}

function Verdict({ result, plan }: { result: SimResult; plan: Plan }) {
  const neg = result.firstNegativeYear
  if (neg !== null) {
    const age = neg - plan.self.birthYear
    return (
      <div className="flex items-center gap-3 rounded-[var(--radius-card)] border border-clay/30 bg-clay-tint/60 px-5 py-3.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-clay/15 text-clay">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 9v4M12 17h.01M10.3 3.86l-8.5 14.7A2 2 0 003.5 21.5h17a2 2 0 001.7-2.94l-8.5-14.7a2 2 0 00-3.4 0z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <div>
          <div className="font-display text-[15px] font-semibold text-clay">
            {neg}年（本人{age}歳）に資金がショートします
          </div>
          <div className="text-[12.5px] text-ink-soft">
            現金が底をつくと投資の取り崩しでも賄えません。積立・支出・収入のバランスを調整してみましょう。
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-card)] border border-pine/25 bg-pine-tint/50 px-5 py-3.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pine/15 text-pine">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <div>
        <div className="font-display text-[15px] font-semibold text-pine">
          このプランなら資金は{plan.endAge}歳まで枯渇しません
        </div>
        <div className="tnum text-[12.5px] text-ink-soft">
          最終資産 {fmtOku(result.endAssets)} ／ 現金残高の底は {fmtManYen(result.minCashAfterStart)}（{result.minCashYear}年）
        </div>
      </div>
    </div>
  )
}

export function Dashboard({ result, plan }: { result: SimResult; plan: Plan }) {
  const rows = result.rows
  const retireYear = plan.self.birthYear + plan.self.retireAge
  const drawdownYear = rows.find((r) => r.drawdown > 0.5)?.year ?? 0 // 実際に取り崩しが始まる年
  const retireRow = rows.find((r) => r.year === retireYear)
  const hasSpouse = plan.spouse.enabled
  const nisaCap = hasSpouse ? 3600 : 1800 // 新NISA非課税枠（1人1,800万）

  const totals = useMemo(() => {
    let income = 0
    let expense = 0
    let education = 0
    let travel = 0
    let housing = 0
    let tax = 0
    let drawdown = 0
    for (const r of rows) {
      income += r.income + r.severance
      expense += r.expenseTotal
      education += r.educationCost
      travel += r.travelCost
      housing += r.housingCost
      tax += r.drawdownTax
      drawdown += r.drawdown
    }
    return { income, expense, education, travel, housing, tax, drawdown }
  }, [rows])

  const hasDrawdown = totals.drawdown > 0.5

  return (
    <div className="space-y-5">
      <div className="rise">
        <Verdict result={result} plan={plan} />
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <KpiCard
          label="退職時の資産"
          value={retireRow ? fmtOku(retireRow.totalAssets) : '—'}
          sub={retireRow ? `${retireYear}年・本人${plan.self.retireAge}歳` : undefined}
          accent={C.pine}
          tone="good"
        />
        <KpiCard
          label={`${plan.endAge}歳時点の資産`}
          value={fmtOku(result.endAssets)}
          sub={result.endAssets >= 0 ? '老後も資産が残る見込み' : '資産が底をつく見込み'}
          accent={C.gold}
          tone={result.endAssets >= 0 ? 'normal' : 'bad'}
        />
        <KpiCard
          label="現金残高の底"
          value={fmtManYen(result.minCashAfterStart)}
          sub={`${result.minCashYear}年が最も手薄`}
          accent={C.slate}
          tone={result.minCashAfterStart < 0 ? 'bad' : 'normal'}
        />
        <KpiCard
          label="NISA投資元本"
          value={fmtManYen(result.nisaLifetimeUsed)}
          sub={`非課税枠${nisaCap.toLocaleString()}万円${hasSpouse ? '（夫婦）' : ''}の ${Math.min(100, Math.round((result.nisaLifetimeUsed / nisaCap) * 100))}%`}
          accent={C.gold}
        />
      </div>

      {/* 資産推移 */}
      <div className="rise" style={{ animationDelay: '60ms' }}>
        <ChartCard
          title="資産の推移"
          subtitle="現金・預金と投資（NISA・iDeCo・特定口座）を積み上げた純資産の生涯推移"
          height={300}
          legend={[
            { name: 'NISA', color: C.gold },
            { name: 'iDeCo', color: C.ideco },
            { name: '特定口座', color: C.tokutei },
            { name: '現金・預金', color: C.slate },
          ]}
        >
          <AssetChart rows={rows} retirementYear={retireYear} drawdownYear={drawdownYear} />
        </ChartCard>
      </div>

      {/* 取り崩し額（発生する場合のみ） */}
      {hasDrawdown && (
        <div className="rise" style={{ animationDelay: '90ms' }}>
          <ChartCard
            title="取り崩し額（投資の売却）"
            subtitle={`現金が不足した年に投資から取り崩した額。生涯で ${fmtOku(totals.drawdown)}（うち譲渡税 ${fmtManYen(totals.tax)}）`}
            height={200}
            legend={[
              { name: '手取り（生活費へ）', color: C.tokutei },
              { name: '譲渡税', color: C.clay },
            ]}
          >
            <DrawdownChart rows={rows} />
          </ChartCard>
        </div>
      )}

      {/* キャッシュフロー & NISA */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="rise" style={{ animationDelay: '120ms' }}>
          <ChartCard
            title="年間キャッシュフロー"
            subtitle="収入（上）と支出の内訳（下）、折れ線は年間収支"
            height={260}
            legend={[
              { name: '給与', color: C.pine },
              { name: '年金', color: C.pineSoft },
              { name: '取崩', color: C.tokutei },
              { name: '生活', color: C.slate },
              { name: '住居', color: C.brown },
              { name: '教育', color: C.clay },
              { name: '旅行', color: C.gold },
              { name: 'その他', color: C.other },
            ]}
          >
            <CashflowChart rows={rows} />
          </ChartCard>
        </div>
        <div className="rise" style={{ animationDelay: '180ms' }}>
          <ChartCard
            title="投資資産（NISA・iDeCo・特定口座）"
            subtitle={
              hasSpouse
                ? '本人・配偶者それぞれのNISA枠（各1,800万）＋iDeCo＋特定口座。点線は夫婦のNISA合計3,600万'
                : 'NISA枠・iDeCo・特定口座の内訳。点線は非課税枠1,800万円'
            }
            height={260}
            legend={
              hasSpouse
                ? [
                    { name: '本人NISA', color: C.gold },
                    { name: '配偶者NISA', color: C.goldSoft },
                    { name: 'iDeCo', color: C.ideco },
                    { name: '特定口座', color: C.tokutei },
                  ]
                : [
                    { name: 'NISA', color: C.gold },
                    { name: 'iDeCo', color: C.ideco },
                    { name: '特定口座', color: C.tokutei },
                  ]
            }
          >
            <NisaChart rows={rows} nisaCap={nisaCap} hasSpouse={hasSpouse} />
          </ChartCard>
        </div>
      </div>

      {/* 生涯サマリー */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <StatChip label="生涯収入（手取り）" value={fmtOku(totals.income)} color={C.pine} />
        <StatChip label="生涯支出" value={fmtOku(totals.expense)} color={C.slate} />
        <StatChip label="教育費 総額" value={fmtManYen(totals.education)} color={C.clay} />
        {totals.tax > 0.5 ? (
          <StatChip label="特定口座の課税" value={fmtManYen(totals.tax)} color={C.tokutei} />
        ) : (
          <StatChip label="住居費 総額" value={fmtOku(totals.housing)} color={C.brown} />
        )}
      </div>

      {/* キャッシュフロー表 */}
      <CashflowTable rows={rows} />
    </div>
  )
}

function StatChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Card className="px-3.5 py-3">
      <div className="flex items-center gap-1.5 text-[11.5px] text-ink-faint">
        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
        {label}
      </div>
      <div className="tnum mt-1 font-display text-[19px] font-semibold text-ink">{value}</div>
    </Card>
  )
}

function CashflowTable({ rows }: { rows: YearRow[] }) {
  const [open, setOpen] = useState(false)
  const shown = open ? rows : rows.slice(0, 10)
  return (
    <Card raised className="overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="font-display text-[15px] font-semibold text-ink">キャッシュフロー表</h3>
        <button
          onClick={() => setOpen((o) => !o)}
          className="text-[12.5px] font-medium text-pine hover:underline"
        >
          {open ? '最初の10年だけ表示' : `全${rows.length}年を表示`}
        </button>
      </div>
      <div className="max-h-[420px] overflow-auto">
        <table className="w-full border-collapse text-right text-[12.5px]">
          <thead className="sticky top-0 z-10 bg-paper-2 text-ink-soft">
            <tr className="[&>th]:whitespace-nowrap [&>th]:px-3 [&>th]:py-2 [&>th]:font-medium">
              <th className="text-left">年</th>
              <th>年齢</th>
              <th>収入</th>
              <th>支出</th>
              <th>収支</th>
              <th>取崩</th>
              <th>現金</th>
              <th>投資</th>
              <th>純資産</th>
              <th className="text-left">ライフイベント</th>
            </tr>
          </thead>
          <tbody className="tnum">
            {shown.map((r) => (
              <tr key={r.year} className="border-t border-line-soft hover:bg-paper-2/50">
                <td className="px-3 py-1.5 text-left text-ink-faint">{r.year}</td>
                <td className="px-3 py-1.5 text-ink-faint">{r.selfAge}</td>
                <td className="px-3 py-1.5">{fmtMan(r.income + r.severance)}</td>
                <td className="px-3 py-1.5">{fmtMan(r.expenseTotal)}</td>
                <td className="px-3 py-1.5" style={{ color: r.netCashflow < 0 ? C.clay : C.pine }}>
                  {fmtSigned(r.netCashflow)}
                </td>
                <td className="px-3 py-1.5" style={{ color: r.drawdown > 0.5 ? C.tokutei : C.inkFaint }}>
                  {r.drawdown > 0.5 ? fmtMan(r.drawdown) : '—'}
                </td>
                <td className="px-3 py-1.5" style={{ color: r.cashBalance < 0 ? C.clay : undefined }}>
                  {fmtMan(r.cashBalance)}
                </td>
                <td className="px-3 py-1.5">{fmtMan(r.investmentBalance)}</td>
                <td className="px-3 py-1.5 font-semibold">{fmtMan(r.totalAssets)}</td>
                <td className="px-3 py-1.5 text-left">
                  <div className="flex flex-wrap gap-1">
                    {r.events.map((ev, i) => (
                      <span
                        key={i}
                        className="whitespace-nowrap rounded-full bg-gold-tint/60 px-2 py-0.5 text-[10.5px] text-ink-soft"
                      >
                        {ev}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
