import { useEffect, useState } from 'react';
import Card, { CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { FormField, Input, Textarea } from '@/components/ui/FormField';
import api from '@/utils/api';

interface Webhook {
  id: string;
  url: string;
  secret: string;
  events?: string[];
}

const availableEvents = [
  'product.created',
  'plan.created',
  'customer.created',
  'customer.updated',
  'customer.deleted',
  'customer.source.created',
  'customer.subscription.created',
  'customer.subscription.deleted',
  'invoice.created',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
];

export default function Webhooks() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [apiError, setApiError] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [newWebhook, setNewWebhook] = useState({
    id: '',
    url: '',
    secret: '',
    events: [] as string[],
  });

  useEffect(() => {
    loadWebhooks();
  }, []);

  const loadWebhooks = async () => {
    setIsLoading(true);
    try {
      const response = await api.getWebhooks();
      // Transform the response to match our interface
      const webhookData = response || {};
      const webhookList = Object.entries(webhookData).map(([id, config]: [string, any]) => ({
        id,
        url: config.url || '',
        secret: config.secret || '',
        events: config.events || [],
      }));
      setWebhooks(webhookList);
    } catch (error) {
      console.error('Failed to load webhooks:', error);
      setWebhooks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!newWebhook.id.trim()) {
      errors.id = 'Webhook ID is required';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(newWebhook.id)) {
      errors.id = 'Webhook ID can only contain letters, numbers, hyphens, and underscores';
    } else if (webhooks.some(webhook => webhook.id === newWebhook.id)) {
      errors.id = 'Webhook ID already exists';
    }
    
    if (!newWebhook.url.trim()) {
      errors.url = 'Webhook URL is required';
    } else {
      try {
        const url = new URL(newWebhook.url);
        if (!['http:', 'https:'].includes(url.protocol)) {
          errors.url = 'URL must use HTTP or HTTPS protocol';
        }
      } catch {
        errors.url = 'Please enter a valid URL';
      }
    }
    
    if (!newWebhook.secret.trim()) {
      errors.secret = 'Webhook secret is required';
    } else if (newWebhook.secret.length < 8) {
      errors.secret = 'Secret must be at least 8 characters long';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const createWebhook = async () => {
    setApiError('');
    setValidationErrors({});
    
    if (!validateForm()) {
      return;
    }
    
    setIsCreating(true);
    try {
      await api.configureWebhook(
        newWebhook.id,
        newWebhook.url,
        newWebhook.secret,
        newWebhook.events.length > 0 ? newWebhook.events : undefined
      );
      resetForm();
      setShowCreateForm(false);
      await loadWebhooks();
    } catch (error: any) {
      console.error('Failed to create webhook:', error);
      setApiError(
        error?.message || 
        'Failed to create webhook. Please check your input and try again.'
      );
    } finally {
      setIsCreating(false);
    }
  };

  const deleteWebhook = async (id: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;
    
    try {
      await api.deleteWebhook(id);
      await loadWebhooks();
    } catch (error: any) {
      console.error('Failed to delete webhook:', error);
      setApiError(
        error?.message || 
        'Failed to delete webhook. Please try again.'
      );
    }
  };

  const resetForm = () => {
    setNewWebhook({
      id: '',
      url: '',
      secret: '',
      events: [],
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

  const handleEventToggle = (event: string) => {
    setNewWebhook(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event]
    }));
  };

  const generateSecret = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'whsec_';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewWebhook(prev => ({ ...prev, secret: result }));
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Webhooks</h1>
          <p className="text-sm text-gray-600 mt-1">
            Configure webhook endpoints to receive event notifications
          </p>
        </div>
        <Button onClick={handleFormToggle}>
          {showCreateForm ? 'Cancel' : '+ New Webhook'}
        </Button>
      </div>

      {/* API Error Display */}
      {apiError && (
        <Alert variant="error" title="Error">
          {apiError}
        </Alert>
      )}

      {/* Create Webhook Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Webhook</CardTitle>
            <CardDescription>Add a new webhook endpoint to receive LocalStripe events</CardDescription>
          </CardHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField 
                label="Webhook ID" 
                required 
                error={validationErrors.id}
              >
                <Input
                  type="text"
                  value={newWebhook.id}
                  onChange={(e) => setNewWebhook(prev => ({ ...prev, id: e.target.value }))}
                  placeholder="my-webhook-endpoint"
                  error={!!validationErrors.id}
                />
              </FormField>
              
              <FormField 
                label="Endpoint URL" 
                required 
                error={validationErrors.url}
              >
                <Input
                  type="url"
                  value={newWebhook.url}
                  onChange={(e) => setNewWebhook(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://example.com/webhook"
                  error={!!validationErrors.url}
                />
              </FormField>
            </div>
            
            <FormField 
              label="Webhook Secret" 
              required 
              error={validationErrors.secret}
            >
              <div className="flex space-x-2">
                <Input
                  type="text"
                  value={newWebhook.secret}
                  onChange={(e) => setNewWebhook(prev => ({ ...prev, secret: e.target.value }))}
                  placeholder="whsec_..."
                  error={!!validationErrors.secret}
                  className="flex-1"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={generateSecret}
                  className="whitespace-nowrap"
                >
                  Generate
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Used to verify webhook authenticity. Click "Generate" for a secure random secret.
              </p>
            </FormField>
            
            <FormField 
              label="Events to Subscribe (optional)"
            >
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Select specific events to receive, or leave empty to receive all events:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {availableEvents.map((event) => (
                    <label key={event} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newWebhook.events.includes(event)}
                        onChange={() => handleEventToggle(event)}
                        className="mr-2 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700 font-mono">{event}</span>
                    </label>
                  ))}
                </div>
              </div>
            </FormField>
            
            <div className="flex space-x-3">
              <Button onClick={createWebhook} loading={isCreating}>
                Create Webhook
              </Button>
              <Button variant="outline" onClick={handleFormToggle}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Webhooks List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Configured Webhooks</CardTitle>
              <CardDescription>
                {isLoading ? 'Loading...' : `${webhooks.length} webhook${webhooks.length !== 1 ? 's' : ''} configured`}
              </CardDescription>
            </div>
            <Button variant="outline" onClick={loadWebhooks} loading={isLoading}>
              Refresh
            </Button>
          </div>
        </CardHeader>
        
        {isLoading ? (
          <div className="py-8 text-center text-gray-500">Loading webhooks...</div>
        ) : webhooks.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <div className="mb-4">🔗</div>
            <p>No webhooks configured</p>
            <p className="text-sm mt-1">Create your first webhook to receive event notifications</p>
          </div>
        ) : (
          <div className="space-y-4">
            {webhooks.map((webhook) => (
              <div key={webhook.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-medium text-gray-900">{webhook.id}</h4>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div>
                        <span className="text-gray-600">URL:</span>
                        <span className="ml-2 font-mono text-gray-900">{webhook.url}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Secret:</span>
                        <span className="ml-2 font-mono text-gray-900">
                          {webhook.secret.substring(0, 15)}...
                        </span>
                      </div>
                      {webhook.events && webhook.events.length > 0 ? (
                        <div>
                          <span className="text-gray-600">Events:</span>
                          <div className="ml-2 mt-1 flex flex-wrap gap-1">
                            {webhook.events.map((event) => (
                              <span
                                key={event}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {event}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="text-gray-600">Events:</span>
                          <span className="ml-2 text-gray-500">All events</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button 
                    variant="danger" 
                    size="sm"
                    onClick={() => deleteWebhook(webhook.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      
      {/* Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>Webhook Documentation</CardTitle>
          <CardDescription>How to use webhooks with LocalStripe</CardDescription>
        </CardHeader>
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Supported Events</h4>
            <p className="text-gray-600 mb-2">LocalStripe supports the following webhook events:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
              {availableEvents.map((event) => (
                <code key={event} className="text-xs bg-gray-100 px-2 py-1 rounded">{event}</code>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Webhook Verification</h4>
            <p className="text-gray-600">
              All webhook payloads are signed with your webhook secret. Use the secret to verify 
              the authenticity of webhook requests to prevent unauthorized access.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Testing</h4>
            <p className="text-gray-600">
              Use tools like ngrok or webhook.site to create public URLs for testing webhooks 
              during development.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}