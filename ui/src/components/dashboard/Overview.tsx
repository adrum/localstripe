import { useState, useMemo } from 'react';
import Card, { CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { useCustomers, useSubscriptions, useCharges, useHealthCheck, useFlushData } from '@/hooks/useAPI';

interface OverviewStats {
  customers: number;
  subscriptions: number;
  charges: number;
  revenue: number;
}

export default function Overview() {
  const [apiError, setApiError] = useState<string>('');

  // TanStack Query hooks
  const { data: healthData, isLoading: isHealthLoading } = useHealthCheck();
  const { data: customersData, isLoading: isCustomersLoading } = useCustomers();
  const { data: subscriptionsData, isLoading: isSubscriptionsLoading } = useSubscriptions();
  const { data: chargesData, isLoading: isChargesLoading } = useCharges();
  const flushDataMutation = useFlushData();

  const isConnected = healthData?.status === 'connected';
  const isLoading = isHealthLoading || isCustomersLoading || isSubscriptionsLoading || isChargesLoading;

  // Calculate stats from data
  const stats = useMemo(() => {
    const customers = customersData?.data?.length || 0;
    const subscriptions = subscriptionsData?.data?.length || 0;
    const charges = chargesData?.data?.length || 0;
    
    // Calculate revenue from charges
    const chargesArray = chargesData?.data || [];
    const revenue = chargesArray.reduce((sum: number, charge: any) => 
      sum + (charge.paid ? charge.amount / 100 : 0), 0) || 0;

    return {
      customers,
      subscriptions,
      charges,
      revenue,
    };
  }, [customersData, subscriptionsData, chargesData]);

  const flushData = async () => {
    if (!confirm('Are you sure you want to flush all data? This action cannot be undone.')) {
      return;
    }

    setApiError('');
    try {
      await flushDataMutation.mutateAsync();
      // Data will automatically refresh due to query invalidation in the hook
    } catch (error: any) {
      console.error('Failed to flush data:', error);
      setApiError(
        error?.message || 
        'Failed to flush data. Please try again.'
      );
    }
  };

  if (!isConnected && !isLoading) {
    return (
      <div className="p-6">
        <Card className="text-center">
          <div className="py-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔌</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              LocalStripe Server Not Connected
            </h3>
            <p className="text-gray-600 mb-4">
              Make sure the LocalStripe server is running on port 8420
            </p>
            <Button onClick={() => window.location.reload()}>
              Retry Connection
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* API Error Display */}
      {apiError && (
        <Alert variant="error" title="API Error">
          {apiError}
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Customers</p>
              <p className="text-2xl font-bold text-gray-900">
                {isLoading ? '—' : stats.customers.toLocaleString()}
              </p>
            </div>
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600">👥</span>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Subscriptions</p>
              <p className="text-2xl font-bold text-gray-900">
                {isLoading ? '—' : stats.subscriptions.toLocaleString()}
              </p>
            </div>
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-purple-600">🔄</span>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Charges</p>
              <p className="text-2xl font-bold text-gray-900">
                {isLoading ? '—' : stats.charges.toLocaleString()}
              </p>
            </div>
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600">⚡</span>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                {isLoading ? '—' : `$${stats.revenue.toFixed(2)}`}
              </p>
            </div>
            <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
              <span className="text-yellow-600">💰</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common development and testing actions for your LocalStripe server
          </CardDescription>
        </CardHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button variant="outline" onClick={() => window.location.reload()} loading={isLoading}>
            🔄 Refresh Data
          </Button>
          <Button variant="danger" onClick={flushData} loading={flushDataMutation.isPending}>
            🗑️ Flush All Data
          </Button>
          <Button variant="secondary" onClick={() => window.open('http://localhost:8420/v1/customers', '_blank')}>
            🔗 Open API
          </Button>
        </div>
      </Card>

      {/* Server Status */}
      <Card>
        <CardHeader>
          <CardTitle>Server Status</CardTitle>
          <CardDescription>
            LocalStripe mock server connection and configuration
          </CardDescription>
        </CardHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Status</span>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span className="text-sm text-gray-900">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Endpoint</span>
            <span className="text-sm text-gray-900 font-mono">http://localhost:8420</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">API Version</span>
            <span className="text-sm text-gray-900">v1</span>
          </div>
        </div>
      </Card>
    </div>
  );
}