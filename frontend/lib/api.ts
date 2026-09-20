import {
  User,
  Transaction,
  TransactionListResponse,
  UploadResponse,
  UploadItem,
  DetectionJob,
  Subscription,
  SubscriptionDetail,
  DashboardData,
  InsightsData,
  UserSettings
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    let errorData: any;
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: { message: response.statusText } };
    }
    const err = errorData?.error || { message: `Request failed: ${response.status}` };
    throw new Error(err.message || 'An unexpected error occurred');
  }

  return response.json();
}

export const api = {
  // Health
  getHealth: () => request<{ status: string; db: string }>('/health'),

  // Demo users & management
  getUsers: () => request<User[]>('/demo/users'),
  seedDemo: () => request<{ status: string; message: string }>('/demo/seed', { method: 'POST' }),
  resetDemo: (userId: number = 1) =>
    request<{ status: string; message: string }>(`/demo/reset?user_id=${userId}`, { method: 'POST' }),

  // Dashboard
  getDashboard: (userId: number = 1) => request<DashboardData>(`/dashboard?user_id=${userId}`),

  // Insights
  getInsights: (userId: number = 1) => request<InsightsData>(`/insights?user_id=${userId}`),

  // Settings
  getSettings: (userId: number = 1) => request<UserSettings>(`/settings?user_id=${userId}`),
  updateSettings: (data: Partial<UserSettings>, userId: number = 1) =>
    request<UserSettings>(`/settings?user_id=${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Transactions
  getTransactions: (params: {
    userId?: number;
    search?: string;
    from?: string;
    to?: string;
    category?: string;
    recurring?: boolean;
    merchantId?: number;
    sort?: string;
    order?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const query = new URLSearchParams();
    query.append('user_id', String(params.userId ?? 1));
    if (params.search) query.append('search', params.search);
    if (params.from) query.append('from', params.from);
    if (params.to) query.append('to', params.to);
    if (params.category && params.category !== 'all') query.append('category', params.category);
    if (params.recurring !== undefined) query.append('recurring', String(params.recurring));
    if (params.merchantId !== undefined) query.append('merchant_id', String(params.merchantId));
    if (params.sort) query.append('sort', params.sort);
    if (params.order) query.append('order', params.order);
    if (params.page) query.append('page', String(params.page));
    if (params.pageSize) query.append('page_size', String(params.pageSize));

    return request<TransactionListResponse>(`/transactions?${query.toString()}`);
  },

  getTransaction: (id: number, userId: number = 1) =>
    request<Transaction>(`/transactions/${id}?user_id=${userId}`),

  // Subscriptions
  getSubscriptions: (params?: {
    userId?: number;
    search?: string;
    status?: string;
    band?: string;
    merchantId?: number;
    sort?: string;
    order?: string;
  }) => {
    const query = new URLSearchParams();
    query.append('user_id', String(params?.userId ?? 1));
    if (params?.search) query.append('search', params.search);
    if (params?.status && params.status !== 'all') query.append('status', params.status);
    if (params?.band && params.band !== 'all') query.append('band', params.band);
    if (params?.merchantId !== undefined) query.append('merchant_id', String(params.merchantId));
    if (params?.sort) query.append('sort', params.sort);
    if (params?.order) query.append('order', params.order);

    return request<Subscription[]>(`/subscriptions?${query.toString()}`);
  },

  getSubscription: (id: number, userId: number = 1) =>
    request<SubscriptionDetail>(`/subscriptions/${id}?user_id=${userId}`),

  updateSubscription: (
    id: number,
    data: { status?: string; reviewed?: boolean; notes?: string },
    userId: number = 1
  ) =>
    request<Subscription>(`/subscriptions/${id}?user_id=${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getForgotten: (userId: number = 1) => request<Subscription[]>(`/forgotten?user_id=${userId}`),

  // Upload & Analysis
  uploadFile: async (file: File, userId: number = 1): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE_URL}/upload?user_id=${userId}`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      let errorData: any;
      try {
        errorData = await res.json();
      } catch {
        errorData = { error: { message: res.statusText } };
      }
      throw new Error(errorData?.error?.message || 'File upload failed');
    }

    return res.json();
  },

  getUploads: (userId: number = 1) => request<UploadItem[]>(`/uploads?user_id=${userId}`),

  deleteUpload: (uploadId: string, userId: number = 1) =>
    request<{ status: string; upload_id: string }>(`/uploads/${uploadId}?user_id=${userId}`, {
      method: 'DELETE',
    }),

  startAnalyze: (uploadId?: string, userId: number = 1) =>
    request<{ job_id: string; status: string }>(`/analyze?user_id=${userId}`, {
      method: 'POST',
      body: JSON.stringify({ upload_id: uploadId }),
    }),

  getAnalyzeStatus: (jobId: string) => request<DetectionJob>(`/analyze/${jobId}`),
};
