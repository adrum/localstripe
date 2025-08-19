import Card, { CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useSubscriptions } from '@/hooks/useAPI';
import type { Subscription } from '@/types/stripe';

export default function Subscriptions() {
  // TanStack Query hooks
  const { data: subscriptionsData, isLoading, refetch } = useSubscriptions();
  
  const subscriptions: Subscription[] = subscriptionsData?.data || [];

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100 dark:text-green-200 dark:bg-green-900';
      case 'canceled':
        return 'text-red-600 bg-red-100 dark:text-red-200 dark:bg-red-900';
      case 'past_due':
        return 'text-yellow-600 bg-yellow-100 dark:text-yellow-200 dark:bg-yellow-900';
      case 'trialing':
        return 'text-blue-600 bg-blue-100 dark:text-blue-200 dark:bg-blue-900';
      default:
        return 'text-gray-600 bg-gray-100 dark:text-gray-200 dark:bg-gray-700';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Subscriptions</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Monitor active and past subscriptions
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} loading={isLoading}>
          Refresh
        </Button>
      </div>

      {/* Subscriptions List */}
      <Card>
        <CardHeader>
          <CardTitle>All Subscriptions</CardTitle>
          <CardDescription>
            {isLoading ? 'Loading...' : `${subscriptions.length} subscription${subscriptions.length !== 1 ? 's' : ''} total`}
          </CardDescription>
        </CardHeader>
        
        {isLoading ? (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">Loading subscriptions...</div>
        ) : subscriptions.length === 0 ? (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">
            <div className="mb-4"><i className="fas fa-sync-alt text-4xl text-gray-400 dark:text-gray-500"></i></div>
            <p>No subscriptions found</p>
            <p className="text-sm mt-1">Subscriptions will appear here when customers subscribe to plans</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Subscription</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Customer</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Current Period</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Created</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((subscription) => (
                  <tr key={subscription.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="py-3 px-4">
                      <div className="font-mono text-sm text-gray-900 dark:text-white">{subscription.id}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono text-sm text-gray-600 dark:text-gray-400">{subscription.customer}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(subscription.status)}`}>
                        {subscription.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400 text-sm">
                      {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                      {formatDate(subscription.created)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}