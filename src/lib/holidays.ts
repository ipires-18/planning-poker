/**
 * Feriados brasileiros e contagem de dias úteis.
 *
 * Os feriados são calculados aqui, não buscados numa API: são determinísticos,
 * funcionam offline e não dependem de um serviço de terceiros continuar no ar.
 * O time pode desmarcar o que não vale para ele e acrescentar os municipais.
 */

export interface Holiday {
  /** YYYY-MM-DD, no fuso local. */
  date: string
  name: string
  /**
   * Ponto facultativo, não feriado por lei federal (Carnaval, Corpus Christi).
   * Vem marcado, porque na prática quase todo time para — mas dá para tirar.
   */
  optional?: boolean
}

/* -------------------------------------------------------------------------- */
/* Datas como texto local, para não escorregar de dia por causa de fuso        */
/* -------------------------------------------------------------------------- */

export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(iso: string, days: number): string {
  const date = fromISODate(iso)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

export function formatShort(iso: string): string {
  const date = fromISODate(iso)
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export function formatLong(iso: string): string {
  return fromISODate(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

/* -------------------------------------------------------------------------- */
/* Páscoa — algoritmo gregoriano de Meeus/Jones/Butcher                        */
/* -------------------------------------------------------------------------- */

function easterSunday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

function shift(base: Date, days: number): string {
  const date = new Date(base)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

/** Feriados nacionais de um ano, incluindo os móveis. */
export function brazilHolidays(year: number): Holiday[] {
  const easter = easterSunday(year)
  const pad = (n: number) => String(n).padStart(2, '0')
  const fixed = (month: number, day: number) => `${year}-${pad(month)}-${pad(day)}`

  return [
    { date: fixed(1, 1), name: 'Confraternização Universal' },
    { date: shift(easter, -48), name: 'Carnaval (segunda)', optional: true },
    { date: shift(easter, -47), name: 'Carnaval', optional: true },
    { date: shift(easter, -2), name: 'Sexta-feira Santa' },
    { date: fixed(4, 21), name: 'Tiradentes' },
    { date: fixed(5, 1), name: 'Dia do Trabalho' },
    { date: shift(easter, 60), name: 'Corpus Christi', optional: true },
    { date: fixed(9, 7), name: 'Independência' },
    { date: fixed(10, 12), name: 'Nossa Senhora Aparecida' },
    { date: fixed(11, 2), name: 'Finados' },
    { date: fixed(11, 15), name: 'Proclamação da República' },
    { date: fixed(11, 20), name: 'Consciência Negra' },
    { date: fixed(12, 25), name: 'Natal' },
  ].sort((a, b) => a.date.localeCompare(b.date))
}

/** Os feriados que caem dentro da janela da sprint. */
export function holidaysInWindow(start: string, days: number): Holiday[] {
  const end = addDays(start, days - 1)
  const years = new Set([fromISODate(start).getFullYear(), fromISODate(end).getFullYear()])

  return [...years]
    .flatMap((year) => brazilHolidays(year))
    .filter((h) => h.date >= start && h.date <= end)
    .sort((a, b) => a.date.localeCompare(b.date))
}

/* -------------------------------------------------------------------------- */
/* Dias úteis                                                                  */
/* -------------------------------------------------------------------------- */

export function isWeekend(iso: string): boolean {
  const day = fromISODate(iso).getDay()
  return day === 0 || day === 6
}

export interface SprintWindow {
  start: string
  days: number
  holidays: Holiday[]
}

export interface WindowStats {
  start: string
  end: string
  calendarDays: number
  weekendDays: number
  holidayDays: number
  workingDays: number
}

/**
 * Dias úteis da janela: dias corridos menos fins de semana menos feriados.
 * Feriado que cai no fim de semana não conta duas vezes.
 */
export function windowStats({ start, days, holidays }: SprintWindow): WindowStats {
  const holidaySet = new Set(holidays.map((h) => h.date))
  let weekendDays = 0
  let holidayDays = 0
  let workingDays = 0

  for (let i = 0; i < days; i++) {
    const iso = addDays(start, i)
    if (isWeekend(iso)) {
      weekendDays++
    } else if (holidaySet.has(iso)) {
      holidayDays++
    } else {
      workingDays++
    }
  }

  return {
    start,
    end: addDays(start, days - 1),
    calendarDays: days,
    weekendDays,
    holidayDays,
    workingDays,
  }
}

/** Durações comuns. O número é em dias corridos. */
export const SPRINT_PRESETS = [
  { days: 7, label: '1 semana' },
  { days: 14, label: '2 semanas' },
  { days: 15, label: '15 dias' },
  { days: 21, label: '3 semanas' },
  { days: 28, label: '4 semanas' },
] as const

/** Segunda-feira mais próxima a partir de hoje — o começo de sprint usual. */
export function nextMonday(from = new Date()): string {
  const date = new Date(from)
  const day = date.getDay()
  if (day !== 1) date.setDate(date.getDate() + ((8 - day) % 7 || 7))
  return toISODate(date)
}
