// In development, use relative URLs to leverage Vite proxy
// In production, use the full URL
const API_BASE = import.meta.env.DEV ? '' : 'http://localhost:8420';
const API_KEY = 'sk_test_12345'; // Default test key for localstripe

class LocalStripeAPI {
  private baseURL: string;
  private apiKey: string;

  constructor(baseURL = API_BASE, apiKey = API_KEY) {
    this.baseURL = baseURL;
    this.apiKey = apiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const config: RequestInit = {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  private formEncode(data: Record<string, any>): string {
    return Object.entries(data)
      .map(([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
      )
      .join('&');
  }

  // Customer endpoints
  async getCustomers() {
    return this.request('/v1/customers');
  }

  async getCustomer(id: string) {
    return this.request(`/v1/customers/${id}`);
  }

  async createCustomer(data: Record<string, any>) {
    return this.request('/v1/customers', {
      method: 'POST',
      body: this.formEncode(data),
    });
  }

  async updateCustomer(id: string, data: Record<string, any>) {
    return this.request(`/v1/customers/${id}`, {
      method: 'POST',
      body: this.formEncode(data),
    });
  }

  async deleteCustomer(id: string) {
    return this.request(`/v1/customers/${id}`, {
      method: 'DELETE',
    });
  }

  // Subscription endpoints
  async getSubscriptions() {
    return this.request('/v1/subscriptions');
  }

  async getSubscription(id: string) {
    return this.request(`/v1/subscriptions/${id}`);
  }

  async createSubscription(data: Record<string, any>) {
    return this.request('/v1/subscriptions', {
      method: 'POST',
      body: this.formEncode(data),
    });
  }

  // Plan endpoints
  async getPlans() {
    return this.request('/v1/plans');
  }

  async createPlan(data: Record<string, any>) {
    return this.request('/v1/plans', {
      method: 'POST',
      body: this.formEncode(data),
    });
  }

  // Charge endpoints
  async getCharges() {
    return this.request('/v1/charges');
  }

  async getCharge(id: string) {
    return this.request(`/v1/charges/${id}`);
  }

  async createCharge(data: Record<string, any>) {
    return this.request('/v1/charges', {
      method: 'POST',
      body: this.formEncode(data),
    });
  }

  // Payment Intent endpoints
  async getPaymentIntents() {
    return this.request('/v1/payment_intents');
  }

  async getPaymentIntent(id: string) {
    return this.request(`/v1/payment_intents/${id}`);
  }

  async createPaymentIntent(data: Record<string, any>) {
    return this.request('/v1/payment_intents', {
      method: 'POST',
      body: this.formEncode(data),
    });
  }

  // Webhook configuration
  async configureWebhook(name: string, url: string, secret: string, events?: string[]) {
    const data: Record<string, any> = { url, secret };
    if (events) {
      data.events = events.join(',');
    }

    return this.request(`/_config/webhooks/${name}`, {
      method: 'POST',
      body: this.formEncode(data),
    });
  }

  async getWebhooks() {
    return this.request('/_config/webhooks');
  }

  async deleteWebhook(name: string) {
    return this.request(`/_config/webhooks/${name}`, {
      method: 'DELETE',
    });
  }

  // Webhook logs
  async getWebhookLogs(limit = 50, offset = 0) {
    return this.request(`/_config/webhook_logs?limit=${limit}&offset=${offset}`);
  }

  async retryWebhook(logId: string) {
    return this.request(`/_config/webhook_logs/${logId}/retry`, {
      method: 'POST',
    });
  }


  // API Logs
  async getAPILogs(queryParams = '') {
    const url = queryParams ? `/_config/api_logs?${queryParams}` : '/_config/api_logs';
    return this.request(url);
  }

  async clearAPILogs() {
    return this.request('/_config/api_logs', {
      method: 'DELETE',
    });
  }

  // Data management
  async flushData() {
    return this.request('/_config/data', {
      method: 'DELETE',
    });
  }

  // Health check
  async healthCheck() {
    try {
      await this.request('/v1/customers?limit=1');
      return { status: 'connected', url: this.baseURL };
    } catch (error) {
      return { status: 'disconnected', url: this.baseURL, error };
    }
  }
}

export const api = new LocalStripeAPI();
export default api;
