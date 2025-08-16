import { useEffect, useState } from 'react';
import Card, { CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import api from '@/utils/api';

interface OverviewStats {
  customers: number;
  subscriptions: number;
  charges: number;
  revenue: number;
}

export default function Overview() {
  const [stats, setStats] = useState<OverviewStats>({
    customers: 0,
    subscriptions: 0,
    charges: 0,
    revenue: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      // Check connection first
      const health = await api.healthCheck();
      setIsConnected(health.status === 'connected');

      if (health.status === 'connected') {
        // Load data in parallel
        const [customers, subscriptions, charges] = await Promise.all([
          api.getCustomers().catch(() => ({ data: [] })),
          api.getSubscriptions().catch(() => ({ data: [] })),
          api.getCharges().catch(() => ({ data: [] })),
        ]);

        // Calculate revenue from charges
        const chargesData = (charges as any)?.data || [];
        const revenue = chargesData.reduce((sum: number, charge: any) => 
          sum + (charge.paid ? charge.amount / 100 : 0), 0) || 0;

        setStats({
          customers: (customers as any)?.data?.length || 0,
          subscriptions: (subscriptions as any)?.data?.length || 0,
          charges: chargesData.length || 0,
          revenue,
        });
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const flushData = async () => {
    if (!confirm('Are you sure you want to flush all data? This action cannot be undone.')) {
      return;
    }

    try {
      await api.flushData();
      await loadStats(); // Reload stats after flushing
    } catch (error) {
      console.error('Failed to flush data:', error);
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
            <Button onClick={loadStats}>
              Retry Connection
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
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
          <Button variant="outline" onClick={loadStats} loading={isLoading}>
            🔄 Refresh Data
          </Button>
          <Button variant="danger" onClick={flushData}>
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