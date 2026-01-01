import { useLocation, Link } from 'react-router-dom';
import ThemeToggle from '@/components/ui/ThemeToggle';
import AccountSwitcher from '@/components/ui/AccountSwitcher';

interface SidebarProps {
  className?: string;
}

const navigationItems = [
  { id: 'overview', label: 'Overview', icon: 'fas fa-chart-line', href: '/' },
  { id: 'customers', label: 'Customers', icon: 'fas fa-users', href: '/customers' },
  { id: 'products', label: 'Products', icon: 'fas fa-box', href: '/products' },
  { id: 'subscriptions', label: 'Subscriptions', icon: 'fas fa-sync-alt', href: '/subscriptions' },
  { id: 'plans', label: 'Plans', icon: 'fas fa-clipboard-list', href: '/plans' },
  { id: 'payments', label: 'Payments', icon: 'fas fa-credit-card', href: '/payments' },
  { id: 'charges', label: 'Charges', icon: 'fas fa-bolt', href: '/charges' },
  { id: 'webhooks', label: 'Webhooks', icon: 'fas fa-link', href: '/webhooks' },
  { id: 'logs', label: 'API Logs', icon: 'fas fa-scroll', href: '/logs' },
];

const configItems = [
  { id: 'accounts', label: 'Accounts', icon: 'fas fa-users-cog', href: '/accounts' },
  { id: 'settings', label: 'Settings', icon: 'fas fa-cog', href: '/settings' },
];

export default function Sidebar({ className = '' }: SidebarProps) {
  const location = useLocation();

  return (
    <div className={`w-64 h-screen bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col ${className}`}>
      {/* Logo/Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">LS</span>
          </div>
          <div className="flex flex-col gap-1 py-1">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">LocalStripe</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Mock Server Dashboard</p>
          </div>
        </div>
      </div>

      {/* Account Switcher */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <AccountSwitcher />
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
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${isActive
                  ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                <i className={`${item.icon} mr-3 w-4 text-center`}></i>
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-gray-700 my-6"></div>

        {/* Configuration */}
        <div className="space-y-1">
          <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Configuration
          </h3>
          {configItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.id}
                to={item.href}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${isActive
                  ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                <i className={`${item.icon} mr-3 w-4 text-center`}></i>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-xs text-gray-600 dark:text-gray-400">Connected</span>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">:8420</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400">Theme</span>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
