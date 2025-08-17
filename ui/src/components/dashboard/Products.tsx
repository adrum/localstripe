import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { FormField } from '@/components/ui/FormField';

interface Price {
  id: string;
  object: string;
  active: boolean;
  currency: string;
  nickname: string | null;
  product: string;
  type: 'one_time' | 'recurring';
  unit_amount: number;
  recurring: {
    interval: string;
    interval_count: number;
  } | null;
  created: number;
  livemode: boolean;
  metadata: Record<string, string>;
}

interface Product {
  id: string;
  object: string;
  active: boolean;
  created: number;
  description: string | null;
  livemode: boolean;
  metadata: Record<string, string>;
  name: string;
  statement_descriptor: string | null;
  type: 'good' | 'service';
  url: string | null;
  caption: string | null;
  attributes: string[] | null;
  shippable: boolean;
}

export default function Products() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState(false);
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<Partial<Product>>({});
  const [priceForm, setPriceForm] = useState<{
    nickname?: string;
    active?: string;
    metadata?: Record<string, string>;
  }>({});
  const [metadataEntries, setMetadataEntries] = useState<Array<{key: string, value: string}>>([]);
  const [showCreatePrice, setShowCreatePrice] = useState(false);
  const [newPriceForm, setNewPriceForm] = useState({
    nickname: '',
    unit_amount: '',
    currency: 'usd',
    type: 'one_time' as 'one_time' | 'recurring',
    recurring: {
      interval: 'month',
      interval_count: 1
    }
  });

  const queryClient = useQueryClient();

  const { data: products, isLoading, error } = useQuery<{ data: Product[] }>({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await fetch('/v1/products', {
        headers: {
          'Authorization': 'Bearer sk_test_123',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
  });

  const { data: prices, refetch: refetchPrices } = useQuery<{ data: Price[] }>({
    queryKey: ['prices', selectedProduct?.id],
    queryFn: async () => {
      const response = await fetch(`/v1/prices?product=${selectedProduct?.id}`, {
        headers: {
          'Authorization': 'Bearer sk_test_123',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch prices');
      return response.json();
    },
    enabled: !!selectedProduct,
  });

  const updateProductMutation = useMutation({
    mutationFn: async (data: Partial<Product>) => {
      const response = await fetch(`/v1/products/${selectedProduct?.id}`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer sk_test_123',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(data as any).toString(),
      });
      if (!response.ok) throw new Error('Failed to update product');
      return response.json();
    },
    onSuccess: (data) => {
      setSelectedProduct(data);
      setEditingProduct(false);
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const updatePriceMutation = useMutation({
    mutationFn: async ({ priceId, data }: { priceId: string; data: Partial<Price> }) => {
      const response = await fetch(`/v1/prices/${priceId}`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer sk_test_123',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(data as any).toString(),
      });
      if (!response.ok) throw new Error('Failed to update price');
      return response.json();
    },
    onSuccess: () => {
      setEditingPrice(null);
      refetchPrices();
    },
  });

  const createPriceMutation = useMutation({
    mutationFn: async (data: any) => {
      const params = new URLSearchParams();
      params.append('product', selectedProduct!.id);
      params.append('currency', data.currency);
      params.append('unit_amount', data.unit_amount);
      if (data.nickname) params.append('nickname', data.nickname);
      params.append('type', data.type);

      if (data.type === 'recurring') {
        params.append('recurring[interval]', data.recurring.interval);
        params.append('recurring[interval_count]', data.recurring.interval_count.toString());
      }

      const response = await fetch('/v1/prices', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer sk_test_123',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
      if (!response.ok) throw new Error('Failed to create price');
      return response.json();
    },
    onSuccess: () => {
      setShowCreatePrice(false);
      setNewPriceForm({
        nickname: '',
        unit_amount: '',
        currency: 'usd',
        type: 'one_time',
        recurring: {
          interval: 'month',
          interval_count: 1
        }
      });
      refetchPrices();
    },
  });

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert type="error" message="Failed to load products. Please try again." />
      </div>
    );
  }

  if (selectedProduct) {
    return (
      <div className="p-6">
        {/* Product Detail View */}
        <div className="mb-6">
          <Button
            variant="secondary"
            onClick={() => {
              setSelectedProduct(null);
              setEditingProduct(false);
            }}
          >
            ← Back to Products
          </Button>
        </div>

        <Card>
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">{selectedProduct.name}</h2>
                <p className="text-sm text-gray-500 mt-1">{selectedProduct.id}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${selectedProduct.active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                  }`}>
                  {selectedProduct.active ? 'Active' : 'Inactive'}
                </span>
                {!editingProduct && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setEditingProduct(true);
                      setProductForm({
                        name: selectedProduct.name,
                        description: selectedProduct.description || '',
                        active: selectedProduct.active.toString(),
                        statement_descriptor: selectedProduct.statement_descriptor || '',
                        url: selectedProduct.url || '',
                        type: selectedProduct.type,
                        caption: selectedProduct.caption || '',
                        shippable: selectedProduct.shippable?.toString() || 'true',
                      });
                    }}
                  >
                    Edit Product
                  </Button>
                )}
              </div>
            </div>

            {editingProduct ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={productForm.name || ''}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      placeholder="Product name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={productForm.type}
                      onChange={(e) => setProductForm({ ...productForm, type: e.target.value as 'good' | 'service' })}
                    >
                      <option value="service">Service</option>
                      <option value="good">Good</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows={3}
                    value={productForm.description || ''}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    placeholder="Product description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Caption
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={productForm.caption || ''}
                      onChange={(e) => setProductForm({ ...productForm, caption: e.target.value })}
                      placeholder="Short description for display"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      URL
                    </label>
                    <input
                      type="url"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={productForm.url || ''}
                      onChange={(e) => setProductForm({ ...productForm, url: e.target.value })}
                      placeholder="https://example.com/product"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Statement Descriptor
                  </label>
                  <input
                    type="text"
                    maxLength={22}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={productForm.statement_descriptor || ''}
                    onChange={(e) => setProductForm({ ...productForm, statement_descriptor: e.target.value })}
                    placeholder="Appears on customer's statement"
                  />
                  <p className="text-xs text-gray-500 mt-1">Max 22 characters</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={productForm.active?.toString()}
                      onChange={(e) => setProductForm({ ...productForm, active: e.target.value })}
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Shippable
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={productForm.shippable?.toString()}
                      onChange={(e) => setProductForm({ ...productForm, shippable: e.target.value })}
                    >
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => updateProductMutation.mutate(productForm)}
                    disabled={updateProductMutation.isPending}
                  >
                    Save Changes
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setEditingProduct(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Product Details</h3>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm text-gray-600">Type</dt>
                      <dd className="text-sm font-medium text-gray-900 capitalize">{selectedProduct.type}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-600">Created</dt>
                      <dd className="text-sm font-medium text-gray-900">{formatDate(selectedProduct.created)}</dd>
                    </div>
                    {selectedProduct.description && (
                      <div>
                        <dt className="text-sm text-gray-600">Description</dt>
                        <dd className="text-sm font-medium text-gray-900">{selectedProduct.description}</dd>
                      </div>
                    )}
                    {selectedProduct.caption && (
                      <div>
                        <dt className="text-sm text-gray-600">Caption</dt>
                        <dd className="text-sm font-medium text-gray-900">{selectedProduct.caption}</dd>
                      </div>
                    )}
                    {selectedProduct.url && (
                      <div>
                        <dt className="text-sm text-gray-600">URL</dt>
                        <dd className="text-sm font-medium text-gray-900">
                          <a href={selectedProduct.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 underline">
                            {selectedProduct.url}
                          </a>
                        </dd>
                      </div>
                    )}
                    {selectedProduct.statement_descriptor && (
                      <div>
                        <dt className="text-sm text-gray-600">Statement Descriptor</dt>
                        <dd className="text-sm font-medium text-gray-900">{selectedProduct.statement_descriptor}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-sm text-gray-600">Shippable</dt>
                      <dd className="text-sm font-medium text-gray-900">{selectedProduct.shippable ? 'Yes' : 'No'}</dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Metadata</h3>
                  {Object.keys(selectedProduct.metadata).length > 0 ? (
                    <dl className="space-y-1">
                      {Object.entries(selectedProduct.metadata).map(([key, value]) => (
                        <div key={key} className="flex">
                          <dt className="text-sm text-gray-600 mr-2">{key}:</dt>
                          <dd className="text-sm font-medium text-gray-900">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="text-sm text-gray-500">No metadata</p>
                  )}
                </div>
              </div>
            )}

            {/* Prices Section */}
            {!editingProduct && (
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Prices</h3>
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setShowCreatePrice(true)}
                    >
                      + New Price
                    </Button>
                  </div>
                </div>

                {showCreatePrice && (
                  <div className="border rounded-lg p-4 mb-4 bg-gray-50">
                    <h4 className="font-medium mb-3">Create New Price</h4>
                    <div className="space-y-3">
                      <FormField
                        label="Nickname (optional)"
                        value={newPriceForm.nickname}
                        onChange={(e) => setNewPriceForm({ ...newPriceForm, nickname: e.target.value })}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          label="Amount (in cents)"
                          type="number"
                          value={newPriceForm.unit_amount}
                          onChange={(e) => setNewPriceForm({ ...newPriceForm, unit_amount: e.target.value })}
                          helper="e.g., 1000 = $10.00"
                        />
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Currency
                          </label>
                          <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            value={newPriceForm.currency}
                            onChange={(e) => setNewPriceForm({ ...newPriceForm, currency: e.target.value })}
                          >
                            <option value="usd">USD</option>
                            <option value="eur">EUR</option>
                            <option value="gbp">GBP</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Pricing Type
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          value={newPriceForm.type}
                          onChange={(e) => setNewPriceForm({ ...newPriceForm, type: e.target.value as 'one_time' | 'recurring' })}
                        >
                          <option value="one_time">One-time</option>
                          <option value="recurring">Recurring</option>
                        </select>
                      </div>
                      {newPriceForm.type === 'recurring' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Interval
                            </label>
                            <select
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              value={newPriceForm.recurring.interval}
                              onChange={(e) => setNewPriceForm({
                                ...newPriceForm,
                                recurring: { ...newPriceForm.recurring, interval: e.target.value }
                              })}
                            >
                              <option value="day">Daily</option>
                              <option value="week">Weekly</option>
                              <option value="month">Monthly</option>
                              <option value="year">Yearly</option>
                            </select>
                          </div>
                          <FormField
                            label="Interval Count"
                            type="number"
                            value={newPriceForm.recurring.interval_count.toString()}
                            onChange={(e) => setNewPriceForm({
                              ...newPriceForm,
                              recurring: { ...newPriceForm.recurring, interval_count: parseInt(e.target.value) || 1 }
                            })}
                          />
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button
                          onClick={() => createPriceMutation.mutate(newPriceForm)}
                          disabled={createPriceMutation.isPending || !newPriceForm.unit_amount}
                        >
                          Create Price
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => setShowCreatePrice(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {prices && (
                  <div className="space-y-3">
                    {prices.data.length > 0 ? (
                      prices.data.map((price) => (
                        <div
                          key={price.id}
                          className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                        >
                          {editingPrice === price.id ? (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nickname
                                  </label>
                                  <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={priceForm.nickname || ''}
                                    onChange={(e) => setPriceForm({ ...priceForm, nickname: e.target.value })}
                                    placeholder="Price nickname"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Status
                                  </label>
                                  <select
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={priceForm.active}
                                    onChange={(e) => setPriceForm({ ...priceForm, active: e.target.value })}
                                  >
                                    <option value="true">Active</option>
                                    <option value="false">Inactive</option>
                                  </select>
                                </div>
                              </div>

                              {/* Metadata Section */}
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <label className="block text-sm font-medium text-gray-700">
                                    Metadata
                                  </label>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setMetadataEntries([...metadataEntries, { key: '', value: '' }])}
                                  >
                                    + Add Field
                                  </Button>
                                </div>
                                <div className="space-y-2">
                                  {metadataEntries.map((entry, index) => (
                                    <div key={index} className="flex gap-2 items-center">
                                      <input
                                        type="text"
                                        placeholder="Key"
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        value={entry.key}
                                        onChange={(e) => {
                                          const newEntries = [...metadataEntries];
                                          newEntries[index].key = e.target.value;
                                          setMetadataEntries(newEntries);
                                        }}
                                      />
                                      <input
                                        type="text"
                                        placeholder="Value"
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        value={entry.value}
                                        onChange={(e) => {
                                          const newEntries = [...metadataEntries];
                                          newEntries[index].value = e.target.value;
                                          setMetadataEntries(newEntries);
                                        }}
                                      />
                                      <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => {
                                          const newEntries = metadataEntries.filter((_, i) => i !== index);
                                          setMetadataEntries(newEntries);
                                        }}
                                      >
                                        ×
                                      </Button>
                                    </div>
                                  ))}
                                  {metadataEntries.length === 0 && (
                                    <p className="text-sm text-gray-500 italic">No metadata entries</p>
                                  )}
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    const metadata = metadataEntries.reduce((acc, entry) => {
                                      if (entry.key.trim() && entry.value.trim()) {
                                        acc[entry.key.trim()] = entry.value.trim();
                                      }
                                      return acc;
                                    }, {} as Record<string, string>);
                                    
                                    updatePriceMutation.mutate({ 
                                      priceId: price.id, 
                                      data: { ...priceForm, metadata } 
                                    });
                                  }}
                                  disabled={updatePriceMutation.isPending}
                                >
                                  Save
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => {
                                    setEditingPrice(null);
                                    setMetadataEntries([]);
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <span className="text-lg font-semibold text-gray-900">
                                    {formatCurrency(price.unit_amount, price.currency)}
                                  </span>
                                  {price.recurring && (
                                    <span className="text-sm text-gray-600">
                                      / {price.recurring.interval_count > 1 ? `${price.recurring.interval_count} ` : ''}
                                      {price.recurring.interval}{price.recurring.interval_count > 1 ? 's' : ''}
                                    </span>
                                  )}
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${price.type === 'recurring'
                                      ? 'bg-purple-100 text-purple-800'
                                      : 'bg-blue-100 text-blue-800'
                                    }`}>
                                    {price.type === 'recurring' ? 'Recurring' : 'One-time'}
                                  </span>
                                  {!price.active && (
                                    <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                      Inactive
                                    </span>
                                  )}
                                </div>
                                {price.nickname && (
                                  <p className="text-sm text-gray-600 mt-1">{price.nickname}</p>
                                )}
                                <p className="text-xs text-gray-500 mt-1">{price.id}</p>
                                {Object.keys(price.metadata || {}).length > 0 && (
                                  <div className="mt-2">
                                    <p className="text-xs font-medium text-gray-500 mb-1">Metadata:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {Object.entries(price.metadata).map(([key, value]) => (
                                        <span key={key} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                                          {key}: {value}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  setEditingPrice(price.id);
                                  setPriceForm({
                                    nickname: price.nickname || '',
                                    active: price.active.toString(),
                                  });
                                  // Convert metadata object to array for editing
                                  const metadataArray = Object.entries(price.metadata || {}).map(([key, value]) => ({
                                    key,
                                    value
                                  }));
                                  setMetadataEntries(metadataArray);
                                }}
                              >
                                Edit
                              </Button>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No prices found for this product
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Products List */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">
            {products?.data.length || 0} product{products?.data.length !== 1 ? 's' : ''} found
          </p>
        </div>
      </div>

      {products?.data && products.data.length > 0 ? (
        <div className="grid gap-4">
          {products.data.map((product) => (
            <Card key={product.id}>
              <div
                className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setSelectedProduct(product)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {product.name}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${product.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                        }`}>
                        {product.active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                        {product.type}
                      </span>
                    </div>
                    {product.description && (
                      <p className="text-sm text-gray-600 mt-2">{product.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                      <span>{product.id}</span>
                      <span>Created {formatDate(product.created)}</span>
                    </div>
                  </div>
                  <div className="text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="p-8 text-center">
            <div className="mb-4 text-4xl">📦</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No products yet</h3>
            <p className="text-gray-600 mb-4">
              Create your first product to start managing your catalog.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
