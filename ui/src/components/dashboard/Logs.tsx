import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Card, { CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Select } from '@/components/ui/FormField';
import CodeBlock from '@/components/ui/CodeBlock';
import StackTrace from '@/components/ui/StackTrace';
import { useAPILogs, useClearAPILogs } from '@/hooks/useAPI';

interface APILogError {
  message?: string;
  type?: string;
  traceback?: string;
}

interface APILog {
  id: string;
  method: string;
  path: string;
  query_params: Record<string, string>;
  request_body: unknown;
  response_body: unknown;
  status_code: number;
  duration_ms: number;
  created: number;
  error: string | APILogError | null;
  object_id: string | null;
  object_type: string | null;
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-blue-600 bg-blue-100',
  POST: 'text-green-600 bg-green-100',
  PUT: 'text-yellow-600 bg-yellow-100',
  PATCH: 'text-orange-600 bg-orange-100',
  DELETE: 'text-red-600 bg-red-100',
};

const STATUS_COLORS: Record<string, string> = {
  '2xx': 'text-green-600 bg-green-100',
  '3xx': 'text-blue-600 bg-blue-100',
  '4xx': 'text-yellow-600 bg-yellow-100',
  '5xx': 'text-red-600 bg-red-100',
};

export default function Logs() {
  const navigate = useNavigate();
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    method: '',
    status_code: '',
    object_type: '',
    search: '',
  });
  
  // TanStack Query hooks
  const { data: logsData, isLoading, refetch } = useAPILogs({
    limit: 200,
    method: filters.method || undefined,
    status_code: filters.status_code ? parseInt(filters.status_code) : undefined,
    object_type: filters.object_type || undefined,
  });
  
  const clearLogsMutation = useClearAPILogs();
  
  const logs: APILog[] = useMemo(() => logsData?.data || [], [logsData]);
  
  // Filter logs by search term
  const filteredLogs = useMemo(() => {
    if (!filters.search) return logs;
    
    const searchLower = filters.search.toLowerCase();
    return logs.filter(log => {
      const pathMatch = log.path.toLowerCase().includes(searchLower);
      const idMatch = log.object_id?.toLowerCase().includes(searchLower);
      const bodyMatch = JSON.stringify(log.request_body || {}).toLowerCase().includes(searchLower);
      const responseMatch = JSON.stringify(log.response_body || {}).toLowerCase().includes(searchLower);
      
      return pathMatch || idMatch || bodyMatch || responseMatch;
    });
  }, [logs, filters.search]);
  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };
  
  const getStatusColor = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) return STATUS_COLORS['2xx'];
    if (statusCode >= 300 && statusCode < 400) return STATUS_COLORS['3xx'];
    if (statusCode >= 400 && statusCode < 500) return STATUS_COLORS['4xx'];
    if (statusCode >= 500) return STATUS_COLORS['5xx'];
    return 'text-gray-600 bg-gray-100';
  };
  
  const handleObjectClick = (objectType: string | null, objectId: string | null) => {
    if (!objectType || !objectId) return;
    
    // Map object types to routes
    const routeMap: Record<string, string> = {
      customer: '/customers',
      charge: '/charges',
      payment_intent: '/payments',
      subscription: '/subscriptions',
      plan: '/plans',
      invoice: '/invoices',
      product: '/products',
    };
    
    const route = routeMap[objectType];
    if (route) {
      // Navigate to the appropriate page with the object ID highlighted
      navigate(`${route}?highlight=${objectId}`);
    }
  };
  
  const clearLogs = async () => {
    if (!confirm('Are you sure you want to clear all API logs? This action cannot be undone.')) {
      return;
    }
    
    try {
      await clearLogsMutation.mutateAsync();
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  };
  
  // Extract unique values for filters
  const uniqueMethods = useMemo(() => {
    const methods = new Set(logs.map(log => log.method));
    return Array.from(methods).sort();
  }, [logs]);
  
  const uniqueObjectTypes = useMemo(() => {
    const types = new Set(logs.map(log => log.object_type).filter(Boolean));
    return Array.from(types).sort();
  }, [logs]);
  
  // Calculate stats
  const stats = useMemo(() => {
    const total = filteredLogs.length;
    const successful = filteredLogs.filter(log => log.status_code >= 200 && log.status_code < 300).length;
    const errors = filteredLogs.filter(log => log.status_code >= 400).length;
    const avgDuration = filteredLogs.length > 0
      ? Math.round(filteredLogs.reduce((sum, log) => sum + (log.duration_ms || 0), 0) / filteredLogs.length)
      : 0;
    
    return { total, successful, errors, avgDuration };
  }, [filteredLogs]);
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">API Logs</h1>
          <p className="text-sm text-gray-600 mt-1">
            Monitor all API requests and responses with detailed logging
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => refetch()} loading={isLoading}>
            Refresh
          </Button>
          <Button variant="danger" onClick={clearLogs} loading={clearLogsMutation.isPending}>
            Clear Logs
          </Button>
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div>
            <p className="text-sm font-medium text-gray-600">Total Requests</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
        </Card>
        
        <Card>
          <div>
            <p className="text-sm font-medium text-gray-600">Successful</p>
            <p className="text-2xl font-bold text-green-600">{stats.successful}</p>
          </div>
        </Card>
        
        <Card>
          <div>
            <p className="text-sm font-medium text-gray-600">Errors</p>
            <p className="text-2xl font-bold text-red-600">{stats.errors}</p>
          </div>
        </Card>
        
        <Card>
          <div>
            <p className="text-sm font-medium text-gray-600">Avg Duration</p>
            <p className="text-2xl font-bold text-gray-900">{stats.avgDuration}ms</p>
          </div>
        </Card>
      </div>
      
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              value={filters.search || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              placeholder="Search paths, IDs, or content..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Method
            </label>
            <Select
              value={filters.method}
              onChange={(e) => setFilters(prev => ({ ...prev, method: e.target.value }))}
            >
              <option value="">All Methods</option>
              {uniqueMethods.map(method => (
                <option key={method} value={method}>{method}</option>
              ))}
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status Code
            </label>
            <Select
              value={filters.status_code}
              onChange={(e) => setFilters(prev => ({ ...prev, status_code: e.target.value }))}
            >
              <option value="">All Status Codes</option>
              <option value="200">2xx - Success</option>
              <option value="400">4xx - Client Error</option>
              <option value="500">5xx - Server Error</option>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Object Type
            </label>
            <Select
              value={filters.object_type}
              onChange={(e) => setFilters(prev => ({ ...prev, object_type: e.target.value }))}
            >
              <option value="">All Types</option>
              {uniqueObjectTypes.map(type => (
                <option key={type} value={type || ''}>{type}</option>
              ))}
            </Select>
          </div>
        </div>
      </Card>
      
      {/* Logs List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Request Logs</CardTitle>
              <CardDescription>
                {isLoading ? 'Loading...' : `Showing ${filteredLogs.length} log${filteredLogs.length !== 1 ? 's' : ''}`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        {isLoading ? (
          <div className="py-8 text-center text-gray-500">Loading logs...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <div className="mb-4">📝</div>
            <p>No API logs found</p>
            <p className="text-sm mt-1">
              {filters.search || filters.method || filters.status_code || filters.object_type
                ? 'Try adjusting your filters'
                : 'API logs will appear here when requests are made'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLogs.map((log) => (
              <div key={log.id} className="border border-gray-200 rounded-lg">
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${METHOD_COLORS[log.method] || 'text-gray-600 bg-gray-100'}`}>
                          {log.method}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${getStatusColor(log.status_code)}`}>
                          {log.status_code}
                        </span>
                        <span className="font-mono text-sm text-gray-900">{log.path}</span>
                        { Object.prototype.hasOwnProperty.call(log, 'duration_ms') && (
                          <span className="text-xs text-gray-500">{log.duration_ms}ms</span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Time:</span>
                          <span className="ml-2 text-gray-900">{formatDate(log.created)}</span>
                        </div>

                        {log.object_type && log.object_id && (
                          <div>
                            <span className="text-gray-600">Object:</span>
                            <button
                              onClick={() => handleObjectClick(log.object_type, log.object_id)}
                              className="ml-2 text-purple-600 hover:text-purple-700 font-mono text-sm"
                            >
                              {log.object_type}/{log.object_id}
                            </button>
                          </div>
                        )}

                        {!!log.error && (
                          <div>
                            <span className="text-gray-600">Error:</span>
                            <div className="ml-2 mt-1">
                              {typeof log.error === 'string' ? (
                                <span className="text-red-600">{log.error}</span>
                              ) : typeof log.error === 'object' && (log.error as APILogError)?.message ? (
                                <div className="bg-red-50 border border-red-200 rounded p-2">
                                  <div className="flex items-center text-red-700 font-medium text-sm">
                                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    {(log.error as APILogError).type || 'Error'}
                                  </div>
                                  <div className="text-red-600 text-xs mt-1 font-mono">
                                    {(log.error as APILogError).message}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-red-600">Error occurred</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {Object.keys(log.query_params || {}).length > 0 && (
                        <div className="mt-2">
                          <span className="text-sm text-gray-600">Query Params:</span>
                          <span className="ml-2 font-mono text-xs text-gray-700">
                            {new URLSearchParams(log.query_params).toString()}
                          </span>
                        </div>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                    >
                      {expandedLog === log.id ? 'Hide Details' : 'Show Details'}
                    </Button>
                  </div>
                </div>

                {expandedLog === log.id && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {log.request_body ? (
                        <CodeBlock
                          title="Request Body"
                          data={log.request_body as object | string | number | boolean | null}
                          collapsible
                        />
                      ) : (
                        <div className="text-sm text-gray-500 border border-gray-200 rounded-md p-2 flex items-center justify-center">
                          No request body data available
                        </div>
                      )}

                      {log.response_body ? (
                        <CodeBlock
                          title="Response Body"
                          data={log.response_body as object | string | number | boolean | null}
                          collapsible
                        />
                      ) : (
                        <div className="text-sm text-gray-500 border border-gray-200 rounded-md p-2 flex items-center justify-center">
                          No response body data available
                        </div>
                      )}

                      {!!log.error && typeof log.error === 'object' && (log.error as APILogError)?.traceback && (
                        <div className="lg:col-span-2">
                          <StackTrace
                            trace={typeof (log.error as APILogError).traceback === 'string' ? (log.error as APILogError).traceback! : JSON.stringify((log.error as APILogError).traceback, null, 2)}
                            title="Error Traceback"
                            collapsible
                          />
                        </div>
                      )}

                      {!log.request_body && !log.response_body && !log.error && (
                        <div className="text-sm text-gray-500">
                          No request or response body data available
                        </div>
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
  );
}