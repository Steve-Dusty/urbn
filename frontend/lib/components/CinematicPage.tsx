import { ReactNode } from 'react';
import { VerticalSidebar } from './VerticalSidebar';
import { Particles } from './Particles';

interface CinematicPageProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  gradientFrom?: string;
  gradientTo?: string;
}

export function CinematicPage({ 
  children, 
  title, 
  subtitle, 
  icon,
  gradientFrom = 'from-blue-600',
  gradientTo = 'to-purple-600'
}: CinematicPageProps) {
  return (
    <div className="relative min-h-screen bg-[#0a0a0a]">
      {/* Particles */}
      <Particles />
      
      {/* Vertical Sidebar */}
      <VerticalSidebar />

      {/* Gradient Overlays */}
      <div className="fixed top-0 left-0 w-1/3 h-1/3 bg-purple-600/10 blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-0 right-0 w-1/3 h-1/3 bg-blue-600/10 blur-[120px] pointer-events-none"></div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen">
        {/* Header */}
        <div className={`bg-gradient-to-r ${gradientFrom} via-purple-600 ${gradientTo} shadow-2xl`}>
          <div className="max-w-[1600px] mx-auto px-16 py-8">
            <div className="flex items-center gap-4">
              {icon && <div className="text-white">{icon}</div>}
              <div>
                <h1 className="text-4xl font-bold text-white tracking-tight">{title}</h1>
                {subtitle && <p className="text-white/80 mt-2 text-lg">{subtitle}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="max-w-[1600px] mx-auto px-16 py-12">
          {children}
        </div>
      </div>
    </div>
  );
}

