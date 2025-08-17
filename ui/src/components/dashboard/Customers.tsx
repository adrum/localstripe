import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Card, { CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { FormField, Input, Textarea } from '@/components/ui/FormField';
import { useCustomers, useCreateCustomer, useDeleteCustomer } from '@/hooks/useAPI';
import type { Customer } from '@/types/stripe';

export default function Customers() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [newCustomer, setNewCustomer] = useState({
    email: '',
    name: '',
    description: '',
  });
  const [editForm, setEditForm] = useState({
    email: '',
    name: '',
    description: '',
  });

  const queryClient = useQueryClient();

  // TanStack Query hooks
  const { data: customersData, isLoading, refetch } = useCustomers();
  const createCustomerMutation = useCreateCustomer();
  const deleteCustomerMutation = useDeleteCustomer();

  const updateCustomerMutation = useMutation({
    mutationFn: async ({ customerId, data }: { customerId: string; data: Partial<Customer> }) => {
      const response = await fetch(`/v1/customers/${customerId}`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer sk_test_123',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(data as any).toString(),
      });
      if (!response.ok) throw new Error('Failed to update customer');
      return response.json();
    },
    onSuccess: () => {
      setEditingCustomer(null);
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  const customers: Customer[] = customersData?.data || [];

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
    
    try {
      await createCustomerMutation.mutateAsync(newCustomer);
      setNewCustomer({ email: '', name: '', description: '' });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create customer:', error);
      setApiError(
        (error as Error)?.message || 
        'Failed to create customer. Please check your input and try again.'
      );
    }
  };

  const deleteCustomer = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    
    setApiError('');
    try {
      await deleteCustomerMutation.mutateAsync(id);
    } catch (error) {
      console.error('Failed to delete customer:', error);
      setApiError(
        (error as Error)?.message || 
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
              <Button onClick={createCustomer} loading={createCustomerMutation.isPending}>
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
            <Button variant="outline" onClick={() => refetch()} loading={isLoading}>
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
                    {editingCustomer === customer.id ? (
                      <>
                        <td className="py-3 px-4">
                          <div>
                            <FormField label="" error="">
                              <Input
                                type="text"
                                value={editForm.name}
                                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Customer name"
                              />
                            </FormField>
                            <div className="text-sm text-gray-500 font-mono mt-1">{customer.id}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <FormField label="" error="">
                            <Input
                              type="email"
                              value={editForm.email}
                              onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                              placeholder="customer@example.com"
                            />
                          </FormField>
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
                        <td className="py-3 px-4 text-right space-x-2">
                          <Button 
                            variant="primary" 
                            size="sm"
                            onClick={() => updateCustomerMutation.mutate({ 
                              customerId: customer.id, 
                              data: editForm 
                            })}
                            disabled={updateCustomerMutation.isPending}
                          >
                            Save
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setEditingCustomer(null)}
                          >
                            Cancel
                          </Button>
                        </td>
                      </>
                    ) : (
                      <>
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
                        <td className="py-3 px-4 text-right space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setEditingCustomer(customer.id);
                              setEditForm({
                                name: customer.name || '',
                                email: customer.email || '',
                                description: customer.description || '',
                              });
                            }}
                          >
                            Edit
                          </Button>
                          <Button 
                            variant="danger" 
                            size="sm"
                            onClick={() => deleteCustomer(customer.id)}
                          >
                            Delete
                          </Button>
                        </td>
                      </>
                    )}
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