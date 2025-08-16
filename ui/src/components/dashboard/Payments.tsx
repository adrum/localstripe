import { useState } from 'react';
import Card, { CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { FormField, Input, Select } from '@/components/ui/FormField';
import { usePaymentIntents, useCreatePaymentIntent } from '@/hooks/useAPI';
import type { PaymentIntent } from '@/types/stripe';

export default function Payments() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [apiError, setApiError] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [newPaymentIntent, setNewPaymentIntent] = useState({
    amount: '',
    currency: 'usd',
    customer: '',
    description: '',
  });

  // TanStack Query hooks
  const { data: paymentIntentsData, isLoading, refetch } = usePaymentIntents();
  const createPaymentIntentMutation = useCreatePaymentIntent();
  
  const paymentIntents: PaymentIntent[] = paymentIntentsData?.data || [];

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!newPaymentIntent.amount.trim()) {
      errors.amount = 'Amount is required';
    } else {
      const amount = parseFloat(newPaymentIntent.amount);
      if (isNaN(amount) || amount <= 0) {
        errors.amount = 'Amount must be a positive number';
      } else if (amount < 0.50) {
        errors.amount = 'Amount must be at least $0.50';
      } else if (amount > 99999999.99) {
        errors.amount = 'Amount cannot exceed $99,999,999.99';
      }
    }
    
    if (newPaymentIntent.description && newPaymentIntent.description.trim().length > 1000) {
      errors.description = 'Description must be less than 1000 characters';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const createPaymentIntent = async () => {
    setApiError('');
    setValidationErrors({});
    
    if (!validateForm()) {
      return;
    }
    
    try {
      const paymentData = {
        ...newPaymentIntent,
        amount: Math.round(parseFloat(newPaymentIntent.amount) * 100), // Convert to cents
      };
      
      // Remove empty fields
      if (!paymentData.customer.trim()) {
        delete (paymentData as any).customer;
      }
      if (!paymentData.description.trim()) {
        delete (paymentData as any).description;
      }
      
      await createPaymentIntentMutation.mutateAsync(paymentData);
      resetForm();
      setShowCreateForm(false);
    } catch (error: any) {
      console.error('Failed to create payment intent:', error);
      setApiError(
        error?.message || 
        'Failed to create payment intent. Please check your input and try again.'
      );
    }
  };

  const resetForm = () => {
    setNewPaymentIntent({
      amount: '',
      currency: 'usd',
      customer: '',
      description: '',
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
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'text-green-600 bg-green-100';
      case 'canceled':
        return 'text-red-600 bg-red-100';
      case 'processing':
        return 'text-blue-600 bg-blue-100';
      case 'requires_payment_method':
      case 'requires_confirmation':
      case 'requires_action':
        return 'text-yellow-600 bg-yellow-100';
      case 'requires_capture':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Payment Intents</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage payment intents and track payment flow
          </p>
        </div>
        <Button onClick={handleFormToggle}>
          {showCreateForm ? 'Cancel' : '+ New Payment Intent'}
        </Button>
      </div>

      {/* Create Payment Intent Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Payment Intent</CardTitle>
            <CardDescription>Create a new payment intent for processing</CardDescription>
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
                label="Amount (USD)" 
                required 
                error={validationErrors.amount}
              >
                <Input
                  type="number"
                  value={newPaymentIntent.amount}
                  onChange={(e) => setNewPaymentIntent(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="10.00"
                  step="0.01"
                  min="0.50"
                  error={!!validationErrors.amount}
                />
              </FormField>
              
              <FormField 
                label="Currency"
              >
                <Select
                  value={newPaymentIntent.currency}
                  onChange={(e) => setNewPaymentIntent(prev => ({ ...prev, currency: e.target.value }))}
                >
                  <option value="usd">USD</option>
                  <option value="eur">EUR</option>
                  <option value="gbp">GBP</option>
                  <option value="cad">CAD</option>
                </Select>
              </FormField>
            </div>
            
            <FormField 
              label="Customer ID (optional)"
            >
              <Input
                type="text"
                value={newPaymentIntent.customer}
                onChange={(e) => setNewPaymentIntent(prev => ({ ...prev, customer: e.target.value }))}
                placeholder="cus_1234567890"
              />
            </FormField>
            
            <FormField 
              label="Description (optional)" 
              error={validationErrors.description}
            >
              <Input
                type="text"
                value={newPaymentIntent.description}
                onChange={(e) => setNewPaymentIntent(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Payment for order #1234"
                error={!!validationErrors.description}
              />
            </FormField>
            
            <div className="flex space-x-3">
              <Button onClick={createPaymentIntent} loading={createPaymentIntentMutation.isPending}>
                Create Payment Intent
              </Button>
              <Button variant="outline" onClick={handleFormToggle}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Payment Intents List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Payment Intents</CardTitle>
              <CardDescription>
                {isLoading ? 'Loading...' : `${paymentIntents.length} payment intent${paymentIntents.length !== 1 ? 's' : ''} total`}
              </CardDescription>
            </div>
            <Button variant="outline" onClick={() => refetch()} loading={isLoading}>
              Refresh
            </Button>
          </div>
        </CardHeader>
        
        {isLoading ? (
          <div className="py-8 text-center text-gray-500">Loading payment intents...</div>
        ) : paymentIntents.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <div className="mb-4">💳</div>
            <p>No payment intents found</p>
            <p className="text-sm mt-1">Create your first payment intent to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Payment Intent</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Customer</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Created</th>
                </tr>
              </thead>
              <tbody>
                {paymentIntents.map((payment) => (
                  <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-mono text-sm text-gray-900">{payment.id}</div>
                        {payment.description && (
                          <div className="text-sm text-gray-500">{payment.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {formatAmount(payment.amount, payment.currency)}
                    </td>
                    <td className="py-3 px-4">
                      {payment.customer ? (
                        <div className="font-mono text-sm text-gray-600">{payment.customer}</div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                        {payment.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {formatDate(payment.created)}
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