import { useLocation, Link } from 'react-router-dom';

interface SidebarProps {
  className?: string;
}

const navigationItems = [
  { id: 'overview', label: 'Overview', icon: '📊', href: '/' },
  { id: 'customers', label: 'Customers', icon: '👥', href: '/customers' },
  { id: 'subscriptions', label: 'Subscriptions', icon: '🔄', href: '/subscriptions' },
  { id: 'plans', label: 'Plans', icon: '📋', href: '/plans' },
  { id: 'payments', label: 'Payments', icon: '💳', href: '/payments' },
  { id: 'charges', label: 'Charges', icon: '⚡', href: '/charges' },
  { id: 'webhooks', label: 'Webhooks', icon: '🔗', href: '/webhooks' },
  { id: 'logs', label: 'Logs', icon: '📝', href: '/logs' },
];

const configItems = [
  { id: 'settings', label: 'Settings', icon: '⚙️', href: '/settings' },
  { id: 'api-keys', label: 'API Keys', icon: '🔑', href: '/api-keys' },
];

export default function Sidebar({ className = '' }: SidebarProps) {
  const location = useLocation();

  return (
    <div className={`w-64 h-screen bg-white border-r border-gray-200 flex flex-col ${className}`}>
      {/* Logo/Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">LS</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">LocalStripe</h1>
            <p className="text-xs text-gray-500">Mock Server Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        <div className="space-y-1">
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.id}
                to={item.href}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span className="mr-3 text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 my-6"></div>

        {/* Configuration */}
        <div className="space-y-1">
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Configuration
          </h3>
          {configItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.id}
                to={item.href}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span className="mr-3 text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-xs text-gray-600">Connected</span>
          </div>
          <span className="text-xs text-gray-500">:8420</span>
        </div>
      </div>
    </div>
  );
}