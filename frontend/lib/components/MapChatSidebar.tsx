import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, MapPin, Building, Trash2, Plus } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  mapAction?: any;
}

interface MapChatSidebarProps {
  onMapCommand: (command: any) => void;
}

export function MapChatSidebar({ onMapCommand }: MapChatSidebarProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "🎯 I can modify the map in real-time!\n\nTry commands like:\n\n🏗️ BUILD:\n• \"Build a 50-story tower at Salesforce Plaza\"\n• \"Add 300 housing units at 16th & Mission\"\n• \"Construct apartment building on Market St\"\n\n💥 DESTROY:\n• \"Demolish Salesforce Tower\"\n• \"Remove the building at coordinates -122.39, 37.78\"\n• \"Destroy all buildings in Financial District\"\n\n🎨 VISUALIZE:\n• \"Show traffic congestion on Bay Bridge\"\n• \"Highlight Mission District\"\n• \"Show me a heatmap of housing density\"\n\n📍 ANALYZE:\n• \"What's the impact of removing parking on Valencia?\"\n• \"How would 1000 new units affect traffic?\""
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const parseCommand = async (userInput: string) => {
    const lower = userInput.toLowerCase();
    
    // BUILD commands
    if (lower.includes('build') || lower.includes('construct') || lower.includes('add') && (lower.includes('building') || lower.includes('tower') || lower.includes('units'))) {
      const height = extractNumber(userInput) || 50;
      const location = extractLocation(userInput) || extractStreet(userInput) || 'center';
      
      return {
        type: 'build-specific',
        height: height,
        location: location,
        units: Math.floor(height * 8), // ~8 units per floor
        response: `🏗️ BUILDING ${height}-STORY STRUCTURE at ${location}!\n\nConstruction Details:\n• Height: ${height} stories (${height * 4}m)\n• Units: ~${Math.floor(height * 8)} residential\n• Impact: +${(height / 10).toFixed(1)}% housing supply\n• Construction time: ${Math.floor(height / 5)} months\n\n✅ Watch the building RISE from the ground!`
      };
    }
    
    // DESTROY specific buildings
    if (lower.includes('demolish') || lower.includes('destroy') || lower.includes('remove')) {
      if (lower.includes('salesforce')) {
        return {
          type: 'demolish-specific',
          target: 'Salesforce Tower',
          coordinates: [-122.3970, 37.7897],
          response: `💥 DEMOLISHING SALESFORCE TOWER!\n\nDemolition Process:\n• 61 stories will collapse\n• 1.4 million sq ft removed\n• 6,000 workers displaced\n• 10-second demolition sequence\n\n⚠️ Watch the tower SINK and FADE away!`
        };
      } else if (lower.includes('financial district') || lower.includes('downtown')) {
        return {
          type: 'demolish-area',
          area: 'Financial District',
          coordinates: [-122.3965, 37.7893],
          response: `💥 MASS DEMOLITION: Financial District!\n\n⚠️ WARNING: Large-scale demolition:\n• ~50 buildings targeted\n• Downtown core cleared\n• Major economic impact\n• Clearance for redevelopment\n\n🎬 Watch the entire district collapse!`
        };
      } else {
        const location = extractLocation(userInput) || extractStreet(userInput);
        return {
          type: 'demolish-area',
          target: location || 'selected area',
          response: `💥 Demolishing buildings ${location ? `in ${location}` : 'in target area'}!\n\nDemolition Impact:\n• ~5-10 structures removed\n• Displacement analysis ongoing\n• Site prepared for new development\n\n🎬 Watch buildings disappear!`
        };
      }
    }
    
    // TRAFFIC analysis
    if (lower.includes('traffic') || lower.includes('congestion')) {
      const street = extractStreet(userInput) || 'major roads';
      return {
        type: 'analyze-traffic',
        street: street,
        response: `🚗 TRAFFIC ANALYSIS: ${street}\n\nCurrent Conditions:\n• Congestion Level: 45% (Moderate)\n• Average Speed: 18 mph\n• Peak bottleneck: 4th St intersection\n• Suggested: Add transit lane\n\n🎨 Highlighting roads with traffic overlay...`
      };
    }
    
    // HIGHLIGHT areas
    if (lower.includes('highlight') || lower.includes('show') || lower.includes('focus')) {
      const location = extractLocation(userInput) || extractStreet(userInput);
      return {
        type: 'highlight-area',
        location: location || 'city center',
        response: `📍 HIGHLIGHTING: ${location || 'City Center'}\n\nArea Overview:\n• Population: ~45,000\n• Housing density: High\n• Transit access: Excellent\n• Development potential: Medium\n\n🎨 Glowing zone applied to map!`
      };
    }

    // HEATMAP
    if (lower.includes('heatmap') || lower.includes('density') || lower.includes('heat map')) {
      return {
        type: 'show-heatmap',
        metric: lower.includes('housing') ? 'housing' : lower.includes('traffic') ? 'traffic' : 'impact',
        response: `🔥 GENERATING HEATMAP!\n\nShowing ${lower.includes('housing') ? 'housing density' : lower.includes('traffic') ? 'traffic flow' : 'policy impact'} zones:\n\n🟢 Green = High impact/density\n🟡 Yellow = Medium\n🟠 Orange = Low\n🔴 Red = Minimal\n\n🎨 Colorful zones now visible on map!`
      };
    }

    // DEFAULT - Generic analysis
    return {
      type: 'analyze',
      response: `🤔 I can help with that!\n\nI understand you want to explore: "${userInput}"\n\nI can:\n🏗️ Build new structures\n💥 Demolish buildings  \n🚗 Analyze traffic\n📍 Highlight areas\n🔥 Show heatmaps\n\nTry being more specific with:\n• Locations (Mission, SOMA, etc)\n• Actions (build, demolish, show)\n• Numbers (500 units, 40 stories)`
    };
  };

  const extractNumber = (text: string): number | null => {
    const match = text.match(/(\d+)[\s-]?(story|stories|floor|unit|units)?/i);
    return match ? parseInt(match[1]) : null;
  };

  const extractLocation = (text: string): string | null => {
    const locations = [
      'mission district', 'mission', 'soma', 'south of market',
      'tenderloin', 'financial district', 'downtown', 
      'castro', 'haight', 'richmond', 'sunset',
      'treasure island', 'bayview', 'potrero hill',
      'north beach', 'chinatown', 'nob hill'
    ];
    const lower = text.toLowerCase();
    const found = locations.find(l => lower.includes(l));
    return found ? found.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : null;
  };

  const extractStreet = (text: string): string | null => {
    const streets = [
      'market street', 'market', 'mission street', 'valencia',
      '16th street', '16th', 'king street', '3rd street',
      'bay bridge', 'golden gate', 'lombard', 'broadway'
    ];
    const lower = text.toLowerCase();
    const found = streets.find(s => lower.includes(s));
    return found ? found.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : null;
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const command = await parseCommand(userMessage);
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: command.response,
        mapAction: command
      }]);
      
      // Execute map command
      onMapCommand(command);
      
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Error processing command. Please try again!'
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute left-0 top-0 bottom-0 w-[400px] z-30 flex flex-col">
      <div className="relative h-full">
        <div className="absolute -inset-0.5 bg-gradient-to-b from-purple-600 via-pink-600 to-blue-600 blur-xl opacity-50"></div>
        <div className="relative h-full bg-black/95 backdrop-blur-3xl border-r-2 border-white/20 flex flex-col shadow-2xl">
          
          {/* Header */}
          <div className="px-6 py-5 bg-gradient-to-r from-purple-600/30 to-pink-600/30 border-b border-white/20">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="w-7 h-7 text-purple-400 animate-pulse" />
              <div>
                <h3 className="text-white font-black text-2xl">Map AI</h3>
                <p className="text-white/60 text-xs">Command anything, I'll visualize it</p>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setInput('Build a 60-story tower in Mission District')}
                className="flex-1 px-3 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-lg text-green-300 text-xs font-bold transition flex items-center justify-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Build
              </button>
              <button
                onClick={() => setInput('Demolish Salesforce Tower')}
                className="flex-1 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-300 text-xs font-bold transition flex items-center justify-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Destroy
              </button>
              <button
                onClick={() => setInput('Show traffic heatmap')}
                className="flex-1 px-3 py-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 rounded-lg text-orange-300 text-xs font-bold transition flex items-center justify-center gap-1"
              >
                <MapPin className="w-3 h-3" />
                Analyze
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[90%] ${
                  msg.role === 'user' 
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' 
                    : 'bg-white/10 border border-white/20 text-white/90'
                } rounded-2xl px-4 py-3 shadow-lg`}>
                  <p className="text-sm whitespace-pre-line leading-relaxed">{msg.content}</p>
                  {msg.mapAction && (
                    <div className="mt-2 pt-2 border-t border-white/20">
                      <p className="text-xs text-white/60 flex items-center gap-1">
                        <Building className="w-3 h-3" />
                        Map action: {msg.mapAction.type}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/10 border border-white/20 rounded-2xl px-4 py-3">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-white/20 bg-gradient-to-r from-purple-600/10 to-pink-600/10">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Command the map..."
                disabled={loading}
                className="flex-1 px-4 py-3 bg-black/60 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="group relative"
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl blur-lg opacity-75 group-hover:opacity-100 transition"></div>
                <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3 rounded-xl disabled:opacity-50">
                  <Send className="w-5 h-5 text-white" />
                </div>
              </button>
            </div>
            <p className="text-white/40 text-xs mt-2 text-center">
              Type any scenario - I'll make it happen on the map
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

