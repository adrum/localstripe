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
        return 'text-green-600 bg-green-100';
      case 'canceled':
        return 'text-red-600 bg-red-100';
      case 'past_due':
        return 'text-yellow-600 bg-yellow-100';
      case 'trialing':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Subscriptions</h1>
          <p className="text-sm text-gray-600 mt-1">
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
          <div className="py-8 text-center text-gray-500">Loading subscriptions...</div>
        ) : subscriptions.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <div className="mb-4">🔄</div>
            <p>No subscriptions found</p>
            <p className="text-sm mt-1">Subscriptions will appear here when customers subscribe to plans</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Subscription</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Customer</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Current Period</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Created</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((subscription) => (
                  <tr key={subscription.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-mono text-sm text-gray-900">{subscription.id}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono text-sm text-gray-600">{subscription.customer}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(subscription.status)}`}>
                        {subscription.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-sm">
                      {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
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