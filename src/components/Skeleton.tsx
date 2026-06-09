export function SkeletonLine({ width = '100%', height = 12 }: { width?: string | number; height?: number; radius?: number }) {
  return (
    <div style={{
      width, height,
      background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
      backgroundSize: '200% 100%',
      animation: 'skeleton-shimmer 1.4s ease-in-out infinite',
    }} />
  )
}

export function SkeletonCard() {
  return (
    <div style={{ background: '#fff', padding: '16px', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, background: '#f1f5f9', animation: 'skeleton-shimmer 1.4s ease-in-out infinite', backgroundSize: '200% 100%', backgroundImage: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <SkeletonLine width="60%" height={12} />
          <SkeletonLine width="40%" height={10} />
        </div>
      </div>
      <SkeletonLine width="100%" height={10} />
      <SkeletonLine width="80%" height={10} />
      <SkeletonLine width="90%" height={10} />
    </div>
  )
}

export function SkeletonTabela({ linhas = 5 }: { linhas?: number }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
      <style>{`
        @keyframes skeleton-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 12 }}>
        {[40, 20, 15, 15, 10].map((w, i) => (
          <SkeletonLine key={i} width={`${w}%`} height={10} />
        ))}
      </div>
      {/* Linhas */}
      {Array.from({ length: linhas }).map((_, i) => (
        <div key={i} style={{ padding: '12px 16px', borderBottom: '1px solid #f8fafc', display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '40%' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f1f5f9', flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <SkeletonLine width="80%" height={11} />
              <SkeletonLine width="50%" height={9} />
            </div>
          </div>
          <SkeletonLine width="20%" height={10} />
          <SkeletonLine width="15%" height={10} />
          <SkeletonLine width="15%" height={10} />
          <SkeletonLine width="10%" height={20} radius={99} />
        </div>
      ))}
    </div>
  )
}

export function SkeletonKpis() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }} className="md:grid-cols-4">
      <style>{`
        @keyframes skeleton-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ background: '#fff', padding: '16px', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <SkeletonLine width={60} height={10} />
            <div style={{ width: 28, height: 28, background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.4s ease-in-out infinite' }} />
          </div>
          <SkeletonLine width={50} height={28} radius={8} />
          <SkeletonLine width="70%" height={9} />
          <SkeletonLine width="100%" height={4} radius={99} />
        </div>
      ))}
    </div>
  )
}   