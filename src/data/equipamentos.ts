export type Periodicidade = 'Anual' | 'Bienal'

export interface RegistoCalib {
  id: number
  data: string
  tecnico: string
  entidade: string
  observacoes: string
  relatorio: string
  aprovadoPor: string
}

export interface Equipamento {
  id: number
  numeroSAP: string
  descricao: string
  marca: string
  modelo: string
  numeroSerie: string
  dataCalibracao: string
  responsavel: string
  warning: string
  localizacao: string
  obs: string
  obs2: string
  obs3: string
  ccPasta2025: string
  periodicidade: Periodicidade
  historicoCalibracao?: RegistoCalib[]
}