import type { Equipamento } from '../data/equipamentos'
import { differenceInDays, parse, isValid } from 'date-fns'

const API_URL = 'http://localhost:3001'

function parseData(dataStr: string): Date | null {
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

function getEstadoAlerta(eq: Equipamento): 'vencido' | 'urgente' | 'aviso' | null {
  const proxima = parseData(eq.dataCalibracao)
  if (!proxima) return 'vencido'
  const diff = differenceInDays(proxima, new Date())
  if (diff < 0) return 'vencido'
  if (diff <= 30) return 'urgente'
  if (diff <= 60) return 'aviso'
  return null
}

export function prepararAlertas(equipamentos: Equipamento[], filtros: { incluirVencidas: boolean; incluirUrgentes: boolean; incluirEmBreve: boolean }) {
  return equipamentos
    .map(eq => {
      const estado = getEstadoAlerta(eq)
      if (!estado) return null
      if (estado === 'vencido' && !filtros.incluirVencidas) return null
      if (estado === 'urgente' && !filtros.incluirUrgentes) return null
      if (estado === 'aviso'   && !filtros.incluirEmBreve)  return null
      const proxima = parseData(eq.dataCalibracao)
      const diasRestantes = proxima ? differenceInDays(proxima, new Date()) : -999
      return {
        descricao: eq.descricao,
        marca: eq.marca,
        modelo: eq.modelo,
        numeroSAP: eq.numeroSAP,
        localizacao: eq.localizacao,
        diasRestantes,
        proximaCalib: proxima ? proxima.toLocaleDateString('pt-PT') : '—',
        estado,
      }
    })
    .filter(Boolean)
}

export async function enviarAlertasEmail(equipamentos: Equipamento[], destinatarios?: string[], filtros?: { incluirVencidas: boolean; incluirUrgentes: boolean; incluirEmBreve: boolean }) {
  const filtrosPadrao = filtros ?? { incluirVencidas: true, incluirUrgentes: true, incluirEmBreve: true }
  const alertas = prepararAlertas(equipamentos, filtrosPadrao)
  const res = await fetch(`${API_URL}/api/enviar-alertas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alertas, destinatarios }),
  })
  if (!res.ok) throw new Error('Falha ao enviar alertas')
  return res.json()
}

export async function atualizarCache(equipamentos: Equipamento[]) {
  const alertas = prepararAlertas(equipamentos, { incluirVencidas: true, incluirUrgentes: true, incluirEmBreve: true })
  await fetch(`${API_URL}/api/alertas-cache`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alertas }),
  })
}

export async function testarEmail(): Promise<boolean> {
  const res = await fetch(`${API_URL}/api/testar-email`, { method: 'POST' })
  return res.ok
}

export async function carregarConfig() {
  const res = await fetch(`${API_URL}/api/config`)
  return res.json()
}

export async function guardarConfig(config: unknown) {
  const res = await fetch(`${API_URL}/api/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  })
  return res.json()
}

export async function carregarHistorico() {
  const res = await fetch(`${API_URL}/api/historico`)
  return res.json()
}