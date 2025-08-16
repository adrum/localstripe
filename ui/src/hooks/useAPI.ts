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
    mutationFn: (data: Record<string, any>) => api.createCustomer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
};

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, any> }) =>
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
    mutationFn: (data: Record<string, any>) => api.createSubscription(data),
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
    mutationFn: (data: Record<string, any>) => api.createPlan(data),
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
    mutationFn: (data: Record<string, any>) => api.createCharge(data),
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
    mutationFn: (data: Record<string, any>) => api.createPaymentIntent(data),
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