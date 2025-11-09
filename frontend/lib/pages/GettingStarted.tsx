import Link from 'next/link';
import { Play, Upload, MessageSquare, FileText, Map } from 'lucide-react';

export function GettingStarted() {
  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-primary-50 to-blue-50">
      <div className="max-w-5xl mx-auto p-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to URBAN! 🏙️
          </h1>
          <p className="text-xl text-gray-600">
            AI-Powered Policy Simulation with Real Urban Data
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            🚀 Quick Start Guide
          </h2>
          
          <div className="space-y-6">
            {/* Step 1 */}
            <div className="flex gap-4 items-start p-4 bg-blue-50 rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">Create a Project</h3>
                <p className="text-gray-600 mb-3">
                  Start by creating a new project. Give it a name and specify the city you want to analyze.
                </p>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Go to Dashboard →
                </Link>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4 items-start p-4 bg-green-50 rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload Policy Document (PDF)
                </h3>
                <p className="text-gray-600 mb-2">
                  Upload any policy document in PDF format. Our AI will automatically extract policy actions.
                </p>
                <div className="text-sm text-gray-500">
                  ✓ AI automatically extracts actions<br />
                  ✓ Identifies impacts and changes<br />
                  ✓ Supports any government policy document
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4 items-start p-4 bg-purple-50 rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Map className="w-5 h-5" />
                  Run Simulation
                </h3>
                <p className="text-gray-600 mb-2">
                  Watch AI analyze your policy using REAL data from:
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                  <div>✓ US Census Bureau</div>
                  <div>✓ EPA Air Quality</div>
                  <div>✓ OpenStreetMap</div>
                  <div>✓ Mapbox Traffic</div>
                  <div>✓ HUD Housing Data</div>
                  <div>✓ Live Urban Metrics</div>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4 items-start p-4 bg-orange-50 rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center font-bold">
                4
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Run Debate (Optional)
                </h3>
                <p className="text-gray-600 mb-2">
                  After simulation completes, run a debate to see PRO vs CON arguments.
                </p>
                <div className="text-sm text-gray-500">
                  💬 AI agents argue from multiple perspectives<br />
                  📊 Get risk scores and sentiment analysis<br />
                  ⚖️ See balanced view of your policy
                </div>
              </div>
            </div>

            {/* Step 5 */}
            <div className="flex gap-4 items-start p-4 bg-pink-50 rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 bg-pink-600 text-white rounded-full flex items-center justify-center font-bold">
                5
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Generate Report
                </h3>
                <p className="text-gray-600 mb-2">
                  Compile everything into a professional report.
                </p>
                <div className="text-sm text-gray-500">
                  📄 Export to PDF or PowerPoint<br />
                  📈 Includes charts and metrics<br />
                  ✍️ Professional formatting
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl mb-3">🌍</div>
            <h3 className="font-semibold mb-2">Real Data</h3>
            <p className="text-sm text-gray-600">
              Census, EPA, OpenStreetMap, HUD - all real, authoritative sources
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl mb-3">🤖</div>
            <h3 className="font-semibold mb-2">AI-Powered</h3>
            <p className="text-sm text-gray-600">
              Google Gemini AI analyzes policies and generates insights in real-time
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl mb-3">🗺️</div>
            <h3 className="font-semibold mb-2">3D Visualization</h3>
            <p className="text-sm text-gray-600">
              Interactive Mapbox maps with 3D buildings and real traffic data
            </p>
          </div>
        </div>

        {/* Sample Project */}
        <div className="bg-blue-600 text-white rounded-xl shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">
            Try the Sample Project!
          </h2>
          <p className="mb-6">
            We've created a sample project for you to explore:<br />
            <strong>"Downtown Transit-Oriented Development"</strong>
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-100 font-semibold"
          >
            <Play className="w-5 h-5" />
            Get Started Now
          </Link>
        </div>
      </div>
    </div>
  );
}

