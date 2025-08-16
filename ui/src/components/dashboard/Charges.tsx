import { useState } from 'react';
import Card, { CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { FormField, Input, Select } from '@/components/ui/FormField';
import { useCharges, useCreateCharge } from '@/hooks/useAPI';
import type { Charge } from '@/types/stripe';

export default function Charges() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [apiError, setApiError] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [newCharge, setNewCharge] = useState({
    amount: '',
    currency: 'usd',
    customer: '',
    description: '',
    source: 'tok_visa', // Default test token
  });

  // TanStack Query hooks
  const { data: chargesData, isLoading, refetch } = useCharges();
  const createChargeMutation = useCreateCharge();
  
  const charges: Charge[] = chargesData?.data || [];

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!newCharge.amount.trim()) {
      errors.amount = 'Amount is required';
    } else {
      const amount = parseFloat(newCharge.amount);
      if (isNaN(amount) || amount <= 0) {
        errors.amount = 'Amount must be a positive number';
      } else if (amount < 0.50) {
        errors.amount = 'Amount must be at least $0.50';
      } else if (amount > 99999999.99) {
        errors.amount = 'Amount cannot exceed $99,999,999.99';
      }
    }
    
    if (!newCharge.source.trim()) {
      errors.source = 'Payment source is required';
    }
    
    if (newCharge.description && newCharge.description.trim().length > 1000) {
      errors.description = 'Description must be less than 1000 characters';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const createCharge = async () => {
    setApiError('');
    setValidationErrors({});
    
    if (!validateForm()) {
      return;
    }
    
    try {
      const chargeData = {
        ...newCharge,
        amount: Math.round(parseFloat(newCharge.amount) * 100), // Convert to cents
      };
      
      // Remove empty fields
      if (!chargeData.customer.trim()) {
        delete (chargeData as any).customer;
      }
      if (!chargeData.description.trim()) {
        delete (chargeData as any).description;
      }
      
      await createChargeMutation.mutateAsync(chargeData);
      resetForm();
      setShowCreateForm(false);
    } catch (error: any) {
      console.error('Failed to create charge:', error);
      setApiError(
        error?.message || 
        'Failed to create charge. Please check your input and try again.'
      );
    }
  };

  const resetForm = () => {
    setNewCharge({
      amount: '',
      currency: 'usd',
      customer: '',
      description: '',
      source: 'tok_visa',
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
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Charges</h1>
          <p className="text-sm text-gray-600 mt-1">
            Monitor charges and payment activity
          </p>
        </div>
        <Button onClick={handleFormToggle}>
          {showCreateForm ? 'Cancel' : '+ New Charge'}
        </Button>
      </div>

      {/* Create Charge Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Charge</CardTitle>
            <CardDescription>Create a new charge for immediate payment processing</CardDescription>
          </CardHeader>
          <div className="space-y-4">
            {/* API Error Display */}
            {apiError && (
              <Alert variant="error" title="Error">
                {apiError}
              </Alert>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField 
                label="Amount (USD)" 
                required 
                error={validationErrors.amount}
              >
                <Input
                  type="number"
                  value={newCharge.amount}
                  onChange={(e) => setNewCharge(prev => ({ ...prev, amount: e.target.value }))}
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
                  value={newCharge.currency}
                  onChange={(e) => setNewCharge(prev => ({ ...prev, currency: e.target.value }))}
                >
                  <option value="usd">USD</option>
                  <option value="eur">EUR</option>
                  <option value="gbp">GBP</option>
                  <option value="cad">CAD</option>
                </Select>
              </FormField>
              
              <FormField 
                label="Payment Source" 
                required 
                error={validationErrors.source}
              >
                <Select
                  value={newCharge.source}
                  onChange={(e) => setNewCharge(prev => ({ ...prev, source: e.target.value }))}
                  error={!!validationErrors.source}
                >
                  <option value="tok_visa">Test Visa Token</option>
                  <option value="tok_mastercard">Test Mastercard Token</option>
                  <option value="tok_amex">Test Amex Token</option>
                  <option value="tok_discover">Test Discover Token</option>
                  <option value="tok_chargeDeclined">Test Declined Card</option>
                </Select>
              </FormField>
            </div>
            
            <FormField 
              label="Customer ID (optional)"
            >
              <Input
                type="text"
                value={newCharge.customer}
                onChange={(e) => setNewCharge(prev => ({ ...prev, customer: e.target.value }))}
                placeholder="cus_1234567890"
              />
            </FormField>
            
            <FormField 
              label="Description (optional)" 
              error={validationErrors.description}
            >
              <Input
                type="text"
                value={newCharge.description}
                onChange={(e) => setNewCharge(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Charge for order #1234"
                error={!!validationErrors.description}
              />
            </FormField>
            
            <div className="flex space-x-3">
              <Button onClick={createCharge} loading={createChargeMutation.isPending}>
                Create Charge
              </Button>
              <Button variant="outline" onClick={handleFormToggle}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Charges List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Charges</CardTitle>
              <CardDescription>
                {isLoading ? 'Loading...' : `${charges.length} charge${charges.length !== 1 ? 's' : ''} total`}
              </CardDescription>
            </div>
            <Button variant="outline" onClick={() => refetch()} loading={isLoading}>
              Refresh
            </Button>
          </div>
        </CardHeader>
        
        {isLoading ? (
          <div className="py-8 text-center text-gray-500">Loading charges...</div>
        ) : charges.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <div className="mb-4">⚡</div>
            <p>No charges found</p>
            <p className="text-sm mt-1">Create your first charge to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Charge</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Customer</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Refunded</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Created</th>
                </tr>
              </thead>
              <tbody>
                {charges.map((charge) => (
                  <tr key={charge.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-mono text-sm text-gray-900">{charge.id}</div>
                        {charge.description && (
                          <div className="text-sm text-gray-500">{charge.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {formatAmount(charge.amount, charge.currency)}
                    </td>
                    <td className="py-3 px-4">
                      {charge.customer ? (
                        <div className="font-mono text-sm text-gray-600">{charge.customer}</div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(charge.status)}`}>
                        {charge.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {charge.refunded ? (
                        <div className="text-sm">
                          <span className="text-red-600">
                            {formatAmount(charge.amount_refunded, charge.currency)}
                          </span>
                          {charge.amount_refunded < charge.amount && (
                            <span className="text-gray-500 ml-1">(Partial)</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {formatDate(charge.created)}
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