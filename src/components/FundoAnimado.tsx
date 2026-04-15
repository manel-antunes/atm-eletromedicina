export default function FundoAnimado() {
  const particulas = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    width: Math.random() * 300 + 100,
    top: Math.random() * 100,
    left: Math.random() * 100,
    duration: Math.random() * 20 + 15,
    delay: Math.random() * 10,
    opacity: Math.random() * 0.04 + 0.02,
  }))

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {particulas.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            width: p.width,
            height: p.width,
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(192,0,26,0.15) 0%, transparent 70%)`,
            top: `${p.top}%`,
            left: `${p.left}%`,
            opacity: p.opacity * 10,
            animation: `flutuar${p.id % 3} ${p.duration}s ease-in-out ${p.delay}s infinite`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
      <style>{`
        @keyframes flutuar0 {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          33% { transform: translate(-45%, -55%) scale(1.1); }
          66% { transform: translate(-55%, -45%) scale(0.95); }
        }
        @keyframes flutuar1 {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          33% { transform: translate(-55%, -45%) scale(0.9); }
          66% { transform: translate(-45%, -55%) scale(1.05); }
        }
        @keyframes flutuar2 {
          0%, 100% { transform: translate(-50%, -50%) scale(1.05); }
          50% { transform: translate(-50%, -60%) scale(0.95); }
        }
      `}</style>
    </div>
  )
}