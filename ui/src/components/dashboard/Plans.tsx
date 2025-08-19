import { useState } from 'react';
import Card, { CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { FormField, Input, Select } from '@/components/ui/FormField';
import { usePlans, useCreatePlan } from '@/hooks/useAPI';
import type { Plan } from '@/types/stripe';

export default function Plans() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [apiError, setApiError] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [newPlan, setNewPlan] = useState({
    id: '',
    name: '',
    amount: '',
    currency: 'usd',
    interval: 'month' as 'day' | 'week' | 'month' | 'year',
    interval_count: '1',
  });

  // TanStack Query hooks
  const { data: plansData, isLoading, refetch } = usePlans();
  const createPlanMutation = useCreatePlan();
  
  const plans: Plan[] = plansData?.data || [];

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!newPlan.id.trim()) {
      errors.id = 'Plan ID is required';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(newPlan.id)) {
      errors.id = 'Plan ID can only contain letters, numbers, hyphens, and underscores';
    } else if (plans.some(plan => plan.id === newPlan.id)) {
      errors.id = 'Plan ID already exists';
    }
    
    if (!newPlan.name.trim()) {
      errors.name = 'Plan name is required';
    } else if (newPlan.name.trim().length < 2) {
      errors.name = 'Plan name must be at least 2 characters long';
    }
    
    if (!newPlan.amount.trim()) {
      errors.amount = 'Amount is required';
    } else {
      const amount = parseFloat(newPlan.amount);
      if (isNaN(amount) || amount <= 0) {
        errors.amount = 'Amount must be a positive number';
      } else if (amount > 99999999.99) {
        errors.amount = 'Amount cannot exceed $99,999,999.99';
      }
    }
    
    const intervalCount = parseInt(newPlan.interval_count);
    if (isNaN(intervalCount) || intervalCount < 1 || intervalCount > 365) {
      errors.interval_count = 'Interval count must be between 1 and 365';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const createPlan = async () => {
    setApiError('');
    setValidationErrors({});
    
    if (!validateForm()) {
      return;
    }
    
    try {
      const planData = {
        ...newPlan,
        amount: Math.round(parseFloat(newPlan.amount) * 100), // Convert to cents
        interval_count: parseInt(newPlan.interval_count),
      };
      await createPlanMutation.mutateAsync(planData);
      resetForm();
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create plan:', error);
      setApiError(
        (error as Error)?.message || 
        'Failed to create plan. Please check your input and try again.'
      );
    }
  };

  const resetForm = () => {
    setNewPlan({
      id: '',
      name: '',
      amount: '',
      currency: 'usd',
      interval: 'month',
      interval_count: '1',
    });
    setValidationErrors({});
    setApiError('');
  };

  const handleFormToggle = () => {
    if (showCreateForm) {
      resetForm();
    }
    setShowCreateForm(!showCreateForm);
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
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Plans</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage subscription plans and pricing
          </p>
        </div>
        <Button onClick={handleFormToggle}>
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
            {/* API Error Display */}
            {apiError && (
              <Alert variant="error" title="Error">
                {apiError}
              </Alert>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField 
                label="Plan ID" 
                required 
                error={validationErrors.id}
              >
                <Input
                  type="text"
                  value={newPlan.id}
                  onChange={(e) => setNewPlan(prev => ({ ...prev, id: e.target.value }))}
                  placeholder="pro-monthly"
                  error={!!validationErrors.id}
                />
              </FormField>
              
              <FormField 
                label="Plan Name" 
                required 
                error={validationErrors.name}
              >
                <Input
                  type="text"
                  value={newPlan.name}
                  onChange={(e) => setNewPlan(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Pro Monthly"
                  error={!!validationErrors.name}
                />
              </FormField>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField 
                label="Amount (USD)" 
                required 
                error={validationErrors.amount}
              >
                <Input
                  type="number"
                  value={newPlan.amount}
                  onChange={(e) => setNewPlan(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="9.99"
                  step="0.01"
                  min="0"
                  error={!!validationErrors.amount}
                />
              </FormField>
              
              <FormField 
                label="Interval"
              >
                <Select
                  value={newPlan.interval}
                  onChange={(e) => setNewPlan(prev => ({ ...prev, interval: e.target.value as 'day' | 'week' | 'month' | 'year' }))}
                >
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                </Select>
              </FormField>
              
              <FormField 
                label="Interval Count" 
                error={validationErrors.interval_count}
              >
                <Input
                  type="number"
                  value={newPlan.interval_count}
                  onChange={(e) => setNewPlan(prev => ({ ...prev, interval_count: e.target.value }))}
                  min="1"
                  max="365"
                  error={!!validationErrors.interval_count}
                />
              </FormField>
            </div>
            
            <div className="flex space-x-3">
              <Button onClick={createPlan} loading={createPlanMutation.isPending}>
                Create Plan
              </Button>
              <Button variant="outline" onClick={handleFormToggle}>
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
            <Button variant="outline" onClick={() => refetch()} loading={isLoading}>
              Refresh
            </Button>
          </div>
        </CardHeader>
        
        {isLoading ? (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">Loading plans...</div>
        ) : plans.length === 0 ? (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">
            <div className="mb-4"><i className="fas fa-clipboard-list text-4xl text-gray-400 dark:text-gray-500"></i></div>
            <p>No plans found</p>
            <p className="text-sm mt-1">Create your first plan to start offering subscriptions</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Plan</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Interval</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Created</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr key={plan.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{plan.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">{plan.id}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">
                      {formatAmount(plan.amount, plan.currency)}
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                      Every {plan.interval_count > 1 ? `${plan.interval_count} ` : ''}{plan.interval}{plan.interval_count > 1 ? 's' : ''}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        plan.active ? 'text-green-600 bg-green-100 dark:text-green-200 dark:bg-green-900' : 'text-gray-600 bg-gray-100 dark:text-gray-200 dark:bg-gray-700'
                      }`}>
                        {plan.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
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