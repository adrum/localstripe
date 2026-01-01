import { useState } from 'react';
import { useAccount, Account } from '@/contexts/AccountContext';

export default function Accounts() {
  const {
    accounts,
    currentAccount,
    setCurrentAccount,
    createAccount,
    updateAccount,
    deleteAccount,
    regenerateKeys,
    isLoading,
  } = useAccount();

  const [isCreating, setIsCreating] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmRegenerate, setConfirmRegenerate] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleCreateAccount = async () => {
    if (!newAccountName.trim()) return;

    try {
      setActionError(null);
      await createAccount(newAccountName.trim());
      setNewAccountName('');
      setIsCreating(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to create account');
    }
  };

  const handleUpdateAccount = async (id: string) => {
    if (!editingName.trim()) return;

    try {
      setActionError(null);
      await updateAccount(id, editingName.trim());
      setEditingId(null);
      setEditingName('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update account');
    }
  };

  const handleDeleteAccount = async (id: string) => {
    try {
      setActionError(null);
      await deleteAccount(id);
      setConfirmDelete(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete account');
    }
  };

  const handleRegenerateKeys = async (id: string) => {
    try {
      setActionError(null);
      await regenerateKeys(id);
      setConfirmRegenerate(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to regenerate keys');
    }
  };

  const copyToClipboard = async (text: string, keyId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(keyId);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {actionError && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center">
            <i className="fas fa-exclamation-circle text-red-500 mr-2"></i>
            <span className="text-red-700 dark:text-red-400">{actionError}</span>
            <button
              onClick={() => setActionError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage your LocalStripe accounts. Each account has its own API keys for isolated testing.
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center"
        >
          <i className="fas fa-plus mr-2"></i>
          New Account
        </button>
      </div>

      {/* Create Account Form */}
      {isCreating && (
        <div className="mb-6 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create New Account</h3>
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Account name"
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateAccount()}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              autoFocus
            />
            <button
              onClick={handleCreateAccount}
              disabled={!newAccountName.trim()}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create
            </button>
            <button
              onClick={() => {
                setIsCreating(false);
                setNewAccountName('');
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Account List */}
      <div className="space-y-4">
        {accounts.map((account) => (
          <AccountCard
            key={account.id}
            account={account}
            isCurrentAccount={currentAccount?.id === account.id}
            isEditing={editingId === account.id}
            editingName={editingName}
            setEditingName={setEditingName}
            copiedKey={copiedKey}
            confirmDelete={confirmDelete}
            confirmRegenerate={confirmRegenerate}
            onSetCurrent={() => setCurrentAccount(account)}
            onStartEdit={() => {
              setEditingId(account.id);
              setEditingName(account.name);
            }}
            onCancelEdit={() => {
              setEditingId(null);
              setEditingName('');
            }}
            onSaveEdit={() => handleUpdateAccount(account.id)}
            onCopyKey={copyToClipboard}
            onConfirmDelete={() => setConfirmDelete(account.id)}
            onCancelDelete={() => setConfirmDelete(null)}
            onDelete={() => handleDeleteAccount(account.id)}
            onConfirmRegenerate={() => setConfirmRegenerate(account.id)}
            onCancelRegenerate={() => setConfirmRegenerate(null)}
            onRegenerate={() => handleRegenerateKeys(account.id)}
            formatDate={formatDate}
            canDelete={accounts.length > 1}
          />
        ))}
      </div>

      {accounts.length === 0 && (
        <div className="text-center py-12">
          <i className="fas fa-users text-4xl text-gray-400 dark:text-gray-500 mb-4"></i>
          <p className="text-gray-600 dark:text-gray-400">No accounts found. Create one to get started.</p>
        </div>
      )}
    </div>
  );
}

interface AccountCardProps {
  account: Account;
  isCurrentAccount: boolean;
  isEditing: boolean;
  editingName: string;
  setEditingName: (name: string) => void;
  copiedKey: string | null;
  confirmDelete: string | null;
  confirmRegenerate: string | null;
  onSetCurrent: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onCopyKey: (text: string, keyId: string) => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
  onConfirmRegenerate: () => void;
  onCancelRegenerate: () => void;
  onRegenerate: () => void;
  formatDate: (timestamp: number) => string;
  canDelete: boolean;
}

function AccountCard({
  account,
  isCurrentAccount,
  isEditing,
  editingName,
  setEditingName,
  copiedKey,
  confirmDelete,
  confirmRegenerate,
  onSetCurrent,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onCopyKey,
  onConfirmDelete,
  onCancelDelete,
  onDelete,
  onConfirmRegenerate,
  onCancelRegenerate,
  onRegenerate,
  formatDate,
  canDelete,
}: AccountCardProps) {
  const [showSecretKey, setShowSecretKey] = useState(false);

  return (
    <div
      className={`bg-white dark:bg-gray-800 border rounded-lg shadow-sm overflow-hidden ${
        isCurrentAccount
          ? 'border-purple-300 dark:border-purple-700 ring-2 ring-purple-100 dark:ring-purple-900/30'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg font-bold">
                {account.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="ml-3">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onSaveEdit();
                      if (e.key === 'Escape') onCancelEdit();
                    }}
                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    autoFocus
                  />
                  <button
                    onClick={onSaveEdit}
                    className="p-1 text-green-600 hover:text-green-700"
                  >
                    <i className="fas fa-check"></i>
                  </button>
                  <button
                    onClick={onCancelEdit}
                    className="p-1 text-gray-500 hover:text-gray-700"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    {account.name}
                    <button
                      onClick={onStartEdit}
                      className="ml-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <i className="fas fa-pencil-alt text-xs"></i>
                    </button>
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Created {formatDate(account.created)}
                  </p>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isCurrentAccount ? (
              <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-sm font-medium rounded-full">
                Active
              </span>
            ) : (
              <button
                onClick={onSetCurrent}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Set Active
              </button>
            )}
          </div>
        </div>

        {/* API Keys */}
        <div className="space-y-3">
          {/* Public Key */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Public Key</p>
              <code className="text-sm text-gray-900 dark:text-white font-mono truncate block">
                {account.public_key}
              </code>
            </div>
            <button
              onClick={() => onCopyKey(account.public_key, `pk-${account.id}`)}
              className="ml-3 p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              title="Copy public key"
            >
              {copiedKey === `pk-${account.id}` ? (
                <i className="fas fa-check text-green-500"></i>
              ) : (
                <i className="fas fa-copy"></i>
              )}
            </button>
          </div>

          {/* Secret Key */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Secret Key</p>
              <div className="flex items-center">
                <code className="text-sm text-gray-900 dark:text-white font-mono truncate block">
                  {showSecretKey ? account.secret_key : account.secret_key.substring(0, 12) + '...' + account.secret_key.slice(-4)}
                </code>
                <button
                  onClick={() => setShowSecretKey(!showSecretKey)}
                  className="ml-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  title={showSecretKey ? 'Hide secret key' : 'Show secret key'}
                >
                  <i className={`fas ${showSecretKey ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                </button>
              </div>
            </div>
            <button
              onClick={() => onCopyKey(account.secret_key, `sk-${account.id}`)}
              className="ml-3 p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              title="Copy secret key"
            >
              {copiedKey === `sk-${account.id}` ? (
                <i className="fas fa-check text-green-500"></i>
              ) : (
                <i className="fas fa-copy"></i>
              )}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          {confirmRegenerate === account.id ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-amber-600 dark:text-amber-400">Regenerate keys?</span>
              <button
                onClick={onRegenerate}
                className="px-3 py-1 bg-amber-600 text-white text-sm rounded hover:bg-amber-700 transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={onCancelRegenerate}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : confirmDelete === account.id ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-red-600 dark:text-red-400">Delete this account?</span>
              <button
                onClick={onDelete}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={onCancelDelete}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={onConfirmRegenerate}
                className="px-3 py-1 text-amber-600 dark:text-amber-400 text-sm hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded transition-colors"
                title="Regenerate API keys"
              >
                <i className="fas fa-sync-alt mr-1"></i>
                Regenerate Keys
              </button>
              {canDelete && (
                <button
                  onClick={onConfirmDelete}
                  className="px-3 py-1 text-red-600 dark:text-red-400 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  title="Delete account"
                >
                  <i className="fas fa-trash mr-1"></i>
                  Delete
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
