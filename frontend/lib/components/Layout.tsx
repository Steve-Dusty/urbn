'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Map, MessageSquare, FileText, Terminal, Settings } from 'lucide-react';
import clsx from 'clsx';

export function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { path: '/app/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/app/simulation', icon: Map, label: 'Simulation' },
    { path: '/app/debate', icon: MessageSquare, label: 'Debate' },
    { path: '/app/reports', icon: FileText, label: 'Reports' },
    { path: '/app/console', icon: Terminal, label: 'Console' },
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Stunning Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-r border-white/10 flex flex-col shadow-2xl">
        <div className="p-6 border-b border-white/10">
          <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-transparent bg-clip-text">
            <h1 className="text-3xl font-black tracking-tight">URBAN</h1>
          </div>
          <p className="text-sm text-gray-400 mt-2 font-medium">AI Policy Simulator</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname?.startsWith(item.path);

            return (
              <Link
                key={item.path}
                href={item.path}
                className={clsx(
                  'group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300',
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg scale-105'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                )}
              >
                <Icon className={clsx(
                  'w-5 h-5 transition-transform',
                  isActive && 'scale-110'
                )} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-300"
          >
            <Settings className="w-5 h-5" />
            <span className="font-medium">Back to Home</span>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}


