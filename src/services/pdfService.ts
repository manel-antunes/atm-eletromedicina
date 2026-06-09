import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Equipamento } from '../data/equipamentos'
import { differenceInDays } from 'date-fns'
import { parseData } from '../utils/dateUtils'

function getEstadoPdf(eq: Equipamento): string {
  const proxima = parseData(eq.dataCalibracao)
  if (!proxima) return 'Sem data'
  const diff = differenceInDays(proxima, new Date())
  if (diff < 0) return 'Vencida'
  if (diff <= 30) return 'Urgente'
  if (diff <= 60) return 'Em breve'
  return 'Em dia'
}

function getUltimaCalib(proxima: Date, periodicidade: string): string {
  const ultima = new Date(proxima)
  if (periodicidade === 'Bienal') ultima.setFullYear(ultima.getFullYear() - 2)
  else ultima.setFullYear(ultima.getFullYear() - 1)
  return ultima.toLocaleDateString('pt-PT')
}

function corEstado(estado: string): [number, number, number] {
  switch (estado) {
    case 'Vencida': return [220, 38, 38]
    case 'Urgente': return [234, 88, 12]
    case 'Em breve': return [217, 119, 6]
    default: return [22, 163, 74]
  }
}

export function gerarPDFAlertas(equipamentos: Equipamento[]) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const hoje = new Date()
  const hojeStr = hoje.toLocaleDateString('pt-PT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const alertas = equipamentos.filter(eq => {
    const proxima = parseData(eq.dataCalibracao)
    if (!proxima) return true
    return differenceInDays(proxima, hoje) <= 60
  })

  const vencidas = alertas.filter(eq => getEstadoPdf(eq) === 'Vencida')
  const urgentes = alertas.filter(eq => getEstadoPdf(eq) === 'Urgente')
  const emBreve  = alertas.filter(eq => getEstadoPdf(eq) === 'Em breve')

  // Header vermelho
  doc.setFillColor(192, 0, 26)
  doc.rect(0, 0, 297, 28, 'F')

  // Logo ATM
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('ATM', 14, 12)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Manutenção Total · Eletromedicina', 14, 18)
  doc.text('Relatório de Alertas de Calibração', 14, 24)

  // Data e hora no canto direito
  doc.setFontSize(8)
  doc.text(hojeStr, 283, 12, { align: 'right' })
  doc.text(`Gerado em ${hoje.toLocaleTimeString('pt-PT')}`, 283, 18, { align: 'right' })

  // KPIs
  const kpis = [
    { label: 'Total Equipamentos', valor: equipamentos.length, cor: [59, 130, 246] as [number,number,number] },
    { label: 'Calibrações em dia', valor: equipamentos.length - alertas.length, cor: [22, 163, 74] as [number,number,number] },
    { label: 'A vencer em breve', valor: emBreve.length + urgentes.length, cor: [217, 119, 6] as [number,number,number] },
    { label: 'Vencidas', valor: vencidas.length, cor: [220, 38, 38] as [number,number,number] },
  ]

  const kpiW = 60
  const kpiX = 14
  const kpiY = 32

  kpis.forEach((k, i) => {
    const x = kpiX + i * (kpiW + 5)
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(x, kpiY, kpiW, 18, 2, 2, 'F')
    doc.setDrawColor(...k.cor)
    doc.setLineWidth(0.5)
    doc.line(x, kpiY, x + kpiW, kpiY)

    doc.setTextColor(...k.cor)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(String(k.valor), x + kpiW / 2, kpiY + 10, { align: 'center' })

    doc.setTextColor(100, 116, 139)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(k.label.toUpperCase(), x + kpiW / 2, kpiY + 15, { align: 'center' })
  })

  let y = kpiY + 24

  // Função para tabela por estado
  function adicionarTabela(titulo: string, lista: Equipamento[], corTitulo: [number,number,number]) {
    if (lista.length === 0) return

    if (y > 170) {
      doc.addPage()
      y = 14
    }

    doc.setFillColor(...corTitulo)
    doc.rect(14, y, 269, 7, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text(`${titulo.toUpperCase()} (${lista.length})`, 17, y + 5)
    y += 7

    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      head: [['Nº SAP', 'Descrição', 'Marca/Modelo', 'Última Calib.', 'Próxima Calib.', 'Localização', 'Estado', 'Dias']],
      body: lista.map(eq => {
        const proxima = parseData(eq.dataCalibracao)
        const diff = proxima ? differenceInDays(proxima, hoje) : null
        const estado = getEstadoPdf(eq)
        return [
          eq.numeroSAP,
          eq.descricao,
          `${eq.marca} ${eq.modelo}`,
          proxima ? getUltimaCalib(proxima, eq.periodicidade ?? 'Anual') : '—',
          proxima ? proxima.toLocaleDateString('pt-PT') : '—',
          eq.localizacao || '—',
          estado,
          diff !== null ? (diff < 0 ? `Há ${Math.abs(diff)}d` : `Em ${diff}d`) : '—',
        ]
      }),
      headStyles: {
        fillColor: [248, 250, 252],
        textColor: [100, 116, 139],
        fontSize: 7,
        fontStyle: 'bold',
        halign: 'left',
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [30, 41, 59],
      },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 60 },
        2: { cellWidth: 35 },
        3: { cellWidth: 22 },
        4: { cellWidth: 22 },
        5: { cellWidth: 40 },
        6: { cellWidth: 22, fontStyle: 'bold' },
        7: { cellWidth: 16, halign: 'center' },
      },
      didParseCell: (data) => {
        if (data.column.index === 6 && data.section === 'body') {
          const estado = data.cell.raw as string
          const cor = corEstado(estado)
          data.cell.styles.textColor = cor
        }
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      tableLineColor: [226, 232, 240],
      tableLineWidth: 0.1,
    })

    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
  }

  adicionarTabela('Calibrações Vencidas', vencidas, [220, 38, 38])
  adicionarTabela('Calibrações Urgentes', urgentes, [234, 88, 12])
  adicionarTabela('A Vencer em Breve', emBreve, [217, 119, 6])

  // Footer em todas as páginas
  const totalPaginas = doc.getNumberOfPages()
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i)
    doc.setFillColor(248, 250, 252)
    doc.rect(0, 200, 297, 10, 'F')
    doc.setTextColor(148, 163, 184)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text('ATM Eletromedicina · Relatório gerado automaticamente', 14, 206)
    doc.text(`Página ${i} de ${totalPaginas}`, 283, 206, { align: 'right' })
  }

  doc.save(`ATM_Alertas_${hoje.toLocaleDateString('pt-PT').replace(/\//g, '-')}.pdf`)
}

export function gerarPDFInventario(equipamentos: Equipamento[]) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const hoje = new Date()

  // Header
  doc.setFillColor(192, 0, 26)
  doc.rect(0, 0, 297, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('ATM', 14, 12)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Manutenção Total · Eletromedicina', 14, 18)
  doc.text('Inventário Completo de Equipamentos de Teste', 14, 24)
  doc.setFontSize(8)
  doc.text(hoje.toLocaleDateString('pt-PT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), 283, 18, { align: 'right' })

  autoTable(doc, {
    startY: 32,
    margin: { left: 14, right: 14 },
    head: [['Nº SAP', 'Descrição', 'Marca', 'Modelo', 'Nº Série', 'Periodicidade', 'Última Calib.', 'Próxima Calib.', 'Estado', 'Localização']],
    body: equipamentos.map(eq => {
      const proxima = parseData(eq.dataCalibracao)
      const estado = getEstadoPdf(eq)
      return [
        eq.numeroSAP,
        eq.descricao,
        eq.marca,
        eq.modelo,
        eq.numeroSerie || '—',
        eq.periodicidade ?? 'Anual',
        proxima ? getUltimaCalib(proxima, eq.periodicidade ?? 'Anual') : '—',
        proxima ? proxima.toLocaleDateString('pt-PT') : '—',
        estado,
        eq.localizacao || '—',
      ]
    }),
    headStyles: {
      fillColor: [192, 0, 26],
      textColor: [255, 255, 255],
      fontSize: 7,
      fontStyle: 'bold',
    },
    bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 55 },
      2: { cellWidth: 22 },
      3: { cellWidth: 22 },
      4: { cellWidth: 22 },
      5: { cellWidth: 20 },
      6: { cellWidth: 22 },
      7: { cellWidth: 22 },
      8: { cellWidth: 18, fontStyle: 'bold' },
      9: { cellWidth: 35 },
    },
    didParseCell: (data) => {
      if (data.column.index === 8 && data.section === 'body') {
        const estado = data.cell.raw as string
        data.cell.styles.textColor = corEstado(estado)
      }
    },
    tableLineColor: [226, 232, 240],
    tableLineWidth: 0.1,
  })

  // Footer
  const totalPaginas = doc.getNumberOfPages()
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i)
    doc.setFillColor(248, 250, 252)
    doc.rect(0, 200, 297, 10, 'F')
    doc.setTextColor(148, 163, 184)
    doc.setFontSize(7)
    doc.text('ATM Eletromedicina · Inventário de Equipamentos de Teste', 14, 206)
    doc.text(`Página ${i} de ${totalPaginas} · ${equipamentos.length} equipamentos`, 283, 206, { align: 'right' })
  }

  doc.save(`ATM_Inventario_${hoje.toLocaleDateString('pt-PT').replace(/\//g, '-')}.pdf`)
}