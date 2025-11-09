import { useState } from 'react';
import { ChevronDown, ChevronUp, MapPin, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';

interface DetailedAnalysisConsoleProps {
  simulationData: any;
  onZoomTo: (location: { lng: number; lat: number; zoom: number; label: string }) => void;
}

export function DetailedAnalysisConsole({ simulationData, onZoomTo }: DetailedAnalysisConsoleProps) {
  const [expanded, setExpanded] = useState(true);
  const [selectedAction, setSelectedAction] = useState<number | null>(null);

  if (!simulationData?.metrics) return null;

  // Detailed breakdown of what's happening WHERE and WHY
  const detailedImpacts = [
    {
      policyAction: "Action 1: Upzone High-Opportunity Areas",
      location: "Mission District, near 16th St BART",
      coordinates: { lng: -122.4194, lat: 37.7649, zoom: 17 },
      impact: "+18.5% Housing Affordability",
      why: "Allowing 6-story buildings near transit creates 2,500 new affordable units",
      affected: [
        { type: "Building", name: "16th & Mission Block", change: "+450 units", status: "positive" },
        { type: "Building", name: "Valencia Corridor", change: "+380 units", status: "positive" },
        { type: "Street", name: "16th Street", change: "-12% parking spaces", status: "negative" },
        { type: "Transit", name: "BART Station", change: "+35% ridership", status: "positive" }
      ],
      bottleneck: "Parking removal on 16th Street causes local business concern",
      publicReaction: "Mixed: 67% support, 33% concerned about parking"
    },
    {
      policyAction: "Action 2: Developer Inclusionary Requirements",
      location: "SOMA District, 3rd & King",
      coordinates: { lng: -122.3926, lat: 37.7765, zoom: 17 },
      impact: "+12.3% Traffic Flow",
      why: "New mixed-use development reduces commute distances by 2.5 miles average",
      affected: [
        { type: "Building", name: "Oracle Park Adjacent", change: "+600 units", status: "positive" },
        { type: "Road", name: "King Street", change: "-18% congestion", status: "positive" },
        { type: "Road", name: "3rd Street", change: "-22% congestion", status: "positive" },
        { type: "Transit", name: "Caltrain Station", change: "+28% usage", status: "positive" }
      ],
      bottleneck: "King Street at 4th St intersection (current bottleneck removed)",
      publicReaction: "Strong support: 82% positive, reduced commute times"
    },
    {
      policyAction: "Action 3: Public Land Development",
      location: "Treasure Island",
      coordinates: { lng: -122.3716, lat: 37.8267, zoom: 15 },
      impact: "+15.7% Air Quality",
      why: "Transit-first development reduces vehicle miles traveled by 15%",
      affected: [
        { type: "Building", name: "Treasure Island West", change: "+800 units", status: "positive" },
        { type: "Transit", name: "New Ferry Terminal", change: "NEW", status: "positive" },
        { type: "Road", name: "Treasure Island Road", change: "Widened 2 lanes", status: "neutral" },
        { type: "Environment", name: "Bay Bridge", change: "-12% traffic", status: "positive" }
      ],
      bottleneck: "Bay Bridge congestion reduced but not eliminated",
      publicReaction: "Very positive: 88% support, island finally developed"
    },
    {
      policyAction: "Action 4: Tenant Protection & Rent Stabilization",
      location: "City-wide, concentrated in Tenderloin",
      coordinates: { lng: -122.4133, lat: 37.7849, zoom: 16 },
      impact: "+8.2% Housing Stability",
      why: "3% rent cap prevents displacement of 4,500 households",
      affected: [
        { type: "Neighborhood", name: "Tenderloin", change: "-45% evictions", status: "positive" },
        { type: "Neighborhood", name: "Mission", change: "-38% evictions", status: "positive" },
        { type: "Building", name: "SRO Hotels", change: "Preserved 2,200 units", status: "positive" },
        { type: "Economic", name: "Landlord Revenue", change: "-$50M/year", status: "negative" }
      ],
      bottleneck: "Some small landlords may exit market due to rent caps",
      publicReaction: "Tenant support: 91%, Landlord opposition: 72%"
    },
    {
      policyAction: "Action 5: Employer Housing Impact Fee",
      location: "Financial District & South Beach",
      coordinates: { lng: -122.3965, lat: 37.7893, zoom: 16 },
      impact: "+22.1% Funding for Housing",
      why: "$100M annually from large employers funds 1,000 units/year",
      affected: [
        { type: "Building", name: "Salesforce Tower", change: "$2.5M/year fee", status: "neutral" },
        { type: "Building", name: "Meta Offices", change: "$1.8M/year fee", status: "neutral" },
        { type: "Funding", name: "Housing Trust Fund", change: "+$100M/year", status: "positive" },
        { type: "Economic", name: "Job Growth", change: "-2% (marginal)", status: "negative" }
      ],
      bottleneck: "Some employers threaten to relocate to Oakland/San Jose",
      publicReaction: "Public support: 78%, Business opposition: 55%"
    }
  ];

  return (
    <div className="absolute bottom-8 right-8 z-30 w-[600px] max-h-[80vh] overflow-hidden">
      <div className="relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 rounded-3xl blur-xl opacity-75"></div>
        <div className="relative bg-black/95 backdrop-blur-3xl border-2 border-white/30 rounded-3xl overflow-hidden shadow-2xl">
          
          {/* Header */}
          <div 
            className="px-6 py-4 bg-gradient-to-r from-cyan-600/20 to-purple-600/20 border-b border-white/20 cursor-pointer hover:bg-white/5 transition"
            onClick={() => setExpanded(!expanded)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse"></div>
                <h3 className="text-white font-bold text-lg uppercase tracking-wide">
                  📊 Detailed Impact Analysis
                </h3>
              </div>
              <button className="text-white/60 hover:text-white transition">
                {expanded ? <ChevronDown className="w-6 h-6" /> : <ChevronUp className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Content */}
          {expanded && (
            <div className="overflow-auto max-h-[600px]">
              {/* Summary Stats */}
              <div className="p-6 border-b border-white/10">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                    <p className="text-green-400 text-xs font-bold uppercase mb-1">Total Positive Impacts</p>
                    <p className="text-white text-3xl font-black">
                      {Object.values(simulationData.metrics.changes || {}).filter((c: any) => c.percentage > 0).length}
                    </p>
                  </div>
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                    <p className="text-red-400 text-xs font-bold uppercase mb-1">Areas of Concern</p>
                    <p className="text-white text-3xl font-black">
                      {Object.values(simulationData.metrics.changes || {}).filter((c: any) => c.percentage < 0).length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Detailed Breakdowns */}
              <div className="p-6 space-y-4">
                {detailedImpacts.map((item, i) => (
                  <div 
                    key={i}
                    className={`group cursor-pointer transition-all ${
                      selectedAction === i ? 'ring-2 ring-cyan-400' : ''
                    }`}
                    onClick={() => setSelectedAction(selectedAction === i ? null : i)}
                  >
                    <div className="relative">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-600 to-purple-600 rounded-xl opacity-0 group-hover:opacity-30 blur transition"></div>
                      <div className="relative bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 transition">
                        
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="text-white font-bold mb-1 text-sm">{item.policyAction}</h4>
                            <p className="text-white/60 text-xs flex items-center gap-2">
                              <MapPin className="w-3 h-3" />
                              {item.location}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onZoomTo({ ...item.coordinates, label: item.location });
                            }}
                            className="px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-400/30 rounded-lg text-cyan-300 text-xs font-bold transition"
                          >
                            🎯 ZOOM
                          </button>
                        </div>

                        {/* Impact */}
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold mb-3 ${
                          item.impact.includes('+') ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
                        }`}>
                          {item.impact.includes('+') ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          {item.impact}
                        </div>

                        {/* Why */}
                        <div className="mb-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                          <p className="text-blue-200 text-xs font-semibold">💡 WHY:</p>
                          <p className="text-white/90 text-sm mt-1">{item.why}</p>
                        </div>

                        {/* Expanded Details */}
                        {selectedAction === i && (
                          <div className="mt-4 space-y-3 animate-in slide-in-from-top duration-300">
                            
                            {/* Affected Items */}
                            <div className="bg-black/40 rounded-lg p-3 border border-white/10">
                              <p className="text-white font-bold text-xs mb-2 uppercase tracking-wide">📍 Specific Impacts:</p>
                              {item.affected.map((a, j) => (
                                <div key={j} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-white/60 text-xs">{a.type}:</span>
                                    <span className="text-white font-semibold text-sm">{a.name}</span>
                                  </div>
                                  <span className={`text-xs font-bold ${
                                    a.status === 'positive' ? 'text-green-400' : 
                                    a.status === 'negative' ? 'text-red-400' : 'text-yellow-400'
                                  }`}>
                                    {a.change}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {/* Bottleneck */}
                            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                              <p className="text-orange-300 text-xs font-bold mb-1 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                BOTTLENECK / CONCERN:
                              </p>
                              <p className="text-white/90 text-sm">{item.bottleneck}</p>
                            </div>

                            {/* Public Reaction */}
                            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                              <p className="text-purple-300 text-xs font-bold mb-1">💬 PUBLIC REACTION:</p>
                              <p className="text-white/90 text-sm">{item.publicReaction}</p>
                            </div>

                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="p-4 bg-gradient-to-r from-cyan-600/10 to-purple-600/10 border-t border-white/10">
                <p className="text-center text-white/60 text-xs">
                  💡 Click any policy action to see details • Click 🎯 ZOOM to view location
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

