import type { ContributionPhase, CustomExpense, Earner, ExpenseKind } from '../engine/types'
import { disposableFromGross, estimatePension } from '../engine/tax'
import { usePlanStore } from '../store/usePlanStore'
import { fmtMan } from '../utils/format'
import { NumberField, Row, Section, Segmented, SliderField, Toggle } from './ui'

const eduOptions = [
  { value: 'public' as const, label: '公立' },
  { value: 'private' as const, label: '私立' },
]

function EarnerBlock({ which }: { which: 'self' | 'spouse' }) {
  const plan = usePlanStore((s) => s.plan)
  const update = usePlanStore((s) => s.update)
  const e: Earner = plan[which]
  const age = plan.startYear - e.birthYear
  const set = (fn: (d: Earner) => void) => update((p) => fn(p[which]))

  return (
    <div className="mb-5 rounded-xl border border-line-soft bg-paper-2/40 p-3.5 last:mb-0">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-display text-[14px] font-semibold text-ink">{e.name}</span>
        {which === 'spouse' && (
          <Toggle checked={e.enabled} onChange={(v) => set((d) => (d.enabled = v))} label="あり" />
        )}
        {which === 'self' && <span className="tnum text-[12px] text-ink-faint">現在 {age}歳</span>}
      </div>
      {(which === 'self' || e.enabled) && (
        <>
          <SliderField
            label="現在の年齢"
            value={age}
            min={20}
            max={70}
            unit="歳"
            onChange={(v) => set((d) => (d.birthYear = plan.startYear - v))}
          />
          <SliderField
            label="額面年収（賞与込み）"
            value={e.annualIncome}
            min={0}
            max={2000}
            step={10}
            unit="万円"
            onChange={(v) => set((d) => (d.annualIncome = v))}
            hint={`手取り目安 約${fmtMan(disposableFromGross(e.annualIncome, age))}万円（税・社会保険料を自動控除）`}
          />
          <SliderField
            label="昇給率"
            value={e.incomeGrowth}
            min={0}
            max={5}
            step={0.1}
            unit="%/年"
            format={(v) => v.toFixed(1)}
            onChange={(v) => set((d) => (d.incomeGrowth = v))}
            hint={`65歳時点の額面 約${fmtMan(e.annualIncome * Math.pow(1 + e.incomeGrowth / 100, Math.max(0, 65 - age)))}万円`}
          />
          <SliderField
            label="退職年齢"
            value={e.retireAge}
            min={45}
            max={75}
            unit="歳"
            onChange={(v) => set((d) => (d.retireAge = v))}
          />
          <NumberField
            label="退職金（受取）"
            value={e.severancePay}
            unit="万円"
            step={50}
            onChange={(v) => set((d) => (d.severancePay = v))}
          />
          <div className="mt-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[12px] text-ink-soft">年金 年額</span>
              <Toggle
                checked={e.autoPension}
                onChange={(v) => set((d) => (d.autoPension = v))}
                label="年収から自動"
              />
            </div>
            {e.autoPension ? (
              <div className="flex items-baseline gap-1.5 rounded-lg bg-pine-tint/40 px-3 py-2">
                <span className="tnum font-display text-[17px] font-semibold text-pine">
                  約 {fmtMan(estimatePension(e.annualIncome, e.retireAge))}
                </span>
                <span className="text-[11px] text-ink-faint">万円/年（基礎＋厚生の概算）</span>
              </div>
            ) : (
              <NumberField
                value={e.pensionAnnual}
                unit="万円/年（受取）"
                step={5}
                onChange={(v) => set((d) => (d.pensionAnnual = v))}
              />
            )}
          </div>
        </>
      )}
    </div>
  )
}

function ChildrenSection() {
  const plan = usePlanStore((s) => s.plan)
  const addChild = usePlanStore((s) => s.addChild)
  const removeChild = usePlanStore((s) => s.removeChild)
  const updateChild = usePlanStore((s) => s.updateChild)

  return (
    <div>
      {plan.children.map((c) => {
        const age = plan.startYear - c.birthYear
        return (
          <div key={c.id} className="mb-4 rounded-xl border border-line-soft bg-paper-2/40 p-3.5">
            <div className="mb-3 flex items-center justify-between">
              <input
                value={c.name}
                onChange={(e) => updateChild(c.id, (ch) => (ch.name = e.target.value))}
                className="font-display text-[14px] font-semibold text-ink bg-transparent outline-none w-28"
              />
              <div className="flex items-center gap-2">
                <span className="tnum text-[12px] text-ink-faint">
                  {age < 0 ? `${-age}年後に誕生` : `${age}歳`}
                </span>
                <button
                  onClick={() => removeChild(c.id)}
                  className="text-ink-faint hover:text-clay"
                  title="削除"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
            <SliderField
              label="本人が何歳のときの子"
              value={c.birthYear - plan.self.birthYear}
              min={18}
              max={55}
              unit="歳"
              onChange={(v) => updateChild(c.id, (ch) => (ch.birthYear = plan.self.birthYear + v))}
              hint={`${c.birthYear}年に誕生${c.birthYear > plan.startYear ? '予定' : ''}`}
            />
            <div className="mt-1 grid grid-cols-1 gap-2">
              <Row label="保育園・幼稚園">
                <Segmented
                  size="sm"
                  value={c.preschool}
                  options={[
                    { value: 'public', label: '公立' },
                    { value: 'private', label: '私立' },
                    { value: 'international', label: 'インター' },
                  ]}
                  onChange={(v) => updateChild(c.id, (ch) => (ch.preschool = v))}
                />
              </Row>
              {c.preschool === 'international' && (
                <div className="grid grid-cols-2 gap-2.5 rounded-lg bg-gold-tint/30 p-2.5">
                  <NumberField
                    label="インター年額"
                    value={c.interPreschoolAnnual}
                    unit="万円/年"
                    step={10}
                    onChange={(v) => updateChild(c.id, (ch) => (ch.interPreschoolAnnual = v))}
                  />
                  <NumberField
                    label="開始年齢"
                    value={c.interPreschoolFromAge}
                    unit="歳"
                    onChange={(v) => updateChild(c.id, (ch) => (ch.interPreschoolFromAge = v))}
                  />
                </div>
              )}
              <Row label="小学校">
                <Segmented size="sm" value={c.elementary} options={eduOptions} onChange={(v) => updateChild(c.id, (ch) => (ch.elementary = v))} />
              </Row>
              <Row label="中学受験の塾（小4〜6）">
                <Toggle checked={c.jukuJunior} onChange={(v) => updateChild(c.id, (ch) => (ch.jukuJunior = v))} />
              </Row>
              <Row label="中学校">
                <Segmented size="sm" value={c.juniorHigh} options={eduOptions} onChange={(v) => updateChild(c.id, (ch) => (ch.juniorHigh = v))} />
              </Row>
              <Row label="高校">
                <Segmented size="sm" value={c.highSchool} options={eduOptions} onChange={(v) => updateChild(c.id, (ch) => (ch.highSchool = v))} />
              </Row>
              <Row label="大学受験の塾（高1〜3）">
                <Toggle checked={c.jukuUniv} onChange={(v) => updateChild(c.id, (ch) => (ch.jukuUniv = v))} />
              </Row>
              <Row label="大学">
                <Segmented
                  size="sm"
                  value={c.university}
                  options={[
                    { value: 'none', label: '進学なし' },
                    { value: 'national', label: '国公立' },
                    { value: 'privateHum', label: '私立文系' },
                    { value: 'privateSci', label: '私立理系' },
                  ]}
                  onChange={(v) => updateChild(c.id, (ch) => (ch.university = v))}
                />
              </Row>
              {c.university !== 'none' && (
                <Row label="大学から一人暮らし">
                  <Toggle
                    checked={c.universityLivingAlone}
                    onChange={(v) => updateChild(c.id, (ch) => (ch.universityLivingAlone = v))}
                  />
                </Row>
              )}
            </div>
          </div>
        )
      })}
      <button
        onClick={addChild}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line py-2.5 text-[13px] font-medium text-pine hover:bg-pine-tint/40"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
        子どもを追加
      </button>
    </div>
  )
}

function HousingSection() {
  const plan = usePlanStore((s) => s.plan)
  const update = usePlanStore((s) => s.update)
  const h = plan.housing

  return (
    <div>
      <div className="mb-4 flex justify-center">
        <Segmented
          value={h.mode}
          options={[
            { value: 'rent', label: '賃貸で続ける' },
            { value: 'own', label: '住宅を購入する' },
          ]}
          onChange={(v) => update((p) => (p.housing.mode = v))}
        />
      </div>
      {h.mode === 'rent' ? (
        <>
          <SliderField
            label="家賃"
            value={h.rent.monthly}
            min={3}
            max={40}
            step={0.5}
            unit="万円/月"
            format={(v) => v.toFixed(1)}
            onChange={(v) => update((p) => (p.housing.rent.monthly = v))}
          />
          <SliderField
            label="家賃上昇率"
            value={h.rent.increaseRate}
            min={0}
            max={3}
            step={0.1}
            unit="%/年"
            format={(v) => v.toFixed(1)}
            onChange={(v) => update((p) => (p.housing.rent.increaseRate = v))}
          />
        </>
      ) : (
        <>
          <SliderField
            label="購入年"
            value={h.own.purchaseYear}
            min={plan.startYear}
            max={plan.startYear + 30}
            unit="年"
            format={(v) => `${v}`}
            onChange={(v) => update((p) => (p.housing.own.purchaseYear = v))}
            hint={`購入まで家賃 ${h.own.rentBeforePurchase}万円/月で生活`}
          />
          <SliderField
            label="物件価格"
            value={h.own.price}
            min={1000}
            max={30000}
            step={100}
            unit="万円"
            format={(v) => v.toLocaleString('ja-JP')}
            onChange={(v) => update((p) => (p.housing.own.price = v))}
          />
          <SliderField
            label="頭金"
            value={h.own.downPayment}
            min={0}
            max={Math.max(1000, h.own.price)}
            step={50}
            unit="万円"
            onChange={(v) => update((p) => (p.housing.own.downPayment = v))}
            hint={`借入額 ${Math.max(0, h.own.price - h.own.downPayment).toLocaleString()}万円`}
          />
          <div className="grid grid-cols-2 gap-3">
            <SliderField
              label="金利"
              value={h.own.loanRate}
              min={0}
              max={4}
              step={0.05}
              unit="%"
              format={(v) => v.toFixed(2)}
              onChange={(v) => update((p) => (p.housing.own.loanRate = v))}
            />
            <SliderField
              label="返済期間"
              value={h.own.loanYears}
              min={5}
              max={50}
              unit="年"
              onChange={(v) => update((p) => (p.housing.own.loanYears = v))}
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <NumberField
              label="購入前の家賃"
              value={h.own.rentBeforePurchase}
              unit="万/月"
              step={0.5}
              onChange={(v) => update((p) => (p.housing.own.rentBeforePurchase = v))}
            />
            <NumberField
              label="固定資産税・管理費"
              value={h.own.maintenanceAnnual}
              unit="万/年"
              step={5}
              onChange={(v) => update((p) => (p.housing.own.maintenanceAnnual = v))}
            />
          </div>
        </>
      )}
    </div>
  )
}

const kindOptions: { value: ExpenseKind; label: string }[] = [
  { value: 'monthly', label: '月額' },
  { value: 'yearly', label: '年額' },
  { value: 'spot', label: 'スポット' },
]

function unitForKind(kind: ExpenseKind): string {
  return kind === 'monthly' ? '万/月' : kind === 'yearly' ? '万/年' : '万円'
}

function ExpenseItem({ ex }: { ex: CustomExpense }) {
  const updateExpense = usePlanStore((s) => s.updateExpense)
  const removeExpense = usePlanStore((s) => s.removeExpense)
  const set = (fn: (e: CustomExpense) => void) => updateExpense(ex.id, fn)

  const isSpot = ex.kind === 'spot'
  return (
    <div className="mb-4 rounded-xl border border-line-soft bg-paper-2/40 p-3.5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <input
          value={ex.name}
          onChange={(e) => set((d) => (d.name = e.target.value))}
          className="min-w-0 flex-1 bg-transparent font-display text-[14px] font-semibold text-ink outline-none"
        />
        <button onClick={() => removeExpense(ex.id)} className="shrink-0 text-ink-faint hover:text-clay" title="削除">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="mb-2.5 flex justify-center">
        <Segmented size="sm" value={ex.kind} options={kindOptions} onChange={(v) => set((d) => (d.kind = v))} />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <NumberField
          label="金額"
          value={ex.amount}
          unit={unitForKind(ex.kind)}
          step={isSpot ? 10 : 1}
          onChange={(v) => set((d) => (d.amount = v))}
        />
        {isSpot && (
          <NumberField
            label="周期（0=1回のみ）"
            value={ex.everyYears}
            unit="年ごと"
            onChange={(v) => set((d) => (d.everyYears = v))}
          />
        )}
        <NumberField
          label="開始（本人年齢）"
          value={ex.startAge}
          unit="歳"
          onChange={(v) => set((d) => (d.startAge = v))}
        />
        {(!isSpot || ex.everyYears > 1) && (
          <NumberField
            label="終了（本人年齢）"
            value={ex.endAge}
            unit="歳"
            onChange={(v) => set((d) => (d.endAge = v))}
          />
        )}
      </div>

      <div className="mt-3">
        <Toggle checked={ex.inflate} onChange={(v) => set((d) => (d.inflate = v))} label="物価上昇に連動" />
      </div>
    </div>
  )
}

function CustomExpenseSection() {
  const expenses = usePlanStore((s) => s.plan.customExpenses)
  const addExpense = usePlanStore((s) => s.addExpense)
  return (
    <div>
      {expenses.length === 0 && (
        <p className="mb-3 text-[12px] leading-relaxed text-ink-faint">
          車の買い替え・親の介護・習い事・リフォームなど、独自の支出を自由に追加できます。
        </p>
      )}
      {expenses.map((ex) => (
        <ExpenseItem key={ex.id} ex={ex} />
      ))}
      <button
        onClick={addExpense}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line py-2.5 text-[13px] font-medium text-pine hover:bg-pine-tint/40"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
        支出項目を追加
      </button>
    </div>
  )
}

function PhaseRow({ phase, index, hasSpouse }: { phase: ContributionPhase; index: number; hasSpouse: boolean }) {
  const updatePhase = usePlanStore((s) => s.updatePhase)
  const removePhase = usePlanStore((s) => s.removePhase)
  const set = (fn: (p: ContributionPhase) => void) => updatePhase(phase.id, fn)
  const total =
    (phase.nisaMonthly +
      phase.idecoMonthly +
      phase.tokuteiMonthly +
      (hasSpouse ? phase.spouseNisaMonthly + phase.spouseIdecoMonthly : 0)) *
    12
  return (
    <div className="mb-3 rounded-xl border border-line-soft bg-paper-2/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-display text-[13px] font-semibold text-ink">積立期間 {index + 1}</span>
        <div className="flex items-center gap-2">
          <span className="tnum text-[11px] text-ink-faint">年 {total.toLocaleString()}万</span>
          <button onClick={() => removePhase(phase.id)} className="text-ink-faint hover:text-clay" title="削除">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
      <div className="mb-2">
        <span className="mb-1 block text-[12px] text-ink-soft">本人の年齢</span>
        <div className="flex items-center gap-2">
          <NumberField value={phase.fromAge} unit="歳" onChange={(v) => set((d) => (d.fromAge = v))} className="flex-1" />
          <span className="text-ink-faint">〜</span>
          <NumberField value={phase.toAge} unit="歳" onChange={(v) => set((d) => (d.toAge = v))} className="flex-1" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <NumberField
          label={hasSpouse ? '本人NISA' : 'NISA'}
          value={phase.nisaMonthly}
          unit="万/月"
          step={0.5}
          onChange={(v) => set((d) => (d.nisaMonthly = v))}
        />
        {hasSpouse && (
          <NumberField
            label="配偶者NISA"
            value={phase.spouseNisaMonthly}
            unit="万/月"
            step={0.5}
            onChange={(v) => set((d) => (d.spouseNisaMonthly = v))}
          />
        )}
        <NumberField
          label={hasSpouse ? '本人iDeCo' : 'iDeCo'}
          value={phase.idecoMonthly}
          unit="万/月"
          step={0.1}
          onChange={(v) => set((d) => (d.idecoMonthly = v))}
        />
        {hasSpouse && (
          <NumberField
            label="配偶者iDeCo"
            value={phase.spouseIdecoMonthly}
            unit="万/月"
            step={0.1}
            onChange={(v) => set((d) => (d.spouseIdecoMonthly = v))}
          />
        )}
        <NumberField label="特定口座" value={phase.tokuteiMonthly} unit="万/月" step={0.5} onChange={(v) => set((d) => (d.tokuteiMonthly = v))} />
      </div>
    </div>
  )
}

function NisaSection() {
  const plan = usePlanStore((s) => s.plan)
  const update = usePlanStore((s) => s.update)
  const addPhase = usePlanStore((s) => s.addPhase)
  const n = plan.nisa
  const hasSpouse = plan.spouse.enabled
  return (
    <div>
      <SliderField
        label="想定利回り"
        value={n.expectedReturn}
        min={0}
        max={8}
        step={0.1}
        unit="%/年"
        format={(v) => v.toFixed(1)}
        onChange={(v) => update((p) => (p.nisa.expectedReturn = v))}
      />

      <div className="mb-1.5 mt-4 flex items-center justify-between">
        <span className="text-[13px] font-medium text-ink-soft">積立プラン（期間ごと）</span>
      </div>
      <p className="mb-2.5 text-[11.5px] leading-snug text-ink-faint">
        年齢の区間ごとに毎月の積立額を設定できます。
        {hasSpouse
          ? 'NISAは本人・配偶者それぞれ別枠（各1,800万円）。'
          : 'NISA枠（生涯1,800万円）。'}
        枠を超えた分は特定口座へ。<span className="text-ink-soft">iDeCoは65歳まで引き出せませんが、掛金が所得控除になり節税できます。</span>
      </p>
      {n.phases.map((ph, i) => (
        <PhaseRow key={ph.id} phase={ph} index={i} hasSpouse={hasSpouse} />
      ))}
      <button
        onClick={addPhase}
        className="mb-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line py-2.5 text-[13px] font-medium text-pine hover:bg-pine-tint/40"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
        積立期間を追加
      </button>

      <div className="mt-2 rounded-lg bg-gold-tint/50 px-3 py-2 text-[12px] leading-relaxed text-ink-soft">
        取り崩しは<span className="font-semibold">現金が足りない年</span>に、
        <span className="font-semibold text-gold">特定口座→NISA</span>の順で必要な分だけ自動売却します（特定口座は運用益に約20.3%課税）。
        現金も投資も尽きて初めて「資金ショート」と判定します。
      </div>
    </div>
  )
}

export function ControlPanel() {
  const plan = usePlanStore((s) => s.plan)
  const update = usePlanStore((s) => s.update)
  return (
    <div className="px-4">
      <Section title="世帯・収入" accent="pine">
        <EarnerBlock which="self" />
        <EarnerBlock which="spouse" />
      </Section>

      <Section title="子ども・教育費" accent="clay">
        <ChildrenSection />
      </Section>

      <Section title="生活費" accent="slate">
        <SliderField
          label="基本生活費（住居費を除く）"
          value={plan.monthlyBasic}
          min={8}
          max={60}
          step={0.5}
          unit="万円/月"
          format={(v) => v.toFixed(1)}
          onChange={(v) => update((p) => (p.monthlyBasic = v))}
        />
        <SliderField
          label="物価上昇率（インフレ）"
          value={plan.inflation}
          min={0}
          max={4}
          step={0.1}
          unit="%/年"
          format={(v) => v.toFixed(1)}
          onChange={(v) => update((p) => (p.inflation = v))}
        />
      </Section>

      <Section title="住居" accent="slate">
        <HousingSection />
      </Section>

      <Section title="海外旅行・レジャー" accent="gold">
        <SliderField
          label="毎年の旅行予算"
          value={plan.travel.annualBudget}
          min={0}
          max={150}
          step={5}
          unit="万円/年"
          onChange={(v) => update((p) => (p.travel.annualBudget = v))}
        />
        <div className="grid grid-cols-2 gap-3">
          <SliderField
            label="大型旅行の周期"
            value={plan.travel.bigTripEveryYears}
            min={0}
            max={10}
            unit="年ごと"
            onChange={(v) => update((p) => (p.travel.bigTripEveryYears = v))}
          />
          <SliderField
            label="大型旅行1回"
            value={plan.travel.bigTripCost}
            min={0}
            max={300}
            step={10}
            unit="万円"
            onChange={(v) => update((p) => (p.travel.bigTripCost = v))}
          />
        </div>
        <SliderField
          label="旅行を続ける年齢"
          value={plan.travel.untilPrimaryAge}
          min={40}
          max={95}
          unit="歳まで"
          onChange={(v) => update((p) => (p.travel.untilPrimaryAge = v))}
        />
      </Section>

      <Section title="そのほかの支出（カスタム）" accent="clay">
        <CustomExpenseSection />
      </Section>

      <Section title="積立投資（新NISA）" accent="gold">
        <NisaSection />
      </Section>

      <Section title="現在の資産・期間" accent="pine" defaultOpen={false}>
        <NumberField
          label="現在の現金・預金（世帯）"
          value={plan.initialCash}
          unit="万円"
          step={10}
          onChange={(v) => update((p) => (p.initialCash = v))}
        />

        <div className="mt-3 rounded-xl border border-line-soft bg-paper-2/40 p-3">
          <div className="mb-2 font-display text-[13px] font-semibold text-ink">
            {plan.spouse.enabled ? '本人の投資' : '投資'}
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <NumberField label="NISA 評価額" value={plan.initialNisaValue} unit="万円" step={10} onChange={(v) => update((p) => (p.initialNisaValue = v))} />
            <NumberField label="うち簿価" value={plan.initialNisaPrincipal} unit="万円" step={10} onChange={(v) => update((p) => (p.initialNisaPrincipal = v))} />
            <NumberField label="特定口座 評価額" value={plan.initialTokuteiValue} unit="万円" step={10} onChange={(v) => update((p) => (p.initialTokuteiValue = v))} />
            <NumberField label="うち簿価" value={plan.initialTokuteiPrincipal} unit="万円" step={10} onChange={(v) => update((p) => (p.initialTokuteiPrincipal = v))} />
            <NumberField label="iDeCo 評価額" value={plan.initialIdecoValue} unit="万円" step={10} onChange={(v) => update((p) => (p.initialIdecoValue = v))} />
          </div>
        </div>

        {plan.spouse.enabled && (
          <div className="mt-3 rounded-xl border border-line-soft bg-paper-2/40 p-3">
            <div className="mb-2 font-display text-[13px] font-semibold text-ink">配偶者の投資</div>
            <div className="grid grid-cols-2 gap-2.5">
              <NumberField label="NISA 評価額" value={plan.spouseInitialNisaValue} unit="万円" step={10} onChange={(v) => update((p) => (p.spouseInitialNisaValue = v))} />
              <NumberField label="うち簿価" value={plan.spouseInitialNisaPrincipal} unit="万円" step={10} onChange={(v) => update((p) => (p.spouseInitialNisaPrincipal = v))} />
              <NumberField label="特定口座 評価額" value={plan.spouseInitialTokuteiValue} unit="万円" step={10} onChange={(v) => update((p) => (p.spouseInitialTokuteiValue = v))} />
              <NumberField label="うち簿価" value={plan.spouseInitialTokuteiPrincipal} unit="万円" step={10} onChange={(v) => update((p) => (p.spouseInitialTokuteiPrincipal = v))} />
              <NumberField label="iDeCo 評価額" value={plan.spouseInitialIdecoValue} unit="万円" step={10} onChange={(v) => update((p) => (p.spouseInitialIdecoValue = v))} />
            </div>
          </div>
        )}

        <div className="mt-3">
          <SliderField
            label="シミュレーション終了年齢"
            value={plan.endAge}
            min={70}
            max={105}
            unit="歳"
            onChange={(v) => update((p) => (p.endAge = v))}
          />
        </div>
      </Section>
    </div>
  )
}
