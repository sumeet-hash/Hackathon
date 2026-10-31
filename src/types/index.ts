// src/types/index.ts

export type UserRole = 'admin' | 'staff' | 'customer';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  company_name?: string | null;
  phone?: string | null;
  address?: string | null;
  created_at?: string;
}

export interface ProductVariant {
  id: number;
  product_id: number;
  attribute_name: string;
  variant_value: string;
  price_extra: number;
  sku?: string | null;
  is_active?: number;
}

export interface Product {
  id: number;
  name: string;
  type: 'software_license' | 'service' | 'addon' | 'hardware' | string;
  sales_price: number;
  cost_price: number;
  notes?: string | null;
  is_active: number;
  variants: ProductVariant[];
}

export interface Plan {
  id: number;
  name: string;
  code: string;
  cost: number;
  billing_frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  min_quantity: number;
  start_date: string;
  end_date?: string | null;
  auto_close_on_end: number | boolean;
  can_close_early: number | boolean;
  can_pause: number | boolean;
  can_renew: number | boolean;
  description?: string | null;
  is_active: number;
  active_subscriptions_count?: number;
}

export interface Tax {
  id: number;
  name: string;
  rate: number;
  tax_type: 'percentage' | 'fixed';
  is_default: number;
  is_active: number;
}

export interface Discount {
  id: number;
  code: string;
  name: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_purchase_amount: number;
  min_quantity: number;
  start_date: string;
  end_date?: string | null;
  usage_limit?: number | null;
  times_used: number;
  scope: 'product' | 'subscription';
  target_product_id?: number | null;
  target_product_name?: string | null;
  is_active: number;
}

export interface QuotationTemplateLine {
  id?: number;
  template_id?: number;
  product_id: number;
  product_name?: string;
  variant_id?: number | null;
  variant_value?: string;
  quantity: number;
  unit_price: number;
  tax_id?: number | null;
  tax_rate?: number;
}

export interface QuotationTemplate {
  id: number;
  name: string;
  plan_id: number;
  plan_name?: string;
  billing_frequency?: string;
  plan_cost?: number;
  validity_days: number;
  notes?: string | null;
  lines: QuotationTemplateLine[];
}

export type SubscriptionStatus = 'draft' | 'quotation' | 'confirmed' | 'active' | 'paused' | 'closed';

export interface SubscriptionLine {
  id?: number;
  subscription_id?: number;
  product_id: number;
  product_name?: string;
  product_type?: string;
  variant_id?: number | null;
  variant_value?: string;
  attribute_name?: string;
  price_extra?: number;
  quantity: number;
  unit_price: number;
  tax_id?: number | null;
  tax_name?: string;
  tax_rate?: number;
  tax_amount?: number;
  discount_amount?: number;
  line_total: number;
}

export interface Subscription {
  id: number;
  subscription_number: string;
  customer_id: number;
  customer_name?: string;
  customer_email?: string;
  company_name?: string;
  phone?: string;
  address?: string;
  sales_rep_id?: number | null;
  sales_rep_name?: string;
  plan_id: number;
  plan_name?: string;
  plan_code?: string;
  billing_frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  plan_cost?: number;
  plan_auto_close?: number;
  can_close_early?: number;
  can_pause?: number;
  can_renew?: number;
  start_date: string;
  expiry_date?: string | null;
  payment_terms: 'immediate' | 'net_15' | 'net_30' | 'net_60';
  status: SubscriptionStatus;
  last_billed_date?: string | null;
  next_billing_date?: string | null;
  auto_close_on_end: number;
  discount_id?: number | null;
  discount_code?: string;
  discount_name?: string;
  subtotal: number;
  tax_total: number;
  discount_total: number;
  total_amount: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type InvoiceStatus = 'draft' | 'confirmed' | 'paid' | 'cancelled';

export interface InvoiceLine {
  id?: number;
  invoice_id?: number;
  product_id?: number;
  product_name?: string;
  variant_id?: number | null;
  variant_value?: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_id?: number | null;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  line_total: number;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  subscription_id?: number | null;
  subscription_number?: string | null;
  customer_id: number;
  customer_name?: string;
  customer_email?: string;
  company_name?: string;
  phone?: string;
  address?: string;
  invoice_date: string;
  due_date: string;
  payment_terms: string;
  status: InvoiceStatus;
  billing_period_start?: string | null;
  billing_period_end?: string | null;
  subtotal: number;
  tax_total: number;
  discount_total: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  is_overdue: number;
  sent_at?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface Payment {
  id: number;
  payment_number: string;
  invoice_id: number;
  invoice_number?: string;
  invoice_total?: number;
  customer_id: number;
  customer_name?: string;
  customer_email?: string;
  amount: number;
  payment_method: 'credit_card' | 'bank_transfer' | 'stripe' | 'paypal' | 'cash' | 'cheque';
  payment_date: string;
  reference_note?: string | null;
  recorded_by_name?: string;
  created_at: string;
}

export interface SimulatedEmail {
  id: number;
  to_email: string;
  subject: string;
  body: string;
  email_type: string;
  created_at: string;
}

export interface DashboardMetrics {
  activeSubscriptions: number;
  totalSubscriptions: number;
  draftSubscriptions: number;
  quotationSubscriptions: number;
  pausedSubscriptions: number;
  closedSubscriptions: number;
  mrr: number;
  arr: number;
  totalRevenueCollected: number;
  totalOutstanding: number;
  overdueInvoicesCount: number;
  overdueAmount: number;
  totalInvoiced: number;
}

