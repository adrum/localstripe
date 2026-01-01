import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { setApiKey } from '@/utils/api';

export interface Account {
  id: string;
  object: string;
  name: string;
  public_key: string;
  secret_key: string;
  created: number;
}

interface AccountContextType {
  accounts: Account[];
  currentAccount: Account | null;
  setCurrentAccount: (account: Account) => void;
  refreshAccounts: () => Promise<void>;
  createAccount: (name: string) => Promise<Account>;
  updateAccount: (id: string, name: string) => Promise<Account>;
  deleteAccount: (id: string) => Promise<void>;
  regenerateKeys: (id: string) => Promise<Account>;
  isLoading: boolean;
  error: string | null;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export const useAccount = () => {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return context;
};

interface AccountProviderProps {
  children: ReactNode;
}

// In development, use relative URLs to leverage Vite proxy
// In production, use the full URL
const API_BASE = import.meta.env.DEV ? '' : 'http://localhost:8420';

export const AccountProvider = ({ children }: AccountProviderProps) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currentAccount, setCurrentAccountState] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE}/_config/accounts`);
      if (!response.ok) {
        throw new Error('Failed to fetch accounts');
      }
      const data = await response.json();
      setAccounts(data.data || []);
      return data.data || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch accounts');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize accounts on mount
  useEffect(() => {
    const initAccounts = async () => {
      const accountList = await fetchAccounts();

      // Try to restore previously selected account from localStorage
      const savedAccountId = localStorage.getItem('localstripe-current-account');
      if (savedAccountId && accountList.length > 0) {
        const savedAccount = accountList.find((acc: Account) => acc.id === savedAccountId);
        if (savedAccount) {
          setCurrentAccountState(savedAccount);
          setApiKey(savedAccount.secret_key);
          return;
        }
      }

      // Default to first account
      if (accountList.length > 0) {
        setCurrentAccountState(accountList[0]);
        setApiKey(accountList[0].secret_key);
      }
    };

    initAccounts();
  }, [fetchAccounts]);

  const setCurrentAccount = useCallback((account: Account) => {
    setCurrentAccountState(account);
    setApiKey(account.secret_key);
    localStorage.setItem('localstripe-current-account', account.id);
  }, []);

  const refreshAccounts = useCallback(async () => {
    const accountList = await fetchAccounts();
    // Update current account if it still exists
    if (currentAccount) {
      const updated = accountList.find((acc: Account) => acc.id === currentAccount.id);
      if (updated) {
        setCurrentAccountState(updated);
      } else if (accountList.length > 0) {
        setCurrentAccount(accountList[0]);
      }
    }
  }, [fetchAccounts, currentAccount, setCurrentAccount]);

  const createAccount = useCallback(async (name: string): Promise<Account> => {
    const response = await fetch(`${API_BASE}/_config/accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `name=${encodeURIComponent(name)}`,
    });

    if (!response.ok) {
      throw new Error('Failed to create account');
    }

    const newAccount = await response.json();
    await refreshAccounts();
    return newAccount;
  }, [refreshAccounts]);

  const updateAccount = useCallback(async (id: string, name: string): Promise<Account> => {
    const response = await fetch(`${API_BASE}/_config/accounts/${id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `name=${encodeURIComponent(name)}`,
    });

    if (!response.ok) {
      throw new Error('Failed to update account');
    }

    const updatedAccount = await response.json();
    await refreshAccounts();
    return updatedAccount;
  }, [refreshAccounts]);

  const deleteAccount = useCallback(async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/_config/accounts/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error?.message || 'Failed to delete account');
    }

    await refreshAccounts();
  }, [refreshAccounts]);

  const regenerateKeys = useCallback(async (id: string): Promise<Account> => {
    const response = await fetch(`${API_BASE}/_config/accounts/${id}/regenerate-keys`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('Failed to regenerate keys');
    }

    const updatedAccount = await response.json();
    await refreshAccounts();
    return updatedAccount;
  }, [refreshAccounts]);

  return (
    <AccountContext.Provider
      value={{
        accounts,
        currentAccount,
        setCurrentAccount,
        refreshAccounts,
        createAccount,
        updateAccount,
        deleteAccount,
        regenerateKeys,
        isLoading,
        error,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
};
