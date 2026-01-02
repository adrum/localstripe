import { useState, useRef, useEffect } from 'react';
import { useAccount } from '@/contexts/AccountContext';
import { Link } from 'react-router-dom';

export default function AccountSwitcher() {
  const { accounts, currentAccount, setCurrentAccount, isLoading } = useAccount();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="px-3 py-2">
        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-10 rounded-lg"></div>
      </div>
    );
  }

  if (!currentAccount) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
      >
        <div className="flex items-center min-w-0">
          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">
              {currentAccount.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="ml-2 truncate text-gray-900 dark:text-white">
            {currentAccount.name}
          </span>
        </div>
        <i className={`fas fa-chevron-down ml-2 text-gray-500 dark:text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          <div className="py-1">
            {accounts.map((account) => (
              <button
                key={account.id}
                onClick={() => {
                  setCurrentAccount(account);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  account.id === currentAccount.id
                    ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">
                    {account.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="ml-2 truncate">{account.name}</span>
                {account.id === currentAccount.id && (
                  <i className="fas fa-check ml-auto text-purple-600 dark:text-purple-400"></i>
                )}
              </button>
            ))}
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 p-2">
            <Link
              to="/accounts"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center w-full px-3 py-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
            >
              <i className="fas fa-cog mr-2"></i>
              Manage Accounts
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
