import { differenceInDays } from 'date-fns'
import { parseData } from './dateUtils'
import type { Equipamento } from '../data/equipamentos'

export type EstadoCalibracao = 'vencido' | 'urgente' | 'aviso' | 'ok'

export function getEstado(eq: Equipamento): EstadoCalibracao {
  const proxima = parseData(eq.dataCalibracao)
  if (!proxima) return 'vencido'
  const diff = differenceInDays(proxima, new Date())
  if (diff < 0) return 'vencido'
  if (diff <= 30) return 'urgente'
  if (diff <= 60) return 'aviso'
  return 'ok'
}

export function contarAlertas(equipamentos: Equipamento[]): number {
  return equipamentos.filter(eq => getEstado(eq) !== 'ok').length
}
