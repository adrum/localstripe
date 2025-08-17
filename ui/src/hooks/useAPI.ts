import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';

// Customers
export const useCustomers = () => {
  return useQuery({
    queryKey: ['customers'],
    queryFn: () => api.getCustomers(),
  });
};

export const useCustomer = (id: string) => {
  return useQuery({
    queryKey: ['customers', id],
    queryFn: () => api.getCustomer(id),
    enabled: !!id,
  });
};

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, string | number | boolean>) => api.createCustomer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
};

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, string | number | boolean> }) =>
      api.updateCustomer(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers', id] });
    },
  });
};

export const useDeleteCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
};

// Subscriptions
export const useSubscriptions = () => {
  return useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => api.getSubscriptions(),
  });
};

export const useSubscription = (id: string) => {
  return useQuery({
    queryKey: ['subscriptions', id],
    queryFn: () => api.getSubscription(id),
    enabled: !!id,
  });
};

export const useCreateSubscription = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, string | number | boolean>) => api.createSubscription(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
  });
};

// Plans
export const usePlans = () => {
  return useQuery({
    queryKey: ['plans'],
    queryFn: () => api.getPlans(),
  });
};

export const useCreatePlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, string | number | boolean>) => api.createPlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
  });
};

// Charges
export const useCharges = () => {
  return useQuery({
    queryKey: ['charges'],
    queryFn: () => api.getCharges(),
  });
};

export const useCharge = (id: string) => {
  return useQuery({
    queryKey: ['charges', id],
    queryFn: () => api.getCharge(id),
    enabled: !!id,
  });
};

export const useCreateCharge = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, string | number | boolean>) => api.createCharge(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charges'] });
    },
  });
};

// Payment Intents
export const usePaymentIntents = () => {
  return useQuery({
    queryKey: ['payment_intents'],
    queryFn: () => api.getPaymentIntents(),
  });
};

export const usePaymentIntent = (id: string) => {
  return useQuery({
    queryKey: ['payment_intents', id],
    queryFn: () => api.getPaymentIntent(id),
    enabled: !!id,
  });
};

export const useCreatePaymentIntent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, string | number | boolean>) => api.createPaymentIntent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment_intents'] });
    },
  });
};

// Webhooks
export const useWebhooks = () => {
  return useQuery({
    queryKey: ['webhooks'],
    queryFn: () => api.getWebhooks(),
  });
};

export const useConfigureWebhook = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, url, secret, events }: { 
      name: string; 
      url: string; 
      secret: string; 
      events?: string[] 
    }) => api.configureWebhook(name, url, secret, events),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
    },
  });
};

export const useDeleteWebhook = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.deleteWebhook(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
    },
  });
};

// Webhook Logs
export const useWebhookLogs = (limit = 50, offset = 0) => {
  return useQuery({
    queryKey: ['webhook_logs', limit, offset],
    queryFn: () => api.getWebhookLogs(limit, offset),
  });
};

export const useRetryWebhook = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (logId: string) => api.retryWebhook(logId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook_logs'] });
    },
  });
};

// Health Check
export const useHealthCheck = () => {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => api.healthCheck(),
    refetchInterval: 30000, // Check every 30 seconds
  });
};

// API Logs
export const useAPILogs = (filters?: {
  limit?: number;
  offset?: number;
  method?: string;
  status_code?: number;
  object_type?: string;
  object_id?: string;
}) => {
  const params = new URLSearchParams();
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.offset) params.append('offset', filters.offset.toString());
  if (filters?.method) params.append('method', filters.method);
  if (filters?.status_code) params.append('status_code', filters.status_code.toString());
  if (filters?.object_type) params.append('object_type', filters.object_type);
  if (filters?.object_id) params.append('object_id', filters.object_id);
  
  return useQuery({
    queryKey: ['api_logs', filters],
    queryFn: () => api.getAPILogs(params.toString()),
    refetchInterval: 5000, // Refresh every 5 seconds
  });
};

export const useClearAPILogs = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.clearAPILogs(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api_logs'] });
    },
  });
};

// Data Management
export const useFlushData = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.flushData(),
    onSuccess: () => {
      // Invalidate all queries after flushing data
      queryClient.invalidateQueries();
    },
  });
};