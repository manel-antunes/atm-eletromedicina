import { parse, isValid } from 'date-fns'

export function parseData(dataStr: string): Date | null {
  if (!dataStr || dataStr === 'undefined') return null
  const numerico = Number(dataStr)
  if (!isNaN(numerico) && numerico > 40000) {
    const data = new Date((numerico - 25569) * 86400 * 1000)
    if (isValid(data)) return data
  }
  const formatos = ['M/d/yyyy', 'MM/dd/yyyy', 'dd/MM/yyyy', 'yyyy-MM-dd']
  for (const fmt of formatos) {
    const tentativa = parse(dataStr, fmt, new Date())
    if (isValid(tentativa)) return tentativa
  }
  return null
}
