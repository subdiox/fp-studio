// 金額はすべて「万円」単位で保持している。表示用の整形ヘルパー。

const nf = new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 0 })

/** 万円を整数＋カンマで（例: 1234 -> "1,234"） */
export function fmtMan(v: number): string {
  return nf.format(Math.round(v))
}

/** "1,234万円" */
export function fmtManYen(v: number): string {
  return `${fmtMan(v)}万円`
}

/** 大きい額は億表記に切り替え（例: 12345 -> "1.23億円", 850 -> "850万円"） */
export function fmtOku(v: number): string {
  const abs = Math.abs(v)
  if (abs >= 10000) {
    const oku = v / 10000
    const digits = abs >= 100000 ? 1 : 2
    return `${oku.toFixed(digits)}億円`
  }
  return `${fmtMan(v)}万円`
}

/** 符号付き（収支用） */
export function fmtSigned(v: number): string {
  const s = v >= 0 ? '+' : '−'
  return `${s}${fmtMan(Math.abs(v))}`
}

/** グラフ軸用の短縮表記（万円 -> 億/万） */
export function fmtAxis(v: number): string {
  if (v === 0) return '0'
  const abs = Math.abs(v)
  if (abs >= 10000) return `${(v / 10000).toFixed(abs >= 50000 ? 0 : 1)}億`
  if (abs >= 1000) return `${(v / 1000).toFixed(0)}千万`.replace('千万', '千万')
  return `${fmtMan(v)}`
}

export function fmtPct(v: number): string {
  return `${v.toFixed(1)}%`
}
