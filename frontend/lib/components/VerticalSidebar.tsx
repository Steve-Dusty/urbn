import { Zap, User, Briefcase, BarChart3, Calendar, Mail } from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { icon: Zap, label: 'Dashboard', href: '/app/dashboard' },
  { icon: BarChart3, label: 'Simulations', href: '/app/simulation' },
  { icon: Briefcase, label: 'Projects', href: '/app/dashboard' },
  { icon: User, label: 'Debates', href: '/app/debate' },
  { icon: Calendar, label: 'Reports', href: '/app/reports' },
  { icon: Mail, label: 'Console', href: '/app/console' },
];

export function VerticalSidebar() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div className="fixed left-8 top-1/2 -translate-y-1/2 z-50">
      <div className="flex flex-col gap-4">
        {navItems.map((item, index) => (
          <div key={index} className="relative">
            <a
              href={item.href}
              className="group flex items-center justify-center w-12 h-12 rounded-full border border-white/20 bg-black backdrop-blur-sm hover:bg-gray-900 hover:border-white/40 transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-purple-500/20"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <item.icon className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
            </a>
            
            {/* Tooltip */}
            {hoveredIndex === index && (
              <div className="absolute left-16 top-1/2 -translate-y-1/2 whitespace-nowrap px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg animate-in fade-in slide-in-from-left-2 duration-200">
                <span className="text-white text-sm font-medium">{item.label}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

