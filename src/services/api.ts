const API_URL = 'https://atm-eletromedicina-production.up.railway.app'

export async function importarEquipamentos(equipamentos: unknown[]) {
  const res = await fetch(`${API_URL}/api/equipamentos/importar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ equipamentos }),
  })
  return res.json()
}

export async function carregarEquipamentos() {
  const res = await fetch(`${API_URL}/api/equipamentos`)
  return res.json()
}

export async function registarCalibracao(dados: {
  equipamentoSAP: string
  dataCalibracao: string
  tecnico: string
  entidade: string
  observacoes: string
  relatorio: string
  aprovadoPor: string
  novaProximaCalib: string
}) {
  const res = await fetch(`${API_URL}/api/calibracoes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  })
  return res.json()
}

export async function carregarCalibracoes(sap: string) {
  const res = await fetch(`${API_URL}/api/calibracoes/${sap}`)
  return res.json()
}

export async function carregarCedencias() {
  const res = await fetch(`${API_URL}/api/cedencias`)
  return res.json()
}

export async function registarCedencia(dados: {
  equipamentoSAP: string
  equipamentoNome: string
  destino: string
  responsavel: string
  contacto: string
  dataSaida: string
  dataRetornoPrevista: string
  observacoes: string
}) {
  const res = await fetch(`${API_URL}/api/cedencias`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  })
  return res.json()
}

export async function registarRetorno(id: number, dataRetornoEfetiva: string) {
  const res = await fetch(`${API_URL}/api/cedencias/${id}/retorno`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataRetornoEfetiva }),
  })
  return res.json()
}