import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Overview from '@/components/dashboard/Overview';
import Customers from '@/components/dashboard/Customers';
import Subscriptions from '@/components/dashboard/Subscriptions';
import Plans from '@/components/dashboard/Plans';
import Payments from '@/components/dashboard/Payments';
import Charges from '@/components/dashboard/Charges';
import Webhooks from '@/components/dashboard/Webhooks';
import Logs from '@/components/dashboard/Logs';

// Page titles and subtitles for each route
const pageInfo: Record<string, { title: string; subtitle: string }> = {
  '/': {
    title: 'Overview',
    subtitle: 'Monitor your LocalStripe mock server activity and data'
  },
  '/customers': {
    title: 'Customers',
    subtitle: 'Manage your LocalStripe customers'
  },
  '/subscriptions': {
    title: 'Subscriptions',
    subtitle: 'Monitor active and past subscriptions'
  },
  '/plans': {
    title: 'Plans',
    subtitle: 'Manage subscription plans and pricing'
  },
  '/payments': {
    title: 'Payments',
    subtitle: 'View payment intents and transactions'
  },
  '/charges': {
    title: 'Charges',
    subtitle: 'Monitor charges and payment activity'
  },
  '/webhooks': {
    title: 'Webhooks',
    subtitle: 'Configure webhook endpoints'
  },
  '/logs': {
    title: 'Logs',
    subtitle: 'Monitor all API requests and responses with detailed logging'
  },
  '/settings': {
    title: 'Settings',
    subtitle: 'Configure your LocalStripe instance'
  },
  '/api-keys': {
    title: 'API Keys',
    subtitle: 'Manage API keys and authentication'
  },
};

function AppContent() {
  const location = useLocation();
  const currentPage = pageInfo[location.pathname] || { title: 'LocalStripe', subtitle: '' };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Dynamic Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{currentPage.title}</h1>
              {currentPage.subtitle && (
                <p className="text-sm text-gray-600 mt-1">{currentPage.subtitle}</p>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/subscriptions" element={<Subscriptions />} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/charges" element={<Charges />} />
            <Route path="/webhooks" element={<Webhooks />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/settings" element={<PlaceholderPage name="Settings" />} />
            <Route path="/api-keys" element={<PlaceholderPage name="API Keys" />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

// Placeholder component for unimplemented pages
function PlaceholderPage({ name }: { name: string }) {
  return (
    <div className="p-6">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
        <div className="mb-4 text-4xl">🚧</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {name} Page Coming Soon
        </h3>
        <p className="text-gray-600">
          This page is under development and will be available in a future update.
        </p>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
