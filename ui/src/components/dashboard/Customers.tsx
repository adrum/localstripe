import { useEffect, useState } from 'react';
import Card, { CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { FormField, Input, Textarea } from '@/components/ui/FormField';
import api from '@/utils/api';
import type { Customer } from '@/types/stripe';

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [apiError, setApiError] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [newCustomer, setNewCustomer] = useState({
    email: '',
    name: '',
    description: '',
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const response = await api.getCustomers();
      setCustomers((response as any)?.data || []);
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!newCustomer.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newCustomer.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (newCustomer.name && newCustomer.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters long';
    }
    
    if (newCustomer.description && newCustomer.description.trim().length > 500) {
      errors.description = 'Description must be less than 500 characters';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const createCustomer = async () => {
    setApiError('');
    setValidationErrors({});
    
    if (!validateForm()) {
      return;
    }
    
    setIsCreating(true);
    try {
      await api.createCustomer(newCustomer);
      setNewCustomer({ email: '', name: '', description: '' });
      setShowCreateForm(false);
      await loadCustomers();
    } catch (error: any) {
      console.error('Failed to create customer:', error);
      setApiError(
        error?.message || 
        'Failed to create customer. Please check your input and try again.'
      );
    } finally {
      setIsCreating(false);
    }
  };

  const deleteCustomer = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    
    try {
      await api.deleteCustomer(id);
      await loadCustomers();
    } catch (error: any) {
      console.error('Failed to delete customer:', error);
      setApiError(
        error?.message || 
        'Failed to delete customer. Please try again.'
      );
    }
  };

  const resetForm = () => {
    setNewCustomer({ email: '', name: '', description: '' });
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage your LocalStripe customers
          </p>
        </div>
        <Button onClick={handleFormToggle}>
          {showCreateForm ? 'Cancel' : '+ New Customer'}
        </Button>
      </div>

      {/* Create Customer Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Customer</CardTitle>
            <CardDescription>Add a new customer to your LocalStripe instance</CardDescription>
          </CardHeader>
          <div className="space-y-4">
            {/* API Error Display */}
            {apiError && (
              <Alert variant="error" title="Error">
                {apiError}
              </Alert>
            )}
            
            <FormField 
              label="Email" 
              required 
              error={validationErrors.email}
            >
              <Input
                type="email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                placeholder="customer@example.com"
                error={!!validationErrors.email}
              />
            </FormField>
            
            <FormField 
              label="Name" 
              error={validationErrors.name}
            >
              <Input
                type="text"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                placeholder="John Doe"
                error={!!validationErrors.name}
              />
            </FormField>
            
            <FormField 
              label="Description" 
              error={validationErrors.description}
            >
              <Textarea
                value={newCustomer.description}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Customer description..."
                error={!!validationErrors.description}
              />
            </FormField>
            
            <div className="flex space-x-3">
              <Button onClick={createCustomer} loading={isCreating}>
                Create Customer
              </Button>
              <Button variant="outline" onClick={handleFormToggle}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Customers List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Customers</CardTitle>
              <CardDescription>
                {isLoading ? 'Loading...' : `${customers.length} customer${customers.length !== 1 ? 's' : ''} total`}
              </CardDescription>
            </div>
            <Button variant="outline" onClick={loadCustomers} loading={isLoading}>
              Refresh
            </Button>
          </div>
        </CardHeader>
        
        {isLoading ? (
          <div className="py-8 text-center text-gray-500">Loading customers...</div>
        ) : customers.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <div className="mb-4">👥</div>
            <p>No customers found</p>
            <p className="text-sm mt-1">Create your first customer to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Customer</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Created</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Balance</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-gray-900">
                          {customer.name || 'Unnamed Customer'}
                        </div>
                        <div className="text-sm text-gray-500 font-mono">{customer.id}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {customer.email || '-'}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {formatDate(customer.created)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-sm ${
                        customer.account_balance === 0 
                          ? 'text-gray-600' 
                          : customer.account_balance > 0 
                            ? 'text-green-600' 
                            : 'text-red-600'
                      }`}>
                        ${(customer.account_balance / 100).toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button 
                        variant="danger" 
                        size="sm"
                        onClick={() => deleteCustomer(customer.id)}
                      >
                        Delete
                      </Button>
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