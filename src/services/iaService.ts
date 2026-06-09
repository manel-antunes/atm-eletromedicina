import type { Equipamento } from '../data/equipamentos'
import { differenceInDays } from 'date-fns'
import { parseData } from '../utils/dateUtils'

export interface ScoreEquipamento {
  equipamento: Equipamento
  score: number
  nivel: 'critico' | 'alto' | 'medio' | 'baixo'
  fatores: string[]
  recomendacao: string
  diasAteCalib: number | null
}

export interface PrevisaoMes {
  mes: string
  total: number
  criticos: number
  cargaRelativa: number
}

export interface InsightIA {
  tipo: 'alerta' | 'tendencia' | 'oportunidade' | 'info'
  titulo: string
  descricao: string
  equipamentos?: string[]
  prioridade: number
}

export function calcularScoreRisco(eq: Equipamento): ScoreEquipamento {
  const hoje = new Date()
  const proxima = parseData(eq.dataCalibracao)
  const fatores: string[] = []
  let score = 0

  // Fator 1 — dias até calibração
  let diasAteCalib: number | null = null
  if (proxima) {
    diasAteCalib = differenceInDays(proxima, hoje)
    if (diasAteCalib < 0) {
      score += 50 + Math.min(Math.abs(diasAteCalib) * 0.5, 30)
      fatores.push(`Calibração vencida há ${Math.abs(diasAteCalib)} dias`)
    } else if (diasAteCalib <= 14) {
      score += 40
      fatores.push(`Calibração em apenas ${diasAteCalib} dias`)
    } else if (diasAteCalib <= 30) {
      score += 30
      fatores.push(`Calibração em ${diasAteCalib} dias`)
    } else if (diasAteCalib <= 60) {
      score += 15
      fatores.push(`Calibração em ${diasAteCalib} dias`)
    }
  } else {
    score += 60
    fatores.push('Sem data de calibração registada')
  }

  // Fator 2 — equipamento cedido
  const loc = eq.localizacao?.toLowerCase() ?? ''
  const emCasa = loc.includes('hprt') || loc.includes('htrd') || loc.includes('fixo')
  if (!emCasa && proxima && differenceInDays(proxima, hoje) <= 60) {
    score += 20
    fatores.push(`Equipamento cedido a ${eq.localizacao} — difícil de recuperar a tempo`)
  }

  // Fator 3 — sem responsável definido
  if (!eq.responsavel || eq.responsavel === '—') {
    score += 10
    fatores.push('Sem responsável definido')
  }

  // Fator 4 — periodicidade bienal com calibração próxima
  if (eq.periodicidade === 'Bienal' && proxima && differenceInDays(proxima, hoje) <= 90) {
    score += 10
    fatores.push('Calibração bienal — processo mais complexo')
  }

  // Fator 5 — sem número de série
  if (!eq.numeroSerie || eq.numeroSerie === '—' || eq.numeroSerie === '-') {
    score += 5
    fatores.push('Sem número de série registado')
  }

  score = Math.min(score, 100)

  let nivel: ScoreEquipamento['nivel']
  let recomendacao: string

  if (score >= 70) {
    nivel = 'critico'
    recomendacao = 'Ação imediata necessária — agendar calibração urgentemente'
  } else if (score >= 45) {
    nivel = 'alto'
    recomendacao = 'Agendar calibração nas próximas semanas'
  } else if (score >= 20) {
    nivel = 'medio'
    recomendacao = 'Monitorizar — calibração a aproximar-se'
  } else {
    nivel = 'baixo'
    recomendacao = 'Situação normal — sem ação necessária'
  }

  return { equipamento: eq, score, nivel, fatores, recomendacao, diasAteCalib }
}

export function gerarInsights(equipamentos: Equipamento[]): InsightIA[] {
  const hoje = new Date()
  const insights: InsightIA[] = []
  const scores = equipamentos.map(calcularScoreRisco)

  // Insight 1 — equipamentos críticos cedidos
  const criticosCedidos = scores.filter(s => {
    const loc = s.equipamento.localizacao?.toLowerCase() ?? ''
    const emCasa = loc.includes('hprt') || loc.includes('htrd') || loc.includes('fixo')
    return !emCasa && s.diasAteCalib !== null && s.diasAteCalib <= 60
  })
  if (criticosCedidos.length > 0) {
    insights.push({
      tipo: 'alerta',
      titulo: `${criticosCedidos.length} equipamento(s) cedido(s) com calibração próxima`,
      descricao: 'Estes equipamentos estão fora da Eletromedicina e precisam de ser recuperados antes da calibração.',
      equipamentos: criticosCedidos.map(s => s.equipamento.descricao),
      prioridade: 1,
    })
  }

  // Insight 2 — mês mais crítico
  const proximosMeses = Array.from({ length: 6 }, (_, i) => {
    const mes = new Date(hoje)
    mes.setMonth(mes.getMonth() + i)
    const inicio = new Date(mes.getFullYear(), mes.getMonth(), 1)
    const fim = new Date(mes.getFullYear(), mes.getMonth() + 1, 1)
    const count = equipamentos.filter(eq => {
      const p = parseData(eq.dataCalibracao)
      return p && p >= inicio && p < fim
    }).length
    return { mes: inicio.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' }), count }
  })
  const mesCritico = proximosMeses.reduce((a, b) => a.count > b.count ? a : b)
  if (mesCritico.count > 3) {
    insights.push({
      tipo: 'tendencia',
      titulo: `Pico de calibrações em ${mesCritico.mes}`,
      descricao: `${mesCritico.count} equipamentos para calibrar neste mês. Recomenda-se planear com antecedência.`,
      prioridade: 2,
    })
  }

  // Insight 3 — sem responsável
  const semResponsavel = equipamentos.filter(eq => !eq.responsavel || eq.responsavel === '—')
  if (semResponsavel.length > 0) {
    insights.push({
      tipo: 'oportunidade',
      titulo: `${semResponsavel.length} equipamento(s) sem responsável`,
      descricao: 'Atribuir responsáveis melhora o acompanhamento e reduz o risco de calibrações esquecidas.',
      equipamentos: semResponsavel.slice(0, 3).map(eq => eq.descricao),
      prioridade: 3,
    })
  }

  // Insight 4 — taxa de conformidade
  const emDia = scores.filter(s => s.nivel === 'baixo' || s.nivel === 'medio').length
  const taxa = Math.round((emDia / equipamentos.length) * 100)
  insights.push({
    tipo: 'info',
    titulo: `Taxa de conformidade: ${taxa}%`,
    descricao: taxa >= 80
      ? 'Excelente! A maioria dos equipamentos está em dia com as calibrações.'
      : taxa >= 60
      ? 'Taxa razoável. Existem oportunidades de melhoria.'
      : 'Taxa baixa. É necessário um plano de ação para regularizar as calibrações.',
    prioridade: 4,
  })

  // Insight 5 — equipamentos bianuais a vencer
  const bianuaisProximos = equipamentos.filter(eq => {
    const p = parseData(eq.dataCalibracao)
    return eq.periodicidade === 'Bienal' && p && differenceInDays(p, hoje) <= 180
  })
  if (bianuaisProximos.length > 0) {
    insights.push({
      tipo: 'alerta',
      titulo: `${bianuaisProximos.length} calibração(ões) bienal(is) nos próximos 6 meses`,
      descricao: 'Calibrações bianuais requerem mais tempo de planeamento e coordenação.',
      equipamentos: bianuaisProximos.map(eq => eq.descricao),
      prioridade: 2,
    })
  }

  return insights.sort((a, b) => a.prioridade - b.prioridade)
}

export function calcularPrevisaoMeses(equipamentos: Equipamento[]): PrevisaoMes[] {
  const hoje = new Date()
  return Array.from({ length: 12 }, (_, i) => {
    const mes = new Date(hoje)
    mes.setMonth(mes.getMonth() + i)
    const inicio = new Date(mes.getFullYear(), mes.getMonth(), 1)
    const fim = new Date(mes.getFullYear(), mes.getMonth() + 1, 1)

    const equipMes = equipamentos.filter(eq => {
      const p = parseData(eq.dataCalibracao)
      return p && p >= inicio && p < fim
    })

    const criticos = equipMes.filter(eq => {
      const p = parseData(eq.dataCalibracao)
      return p && differenceInDays(p, hoje) < 0
    }).length

    return {
      mes: inicio.toLocaleDateString('pt-PT', { month: 'short', year: '2-digit' }),
      total: equipMes.length,
      criticos,
      cargaRelativa: equipMes.length,
    }
  })
}