import { useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { Upload, FileSpreadsheet } from 'lucide-react'
import type { Equipamento } from '../data/equipamentos'
import { guardarEquipamentos } from '../data/storage'
import logoAtm from '../assets/logo-atm.png'

interface Props {
  onImportar: (equipamentos: Equipamento[]) => void
}

export default function ImportarExcel({ onImportar }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Nós conectados — tema de rede biomédica
    interface Node {
      x: number; y: number; vx: number; vy: number
      r: number; alpha: number; pulseOffset: number
    }
    const nodes: Node[] = Array.from({ length: 40 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 2.5 + 1,
      alpha: Math.random() * 0.5 + 0.2,
      pulseOffset: Math.random() * Math.PI * 2,
    }))

    // Ondas circulares a emanar do centro
    const waves: { r: number; alpha: number; speed: number }[] = Array.from({ length: 4 }, (_, i) => ({
      r: i * 180,
      alpha: 0.12 - i * 0.02,
      speed: 0.8,
    }))

    let t = 0
    let animId: number

    function draw() {
      const w = canvas!.width
      const h = canvas!.height
      const cx = w * 0.22  // centro das ondas no painel esquerdo
      const cy = h * 0.5

      ctx!.fillStyle = 'rgba(10,6,6,0.18)'
      ctx!.fillRect(0, 0, w, h)

      // Ondas circulares
      waves.forEach(wave => {
        wave.r += wave.speed
        if (wave.r > Math.max(w, h) * 1.2) wave.r = 0

        const gradient = ctx!.createRadialGradient(cx, cy, wave.r - 2, cx, cy, wave.r + 2)
        gradient.addColorStop(0, `rgba(192,0,26,0)`)
        gradient.addColorStop(0.5, `rgba(192,0,26,${wave.alpha * (1 - wave.r / (Math.max(w,h)*1.2))})`)
        gradient.addColorStop(1, `rgba(192,0,26,0)`)
        ctx!.beginPath()
        ctx!.arc(cx, cy, wave.r, 0, Math.PI * 2)
        ctx!.strokeStyle = `rgba(192,0,26,${wave.alpha * (1 - wave.r / (Math.max(w,h)*1.2))})`
        ctx!.lineWidth = 1.5
        ctx!.stroke()
      })

      // Nós
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy
        if (n.x < 0) n.x = w; if (n.x > w) n.x = 0
        if (n.y < 0) n.y = h; if (n.y > h) n.y = 0

        const pulse = 0.6 + 0.4 * Math.sin(t * 0.05 + n.pulseOffset)
        ctx!.beginPath()
        ctx!.arc(n.x, n.y, n.r * pulse, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(192,0,26,${n.alpha * pulse})`
        ctx!.fill()
      })

      // Ligações entre nós próximos
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y)
          if (d < 140) {
            ctx!.beginPath()
            ctx!.moveTo(nodes[i].x, nodes[i].y)
            ctx!.lineTo(nodes[j].x, nodes[j].y)
            ctx!.strokeStyle = `rgba(192,0,26,${0.1 * (1 - d / 140)})`
            ctx!.lineWidth = 0.6
            ctx!.stroke()
          }
        }
      }

      // Vignette
      const vig = ctx!.createRadialGradient(w/2, h/2, h*0.2, w/2, h/2, h)
      vig.addColorStop(0, 'rgba(10,6,6,0)')
      vig.addColorStop(1, 'rgba(10,6,6,0.75)')
      ctx!.fillStyle = vig
      ctx!.fillRect(0, 0, w, h)

      t++
      animId = requestAnimationFrame(draw)
    }

    ctx.fillStyle = '#0a0606'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  function handleFicheiro(e: React.ChangeEvent<HTMLInputElement>) {
    const ficheiro = e.target.files?.[0]
    if (!ficheiro) return
    const reader = new FileReader()
    reader.onload = (evento) => {
      const dados = new Uint8Array(evento.target?.result as ArrayBuffer)
      const workbook = XLSX.read(dados, { type: 'array' })
      const folha = workbook.Sheets[workbook.SheetNames[0]]
      const linhas = XLSX.utils.sheet_to_json(folha, { header: 1 }) as string[][]
      const equipamentos: Equipamento[] = linhas
        .slice(1)
        .filter((linha) => {
          const sap = String(linha[0] ?? '').trim()
          return sap !== '' && sap !== 'undefined' && sap !== 'Nº SAP' && sap.length > 3
        })
        .map((linha, index) => {
          const sap = String(linha[0] ?? '')
          return {
            id: index + 1,
            numeroSAP: sap,
            descricao: String(linha[1] ?? ''),
            marca: String(linha[2] ?? ''),
            modelo: String(linha[3] ?? ''),
            numeroSerie: String(linha[4] ?? ''),
            dataCalibracao: String(linha[5] ?? ''),
            responsavel: String(linha[6] ?? ''),
            warning: String(linha[7] ?? ''),
            localizacao: String(linha[8] ?? ''),
            obs: String(linha[9] ?? ''),
            obs2: String(linha[10] ?? ''),
            obs3: String(linha[11] ?? ''),
            ccPasta2025: String(linha[12] ?? ''),
            periodicidade: sap === '631009707' ? 'Bienal' : 'Anual',
          }
        })
      guardarEquipamentos(equipamentos)
      onImportar(equipamentos)
    }
    reader.readAsArrayBuffer(ficheiro)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#0a0606' }}>
      <style>{`
        @keyframes fade-up { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse-ring { 0%{transform:scale(1);opacity:.6} 70%{transform:scale(2);opacity:0} 100%{transform:scale(2);opacity:0} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        .fade-up { animation: fade-up .6s cubic-bezier(.16,1,.3,1) both }
        .float { animation: float 4s ease-in-out infinite }
        .upload-btn {
          display:flex;align-items:center;gap:10px;
          padding:14px 28px;border:none;border-radius:12px;cursor:pointer;
          background:linear-gradient(135deg,#C0001A,#E30613);
          color:#fff;font-size:14px;font-weight:700;
          box-shadow:0 8px 32px rgba(192,0,26,.4);
          transition:all .2s;
        }
        .upload-btn:hover { transform:translateY(-2px); box-shadow:0 14px 40px rgba(192,0,26,.5) }
        .upload-btn:active { transform:scale(.97) }
        .drop-zone {
          border:2px dashed rgba(192,0,26,.25);
          border-radius:16px;padding:20px;
          transition:all .2s;cursor:pointer;
          background:rgba(192,0,26,.03);
        }
        .drop-zone:hover { border-color:rgba(192,0,26,.5); background:rgba(192,0,26,.06) }
      `}</style>

      {/* Canvas animado */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, display: 'block' }} />

      {/* Layout */}
      <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex' }}>

        {/* Painel esquerdo */}
        <div style={{ width: 320, minHeight: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '40px 36px', background: 'rgba(192,0,26,0.12)', backdropFilter: 'blur(20px)', borderRight: '1px solid rgba(192,0,26,.2)' }}>
          <div>
            <div className="float" style={{ marginBottom: 40 }}>
              <img src={logoAtm} alt="ATM" style={{ width: 120, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
            </div>
            <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, lineHeight: 1.2, margin: '0 0 16px', letterSpacing: '-0.5px' }}>
              Gestão de<br />Equipamentos<br />
              <span style={{ color: 'rgba(255,255,255,.5)', fontWeight: 400, fontSize: 22 }}>de Teste</span>
            </h1>
            <p style={{ color: 'rgba(255,255,255,.45)', fontSize: 13, lineHeight: 1.7, margin: 0 }}>
              Sistema de gestão de equipamentos de teste e calibração para a equipa de Eletromedicina da ATM.
            </p>

            {/* Stats */}
            <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Equipamentos geridos', valor: '49+' },
                { label: 'Tipos de ficha OT', valor: '51' },
                { label: 'Unidade', valor: 'HPRT' },
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <span style={{ color: 'rgba(255,255,255,.4)', fontSize: 12 }}>{s.label}</span>
                  <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{s.valor}</span>
                </div>
              ))}
            </div>
          </div>
          <p style={{ color: 'rgba(255,255,255,.2)', fontSize: 11, fontFamily: 'monospace' }}>v1.0 · ATM 2026</p>
        </div>

        {/* Painel direito */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <div className="fade-up" style={{ width: '100%', maxWidth: 440 }}>

            {/* Card principal */}
            <div style={{ background: 'rgba(10,6,6,0.85)', border: '1px solid rgba(192,0,26,.2)', borderRadius: 24, padding: '40px 36px', backdropFilter: 'blur(32px)', boxShadow: '0 40px 100px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.04)' }}>

              {/* Linha topo */}
              <div style={{ height: 2, background: 'linear-gradient(90deg,transparent,rgba(192,0,26,.8),transparent)', borderRadius: 99, marginBottom: 32 }} />

              {/* Ícone */}
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: 24 }}>
                <div style={{ position: 'absolute', inset: -4, borderRadius: 20, border: '1px solid rgba(192,0,26,.3)', animation: 'pulse-ring 2s ease-out infinite' }} />
                <div style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(192,0,26,.15)', border: '1px solid rgba(192,0,26,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileSpreadsheet size={28} color="#ff3333" />
                </div>
              </div>

              <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.3px' }}>
                Importar Lista de Equipamentos
              </h2>
              <p style={{ color: 'rgba(255,255,255,.35)', fontSize: 13, margin: '0 0 28px', lineHeight: 1.6 }}>
                Seleciona o ficheiro Excel (.xlsx) exportado do SAP para carregar os equipamentos.
              </p>

              {/* Drop zone */}
              <div className="drop-zone" onClick={() => inputRef.current?.click()}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '12px 0' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(192,0,26,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Upload size={22} color="rgba(192,0,26,.8)" />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>
                      Clica para selecionar
                    </p>
                    <p style={{ color: 'rgba(255,255,255,.25)', fontSize: 12, margin: 0 }}>
                      Ficheiros .xlsx ou .xls
                    </p>
                  </div>
                  <button className="upload-btn" onClick={e => { e.stopPropagation(); inputRef.current?.click() }}>
                    <Upload size={15} />
                    Selecionar ficheiro .xlsx
                  </button>
                </div>
              </div>

              <input ref={inputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFicheiro} />

              <p style={{ textAlign: 'center', color: 'rgba(255,255,255,.15)', fontSize: 11, marginTop: 20 }}>
                Os dados são guardados na base de dados
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}