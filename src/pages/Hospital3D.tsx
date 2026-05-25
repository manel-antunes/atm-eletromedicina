import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import type { Equipamento } from '../data/equipamentos'
import { differenceInDays, parse, isValid } from 'date-fns'

interface Props {
  equipamentos: Equipamento[]
  onVerDetalhe?: (eq: Equipamento) => void
}

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

function getEstado(eq: Equipamento): 'vencida' | 'urgente' | 'emBreve' | 'emDia' {
  const proxima = parseData(eq.dataCalibracao)
  if (!proxima) return 'vencida'
  const diff = differenceInDays(proxima, new Date())
  if (diff < 0) return 'vencida'
  if (diff <= 30) return 'urgente'
  if (diff <= 60) return 'emBreve'
  return 'emDia'
}

const COR_ESTADO = {
  vencida: 0xdc2626,
  urgente: 0xea580c,
  emBreve: 0xd97706,
  emDia:   0x16a34a,
}

const COR_ESTADO_HEX = {
  vencida: '#dc2626',
  urgente: '#ea580c',
  emBreve: '#d97706',
  emDia:   '#16a34a',
}

const LABEL_ESTADO = {
  vencida: 'Vencida',
  urgente: 'Urgente',
  emBreve: 'Em breve',
  emDia:   'Em dia',
}

// Localizações do hospital com posição 3D (x, z) e piso (y)
const LOCALIZACOES: Record<string, { x: number; z: number; piso: number; label: string; cor: number }> = {
  'Bloco Operatório':              { x: -6,  z: -5,  piso: 1, label: 'Bloco Operatório',        cor: 0x6366f1 },
  'Bloco Partos':                  { x: -6,  z: -2,  piso: 1, label: 'Bloco Partos',             cor: 0x8b5cf6 },
  'UCIP':                          { x: -6,  z:  1,  piso: 1, label: 'UCIP',                     cor: 0xef4444 },
  'Urgência Adultos':              { x: -6,  z:  4,  piso: 0, label: 'Urgência Adultos',         cor: 0xf97316 },
  'Urgência Pediátrico':           { x: -2,  z:  4,  piso: 0, label: 'Urgência Pediátrico',      cor: 0xf59e0b },
  'Internamento Obstetrícia':      { x:  2,  z: -5,  piso: 2, label: 'Internamento Obstetrícia', cor: 0xec4899 },
  'Internamento Medicina Geral':   { x:  6,  z: -5,  piso: 2, label: 'Medicina Geral',           cor: 0x14b8a6 },
  'Internamento Pediatria':        { x:  6,  z: -2,  piso: 2, label: 'Internamento Pediatria',   cor: 0x06b6d4 },
  'Neonatologia':                  { x:  6,  z:  1,  piso: 2, label: 'Neonatologia',             cor: 0x3b82f6 },
  'Consultas Externas':            { x:  2,  z:  4,  piso: 0, label: 'Consultas Externas',       cor: 0x10b981 },
  'Consultas Ginecologia':         { x:  6,  z:  4,  piso: 0, label: 'Consultas Ginecologia',    cor: 0x22c55e },
  'Consultas Pediatria':           { x: -2,  z: -5,  piso: 0, label: 'Consultas Pediatria',      cor: 0x84cc16 },
  'Exames Especiais':              { x: -2,  z: -2,  piso: 1, label: 'Exames Especiais',         cor: 0xa855f7 },
  'Imagiologia':                   { x:  2,  z: -2,  piso: 1, label: 'Imagiologia',              cor: 0x64748b },
  'Otorrinolaringologia':          { x:  2,  z:  1,  piso: 1, label: 'ORL',                      cor: 0x0ea5e9 },
  'Farmácia':                      { x: -2,  z:  1,  piso: 0, label: 'Farmácia',                 cor: 0xf43f5e },
  'Neurociências':                 { x:  6,  z:  7,  piso: 2, label: 'Neurociências',            cor: 0x7c3aed },
  'Cabeleireiro':                  { x: -6,  z:  7,  piso: 3, label: 'Cabeleireiro',             cor: 0x9ca3af },
}

function getLocalizacao(loc: string) {
  if (!loc) return null
  const chave = Object.keys(LOCALIZACOES).find(k =>
    loc.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(loc.toLowerCase())
  )
  return chave ? LOCALIZACOES[chave] : null
}

export default function Hospital3D({ equipamentos, onVerDetalhe }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const frameRef = useRef<number>(0)
  const mouseRef = useRef({ x: 0, y: 0 })
  const isDragging = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })
  const camAngle = useRef({ theta: 0.6, phi: 0.8, radius: 28 })
  const meshesRef = useRef<{ mesh: THREE.Mesh; eqs: Equipamento[] }[]>([])

  const [tooltip, setTooltip] = useState<{
    x: number; y: number
    label: string
    eqs: Equipamento[]
  } | null>(null)
  const [filtro, setFiltro] = useState<'todos' | 'vencida' | 'urgente' | 'emBreve' | 'emDia'>('todos')
  const [stats, setStats] = useState({ vencida: 0, urgente: 0, emBreve: 0, emDia: 0 })

  useEffect(() => {
    // Stats
    const s = { vencida: 0, urgente: 0, emBreve: 0, emDia: 0 }
    equipamentos.forEach(eq => { s[getEstado(eq)]++ })
    setStats(s)
  }, [equipamentos])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0f1e)
    scene.fog = new THREE.FogExp2(0x0a0f1e, 0.018)
    sceneRef.current = scene

    // Camera
    const camera = new THREE.PerspectiveCamera(55, mount.clientWidth / mount.clientHeight, 0.1, 200)
    cameraRef.current = camera

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    rendererRef.current = renderer
    mount.appendChild(renderer.domElement)

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.4)
    scene.add(ambient)

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
    dirLight.position.set(10, 20, 10)
    dirLight.castShadow = true
    scene.add(dirLight)

    const pointLight = new THREE.PointLight(0xC0001A, 1.5, 30)
    pointLight.position.set(0, 8, 0)
    scene.add(pointLight)

    // Grid floor
    const gridHelper = new THREE.GridHelper(40, 20, 0x1e293b, 0x1e293b)
    scene.add(gridHelper)

    // Chão
    const floorGeo = new THREE.PlaneGeometry(40, 40)
    const floorMat = new THREE.MeshLambertMaterial({ color: 0x0f172a })
    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -0.05
    floor.receiveShadow = true
    scene.add(floor)

    // Agrupa equipamentos por localização
    const porLocalizacao: Record<string, Equipamento[]> = {}
    equipamentos.forEach(eq => {
      const loc = eq.localizacao?.trim() || 'Sem localização'
      if (!porLocalizacao[loc]) porLocalizacao[loc] = []
      porLocalizacao[loc].push(eq)
    })

    const meshes: { mesh: THREE.Mesh; eqs: Equipamento[] }[] = []

    Object.entries(porLocalizacao).forEach(([loc, eqs]) => {
      const locInfo = getLocalizacao(loc)
      if (!locInfo) return

      const pisoY = locInfo.piso * 2.5

      // Edifício base (bloco do piso)
      const blocoGeo = new THREE.BoxGeometry(2.8, 0.15, 2.8)
      const blocoMat = new THREE.MeshLambertMaterial({ color: locInfo.cor, opacity: 0.15, transparent: true })
      const bloco = new THREE.Mesh(blocoGeo, blocoMat)
      bloco.position.set(locInfo.x, pisoY - 0.07, locInfo.z)
      scene.add(bloco)

      // Conta estados
      const contagem = { vencida: 0, urgente: 0, emBreve: 0, emDia: 0 }
      eqs.forEach(eq => { contagem[getEstado(eq)]++ })

      // Cor dominante
      let estadoDominante: keyof typeof COR_ESTADO = 'emDia'
      if (contagem.vencida > 0) estadoDominante = 'vencida'
      else if (contagem.urgente > 0) estadoDominante = 'urgente'
      else if (contagem.emBreve > 0) estadoDominante = 'emBreve'

      const altura = Math.max(0.3, eqs.length * 0.12)

      // Coluna principal
      const colunaGeo = new THREE.BoxGeometry(2.4, altura, 2.4)
      const colunaMat = new THREE.MeshLambertMaterial({
        color: COR_ESTADO[estadoDominante],
        emissive: new THREE.Color(COR_ESTADO[estadoDominante]),
        emissiveIntensity: 0.15,
      })
      const coluna = new THREE.Mesh(colunaGeo, colunaMat)
      coluna.position.set(locInfo.x, pisoY + altura / 2, locInfo.z)
      coluna.castShadow = true
      coluna.receiveShadow = true
      scene.add(coluna)
      meshes.push({ mesh: coluna, eqs })

      // Topo brilhante
      const topoGeo = new THREE.BoxGeometry(2.6, 0.08, 2.6)
      const topoMat = new THREE.MeshLambertMaterial({
        color: COR_ESTADO[estadoDominante],
        emissive: new THREE.Color(COR_ESTADO[estadoDominante]),
        emissiveIntensity: 0.6,
      })
      const topo = new THREE.Mesh(topoGeo, topoMat)
      topo.position.set(locInfo.x, pisoY + altura + 0.04, locInfo.z)
      scene.add(topo)

      // Luz pontual por coluna
      const pLight = new THREE.PointLight(COR_ESTADO[estadoDominante], 0.6, 4)
      pLight.position.set(locInfo.x, pisoY + altura + 0.5, locInfo.z)
      scene.add(pLight)

      // Partículas flutuantes (equipamentos vencidos)
      if (contagem.vencida > 0) {
        for (let i = 0; i < Math.min(contagem.vencida, 5); i++) {
          const partGeo = new THREE.SphereGeometry(0.06, 8, 8)
          const partMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
          const part = new THREE.Mesh(partGeo, partMat)
          part.position.set(
            locInfo.x + (Math.random() - 0.5) * 2,
            pisoY + altura + 0.3 + Math.random() * 1.5,
            locInfo.z + (Math.random() - 0.5) * 2
          )
          scene.add(part)
        }
      }
    })

    // Linhas entre pisos (elevadores)
    for (let piso = 0; piso < 3; piso++) {
      const lineGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.5, 8)
      const lineMat = new THREE.MeshBasicMaterial({ color: 0x334155, opacity: 0.4, transparent: true })
      const line = new THREE.Mesh(lineGeo, lineMat)
      line.position.set(0, piso * 2.5 + 1.25, 0)
      scene.add(line)
    }

    meshesRef.current = meshes

    // Posiciona câmara
    function updateCamera() {
      const { theta, phi, radius } = camAngle.current
      camera.position.x = radius * Math.sin(phi) * Math.sin(theta)
      camera.position.y = radius * Math.cos(phi)
      camera.position.z = radius * Math.sin(phi) * Math.cos(theta)
      camera.lookAt(0, 3, 0)
    }
    updateCamera()

    // Animação
    let t = 0
    function animate() {
      frameRef.current = requestAnimationFrame(animate)
      t += 0.01

      // Pulsa a luz central
      pointLight.intensity = 1.0 + 0.5 * Math.sin(t * 2)

      renderer.render(scene, camera)
    }
    animate()

    // Mouse drag para rodar
    function onMouseDown(e: MouseEvent) {
      isDragging.current = true
      lastMouse.current = { x: e.clientX, y: e.clientY }
    }
    function onMouseMove(e: MouseEvent) {
      mouseRef.current = { x: e.clientX, y: e.clientY }
      if (!isDragging.current) return
      const dx = e.clientX - lastMouse.current.x
      const dy = e.clientY - lastMouse.current.y
      camAngle.current.theta -= dx * 0.005
      camAngle.current.phi = Math.max(0.2, Math.min(1.4, camAngle.current.phi + dy * 0.005))
      lastMouse.current = { x: e.clientX, y: e.clientY }
      updateCamera()
    }
    function onMouseUp() { isDragging.current = false }
    function onWheel(e: WheelEvent) {
      camAngle.current.radius = Math.max(10, Math.min(50, camAngle.current.radius + e.deltaY * 0.05))
      updateCamera()
    }

    // Raycasting para hover
    const raycaster = new THREE.Raycaster()
function onMouseMoveRay(e: MouseEvent) {
  if (!mount) return
  const rect = mount.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
  const y = -((e.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(new THREE.Vector2(x, y), camera)
  const hits = raycaster.intersectObjects(meshes.map(m => m.mesh))
  if (hits.length > 0) {
    const hit = hits[0]
    const found = meshes.find(m => m.mesh === hit.object)
    if (found) {
      setTooltip({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        label: found.eqs[0]?.localizacao ?? '',
        eqs: found.eqs,
      })
      mount.style.cursor = 'pointer'
      return
    }
  }
  setTooltip(null)
  if (mount) mount.style.cursor = isDragging.current ? 'grabbing' : 'grab'
}

    mount.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mousemove', onMouseMoveRay)
    window.addEventListener('mouseup', onMouseUp)
    mount.addEventListener('wheel', onWheel)

    // Resize
    function onResize() {
      if (!mount) return
      camera.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mount.clientWidth, mount.clientHeight)
    }
    window.addEventListener('resize', onResize)

return () => {
  cancelAnimationFrame(frameRef.current)
  if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
  renderer.dispose()
  mount.removeEventListener('mousedown', onMouseDown)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mousemove', onMouseMoveRay)
  window.removeEventListener('mouseup', onMouseUp)
  mount.removeEventListener('wheel', onWheel)
  window.removeEventListener('resize', onResize)
}
  }, [equipamentos, filtro])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0a0f1e', position: 'relative' }}>

      {/* Header */}
      <div style={{ padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)', zIndex: 10 }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: 16, fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>
            Hospital 3D — HPRT
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: '2px 0 0' }}>
            Arrastar para rodar · Scroll para zoom · Hover para detalhes
          </p>
        </div>

        {/* KPIs */}
        <div style={{ display: 'flex', gap: 8 }}>
          {(Object.entries(stats) as [keyof typeof stats, number][]).map(([estado, valor]) => (
            <div
              key={estado}
              onClick={() => setFiltro(filtro === estado ? 'todos' : estado)}
              style={{
                background: filtro === estado ? `${COR_ESTADO_HEX[estado]}20` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${filtro === estado ? COR_ESTADO_HEX[estado] : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 10, padding: '6px 12px', cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              <p style={{ color: COR_ESTADO_HEX[estado], fontSize: 16, fontWeight: 800, fontFamily: 'monospace', margin: 0 }}>{valor}</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, margin: 0 }}>{LABEL_ESTADO[estado]}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Canvas 3D */}
      <div ref={mountRef} style={{ flex: 1, cursor: 'grab', position: 'relative' }}>

        {/* Tooltip */}
        {tooltip && (
          <div style={{
            position: 'absolute',
            left: tooltip.x + 16,
            top: tooltip.y - 10,
            background: 'rgba(10,15,30,0.95)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: '12px 16px',
            zIndex: 50,
            pointerEvents: 'none',
            minWidth: 200,
            backdropFilter: 'blur(20px)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          }}>
            <p style={{ color: '#fff', fontSize: 13, fontWeight: 700, margin: '0 0 8px' }}>{tooltip.label}</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {(Object.entries({ vencida: 0, urgente: 0, emBreve: 0, emDia: 0 }) as [keyof typeof COR_ESTADO, number][]).map(([estado]) => {
                const count = tooltip.eqs.filter(eq => getEstado(eq) === estado).length
                if (count === 0) return null
                return (
                  <span key={estado} style={{ background: `${COR_ESTADO_HEX[estado]}20`, border: `1px solid ${COR_ESTADO_HEX[estado]}40`, color: COR_ESTADO_HEX[estado], fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>
                    {count} {LABEL_ESTADO[estado]}
                  </span>
                )
              })}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 150, overflowY: 'auto' }}>
              {tooltip.eqs.slice(0, 6).map(eq => {
                const estado = getEstado(eq)
                return (
                  <div key={eq.numeroSAP} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: COR_ESTADO_HEX[estado], flexShrink: 0 }} />
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{eq.descricao}</span>
                  </div>
                )
              })}
              {tooltip.eqs.length > 6 && (
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, margin: '4px 0 0' }}>+{tooltip.eqs.length - 6} mais</p>
              )}
            </div>
          </div>
        )}

        {/* Legenda */}
        <div style={{ position: 'absolute', bottom: 20, left: 20, background: 'rgba(10,15,30,0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 16px', backdropFilter: 'blur(10px)' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Legenda</p>
          {Object.entries(COR_ESTADO_HEX).map(([estado, cor]) => (
            <div key={estado} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: cor }} />
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{LABEL_ESTADO[estado as keyof typeof LABEL_ESTADO]}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 8, paddingTop: 8 }}>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, margin: 0 }}>Altura = nº de equipamentos</p>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, margin: '2px 0 0' }}>Piso = localização no hospital</p>
          </div>
        </div>

        {/* Pisos */}
        <div style={{ position: 'absolute', bottom: 20, right: 20, background: 'rgba(10,15,30,0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 16px', backdropFilter: 'blur(10px)' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Pisos</p>
          {[
            { piso: 0, label: 'Piso 0 — Urgência / Consultas' },
            { piso: 1, label: 'Piso 1 — Bloco / Exames' },
            { piso: 2, label: 'Piso 2 — Internamentos' },
            { piso: 3, label: 'Piso 3 — Outros' },
          ].map(p => (
            <div key={p.piso} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: `rgba(255,255,255,${0.1 + p.piso * 0.1})`, border: '1px solid rgba(255,255,255,0.2)' }} />
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>{p.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}