# CLAUDE.md — ライフプラン・シミュレーター

FP向けの生涯キャッシュフロー・シミュレーター（ブラウザSPA）。スライダー操作でリアルタイムにグラフが更新される。

## アーキテクチャ

```
src/
  engine/            … 純粋なシミュレーションロジック（UI非依存）
    types.ts         … Plan / YearRow / SimResult / CustomExpense などの型。NISA定数もここ
    education.ts     … 教育費データ（年額・万円）と childEducationCost()
    tax.ts           … 額面→手取り変換 disposableFromGross()、譲渡益税 CAPITAL_GAINS_TAX
    simulate.ts      … メインエンジン simulate(plan) -> SimResult。住宅ローン償却・口座売却もここ
  store/
    defaults.ts      … 既定プラン（基準年=CURRENT_YEAR=2026）と makeChild() / makeExpense()
    usePlanStore.ts  … Zustand + persist(localStorage)。update(fn) は structuredClone でimmutable更新
  utils/format.ts    … 万円→億表記などの整形
  components/
    ui.tsx           … SliderField / NumberField / Segmented / Toggle / Section など汎用UI
    ControlPanel.tsx … 左の入力パネル（全セクション）
    charts.tsx       … AssetChart / CashflowChart / NisaChart（Recharts）+ 配色定数 C
    Dashboard.tsx    … KPI・判定バナー・チャート・キャッシュフロー表
  App.tsx            … レイアウト。useMemo(simulate(plan)) で再計算
```

データフロー: `usePlanStore`（plan）→ `App` の `useMemo(simulate)` → `Dashboard`/charts。
入力は `ControlPanel` が store を直接更新 → plan 変化で全体が再計算・再描画される。

## 計算モデルの前提（重要）

- **単位は一貫して「万円」**。年次（1年刻み）でループ。
- **収入は額面で入力**。`tax.ts` の `disposableFromGross(額面, 年齢)` で給与所得控除・社会保険料
  （厚生年金/健康保険/介護40歳〜/雇用）・所得税（復興税込）・住民税を概算控除して手取りに変換。
  配偶者控除・扶養控除等は省略。**退職金は受取額として入力**。**年金は `autoPension` のとき `estimatePension(年収, 退職年齢)` で自動概算**
  （老齢基礎年金満額81.6万＋厚生年金＝min(年収,780万)×0.005481×(退職年齢-22)。手動時は `pensionAnnual`）。
  収入は `earnerSalary`（age<retireAge のみ）と `earnerPension`（age>=pensionStartAge, 生涯）に分離し、
  YearRow に `salaryIncome`/`pensionIncome` として保持（キャッシュフロー図で給与＝濃緑・年金＝薄緑に色分け、退職後に給与が消えるのが見える）。
- 年齢 = `year - birthYear`（誕生日経過を単純化）。子の出産はUI上「本人が何歳のとき」で設定し birthYear に変換。
- **生活費**は基準年から `inflation%` で複利増加。
- **住宅**: 賃貸=家賃×12＋更新料（更新周期ごとに家賃1ヶ月）。購入=購入年に頭金を現金から支出し、
  `annualMortgagePayment()`（元利均等）で返済期間ぶん返済＋固定資産税・管理費。購入前は購入前家賃。
- **教育費** (`education.ts`): 文科省「子供の学習費調査(R3)」＋国公私立大学の標準学費をベースにした概算固定値。
  年齢で 未就学(0-5)/小(6-11)/中(12-14)/高(15-17)/大学(18-21) を判定。未就学は `preschool`=公立/私立（0-2認可保育園＋3-5幼稚園）
  または `international`（`interPreschoolFromAge`〜5歳を `interPreschoolAnnual` で計上）。大学は入学金を18歳時のみ加算、一人暮らしは年100万加算。
  **塾**は学校費に上乗せ：`jukuJunior`=中学受験(小4-6, 50/70/110)、`jukuUniv`=大学受験(高1-3, 30/40/70)。
  `childEducationCost()` は複数イベント対応で `{amount, labels[]}` を返す。幼児教育無償化・就学支援金などは未反映（目安値）。
- **カスタム支出** (`customExpenses`): 月額/年額/スポット（`everyYears`周期）。本人年齢 `startAge`〜`endAge` で発生、
  `inflate` でインフレ連動。`customExpenseCost()` が算出し `otherCost` に合算。
- **積立投資**: 口座は **本人NISA・配偶者NISA・本人iDeCo・配偶者iDeCo・特定口座** のプール。毎年 `expectedReturn%`（全口座共通）で成長 → 積立。
  積立額は `nisa.phases`（`ContributionPhase[]`：本人年齢ごとに nisaMonthly/spouseNisaMonthly/idecoMonthly/spouseIdecoMonthly/tokuteiMonthly）の
  該当する**最初の区間**。充当順は **iDeCo→NISA→特定口座**（手元現金の範囲）。
  **NISAは本人・配偶者それぞれ別枠（各1,800万・簿価管理）**、枠超過分は**特定口座へ回す**（overflow）。
- **iDeCo**: 本人・配偶者別口座。掛金は `disposableFromGross(gross, age, idecoAnnual)` の第3引数として**小規模企業共済等掛金控除**になり手取りが増える（節税）。
  `IDECO_UNLOCK_AGE`=65 まで取り崩し対象外（その年齢以降のみ売却可）。受取税は退職所得控除等でほぼ非課税とみなし簡略化（簿価=0で `sellTaxFree`）。
  iDeCo拠出は本人/配偶者の年齢が65未満のときのみ（phase 判定は本人年齢、拠出可否は各人の年齢）。初期残高は `initialIdecoValue`/`spouseInitialIdecoValue`。
  各プールで評価額(value)と簿価(principal)を保持。枠到達時に「本人/配偶者NISA枠 上限」イベント。
  グラフの非課税枠ラインは `hasSpouse ? 3600 : 1800`。YearRow に selfNisaBalance/spouseNisaBalance を保持。
- **初期資産**: 現金（`initialCash`）は世帯共通。投資は本人（`initialNisaValue/Principal`,`initialTokuteiValue/Principal`）と
  配偶者（`spouseInitial*`）で分けて入力。本人/配偶者の初期NISAは各自のNISAプール（＝各自の1,800万枠）の初期値になり、特定口座は世帯で合算。
  配偶者無効時は配偶者初期資産は0扱い。migrate では `spouseInitial*` を 0 で補完（既存データを変えない）。
- **取り崩し**: 現金不足分を**年齢に関係なく**毎年補填（**特定口座→本人NISA→配偶者NISA→iDeCo(65歳以降のみ)** の順に売却）。特定口座は売却益（評価額−簿価の比率）に
  `CAPITAL_GAINS_TAX`(20.315%)を課税し、手取りが不足額になるよう売却額を逆算（`sellTaxable`）。NISAは非課税（`sellTaxFree`）。
  `drawdown`(売却額)/`drawdownTax`(課税額) を記録し、初回年に「取り崩し開始」イベント。**現金も投資も尽きて初めて**資金ショート（`firstNegativeYear`）。
  ※ 以前あった `drawdownStartAge`（取り崩し開始年齢ゲート）は、投資が潤沢でも誤ってショート判定する不具合のため撤廃した。
  純資産表示は評価額（含み益の潜在税は未計上）。取り崩しは専用の `DrawdownChart`（手取り＋譲渡税の積み上げ棒）・キャッシュフロー図の正のバー・表の取崩列・資産推移の取崩ラインで可視化。
- **資金ショート判定**: 現金残高が初めて負になる年を `firstNegativeYear` として警告。

教育費・税率・NISA枠などの数値を変える場合は `engine/` 内の定数を編集する（UIからの個別調整も可能）。

**スキーマ変更時の互換**: persist `name` は `fp-studio-plan-v4` 固定。Plan/Child/CustomExpense に項目を足したら
`defaults.ts` の `normalizePlan()`（と `normalizeChild`/`normalizeExpense`）に既定値補完を追加すること。
`usePlanStore` の persist `merge` がこれを呼び、**保存済みデータを保持したまま新フィールドを補完**する（version バンプ＝データ全消去は避ける）。

## 配色（warm-paper エディトリアル）

`charts.tsx` の `C` と `index.css` の `@theme` で一元管理。
pine=資産/収入, gold=NISA, tokutei=特定口座, clay=支出/警告, slate=現金, brown=住居, other=その他支出。
見出しは Shippori Mincho、本文は Zen Kaku Gothic New。数値は `.tnum`（等幅）を付ける。

## 開発メモ

- Tailwind v4（`@tailwindcss/vite`）。色は `--color-*`、フォントは `--font-*` を `@theme` で定義 → `bg-pine` 等で利用。
- `npx tsc -b` で型チェック、`npm run build` でビルド確認。
- 金額が絡む表示には必ず `utils/format.ts` のヘルパーを使う。
