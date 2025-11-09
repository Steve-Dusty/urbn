import { useEffect, useRef } from 'react';

export function Blob3D() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // For a production version, you'd use Three.js here
    // This is a CSS-based 3D blob that looks similar
    
    const container = containerRef.current;
    if (!container) return;

    let rotation = 0;
    
    const animate = () => {
      rotation += 0.3;
      if (container.firstChild) {
        (container.firstChild as HTMLElement).style.transform = 
          `rotateX(${Math.sin(rotation * 0.01) * 15}deg) rotateY(${rotation * 0.5}deg) rotateZ(${Math.cos(rotation * 0.01) * 10}deg)`;
      }
      requestAnimationFrame(animate);
    };

    animate();
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center"
      style={{ perspective: '1000px' }}
    >
      <div
        className="relative w-[500px] h-[500px]"
        style={{
          transformStyle: 'preserve-3d',
          transition: 'transform 0.1s ease-out',
        }}
      >
        {/* Main metallic blob */}
        <div
          className="absolute inset-0 rounded-[40%_60%_70%_30%/60%_30%_70%_40%]"
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #d4d4d8 20%, #a1a1aa 40%, #71717a 60%, #52525b 80%, #3f3f46 100%)',
            boxShadow: `
              0 20px 60px rgba(255,255,255,0.1),
              inset 0 -20px 40px rgba(0,0,0,0.3),
              inset 0 20px 40px rgba(255,255,255,0.2)
            `,
            animation: 'morph 8s ease-in-out infinite, float 6s ease-in-out infinite',
          }}
        />
        
        {/* Reflection highlight */}
        <div
          className="absolute top-[20%] left-[30%] w-[40%] h-[30%] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.6) 0%, transparent 70%)',
            filter: 'blur(20px)',
          }}
        />

        {/* Secondary glow */}
        <div
          className="absolute inset-0 rounded-[40%_60%_70%_30%/60%_30%_70%_40%]"
          style={{
            background: 'radial-gradient(circle at 30% 30%, rgba(139, 92, 246, 0.3), transparent 60%)',
            filter: 'blur(40px)',
            animation: 'pulse 4s ease-in-out infinite',
          }}
        />
      </div>

      <style jsx>{`
        @keyframes morph {
          0%, 100% {
            border-radius: 40% 60% 70% 30% / 60% 30% 70% 40%;
          }
          25% {
            border-radius: 60% 40% 30% 70% / 40% 70% 30% 60%;
          }
          50% {
            border-radius: 30% 70% 60% 40% / 70% 40% 60% 30%;
          }
          75% {
            border-radius: 70% 30% 40% 60% / 30% 60% 40% 70%;
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
}

