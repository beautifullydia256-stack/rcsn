'use client';

export default function GlassBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Base dark gradient */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #0f0f16 0%, #1a1a23 50%, #1e1e28 100%)'
        }}
      />
      
      {/* Blurred glowing blobs using SVG filters */}
      <svg className="absolute inset-0 w-full h-full" style={{ filter: 'blur(80px)' }}>
        <defs>
          <filter id="blur">
            <feGaussianBlur in="SourceGraphic" stdDeviation="80"/>
          </filter>
        </defs>
        
        {/* Purple blob */}
        <circle
          cx="15%"
          cy="20%"
          r="300"
          fill="#6a5acd"
          opacity="0.4"
          filter="url(#blur)"
        />
        
        {/* Pink blob */}
        <circle
          cx="85%"
          cy="30%"
          r="250"
          fill="#ff6bcb"
          opacity="0.35"
          filter="url(#blur)"
        />
        
        {/* Cyan blob */}
        <circle
          cx="50%"
          cy="70%"
          r="350"
          fill="#00d4ff"
          opacity="0.3"
          filter="url(#blur)"
        />
        
        {/* Soft white haze */}
        <circle
          cx="70%"
          cy="80%"
          r="200"
          fill="rgba(255,255,255,0.08)"
          filter="url(#blur)"
        />
      </svg>
      
      {/* Additional CSS-based blobs for more depth */}
      <div 
        className="absolute top-0 left-1/4 w-96 h-96 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(106, 90, 205, 0.3) 0%, transparent 70%)',
          filter: 'blur(100px)',
          transform: 'translate(-50%, -50%)'
        }}
      />
      
      <div 
        className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(0, 212, 255, 0.25) 0%, transparent 70%)',
          filter: 'blur(120px)',
          transform: 'translate(50%, 50%)'
        }}
      />
      
      <div 
        className="absolute top-1/2 right-0 w-[400px] h-[400px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(255, 107, 203, 0.3) 0%, transparent 70%)',
          filter: 'blur(90px)',
          transform: 'translate(50%, -50%)'
        }}
      />
      
      {/* Soft noise texture overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px'
        }}
      />
    </div>
  );
}

