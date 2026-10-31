// src/services/api.ts

const API_BASE = '/api';

export function getToken(): string | null {
  return localStorage.getItem('brightloop_token');
}

export function setToken(token: string) {
  localStorage.setItem('brightloop_token', token);
}

export function removeToken() {
  localStorage.removeItem('brightloop_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || data.message || `Request failed with status ${res.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  register: (payload: any) => request<any>('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload: any) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  getMe: () => request<{ user: any }>('/auth/me'),
  forgotPassword: (payload: { email: string }) => request<any>('/auth/forgot-password', { method: 'POST', body: JSON.stringify(payload) }),
  resetPassword: (payload: any) => request<any>('/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) }),
  getSimulatedEmails: () => request<{ emails: any[] }>('/auth/simulated-emails'),

  // Staff & Customers
  getStaff: () => request<{ staff: any[] }>('/staff'),
  createStaff: (payload: any) => request<any>('/staff', { method: 'POST', body: JSON.stringify(payload) }),
  deleteStaff: (id: number) => request<any>(`/staff/${id}`, { method: 'DELETE' }),
  getCustomers: () => request<{ customers: any[] }>('/staff/customers'),

  // Products & Variants
  getProducts: () => request<{ products: any[] }>('/products'),
  createProduct: (payload: any) => request<any>('/products', { method: 'POST', body: JSON.stringify(payload) }),
  updateProduct: (id: number, payload: any) => request<any>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteProduct: (id: number) => request<any>(`/products/${id}`, { method: 'DELETE' }),
  addVariant: (productId: number, payload: any) => request<any>(`/products/${productId}/variants`, { method: 'POST', body: JSON.stringify(payload) }),
  deleteVariant: (productId: number, variantId: number) => request<any>(`/products/${productId}/variants/${variantId}`, { method: 'DELETE' }),

  // Plans
  getPlans: () => request<{ plans: any[] }>('/plans'),
  createPlan: (payload: any) => request<any>('/plans', { method: 'POST', body: JSON.stringify(payload) }),
  updatePlan: (id: number, payload: any) => request<any>(`/plans/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deletePlan: (id: number) => request<any>(`/plans/${id}`, { method: 'DELETE' }),

  // Taxes
  getTaxes: () => request<{ taxes: any[] }>('/taxes'),
  createTax: (payload: any) => request<any>('/taxes', { method: 'POST', body: JSON.stringify(payload) }),
  updateTax: (id: number, payload: any) => request<any>(`/taxes/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteTax: (id: number) => request<any>(`/taxes/${id}`, { method: 'DELETE' }),

  // Discounts
  getDiscounts: () => request<{ discounts: any[] }>('/discounts'),
  createDiscount: (payload: any) => request<any>('/discounts', { method: 'POST', body: JSON.stringify(payload) }),
  updateDiscount: (id: number, payload: any) => request<any>(`/discounts/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteDiscount: (id: number) => request<any>(`/discounts/${id}`, { method: 'DELETE' }),

  // Quotation Templates
  getTemplates: () => request<{ templates: any[] }>('/quotation-templates'),
  createTemplate: (payload: any) => request<any>('/quotation-templates', { method: 'POST', body: JSON.stringify(payload) }),
  deleteTemplate: (id: number) => request<any>(`/quotation-templates/${id}`, { method: 'DELETE' }),

  // Subscriptions
  getSubscriptions: (params: Record<string, any> = {}) => {
    const q = new URLSearchParams(params).toString();
    return request<{ total: number; subscriptions: any[] }>(`/subscriptions${q ? '?' + q : ''}`);
  },
  getSubscription: (id: number) => request<{ subscription: any; lines: any[]; invoices: any[] }>(`/subscriptions/${id}`),
  createSubscription: (payload: any) => request<any>('/subscriptions', { method: 'POST', body: JSON.stringify(payload) }),
  transitionSubscription: (id: number, action: string, extra: any = {}) =>
    request<any>(`/subscriptions/${id}/transition`, { method: 'POST', body: JSON.stringify({ action, ...extra }) }),

  // Invoices
  getInvoices: (params: Record<string, any> = {}) => {
    const q = new URLSearchParams(params).toString();
    return request<{ total: number; invoices: any[] }>(`/invoices${q ? '?' + q : ''}`);
  },
  getInvoice: (id: number) => request<{ invoice: any; lines: any[]; payments: any[] }>(`/invoices/${id}`),
  confirmInvoice: (id: number) => request<any>(`/invoices/${id}/confirm`, { method: 'POST' }),
  cancelInvoice: (id: number) => request<any>(`/invoices/${id}/cancel`, { method: 'POST' }),
  sendInvoice: (id: number) => request<any>(`/invoices/${id}/send`, { method: 'POST' }),
  chaseOverdue: () => request<any>('/invoices/chase-overdue', { method: 'POST' }),

  // Payments
  getPayments: (params: Record<string, any> = {}) => {
    const q = new URLSearchParams(params).toString();
    return request<{ payments: any[] }>(`/payments${q ? '?' + q : ''}`);
  },
  recordPayment: (payload: any) => request<any>('/payments', { method: 'POST', body: JSON.stringify(payload) }),

  // Billing Day Engine
  getBillingPreview: (date?: string) => request<any>(`/billing/preview${date ? '?date=' + date : ''}`),
  runBilling: (targetDate?: string) => request<any>('/billing/run', { method: 'POST', body: JSON.stringify({ targetDate }) }),
  getBillingHistory: () => request<{ runs: any[] }>('/billing/history'),

  // Analytics & Benchmark
  getDashboard: (params: Record<string, any> = {}) => {
    const q = new URLSearchParams(params).toString();
    return request<any>(`/analytics/dashboard${q ? '?' + q : ''}`);
  },
  runBenchmark: (seedCount: number = 0) => request<any>('/analytics/benchmark', { method: 'POST', body: JSON.stringify({ seedCount }) })
};

