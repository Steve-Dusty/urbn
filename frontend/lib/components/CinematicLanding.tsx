import { Upload } from 'lucide-react';
import { Particles } from './Particles';
import { Blob3D } from './Blob3D';
import { VerticalSidebar } from './VerticalSidebar';
import { NextButton } from './NextButton';
import { useState } from 'react';

export function CinematicLanding() {
  const [imageHovered, setImageHovered] = useState(false);

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] overflow-hidden">
      {/* Animated Particles Background */}
      <Particles />

      {/* Vertical Sidebar */}
      <VerticalSidebar />

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center">
        <div className="max-w-[1600px] mx-auto w-full px-16">
          <div className="grid grid-cols-2 gap-16 items-center">
            {/* Left: Text Content */}
            <div className="space-y-8">
              {/* Small Title */}
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <h2 className="text-white/60 text-sm uppercase tracking-[0.3em] font-light">
                  URBAN · POLICY INTELLIGENCE
                </h2>
              </div>

              {/* Main Headline */}
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                <h1 className="text-white text-7xl font-bold leading-[1.1] tracking-tight">
                  Visualize Urban
                  <br />
                  <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
                    Policy Futures
                  </span>
                </h1>
              </div>

              {/* Mission Card with Glassmorphism */}
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl opacity-20 group-hover:opacity-40 blur transition duration-500"></div>
                  <div className="relative px-8 py-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl hover:bg-white/10 transition-all duration-300">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-2xl">🏙️</span>
                      <h3 className="text-white/90 text-sm uppercase tracking-wider font-semibold">
                        REAL-TIME URBAN INTELLIGENCE
                      </h3>
                    </div>
                    <p className="text-white/80 text-lg leading-relaxed">
                      Simulate policy impacts on real cities using live Census demographics, EPA air quality, OpenStreetMap infrastructure, and Mapbox traffic—powered by Google Gemini AI for instant, data-driven insights.
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats Row */}
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                <div className="flex items-center gap-6">
                  {[
                    { value: '6', label: 'Data Sources' },
                    { value: '5', label: 'AI Agents' },
                    { value: '3D', label: 'Visualization' },
                  ].map((stat, i) => (
                    <div key={i} className="group">
                      <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-transparent bg-clip-text group-hover:scale-110 transition-transform">
                        {stat.value}
                      </div>
                      <div className="text-white/50 text-xs uppercase tracking-wide mt-1">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: 3D Blob + Photo Placeholder */}
            <div className="relative animate-in fade-in slide-in-from-right-8 duration-1000 delay-300">
              {/* 3D Metallic Blob */}
              <div className="relative z-10">
                <Blob3D />
              </div>

              {/* Photo Placeholder */}
              <div className="absolute top-8 right-8 z-20 animate-in fade-in slide-in-from-right-4 duration-1000 delay-500">
                <div
                  className="relative group cursor-pointer"
                  onMouseEnter={() => setImageHovered(true)}
                  onMouseLeave={() => setImageHovered(false)}
                >
                  <div className="w-48 h-48 rounded-full border-2 border-white/20 bg-white/5 backdrop-blur-sm flex flex-col items-center justify-center hover:border-white/40 hover:bg-white/10 transition-all duration-300">
                    <div className="text-white/40 mb-2">
                      <svg
                        className="w-16 h-16"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <span className="text-white/40 text-sm">Your Logo</span>
                    
                    {/* Upload icon on hover */}
                    {imageHovered && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full animate-in fade-in duration-200">
                        <Upload className="w-8 h-8 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <NextButton />

      {/* Subtle gradient overlays */}
      <div className="fixed top-0 left-0 w-1/3 h-1/3 bg-purple-600/10 blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-0 right-0 w-1/3 h-1/3 bg-blue-600/10 blur-[120px] pointer-events-none"></div>
    </div>
  );
}

