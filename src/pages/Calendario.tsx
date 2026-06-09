import { useState, useEffect, useRef, useCallback } from 'react'

const PT_MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const PT_DAYS_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const PT_DAYS_FULL = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado']

const TYPE_CFG = {
  calib:    { label: 'Calibração', dot: '#ef4444', pillBg: 'rgba(239,68,68,0.15)',  pillBorder: 'rgba(239,68,68,0.3)',  pillText: '#fca5a5', badgeText: '#fca5a5' },
  manut:    { label: 'Manutenção', dot: '#60a5fa', pillBg: 'rgba(96,165,250,0.15)', pillBorder: 'rgba(96,165,250,0.3)', pillText: '#93c5fd', badgeText: '#93c5fd' },
  cedencia: { label: 'Cedência',   dot: '#34d399', pillBg: 'rgba(52,211,153,0.15)', pillBorder: 'rgba(52,211,153,0.3)', pillText: '#6ee7b7', badgeText: '#6ee7b7' },
  reuniao:  { label: 'Reunião',    dot: '#fbbf24', pillBg: 'rgba(251,191,36,0.15)', pillBorder: 'rgba(251,191,36,0.3)', pillText: '#fcd34d', badgeText: '#fcd34d' },
} as const

type EventType = keyof typeof TYPE_CFG
type ViewMode = 'mes' | 'semana' | 'dia'

interface CalEvent { type: EventType; time: string; title: string; eq?: string; desc?: string }
type EventMap = Record<string, CalEvent[]>

function mkDate(y: number, m: number, d: number) {
  return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
}

function genEvents(): EventMap {
  const ev: EventMap = {}
  const today = new Date()
  const y = today.getFullYear(), m = today.getMonth(), d = today.getDate()
  function add(date: string, type: EventType, time: string, title: string, eq?: string, desc?: string) {
    if (!ev[date]) ev[date] = []
    ev[date].push({ type, time, title, eq, desc })
  }
  add(mkDate(y,m,d),    'calib',    '09:00','Calibração Desfibrilhador Zoll X Series','Zoll X Series #INV-0042','Verificar energia entregue e intervalo entre descargas')
  add(mkDate(y,m,d),    'reuniao',  '14:30','Reunião técnica semanal',undefined,'Revisão de calibrações pendentes')
  add(mkDate(y,m,d+2),  'manut',    '10:00','Manutenção preventiva Ventilador Maquet','Maquet Servo-i #INV-0019','Substituição filtros e verificação alarmes')
  add(mkDate(y,m,d+3),  'calib',    '08:30','Calibração Oxímetro Masimo','Masimo Radical-7 #INV-0067','Verificação curva SpO2 e alarmes limite')
  add(mkDate(y,m,d+5),  'cedencia', '09:00','Cedência Bisturi GynCoag','GynCoag #INV-0031','Equipamento cedido ao serviço de ginecologia')
  add(mkDate(y,m,d+7),  'calib',    '11:00','Calibração Monitor Philips MX550','Philips MX550 #INV-0088','ECG, SpO2, NIBP, temperatura — revisão completa')
  add(mkDate(y,m,d+7),  'manut',    '15:00','Manutenção corretiva Bomba Infusão','Alaris GP #INV-0055','Troca de bateria e verificação de alarmes')
  add(mkDate(y,m,d-2),  'calib',    '10:30','Calibração Analisador Gases','Radiometer ABL800','Verificação eletrólitos e pH')
  add(mkDate(y,m,d-4),  'reuniao',  '09:00','Revisão inventário trimestral',undefined,'Atualização de registos SAP')
  add(mkDate(y,m,d-6),  'cedencia', '14:00','Devolução ECG portátil','Cardiosoft EC-12 #INV-0023','Devolução do serviço de cardiologia')
  add(mkDate(y,m,d+10), 'calib',    '08:00','Calibração Ventilador Draeger','Draeger Evita 4 #INV-0012','Teste volume corrente e PEEP')
  add(mkDate(y,m,d+12), 'manut',    '09:30','Manutenção Desfibrilhador Philips','Philips HeartStart MRx #INV-0034','Substituição elétrodos e bateria')
  add(mkDate(y,m,d+14), 'calib',    '11:30','Calibração Seringa Infusora','Alaris Syringe #INV-0078','Verificação precisão caudal')
  add(mkDate(y,m,d+14), 'reuniao',  '16:00','Planeamento manutenções Q3',undefined,'Agendamento próximas intervenções')
  add(mkDate(y,m+1,3),  'calib',    '09:00','Calibração Eletrobisturi Valleylab','Valleylab Force EZ #INV-0049','Verificação potência mono e bipolar')
  add(mkDate(y,m+1,8),  'manut',    '10:00','Manutenção Monitor Nihon Kohden','NK BSM-6301 #INV-0061','Revisão geral e limpeza')
  add(mkDate(y,m+1,15), 'cedencia', '14:00','Cedência Oxímetro portátil','Nonin 9590 #INV-0082','Cedência ao serviço de urgência')
  return ev
}

const EVENTS = genEvents()
function getEventsForDate(ds: string): CalEvent[] { return EVENTS[ds] || [] }
function getEventsForMonth(y: number, m: number): CalEvent[] {
  return Object.entries(EVENTS).flatMap(([k,v]) => {
    const d = new Date(k)
    return d.getFullYear()===y && d.getMonth()===m ? v : []
  })
}

// ─── Pulse Canvas ─────────────────────────────────────────────────────────────
function PulseCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: -9999, y: -9999 })
  const frameRef = useRef(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
    let W = 0, H = 0

    class Particle {
      x=0;y=0;vx=0;vy=0;r=0;alpha=0;isRed=false;pulse=0;pulseSpeed=0
      constructor(){this.reset(true)}
      reset(rand: boolean){
        this.x=rand?Math.random()*W:(Math.random()<.5?-5:W+5)
        this.y=rand?Math.random()*H:Math.random()*H
        this.vx=(Math.random()-.5)*.4;this.vy=(Math.random()-.5)*.4
        this.r=Math.random()*1.8+.4;this.alpha=Math.random()*.5+.1
        this.isRed=Math.random()<.12;this.pulse=Math.random()*Math.PI*2
        this.pulseSpeed=Math.random()*.02+.01
      }
      update(){
        const{x:mx,y:my}=mouseRef.current
        const dx=this.x-mx,dy=this.y-my,dist=Math.sqrt(dx*dx+dy*dy)
        if(dist<120){const f=(120-dist)/120;this.vx+=(dx/dist)*f*.08;this.vy+=(dy/dist)*f*.08}
        this.vx*=.99;this.vy*=.99;this.x+=this.vx;this.y+=this.vy;this.pulse+=this.pulseSpeed
        if(this.x<-10||this.x>W+10||this.y<-10||this.y>H+10)this.reset(false)
      }
      draw(){
        const pa=this.alpha*(.7+.3*Math.sin(this.pulse))
        ctx.beginPath();ctx.arc(this.x,this.y,this.r,0,Math.PI*2)
        ctx.fillStyle=this.isRed?`rgba(192,0,26,${pa})`:`rgba(255,255,255,${pa*.5})`;ctx.fill()
        if(this.isRed&&this.r>1.2){ctx.beginPath();ctx.arc(this.x,this.y,this.r*2.5,0,Math.PI*2);ctx.fillStyle=`rgba(192,0,26,${pa*.12})`;ctx.fill()}
      }
    }

    class PulseWave {
      x=0;y=0;r=0;maxR=0;speed=0;alpha=0;isRed=false
      constructor(){this.reset()}
      reset(){
        this.x=Math.random()*W;this.y=Math.random()*H;this.r=0
        this.maxR=80+Math.random()*120;this.speed=.5+Math.random()*.7
        this.alpha=.3+Math.random()*.25;this.isRed=Math.random()<.4
      }
      update(){this.r+=this.speed;if(this.r>this.maxR)this.reset()}
      draw(){
        const a=this.alpha*(1-this.r/this.maxR)
        ctx.beginPath();ctx.arc(this.x,this.y,this.r,0,Math.PI*2)
        ctx.strokeStyle=this.isRed?`rgba(192,0,26,${a})`:`rgba(255,255,255,${a*.25})`
        ctx.lineWidth=.5;ctx.stroke()
      }
    }

    let particles: Particle[]=[], waves: PulseWave[]=[]

    function resize(){
      if(!canvas)return
      W=canvas.offsetWidth;H=canvas.offsetHeight
      canvas.width=W*devicePixelRatio;canvas.height=H*devicePixelRatio
      ctx.scale(devicePixelRatio,devicePixelRatio)
      particles=Array.from({length:100},()=>new Particle())
      waves=Array.from({length:8},()=>{const w=new PulseWave();w.r=Math.random()*w.maxR;return w})
    }

    function drawGrid(){
      ctx.strokeStyle='rgba(255,255,255,0.018)';ctx.lineWidth=.5
      for(let x=0;x<W;x+=60){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
      for(let y=0;y<H;y+=60){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
    }

    function drawLines(){
      const{x:mx,y:my}=mouseRef.current
      for(let i=0;i<particles.length;i++){
        for(let j=i+1;j<particles.length;j++){
          const dx=particles[i].x-particles[j].x,dy=particles[i].y-particles[j].y
          const d=Math.sqrt(dx*dx+dy*dy)
          if(d<90){
            const a=(1-d/90)*.12
            ctx.beginPath();ctx.moveTo(particles[i].x,particles[i].y);ctx.lineTo(particles[j].x,particles[j].y)
            ctx.strokeStyle=(particles[i].isRed||particles[j].isRed)?`rgba(192,0,26,${a*1.5})`:`rgba(255,255,255,${a*.5})`
            ctx.lineWidth=.5;ctx.stroke()
          }
        }
        const dx=particles[i].x-mx,dy=particles[i].y-my,d=Math.sqrt(dx*dx+dy*dy)
        if(d<150){
          const a=(1-d/150)*.3
          ctx.beginPath();ctx.moveTo(particles[i].x,particles[i].y);ctx.lineTo(mx,my)
          ctx.strokeStyle=`rgba(192,0,26,${a})`;ctx.lineWidth=.5;ctx.stroke()
        }
      }
    }

    function animate(){
      rafRef.current=requestAnimationFrame(animate)
      ctx.clearRect(0,0,W,H)
      drawGrid()
      waves.forEach(w=>{w.update();w.draw()})
      drawLines()
      particles.forEach(p=>{p.update();p.draw()})
      const{x:mx,y:my}=mouseRef.current
      if(mx>0){
        ctx.beginPath();ctx.arc(mx,my,3,0,Math.PI*2);ctx.fillStyle='#C0001A';ctx.fill()
        ctx.beginPath();ctx.arc(mx,my,7+3*Math.sin(frameRef.current*.08),0,Math.PI*2)
        ctx.strokeStyle='rgba(192,0,26,0.4)';ctx.lineWidth=1;ctx.stroke()
      }
      frameRef.current++
    }

    const onMouseMove=(e:MouseEvent)=>{const r=canvas.getBoundingClientRect();mouseRef.current={x:e.clientX-r.left,y:e.clientY-r.top}}
    const onMouseLeave=()=>{mouseRef.current={x:-9999,y:-9999}}
    const onClick=(e:MouseEvent)=>{
      const r=canvas.getBoundingClientRect()
      const cx=e.clientX-r.left,cy=e.clientY-r.top
      for(let i=0;i<10;i++){
        const p=new Particle();p.x=cx;p.y=cy
        p.vx=(Math.random()-.5)*3;p.vy=(Math.random()-.5)*3
        p.isRed=true;p.r=1.5;p.alpha=.8
        particles.splice(Math.floor(Math.random()*particles.length),1,p)
      }
      const w=new PulseWave();w.x=cx;w.y=cy;w.r=0;w.isRed=true;w.maxR=100;w.alpha=.8
      waves.push(w);if(waves.length>12)waves.shift()
    }

    const ro=new ResizeObserver(resize)
    ro.observe(canvas);resize();animate()
    canvas.addEventListener('mousemove',onMouseMove)
    canvas.addEventListener('mouseleave',onMouseLeave)
    canvas.addEventListener('click',onClick)
    return()=>{
      cancelAnimationFrame(rafRef.current);ro.disconnect()
      canvas.removeEventListener('mousemove',onMouseMove)
      canvas.removeEventListener('mouseleave',onMouseLeave)
      canvas.removeEventListener('click',onClick)
    }
  },[])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
}

// ─── Event Pill ───────────────────────────────────────────────────────────────
function EventPill({ ev }: { ev: CalEvent }) {
  const cfg = TYPE_CFG[ev.type]
  return (
    <div className="flex items-center gap-1.5 mb-0.5 truncate transition-all hover:brightness-110"
      style={{ padding:'2px 6px 2px 5px', background:cfg.pillBg, border:`1px solid ${cfg.pillBorder}` }}>
      <div className="flex-shrink-0 rounded-full" style={{ width:5, height:5, background:cfg.dot }} />
      {ev.time && <span className="flex-shrink-0 font-mono" style={{ fontSize:9, color:cfg.pillText, opacity:.65 }}>{ev.time}</span>}
      <span className="truncate font-medium" style={{ fontSize:10, color:cfg.pillText }}>{ev.title}</span>
    </div>
  )
}

// ─── View Mês ─────────────────────────────────────────────────────────────────
function ViewMes({ cells, animKey, selectedDate, openDetail }: {
  cells: { dateStr:string; day:number; isOther:boolean; isToday:boolean; isWeekend:boolean }[]
  animKey: number
  selectedDate: string | null
  openDetail: (d:string) => void
}) {
  return (
    <>
      <div className="grid grid-cols-7 flex-shrink-0" style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((d,i) => (
          <div key={d} className="text-center py-3"
            style={{ color:i===0||i===6?'rgba(192,0,26,0.5)':'rgba(255,255,255,0.25)', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em' }}>
            {d}
          </div>
        ))}
      </div>
      <div key={animKey} className="flex-1 grid grid-cols-7 grid-rows-6 overflow-hidden" style={{ gap:1, padding:1 }}>
        {cells.map((cell) => {
          const evs = getEventsForDate(cell.dateStr)
          const isSel = selectedDate === cell.dateStr
          return (
            <button key={cell.dateStr} onClick={() => openDetail(cell.dateStr)}
              className="relative text-left overflow-hidden transition-all group"
              style={{
                padding:'8px 10px',
                background: cell.isToday ? 'rgba(192,0,26,0.08)' : isSel ? 'rgba(192,0,26,0.05)' : 'transparent',
                outline: cell.isToday ? '1.5px solid rgba(192,0,26,0.45)' : isSel ? '1px solid rgba(192,0,26,0.25)' : '1px solid rgba(255,255,255,0.04)',
                opacity: cell.isOther ? 0.25 : 1,
              }}
            >
              {cell.isToday && <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#C0001A] animate-pulse" />}
              <div className="mb-1.5 flex items-center justify-center font-mono font-semibold"
                style={{ width:24, height:24, fontSize:11, background:cell.isToday?'#C0001A':'transparent', color:cell.isToday?'#fff':'rgba(255,255,255,0.5)' }}>
                {cell.day}
              </div>
              {evs.slice(0,2).map((ev,ei) => <EventPill key={ei} ev={ev} />)}
              {evs.length>2 && <div style={{ fontSize:9, padding:'0 6px', marginTop:2, color:'rgba(255,255,255,0.25)' }}>+{evs.length-2} mais</div>}
            </button>
          )
        })}
      </div>
    </>
  )
}

// ─── View Semana ──────────────────────────────────────────────────────────────
function ViewSemana({ weekStart, openDetail }: {
  weekStart:Date; openDetail:(d:string)=>void
}){
  const today = new Date()
  const days = Array.from({length:7},(_,i)=>{const d=new Date(weekStart);d.setDate(weekStart.getDate()+i);return d})
  const hours = Array.from({length:13},(_,i)=>i+8)

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="grid flex-shrink-0" style={{ gridTemplateColumns:'52px repeat(7,1fr)', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <div />
        {days.map((d,i)=>{
          const ds=mkDate(d.getFullYear(),d.getMonth(),d.getDate())
          const isToday=ds===mkDate(today.getFullYear(),today.getMonth(),today.getDate())
          return (
            <div key={i} className="text-center py-3" style={{ borderLeft:'1px solid rgba(255,255,255,0.04)' }}>
              <p style={{ fontSize:9, textTransform:'uppercase', letterSpacing:'0.1em', color:i===0||i===6?'rgba(192,0,26,0.5)':'rgba(255,255,255,0.25)', marginBottom:4 }}>{PT_DAYS_SHORT[d.getDay()]}</p>
              <div style={{ width:28,height:28,borderRadius:'50%',margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,fontFamily:'monospace',background:isToday?'#C0001A':'transparent',color:isToday?'#fff':'rgba(255,255,255,0.5)' }}>
                {d.getDate()}
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth:'none' }}>
        {hours.map(h=>(
          <div key={h} className="grid" style={{ gridTemplateColumns:'52px repeat(7,1fr)', minHeight:60, borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.2)', fontFamily:'monospace', padding:'10px 8px 0 0', textAlign:'right' }}>{String(h).padStart(2,'0')}:00</div>
            {days.map((d,i)=>{
              const ds=mkDate(d.getFullYear(),d.getMonth(),d.getDate())
              const evs=getEventsForDate(ds).filter(ev=>ev.time&&parseInt(ev.time.split(':')[0])===h)
              return (
                <div key={i} onClick={()=>openDetail(ds)} className="cursor-pointer transition-colors hover:bg-white/[0.02]"
                  style={{ borderLeft:'1px solid rgba(255,255,255,0.04)', padding:'4px 6px' }}>
                  {evs.map((ev,ei)=><EventPill key={ei} ev={ev} />)}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── View Dia ─────────────────────────────────────────────────────────────────
function ViewDia({ date, openDetail }: { date:Date; openDetail:(d:string)=>void }) {
  const today = new Date()
  const ds = mkDate(date.getFullYear(),date.getMonth(),date.getDate())
  const evs = getEventsForDate(ds)
  const hours = Array.from({length:13},(_,i)=>i+8)
  const isToday = ds===mkDate(today.getFullYear(),today.getMonth(),today.getDate())

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="flex items-center gap-4 px-6 py-4 flex-shrink-0" style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ width:44,height:44,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:800,fontFamily:'monospace',background:isToday?'#C0001A':'rgba(255,255,255,0.05)',color:isToday?'#fff':'rgba(255,255,255,0.4)' }}>
          {date.getDate()}
        </div>
        <div>
          <p style={{ color:'#fff', fontWeight:600, fontSize:15 }}>{PT_DAYS_FULL[date.getDay()]}</p>
          <p style={{ color:'rgba(255,255,255,0.3)', fontSize:11 }}>{PT_MONTHS[date.getMonth()]} {date.getFullYear()} · {evs.length} evento{evs.length!==1?'s':''}</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth:'none' }}>
        {hours.map(h=>{
          const slotEvs=evs.filter(ev=>ev.time&&parseInt(ev.time.split(':')[0])===h)
          return (
            <div key={h} className="flex" style={{ minHeight:68, borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ width:64,fontSize:10,color:'rgba(255,255,255,0.2)',fontFamily:'monospace',paddingTop:12,textAlign:'right',paddingRight:12,flexShrink:0 }}>
                {String(h).padStart(2,'0')}:00
              </div>
              <div onClick={()=>openDetail(ds)} className="flex-1 cursor-pointer transition-colors hover:bg-white/[0.02]"
                style={{ padding:'8px 12px', borderLeft:'1px solid rgba(255,255,255,0.06)' }}>
                {slotEvs.map((ev,i)=>{
                  const cfg=TYPE_CFG[ev.type]
                  return (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 mb-1 transition-all hover:brightness-110"
                      style={{ background:cfg.pillBg, border:`1px solid ${cfg.pillBorder}` }}>
                      <div className="rounded-full flex-shrink-0" style={{ width:8,height:8,background:cfg.dot }} />
                      <span className="font-mono flex-shrink-0" style={{ fontSize:10,color:cfg.pillText,opacity:.7 }}>{ev.time}</span>
                      <span className="flex-shrink-0 font-semibold" style={{ fontSize:10,color:cfg.pillText }}>{cfg.label}</span>
                      <span className="truncate" style={{ fontSize:12,color:'rgba(255,255,255,0.8)' }}>{ev.title}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CalendarioPage() {
  const today = new Date()
  const [curYear,  setCurYear]    = useState(today.getFullYear())
  const [curMonth, setCurMonth]   = useState(today.getMonth())
  const [curDate,  setCurDate]    = useState(new Date(today))
  const [selectedDate, setSelectedDate] = useState<string|null>(null)
  const [detailOpen,   setDetailOpen]   = useState(false)
  const [animKey, setAnimKey] = useState(0)
  const [view,    setView]    = useState<ViewMode>('mes')

  const weekStart = new Date(curDate)
  weekStart.setDate(weekStart.getDate()-weekStart.getDay())

  const navigate = useCallback((dir:number)=>{
    setAnimKey(k=>k+1)
    if(view==='mes'){
      setCurMonth(m=>{const nm=m+dir;if(nm<0){setCurYear(y=>y-1);return 11}if(nm>11){setCurYear(y=>y+1);return 0}return nm})
    } else if(view==='semana'){
      setCurDate(d=>{const nd=new Date(d);nd.setDate(nd.getDate()+dir*7);return nd})
    } else {
      setCurDate(d=>{const nd=new Date(d);nd.setDate(nd.getDate()+dir);return nd})
    }
  },[view])

  const goToday = ()=>{setAnimKey(k=>k+1);setCurYear(today.getFullYear());setCurMonth(today.getMonth());setCurDate(new Date(today))}
  const openDetail  = (ds:string)=>{setSelectedDate(ds);setDetailOpen(true)}
  const closeDetail = ()=>{setDetailOpen(false);setTimeout(()=>setSelectedDate(null),300)}

  // Build month cells
  const firstDow    = new Date(curYear,curMonth,1).getDay()
  const daysInMonth = new Date(curYear,curMonth+1,0).getDate()
  const cells: {dateStr:string;day:number;isOther:boolean;isToday:boolean;isWeekend:boolean}[] = []
  for(let i=0;i<42;i++){
    let day:number,year=curYear,month=curMonth,isOther=false
    if(i<firstDow){const pd=new Date(curYear,curMonth,1-firstDow+i);day=pd.getDate();year=pd.getFullYear();month=pd.getMonth();isOther=true}
    else if(i-firstDow>=daysInMonth){day=i-firstDow-daysInMonth+1;const nd=new Date(curYear,curMonth+1,day);year=nd.getFullYear();month=nd.getMonth();isOther=true}
    else{day=i-firstDow+1}
    const dateStr=mkDate(year,month,day)
    const isToday=!isOther&&day===today.getDate()&&month===today.getMonth()&&year===today.getFullYear()
    cells.push({dateStr,day,isOther,isToday,isWeekend:i%7===0||i%7===6})
  }

  const monthEvents = getEventsForMonth(curYear,curMonth)
  const typeCounts  = Object.fromEntries(Object.keys(TYPE_CFG).map(k=>[k,0])) as Record<EventType,number>
  monthEvents.forEach(e=>typeCounts[e.type]++)

  const upcoming = Object.entries(EVENTS)
    .map(([k,evs])=>({date:new Date(k+'T12:00:00'),dateStr:k,evs}))
    .filter(x=>x.date>=today)
    .sort((a,b)=>a.date.getTime()-b.date.getTime())
    .slice(0,6)

  const detailEvents  = selectedDate ? getEventsForDate(selectedDate) : []
  const detailDateObj = selectedDate ? new Date(selectedDate+'T12:00:00') : null

  const weekEnd  = new Date(weekStart.getTime()+6*86400000)
  const navLabel = view==='mes'
    ? `${PT_MONTHS[curMonth]} ${curYear}`
    : view==='semana'
    ? `${weekStart.getDate()} ${PT_MONTHS[weekStart.getMonth()].slice(0,3)} — ${weekEnd.getDate()} ${PT_MONTHS[weekEnd.getMonth()].slice(0,3)} ${curDate.getFullYear()}`
    : `${PT_DAYS_FULL[curDate.getDay()]}, ${curDate.getDate()} de ${PT_MONTHS[curDate.getMonth()]}`

  return (
    <div className="relative flex h-full overflow-hidden" style={{ background:'#080c18' }}>
      <PulseCanvas />

      {/* Corner decorations */}
      {['top-4 left-4 border-t border-l','top-4 right-4 border-t border-r','bottom-4 left-4 border-b border-l','bottom-4 right-4 border-b border-r'].map((cls,i)=>(
        <div key={i} className={`absolute w-4 h-4 pointer-events-none z-10 ${cls}`} style={{ borderColor:'rgba(192,0,26,0.25)' }} />
      ))}

      {/* ── SIDEBAR ───────────────────────────────────────── */}
      <aside className="relative z-10 flex flex-col flex-shrink-0"
        style={{ width:240, borderRight:'1px solid rgba(255,255,255,0.06)', background:'rgba(8,12,24,0.55)', backdropFilter:'blur(16px)' }}>

        {/* Mini calendar */}
        <div style={{ padding:'20px 16px 12px' }}>
          <p style={{ fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:'rgba(255,255,255,0.22)',marginBottom:12 }}>
            {PT_MONTHS[curMonth]} {curYear}
          </p>
          <div className="grid grid-cols-7" style={{ marginBottom:4 }}>
            {['D','S','T','Q','Q','S','S'].map((d,i)=>(
              <span key={i} style={{ textAlign:'center',fontSize:9,color:'rgba(255,255,255,0.18)',fontWeight:600,display:'block',padding:'2px 0' }}>{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7" style={{ gap:1 }}>
            {cells.map((cell,i)=>{
              const hasEv=getEventsForDate(cell.dateStr).length>0
              const isSel=selectedDate===cell.dateStr
              return (
                <button key={i} onClick={()=>openDetail(cell.dateStr)} className="relative transition-all"
                  style={{ textAlign:'center',fontSize:10,padding:'4px 0',fontFamily:'monospace',cursor:'pointer',
                    color:cell.isOther?'rgba(255,255,255,0.1)':cell.isToday?'#fff':'rgba(255,255,255,0.45)',
                    background:cell.isToday?'#C0001A':isSel?'rgba(192,0,26,0.18)':'transparent',
                    fontWeight:cell.isToday?700:400,
                    outline:isSel&&!cell.isToday?'1px solid rgba(192,0,26,0.35)':'none',
                  }}>
                  {cell.day}
                  {hasEv&&!cell.isToday&&(
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 rounded-full" style={{ width:4,height:4,background:'#C0001A',display:'block' }} />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Count + stats */}
        <div style={{ margin:'0 12px 12px',padding:'10px 12px',background:'rgba(192,0,26,0.07)',border:'1px solid rgba(192,0,26,0.15)' }}>
          <div className="flex items-center justify-between" style={{ marginBottom:8 }}>
            <span style={{ fontSize:11,color:'rgba(192,0,26,0.65)',fontWeight:500 }}>Este mês</span>
            <span style={{ fontSize:20,fontWeight:800,fontFamily:'monospace',color:'#C0001A',lineHeight:1 }}>{monthEvents.length}</span>
          </div>
          <div className="grid grid-cols-2" style={{ gap:4 }}>
            {(Object.entries(TYPE_CFG) as [EventType,typeof TYPE_CFG[EventType]][]).map(([k,v])=>(
              <div key={k} className="flex items-center gap-1.5">
                <div className="rounded-full" style={{ width:6,height:6,background:v.dot,flexShrink:0 }} />
                <span style={{ fontSize:10,color:'rgba(255,255,255,0.3)' }}>{typeCounts[k]} {v.label.slice(0,5)}.</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming */}
        <div style={{ flex:1,overflowY:'auto',scrollbarWidth:'none',padding:'0 12px' }}>
          <p style={{ fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:'rgba(255,255,255,0.18)',marginBottom:8 }}>Próximos</p>
          <div style={{ display:'flex',flexDirection:'column',gap:5 }}>
            {upcoming.map((item,i)=>{
              const ev=item.evs[0]
              const cfg=TYPE_CFG[ev.type]
              const diff=Math.round((item.date.getTime()-today.getTime())/(1000*60*60*24))
              const diffStr=diff===0?'Hoje':diff===1?'Amanhã':`${diff}d`
              return (
                <button key={i} onClick={()=>openDetail(item.dateStr)}
                  className="w-full text-left transition-all hover:translate-x-0.5"
                  style={{ display:'flex',alignItems:'flex-start',gap:8,padding:'7px 9px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.05)',cursor:'pointer' }}>
                  <div className="rounded-full flex-shrink-0" style={{ width:6,height:6,background:cfg.dot,marginTop:4 }} />
                  <div style={{ minWidth:0,flex:1 }}>
                    <div className="flex items-center justify-between gap-1" style={{ marginBottom:2 }}>
                      <span style={{ fontSize:9,color:'rgba(255,255,255,0.22)',fontFamily:'monospace' }}>{ev.time}</span>
                      <span style={{ fontSize:9,fontWeight:700,fontFamily:'monospace',color:diff===0?'#C0001A':'rgba(255,255,255,0.18)' }}>{diffStr}</span>
                    </div>
                    <p style={{ fontSize:11,color:'rgba(255,255,255,0.65)',fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{ev.title}</p>
                    {item.evs.length>1&&<p style={{ fontSize:9,color:'rgba(255,255,255,0.2)',marginTop:1 }}>+{item.evs.length-1} mais</p>}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
        <div style={{ height:12 }} />
      </aside>

      {/* ── MAIN ──────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col overflow-hidden">

        {/* Topbar */}
        <div className="flex items-center justify-between flex-shrink-0"
          style={{ padding:'11px 24px',borderBottom:'1px solid rgba(255,255,255,0.06)',background:'rgba(8,12,24,0.4)',backdropFilter:'blur(16px)' }}>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {([-1,1] as const).map(dir=>(
                <button key={dir} onClick={()=>navigate(dir)} className="transition-all hover:bg-white/[0.08]"
                  style={{ width:32,height:32,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.03)',color:'rgba(255,255,255,0.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,cursor:'pointer' }}>
                  {dir===-1?'‹':'›'}
                </button>
              ))}
            </div>
            <h1 style={{ fontSize:16,fontWeight:700,color:'#fff',letterSpacing:'-0.3px',minWidth:200 }}>{navLabel}</h1>
            <button onClick={goToday} className="transition-all hover:scale-105 active:scale-95"
              style={{ padding:'5px 14px',background:'#C0001A',color:'#fff',fontSize:11,fontWeight:700,border:'none',cursor:'pointer',letterSpacing:'0.05em' }}>
              Hoje
            </button>
          </div>
          <div className="flex" style={{ gap:2,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',padding:3 }}>
            {(['mes','semana','dia'] as ViewMode[]).map(v=>(
              <button key={v} onClick={()=>setView(v)} className="transition-all"
                style={{ padding:'5px 14px',fontSize:11,fontWeight:600,cursor:'pointer',border:'none',
                  background:view===v?'rgba(255,255,255,0.1)':'transparent',
                  color:view===v?'#fff':'rgba(255,255,255,0.3)',
                  outline:view===v?'1px solid rgba(255,255,255,0.08)':'none' }}>
                {v==='mes'?'Mês':v==='semana'?'Semana':'Dia'}
              </button>
            ))}
          </div>
        </div>

        {view==='mes'    && <ViewMes cells={cells} animKey={animKey} selectedDate={selectedDate} openDetail={openDetail} />}
{view==='semana' && <ViewSemana weekStart={weekStart} openDetail={openDetail} />}
        {view==='dia'    && <ViewDia date={curDate} openDetail={openDetail} />}
      </main>

      {/* ── DETAIL PANEL ──────────────────────────────────── */}
      <div className="absolute top-0 right-0 h-full flex flex-col z-20 transition-transform duration-300 ease-out"
        style={{ width:300,borderLeft:'1px solid rgba(255,255,255,0.08)',background:'rgba(8,12,24,0.92)',backdropFilter:'blur(20px)',transform:detailOpen?'translateX(0)':'translateX(100%)' }}>

        <div className="flex-shrink-0 relative" style={{ padding:'20px 20px 16px',borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
          {detailDateObj&&(
            <>
              <p style={{ fontSize:11,color:'rgba(255,255,255,0.25)',fontFamily:'monospace',marginBottom:4 }}>
                {PT_DAYS_SHORT[detailDateObj.getDay()]}, {detailDateObj.getDate()} {PT_MONTHS[detailDateObj.getMonth()]} {detailDateObj.getFullYear()}
              </p>
              <p style={{ fontSize:17,fontWeight:700,color:'#fff' }}>
                {detailEvents.length>0?`${detailEvents.length} evento${detailEvents.length>1?'s':''}`:'Sem eventos'}
              </p>
            </>
          )}
          <button onClick={closeDetail} className="absolute transition-all hover:bg-white/[0.08]"
            style={{ top:16,right:16,width:28,height:28,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.4)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,cursor:'pointer' }}>
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto" style={{ padding:16,scrollbarWidth:'none',display:'flex',flexDirection:'column',gap:10 }}>
          {detailEvents.length===0?(
            <div style={{ textAlign:'center',padding:'48px 20px',color:'rgba(255,255,255,0.15)',fontSize:13 }}>Nenhum evento neste dia</div>
          ):detailEvents.map((ev,i)=>{
            const cfg=TYPE_CFG[ev.type]
            return (
              <div key={i} className="transition-all hover:brightness-110"
                style={{ padding:14,background:cfg.pillBg,border:`1px solid ${cfg.pillBorder}`,animation:`slideIn 0.2s ease ${i*60}ms both` }}>
                <div className="flex items-center gap-2" style={{ marginBottom:8 }}>
                  <div className="rounded-full" style={{ width:8,height:8,background:cfg.dot }} />
                  <span style={{ fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:cfg.badgeText }}>{cfg.label}</span>
                  {ev.time&&<span style={{ fontSize:10,color:'rgba(255,255,255,0.25)',fontFamily:'monospace',marginLeft:'auto' }}>{ev.time}</span>}
                </div>
                <p style={{ fontSize:13,fontWeight:600,color:'rgba(255,255,255,0.9)',marginBottom:ev.desc||ev.eq?6:0,lineHeight:1.4 }}>{ev.title}</p>
                {ev.desc&&<p style={{ fontSize:11,color:'rgba(255,255,255,0.4)',lineHeight:1.6 }}>{ev.desc}</p>}
                {ev.eq&&<p style={{ fontSize:10,color:'rgba(255,255,255,0.25)',marginTop:6 }}>⚙ {ev.eq}</p>}
              </div>
            )
          })}
        </div>

        <button className="transition-all hover:-translate-y-0.5 active:translate-y-0"
          style={{ margin:'0 16px 16px',padding:11,background:'#C0001A',color:'#fff',fontSize:13,fontWeight:700,border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6 }}>
          <span style={{ fontSize:16,lineHeight:1 }}>+</span> Adicionar evento
        </button>
      </div>

      <style>{`
        @keyframes slideIn { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
        *{ scrollbar-width:none; -ms-overflow-style:none; }
        *::-webkit-scrollbar{ display:none; }
      `}</style>
    </div>
  )
}