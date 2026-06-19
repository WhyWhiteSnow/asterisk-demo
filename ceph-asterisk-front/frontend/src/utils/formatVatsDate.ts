/** Форматирует create_date / created_at из API для колонки таблицы ВАТС. */
export function formatVatsCreateDate(value: string | undefined | null): string {
  if (!value) return 'Нет данных'

  const isoDateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (isoDateOnly) {
    const [, year, month, day] = isoDateOnly
    return `${day}.${month}.${year} г.`
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  const day = String(parsed.getDate()).padStart(2, '0')
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const year = parsed.getFullYear()
  return `${day}.${month}.${year} г.`
}
