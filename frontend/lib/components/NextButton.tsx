import { ChevronRight, BarChart3 } from 'lucide-react';
import Link from 'next/link';

export function NextButton() {
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
      <Link
        href="/app/simulation"
        className="group flex items-center gap-6 px-8 py-4 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full hover:bg-black/60 hover:border-white/30 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20"
      >
        {/* Pagination dots */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-white"></div>
          <div className="w-2 h-2 rounded-full bg-white"></div>
          <div className="w-2 h-2 rounded-full border border-white/50"></div>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-white/20"></div>

        {/* Label */}
        <div className="flex items-center gap-3">
          <span className="text-white/50 text-xs uppercase tracking-wider">NEXT</span>
          <BarChart3 className="w-4 h-4 text-white/70" />
          <span className="text-white font-medium">Start Simulation</span>
          <ChevronRight className="w-5 h-5 text-white/70 group-hover:translate-x-1 transition-transform" />
        </div>
      </Link>
    </div>
  );
}

