import { useEffect, useState } from 'react';
import Card, { CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import api from '@/utils/api';
import type { Plan } from '@/types/stripe';

export default function Plans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPlan, setNewPlan] = useState({
    id: '',
    name: '',
    amount: '',
    currency: 'usd',
    interval: 'month' as 'day' | 'week' | 'month' | 'year',
    interval_count: '1',
  });

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setIsLoading(true);
    try {
      const response = await api.getPlans();
      setPlans((response as any)?.data || []);
    } catch (error) {
      console.error('Failed to load plans:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createPlan = async () => {
    if (!newPlan.id || !newPlan.name || !newPlan.amount) return;
    
    setIsCreating(true);
    try {
      const planData = {
        ...newPlan,
        amount: parseInt(newPlan.amount) * 100, // Convert to cents
        interval_count: parseInt(newPlan.interval_count),
      };
      await api.createPlan(planData);
      setNewPlan({
        id: '',
        name: '',
        amount: '',
        currency: 'usd',
        interval: 'month',
        interval_count: '1',
      });
      setShowCreateForm(false);
      await loadPlans();
    } catch (error) {
      console.error('Failed to create plan:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Plans</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage subscription plans and pricing
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? 'Cancel' : '+ New Plan'}
        </Button>
      </div>

      {/* Create Plan Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Plan</CardTitle>
            <CardDescription>Add a new subscription plan</CardDescription>
          </CardHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plan ID *
                </label>
                <input
                  type="text"
                  required
                  value={newPlan.id}
                  onChange={(e) => setNewPlan(prev => ({ ...prev, id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="pro-monthly"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plan Name *
                </label>
                <input
                  type="text"
                  required
                  value={newPlan.name}
                  onChange={(e) => setNewPlan(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Pro Monthly"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (USD) *
                </label>
                <input
                  type="number"
                  required
                  value={newPlan.amount}
                  onChange={(e) => setNewPlan(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="9.99"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Interval
                </label>
                <select
                  value={newPlan.interval}
                  onChange={(e) => setNewPlan(prev => ({ ...prev, interval: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Interval Count
                </label>
                <input
                  type="number"
                  value={newPlan.interval_count}
                  onChange={(e) => setNewPlan(prev => ({ ...prev, interval_count: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  min="1"
                />
              </div>
            </div>
            
            <div className="flex space-x-3">
              <Button onClick={createPlan} loading={isCreating}>
                Create Plan
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Plans List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Plans</CardTitle>
              <CardDescription>
                {isLoading ? 'Loading...' : `${plans.length} plan${plans.length !== 1 ? 's' : ''} total`}
              </CardDescription>
            </div>
            <Button variant="outline" onClick={loadPlans} loading={isLoading}>
              Refresh
            </Button>
          </div>
        </CardHeader>
        
        {isLoading ? (
          <div className="py-8 text-center text-gray-500">Loading plans...</div>
        ) : plans.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <div className="mb-4">📋</div>
            <p>No plans found</p>
            <p className="text-sm mt-1">Create your first plan to start offering subscriptions</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Plan</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Interval</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Created</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr key={plan.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-gray-900">{plan.name}</div>
                        <div className="text-sm text-gray-500 font-mono">{plan.id}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {formatAmount(plan.amount, plan.currency)}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      Every {plan.interval_count > 1 ? `${plan.interval_count} ` : ''}{plan.interval}{plan.interval_count > 1 ? 's' : ''}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        plan.active ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100'
                      }`}>
                        {plan.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {formatDate(plan.created)}
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