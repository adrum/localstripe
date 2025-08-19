import { useState } from 'react';
import Card, { CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { FormField, Input } from '@/components/ui/FormField';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import CodeBlock from '@/components/ui/CodeBlock';
import { 
  useWebhooks, 
  useConfigureWebhook, 
  useDeleteWebhook, 
  useWebhookLogs, 
  useRetryWebhook 
} from '@/hooks/useAPI';

interface Webhook {
  id: string;
  url: string;
  secret: string;
  events?: string[];
}

interface WebhookLog {
  id: string;
  webhook_id: string;
  event_type: string;
  url: string;
  status_code: number;
  attempt: number;
  created: number;
  request_data: unknown;
  response_data: unknown;
  response_time_ms: number;
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
  const [activeTab, setActiveTab] = useState('webhooks');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [apiError, setApiError] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [newWebhook, setNewWebhook] = useState({
    id: '',
    url: '',
    secret: '',
    events: [] as string[],
  });

  // TanStack Query hooks
  const { data: webhooksData, isLoading, refetch: refetchWebhooks } = useWebhooks();
  const { data: webhookLogsData, isLoading: isLoadingLogs, refetch: refetchWebhookLogs } = useWebhookLogs();
  const configureWebhookMutation = useConfigureWebhook();
  const deleteWebhookMutation = useDeleteWebhook();
  const retryWebhookMutation = useRetryWebhook();

  // Transform webhooks data
  const webhooks: Webhook[] = webhooksData 
    ? Object.entries(webhooksData).map(([id, config]: [string, { url?: string; secret?: string; events?: string[] }]) => ({
        id,
        url: config.url || '',
        secret: config.secret || '',
        events: config.events || [],
      }))
    : [];

  // Transform webhook logs data
  const webhookLogs: WebhookLog[] = webhookLogsData?.data || [];

  const retryWebhook = async (logId: string) => {
    setApiError('');
    try {
      await retryWebhookMutation.mutateAsync(logId);
    } catch (error) {
      console.error('Failed to retry webhook:', error);
      setApiError(
        (error as Error)?.message || 
        'Failed to retry webhook. Please try again.'
      );
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
    
    try {
      await configureWebhookMutation.mutateAsync({
        name: newWebhook.id,
        url: newWebhook.url,
        secret: newWebhook.secret,
        events: newWebhook.events.length > 0 ? newWebhook.events : undefined
      });
      resetForm();
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create webhook:', error);
      setApiError(
        (error as Error)?.message || 
        'Failed to create webhook. Please check your input and try again.'
      );
    }
  };

  const deleteWebhook = async (id: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;
    
    setApiError('');
    try {
      await deleteWebhookMutation.mutateAsync(id);
    } catch (error) {
      console.error('Failed to delete webhook:', error);
      setApiError(
        (error as Error)?.message || 
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

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const getStatusColor = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) {
      return 'text-green-600 bg-green-100 dark:text-green-200 dark:bg-green-900';
    } else if (statusCode >= 400 && statusCode < 500) {
      return 'text-yellow-600 bg-yellow-100 dark:text-yellow-200 dark:bg-yellow-900';
    } else if (statusCode >= 500) {
      return 'text-red-600 bg-red-100 dark:text-red-200 dark:bg-red-900';
    } else {
      return 'text-gray-600 bg-gray-100 dark:text-gray-200 dark:bg-gray-700';
    }
  };

  const failedLogs = webhookLogs.filter(log => log.status_code >= 400);
  
  const tabs = [
    { id: 'webhooks', label: 'Webhooks', count: webhooks.length },
    { id: 'logs', label: 'Logs', count: webhookLogs.length },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Webhooks</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Configure webhook endpoints and monitor delivery logs
          </p>
        </div>
        {activeTab === 'webhooks' && (
          <Button onClick={handleFormToggle}>
            {showCreateForm ? 'Cancel' : '+ New Webhook'}
          </Button>
        )}
      </div>

      {/* API Error Display */}
      {apiError && (
        <Alert variant="error" title="Error">
          {apiError}
        </Alert>
      )}

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}>
        {/* Webhooks Tab */}
        <TabPanel value="webhooks" activeTab={activeTab}>
          <div className="space-y-6">
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
                      <p className="text-sm text-gray-600 dark:text-gray-400">
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
                            <span className="text-sm text-gray-700 dark:text-gray-300 font-mono">{event}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </FormField>
                  
                  <div className="flex space-x-3">
                    <Button onClick={createWebhook} loading={configureWebhookMutation.isPending}>
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
                  <Button variant="outline" onClick={() => refetchWebhooks()} loading={isLoading}>
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              
              {isLoading ? (
                <div className="py-8 text-center text-gray-500 dark:text-gray-400">Loading webhooks...</div>
              ) : webhooks.length === 0 ? (
                <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                  <div className="mb-4"><i className="fas fa-link text-4xl text-gray-400 dark:text-gray-500"></i></div>
                  <p>No webhooks configured</p>
                  <p className="text-sm mt-1">Create your first webhook to receive event notifications</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {webhooks.map((webhook) => (
                    <div key={webhook.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-medium text-gray-900 dark:text-white">{webhook.id}</h4>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              Active
                            </span>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">URL:</span>
                              <span className="ml-2 font-mono text-gray-900 dark:text-white">{webhook.url}</span>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Secret:</span>
                              <span className="ml-2 font-mono text-gray-900 dark:text-white">
                                {webhook.secret.substring(0, 15)}...
                              </span>
                            </div>
                            {webhook.events && webhook.events.length > 0 ? (
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Events:</span>
                                <div className="ml-2 mt-1 flex flex-wrap gap-1">
                                  {webhook.events.map((event) => (
                                    <span
                                      key={event}
                                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                    >
                                      {event}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Events:</span>
                                <span className="ml-2 text-gray-500 dark:text-gray-400">All events</span>
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
          </div>
        </TabPanel>

        {/* Logs Tab */}
        <TabPanel value="logs" activeTab={activeTab}>
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Deliveries</p>
                    <p className="text-2xl font-bold text-gray-900">{webhookLogs.length}</p>
                  </div>
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600">📊</span>
                  </div>
                </div>
              </Card>
              
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Successful</p>
                    <p className="text-2xl font-bold text-green-600">
                      {webhookLogs.filter(log => log.status_code >= 200 && log.status_code < 300).length}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-green-600">✅</span>
                  </div>
                </div>
              </Card>
              
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Failed</p>
                    <p className="text-2xl font-bold text-red-600">{failedLogs.length}</p>
                  </div>
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <span className="text-red-600">❌</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Webhook Logs */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Webhook Delivery Logs</CardTitle>
                    <CardDescription>
                      Monitor webhook delivery attempts with detailed request/response data
                    </CardDescription>
                  </div>
                  <Button variant="outline" onClick={() => refetchWebhookLogs()} loading={isLoadingLogs}>
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              
              {isLoadingLogs ? (
                <div className="py-8 text-center text-gray-500">Loading webhook logs...</div>
              ) : webhookLogs.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  <div className="mb-4">
                    <i className="fas fa-webhook text-4xl text-gray-400 dark:text-gray-500"></i>
                  </div>
                  <p>No webhook logs found</p>
                  <p className="text-sm mt-1">Webhook delivery logs will appear here when events are triggered</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {webhookLogs.map((log) => (
                    <div key={log.id} className="border border-gray-200 rounded-lg">
                      <div className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <span className="font-mono text-sm font-medium text-gray-900">{log.event_type}</span>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(log.status_code)}`}>
                                {log.status_code}
                              </span>
                              {log.attempt > 1 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                  Attempt #{log.attempt}
                                </span>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Webhook:</span>
                                <span className="ml-2 font-mono text-gray-900">{log.webhook_id}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Response Time:</span>
                                <span className="ml-2 text-gray-900">{log.response_time_ms}ms</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Delivered:</span>
                                <span className="ml-2 text-gray-900">{formatDate(log.created)}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {log.status_code >= 400 && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => retryWebhook(log.id)}
                              >
                                Retry
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                            >
                              {expandedLog === log.id ? 'Hide Details' : 'Show Details'}
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {expandedLog === log.id && (
                        <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-4">
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Request URL</p>
                            <p className="text-sm font-mono bg-white p-2 rounded border">{log.url}</p>
                          </div>
                          
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <CodeBlock 
                              title="Request Data" 
                              data={log.request_data as object | string | number | boolean | null}
                              collapsible
                            />
                            
                            {!!log.response_data && (
                              <CodeBlock 
                                title="Response Data" 
                                data={log.response_data as object | string | number | boolean | null}
                                collapsible
                              />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </TabPanel>
      </Tabs>
    </div>
  );
}