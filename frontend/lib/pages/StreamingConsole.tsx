import { useWebSocket } from '../hooks/useWebSocket';
import { Terminal } from 'lucide-react';
import { VerticalSidebar } from '../components/VerticalSidebar';
import { format } from 'date-fns';

export function StreamingConsole() {
  const { messages, isConnected, clearMessages } = useWebSocket();

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Vertical Sidebar */}
      <VerticalSidebar />

      {/* Particles Background */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}></div>
      </div>

      {/* Gradient Overlays */}
      <div className="fixed top-0 left-0 w-1/3 h-1/3 bg-green-600/10 blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-0 right-0 w-1/3 h-1/3 bg-cyan-600/10 blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 h-full flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 via-cyan-600 to-blue-600 shadow-2xl">
        <div className="max-w-[1600px] mx-auto px-16 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white tracking-tight uppercase flex items-center gap-3">
                <Terminal className="w-10 h-10" />
                Live Console
              </h1>
              <p className="text-white/80 mt-2 text-lg tracking-wide">
                Real-time streaming from all active AI agents
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div
                  className={`w-4 h-4 rounded-full ${
                    isConnected ? 'bg-green-400 shadow-lg shadow-green-400/50 animate-pulse' : 'bg-red-500'
                  }`}
                />
                <span className="text-white font-medium uppercase tracking-wide text-sm">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <button
                onClick={clearMessages}
                className="group relative"
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl opacity-50 group-hover:opacity-100 blur transition duration-300"></div>
                <div className="relative px-6 py-3 bg-black border border-white/20 rounded-xl hover:border-white/40 transition-all">
                  <span className="text-white font-semibold">Clear</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Console Output */}
      <div className="flex-1 overflow-auto p-8 space-y-1 max-w-[1600px] mx-auto w-full">
        {messages.map((msg, i) => (
          <div key={i} className="text-sm">
            <span className="text-gray-500">
              [{format(new Date(msg.timestamp), 'HH:mm:ss')}]
            </span>
            {' '}
            <span className={`font-semibold ${
              msg.type === 'error' ? 'text-red-400' :
              msg.type === 'progress' ? 'text-blue-400' :
              msg.type === 'complete' ? 'text-green-400' :
              'text-yellow-400'
            }`}>
              [{msg.type.toUpperCase()}]
            </span>
            {' '}
            {msg.channel && (
              <span className="text-purple-400">[{msg.channel}]</span>
            )}
            {' '}
            <span className="text-green-400">
              {JSON.stringify(msg.data)}
            </span>
          </div>
        ))}

        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <Terminal className="w-12 h-12 mx-auto mb-4" />
              <p>Waiting for agent activity...</p>
              <p className="text-sm mt-2">
                Start a simulation, debate, or report to see live output
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="relative z-10 border-t border-white/10 p-4 bg-black/50 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between text-xs text-white/50 tracking-wide">
          <span>{messages.length} MESSAGES</span>
          <span className="uppercase">WebSocket: {isConnected ? 'ONLINE' : 'OFFLINE'}</span>
        </div>
      </div>
      </div>
    </div>
  );
}


