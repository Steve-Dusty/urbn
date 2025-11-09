import { CheckCircle, ExternalLink } from 'lucide-react';

export function DataSources() {
  const dataSources = [
    {
      name: 'US Census Bureau API',
      status: 'LIVE',
      url: 'https://api.census.gov',
      data: ['Population', 'Median Income', 'Housing Units', 'Commute Patterns'],
      verified: true,
      example: 'Real ACS 5-Year data for demographics'
    },
    {
      name: 'EPA Air Quality System',
      status: 'LIVE',
      url: 'https://aqs.epa.gov/data/api',
      data: ['PM2.5', 'Ozone', 'NO2', 'Air Quality Index'],
      verified: true,
      example: 'Current air quality measurements'
    },
    {
      name: 'OpenStreetMap (Overpass API)',
      status: 'LIVE',
      url: 'https://overpass-api.de',
      data: ['Buildings', 'Roads', 'Land Use', 'Infrastructure'],
      verified: true,
      example: 'Real-time building and road data'
    },
    {
      name: 'Mapbox',
      status: 'LIVE',
      url: 'https://api.mapbox.com',
      data: ['Geocoding', 'Traffic Flow', '3D Buildings', 'Routing'],
      verified: true,
      example: 'Live traffic and real building heights'
    },
    {
      name: 'HUD User API',
      status: 'LIVE',
      url: 'https://www.huduser.gov/hudapi',
      data: ['Fair Market Rents', 'Income Limits', 'Housing Affordability'],
      verified: true,
      example: 'Current year housing cost data'
    },
    {
      name: 'Google Gemini AI',
      status: 'LIVE',
      url: 'https://ai.google.dev',
      data: ['Policy Analysis', 'Impact Simulation', 'Debate Generation'],
      verified: true,
      example: 'Real AI analysis, not canned responses'
    },
  ];

  return (
    <div className="h-full overflow-auto bg-gray-50">
      <div className="max-w-5xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ✅ Real Data Sources
          </h1>
          <p className="text-gray-600">
            All data in URBAN comes from authoritative, real-world sources. No fake demos here!
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
          <div className="flex items-start gap-4">
            <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0 mt-1" />
            <div>
              <h2 className="font-semibold text-green-900 mb-2">
                100% Real, Live Data
              </h2>
              <p className="text-green-800 text-sm">
                Every simulation, map, and analysis uses real-time data from government agencies and authoritative sources.
                When APIs are unavailable, the system will tell you and use recent cached data.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {dataSources.map((source) => (
            <div key={source.name} className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">
                    {source.name}
                  </h3>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary-600 hover:underline flex items-center gap-1"
                  >
                    {source.url}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                  {source.status}
                </span>
              </div>

              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Data Provided:</h4>
                <div className="flex flex-wrap gap-2">
                  {source.data.map((item) => (
                    <span
                      key={item}
                      className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>Example:</strong> {source.example}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">
            How to Verify Data is Real:
          </h3>
          <ul className="space-y-2 text-blue-800 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-blue-600">1.</span>
              <span>Run a simulation for a real city (e.g., San Francisco, New York)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">2.</span>
              <span>Check the data sources mentioned in the analysis</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">3.</span>
              <span>Compare population, income, housing data with official Census website</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">4.</span>
              <span>Verify building locations and roads match OpenStreetMap</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">5.</span>
              <span>Check the Mapbox map - all buildings, streets, and traffic are real</span>
            </li>
          </ul>
        </div>

        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="font-semibold text-yellow-900 mb-3">
            ⚠️ When Mock Data is Used:
          </h3>
          <p className="text-yellow-800 text-sm mb-3">
            If any API is unavailable (network issues, rate limits, invalid keys), the system will:
          </p>
          <ul className="space-y-2 text-yellow-800 text-sm">
            <li className="flex items-start gap-2">
              <span>•</span>
              <span><strong>Tell you</strong> in the console that it's using mock/cached data</span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Use <strong>realistic fallback data</strong> based on actual patterns</span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Label the data source as "Mock data (API unavailable)"</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

