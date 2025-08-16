export interface Customer {
  id: string;
  object: 'customer';
  created: number;
  description?: string;
  email?: string;
  name?: string;
  phone?: string;
  account_balance: number;
  currency: string;
  default_source?: string;
  delinquent: boolean;
  livemode: boolean;
  metadata: Record<string, string>;
  subscriptions?: {
    data: Subscription[];
    has_more: boolean;
    total_count: number;
  };
}

export interface Subscription {
  id: string;
  object: 'subscription';
  created: number;
  current_period_end: number;
  current_period_start: number;
  customer: string;
  status: 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid';
  items: {
    data: SubscriptionItem[];
  };
  metadata: Record<string, string>;
}

export interface SubscriptionItem {
  id: string;
  object: 'subscription_item';
  created: number;
  plan: Plan;
  quantity: number;
  subscription: string;
}

export interface Plan {
  id: string;
  object: 'plan';
  active: boolean;
  amount: number;
  created: number;
  currency: string;
  interval: 'day' | 'week' | 'month' | 'year';
  interval_count: number;
  livemode: boolean;
  metadata: Record<string, string>;
  name: string;
  statement_descriptor?: string;
  trial_period_days?: number;
}

export interface Charge {
  id: string;
  object: 'charge';
  amount: number;
  amount_captured: number;
  amount_refunded: number;
  captured: boolean;
  created: number;
  currency: string;
  customer?: string;
  description?: string;
  paid: boolean;
  refunded: boolean;
  status: 'succeeded' | 'pending' | 'failed';
  metadata: Record<string, string>;
}

export interface PaymentIntent {
  id: string;
  object: 'payment_intent';
  amount: number;
  currency: string;
  created: number;
  customer?: string;
  description?: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'requires_capture' | 'canceled' | 'succeeded';
  metadata: Record<string, string>;
}

export interface Webhook {
  id: string;
  url: string;
  secret: string;
  events?: string[];
}

export interface LocalStripeResponse<T> {
  object: 'list';
  data: T[];
  has_more: boolean;
  url: string;
}