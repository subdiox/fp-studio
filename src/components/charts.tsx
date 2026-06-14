import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { YearRow } from '../engine/types'
import { fmtAxis, fmtMan } from '../utils/format'

export const C = {
  pine: '#1f4d3f',
  pineSoft: '#386655',
  gold: '#b8862b',
  goldSoft: '#cda24a',
  clay: '#b5532a',
  claySoft: '#c87a52',
  slate: '#4a6072',
  brown: '#8a6f4a',
  other: '#857a63',
  tokutei: '#6d8f80',
  ideco: '#8c5a6b',
  ink: '#211d16',
  inkFaint: '#8a8068',
  line: '#e3d8c2',
  card: '#fbf8f1',
}

const axisStyle = { fontSize: 11, fill: C.inkFaint, fontFamily: 'Zen Kaku Gothic New' }

function TooltipBox({
  label,
  rows,
}: {
  label: string
  rows: { name: string; value: number; color: string; bold?: boolean }[]
}) {
  return (
    <div className="rounded-lg border border-line bg-card-raised/95 px-3 py-2 shadow-lg backdrop-blur">
      <div className="mb-1.5 font-display text-[12px] font-semibold text-ink">{label}</div>
      <div className="space-y-0.5">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center justify-between gap-4 text-[12px]">
            <span className="flex items-center gap-1.5 text-ink-soft">
              <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />
              {r.name}
            </span>
            <span
              className="tnum font-medium"
              style={{ color: r.bold ? C.ink : C.inkFaint, fontWeight: r.bold ? 700 : 500 }}
            >
              {fmtMan(r.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function xTickFormatter(rows: YearRow[]) {
  return (year: number) => {
    const r = rows.find((x) => x.year === year)
    return r ? `${r.selfAge}` : `${year}`
  }
}

/* ============ 資産推移 ============ */
export function AssetChart({
  rows,
  retirementYear,
  drawdownYear,
}: {
  rows: YearRow[]
  retirementYear: number
  drawdownYear: number
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={rows} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="gCash" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.slate} stopOpacity={0.55} />
            <stop offset="100%" stopColor={C.slate} stopOpacity={0.12} />
          </linearGradient>
          <linearGradient id="gTok" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.tokutei} stopOpacity={0.55} />
            <stop offset="100%" stopColor={C.tokutei} stopOpacity={0.12} />
          </linearGradient>
          <linearGradient id="gIdeco" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.ideco} stopOpacity={0.55} />
            <stop offset="100%" stopColor={C.ideco} stopOpacity={0.12} />
          </linearGradient>
          <linearGradient id="gInv" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.gold} stopOpacity={0.6} />
            <stop offset="100%" stopColor={C.gold} stopOpacity={0.14} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={C.line} strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey="year"
          tick={axisStyle}
          tickFormatter={xTickFormatter(rows)}
          tickLine={false}
          axisLine={{ stroke: C.line }}
          interval={4}
          label={{ value: '本人の年齢', position: 'insideBottomRight', offset: -2, fontSize: 10, fill: C.inkFaint }}
        />
        <YAxis tick={axisStyle} tickFormatter={fmtAxis} tickLine={false} axisLine={false} width={42} />
        <Tooltip
          content={({ active, payload }: any) => {
            if (!active || !payload?.length) return null
            const d: YearRow = payload[0].payload
            return (
              <TooltipBox
                label={`${d.year}年 ・ ${d.selfAge}歳`}
                rows={[
                  { name: '純資産 合計', value: d.totalAssets, color: C.ink, bold: true },
                  { name: 'NISA', value: d.nisaBalance, color: C.gold },
                  ...(d.idecoBalance > 0.5 ? [{ name: 'iDeCo', value: d.idecoBalance, color: C.ideco }] : []),
                  { name: '特定口座', value: d.tokuteiBalance, color: C.tokutei },
                  { name: '現金・預金', value: d.cashBalance, color: C.slate },
                  ...(d.drawdown > 0.5
                    ? [{ name: '取り崩し（売却）', value: -d.drawdown, color: C.clay }]
                    : []),
                ]}
              />
            )
          }}
        />
        <ReferenceLine y={0} stroke={C.clay} strokeWidth={1} />
        {retirementYear > 0 && (
          <ReferenceLine
            x={retirementYear}
            stroke={C.pineSoft}
            strokeDasharray="4 3"
            label={{
              value: drawdownYear === retirementYear ? '退職・取崩開始' : '退職',
              position: 'top',
              fontSize: 10,
              fill: C.pineSoft,
            }}
          />
        )}
        {drawdownYear > 0 && drawdownYear !== retirementYear && (
          <ReferenceLine
            x={drawdownYear}
            stroke={C.clay}
            strokeDasharray="4 3"
            label={{ value: '取崩開始', position: 'top', fontSize: 10, fill: C.clay }}
          />
        )}
        <Area type="monotone" dataKey="cashBalance" name="現金" stackId="a" stroke={C.slate} strokeWidth={1.5} fill="url(#gCash)" />
        <Area type="monotone" dataKey="tokuteiBalance" name="特定口座" stackId="a" stroke={C.tokutei} strokeWidth={1.5} fill="url(#gTok)" />
        <Area type="monotone" dataKey="idecoBalance" name="iDeCo" stackId="a" stroke={C.ideco} strokeWidth={1.5} fill="url(#gIdeco)" />
        <Area type="monotone" dataKey="nisaBalance" name="NISA" stackId="a" stroke={C.gold} strokeWidth={1.5} fill="url(#gInv)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/* ============ キャッシュフロー（収入 vs 支出） ============ */
export function CashflowChart({ rows }: { rows: YearRow[] }) {
  const data = rows.map((r) => ({
    ...r,
    eLiving: -r.livingCost,
    eHousing: -r.housingCost,
    eEducation: -r.educationCost,
    eTravel: -r.travelCost,
    eOther: -r.otherCost,
    drawdownNet: r.drawdown - r.drawdownTax, // 取り崩しで受け取る現金
  }))
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }} stackOffset="sign">
        <CartesianGrid stroke={C.line} strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey="year"
          tick={axisStyle}
          tickFormatter={xTickFormatter(rows)}
          tickLine={false}
          axisLine={{ stroke: C.line }}
          interval={4}
        />
        <YAxis tick={axisStyle} tickFormatter={fmtAxis} tickLine={false} axisLine={false} width={42} />
        <Tooltip
          content={({ active, payload }: any) => {
            if (!active || !payload?.length) return null
            const d = payload[0].payload
            return (
              <TooltipBox
                label={`${d.year}年 ・ ${d.selfAge}歳`}
                rows={[
                  { name: '年間収支', value: d.netCashflow, color: C.ink, bold: true },
                  { name: '給与（手取り）', value: d.salaryIncome, color: C.pine },
                  ...(d.pensionIncome > 0.5 ? [{ name: '年金', value: d.pensionIncome, color: C.pineSoft }] : []),
                  ...(d.severance > 0.5 ? [{ name: '退職金', value: d.severance, color: C.goldSoft }] : []),
                  ...(d.drawdown > 0.5
                    ? [{ name: '取り崩し（投資→現金）', value: d.drawdown - d.drawdownTax, color: C.tokutei }]
                    : []),
                  { name: '生活費', value: d.livingCost, color: C.slate },
                  { name: '住居費', value: d.housingCost, color: C.brown },
                  { name: '教育費', value: d.educationCost, color: C.clay },
                  { name: '旅行費', value: d.travelCost, color: C.gold },
                  { name: 'その他', value: d.otherCost, color: C.other },
                ]}
              />
            )
          }}
        />
        <ReferenceLine y={0} stroke={C.ink} strokeWidth={1} />
        <Bar dataKey="salaryIncome" name="給与" stackId="cf" fill={C.pine} maxBarSize={18} />
        <Bar dataKey="pensionIncome" name="年金" stackId="cf" fill={C.pineSoft} maxBarSize={18} />
        <Bar dataKey="severance" name="退職金" stackId="cf" fill={C.goldSoft} maxBarSize={18} />
        <Bar dataKey="drawdownNet" name="取り崩し" stackId="cf" fill={C.tokutei} radius={[2, 2, 0, 0]} maxBarSize={18} />
        <Bar dataKey="eLiving" name="生活費" stackId="cf" fill={C.slate} maxBarSize={18} />
        <Bar dataKey="eHousing" name="住居費" stackId="cf" fill={C.brown} maxBarSize={18} />
        <Bar dataKey="eEducation" name="教育費" stackId="cf" fill={C.clay} maxBarSize={18} />
        <Bar dataKey="eTravel" name="旅行費" stackId="cf" fill={C.gold} maxBarSize={18} />
        <Bar dataKey="eOther" name="その他" stackId="cf" fill={C.other} radius={[0, 0, 2, 2]} maxBarSize={18} />
        <Line type="monotone" dataKey="netCashflow" name="年間収支" stroke={C.ink} strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

/* ============ 投資資産（NISA・特定口座） ============ */
export function NisaChart({ rows, nisaCap, hasSpouse }: { rows: YearRow[]; nisaCap: number; hasSpouse: boolean }) {
  const capLabel = `NISA枠 ${nisaCap.toLocaleString()}万${hasSpouse ? '（夫婦）' : ''}`
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={rows} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="gNisa" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.gold} stopOpacity={0.5} />
            <stop offset="100%" stopColor={C.gold} stopOpacity={0.1} />
          </linearGradient>
          <linearGradient id="gNisaS" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.goldSoft} stopOpacity={0.5} />
            <stop offset="100%" stopColor={C.goldSoft} stopOpacity={0.1} />
          </linearGradient>
          <linearGradient id="gTok2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.tokutei} stopOpacity={0.5} />
            <stop offset="100%" stopColor={C.tokutei} stopOpacity={0.1} />
          </linearGradient>
          <linearGradient id="gIdeco2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.ideco} stopOpacity={0.5} />
            <stop offset="100%" stopColor={C.ideco} stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={C.line} strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey="year"
          tick={axisStyle}
          tickFormatter={xTickFormatter(rows)}
          tickLine={false}
          axisLine={{ stroke: C.line }}
          interval={4}
        />
        <YAxis tick={axisStyle} tickFormatter={fmtAxis} tickLine={false} axisLine={false} width={42} />
        <Tooltip
          content={({ active, payload }: any) => {
            if (!active || !payload?.length) return null
            const d: YearRow = payload[0].payload
            const nisaGain = d.nisaBalance - d.nisaPrincipalUsed
            return (
              <TooltipBox
                label={`${d.year}年 ・ ${d.selfAge}歳`}
                rows={[
                  { name: '投資合計', value: d.investmentBalance, color: C.ink, bold: true },
                  { name: hasSpouse ? '本人NISA' : 'NISA', value: d.selfNisaBalance, color: C.gold },
                  ...(hasSpouse ? [{ name: '配偶者NISA', value: d.spouseNisaBalance, color: C.goldSoft }] : []),
                  ...(d.idecoBalance > 0.5 ? [{ name: 'iDeCo', value: d.idecoBalance, color: C.ideco }] : []),
                  { name: '特定口座', value: d.tokuteiBalance, color: C.tokutei },
                  { name: 'NISA含み益（非課税）', value: nisaGain, color: C.pine },
                ]}
              />
            )
          }}
        />
        <ReferenceLine
          y={nisaCap}
          stroke={C.clay}
          strokeDasharray="5 3"
          label={{ value: capLabel, position: 'insideTopRight', fontSize: 10, fill: C.clay }}
        />
        <Area type="monotone" dataKey="selfNisaBalance" name="本人NISA" stackId="inv" stroke={C.gold} strokeWidth={1.5} fill="url(#gNisa)" />
        {hasSpouse && (
          <Area type="monotone" dataKey="spouseNisaBalance" name="配偶者NISA" stackId="inv" stroke={C.goldSoft} strokeWidth={1.5} fill="url(#gNisaS)" />
        )}
        <Area type="monotone" dataKey="idecoBalance" name="iDeCo" stackId="inv" stroke={C.ideco} strokeWidth={1.5} fill="url(#gIdeco2)" />
        <Area type="monotone" dataKey="tokuteiBalance" name="特定口座" stackId="inv" stroke={C.tokutei} strokeWidth={1.5} fill="url(#gTok2)" />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

/* ============ 取り崩し額（投資の売却） ============ */
export function DrawdownChart({ rows }: { rows: YearRow[] }) {
  const data = rows.map((r) => ({ ...r, ddNet: r.drawdown - r.drawdownTax }))
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
        <CartesianGrid stroke={C.line} strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey="year"
          tick={axisStyle}
          tickFormatter={xTickFormatter(rows)}
          tickLine={false}
          axisLine={{ stroke: C.line }}
          interval={4}
          label={{ value: '本人の年齢', position: 'insideBottomRight', offset: -2, fontSize: 10, fill: C.inkFaint }}
        />
        <YAxis tick={axisStyle} tickFormatter={fmtAxis} tickLine={false} axisLine={false} width={42} />
        <Tooltip
          cursor={{ fill: 'rgba(33,29,22,0.04)' }}
          content={({ active, payload }: any) => {
            if (!active || !payload?.length) return null
            const d: YearRow = payload[0].payload
            if (d.drawdown <= 0.5) return null
            return (
              <TooltipBox
                label={`${d.year}年 ・ ${d.selfAge}歳`}
                rows={[
                  { name: '取り崩し（売却額）', value: d.drawdown, color: C.ink, bold: true },
                  { name: '手取り（生活費へ）', value: d.drawdown - d.drawdownTax, color: C.tokutei },
                  { name: '譲渡税（特定口座）', value: d.drawdownTax, color: C.clay },
                ]}
              />
            )
          }}
        />
        <Bar dataKey="ddNet" name="取り崩し（手取り）" stackId="d" fill={C.tokutei} maxBarSize={22} />
        <Bar dataKey="drawdownTax" name="譲渡税" stackId="d" fill={C.clay} radius={[2, 2, 0, 0]} maxBarSize={22} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
