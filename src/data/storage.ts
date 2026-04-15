import type { Equipamento } from './equipamentos'

const CHAVE = 'atm_equipamentos'

export function guardarEquipamentos(lista: Equipamento[]): void {
  localStorage.setItem(CHAVE, JSON.stringify(lista))
}

export function carregarEquipamentos(): Equipamento[] {
  const dados = localStorage.getItem(CHAVE)
  if (!dados) return []
  return JSON.parse(dados) as Equipamento[]
}

export function limparEquipamentos(): void {
  localStorage.removeItem(CHAVE)
}