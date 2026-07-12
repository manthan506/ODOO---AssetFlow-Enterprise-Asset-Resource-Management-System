const API_BASE = '/api'

function getToken(): string | null {
  return localStorage.getItem('assetflow_token')
}

export function setToken(token: string) {
  localStorage.setItem('assetflow_token', token)
}

export function clearToken() {
  localStorage.removeItem('assetflow_token')
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (!res.ok) {
    let errorData: { error?: string; suggestTransfer?: boolean }
    try {
      errorData = await res.json()
    } catch {
      throw new Error(`Request failed (${res.status})`)
    }
    const err = new Error(errorData.error || `Request failed (${res.status})`)
    ;(err as any).status = res.status
    ;(err as any).suggestTransfer = errorData.suggestTransfer
    throw err
  }

  return res.json()
}

export const api = {
  // Auth
  signup: (data: { name: string; email: string; password: string; role: string; department_id?: number }) =>
    request<{ token: string; user: User }>('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    request<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request<{ user: User }>('/auth/me'),
  listUsers: () => request<{ users: User[] }>('/auth/users'),

  // Departments
  listDepartments: () => request<{ departments: Department[] }>('/departments'),
  createDepartment: (data: Partial<Department>) =>
    request<{ id: number }>('/departments', { method: 'POST', body: JSON.stringify(data) }),
  updateDepartment: (id: number, data: Partial<Department>) =>
    request<{ success: boolean }>(`/departments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Categories
  listCategories: () => request<{ categories: AssetCategory[] }>('/categories'),
  createCategory: (data: { name: string; custom_fields?: Record<string, unknown> }) =>
    request<{ id: number }>('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id: number, data: Partial<AssetCategory>) =>
    request<{ success: boolean }>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id: number) =>
    request<{ success: boolean }>(`/categories/${id}`, { method: 'DELETE' }),

  // Assets
  listAssets: (params?: { status?: string; category_id?: number; search?: string }) => {
    const q = new URLSearchParams()
    if (params?.status) q.set('status', params.status)
    if (params?.category_id) q.set('category_id', String(params.category_id))
    if (params?.search) q.set('search', params.search)
    return request<{ assets: Asset[] }>(`/assets${q.toString() ? '?' + q : ''}`)
  },
  getAsset: (id: number) => request<{ asset: Asset }>(`/assets/${id}`),
  createAsset: (data: Partial<Asset>) =>
    request<{ id: number; tag: string }>('/assets', { method: 'POST', body: JSON.stringify(data) }),
  updateAsset: (id: number, data: Partial<Asset>) =>
    request<{ success: boolean }>(`/assets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAsset: (id: number) =>
    request<{ success: boolean }>(`/assets/${id}`, { method: 'DELETE' }),

  // Allocations
  listAllocations: (params?: { status?: string; user_id?: number }) => {
    const q = new URLSearchParams()
    if (params?.status) q.set('status', params.status)
    if (params?.user_id) q.set('user_id', String(params.user_id))
    return request<{ allocations: Allocation[] }>(`/allocations${q.toString() ? '?' + q : ''}`)
  },
  createAllocation: (data: { asset_id: number; user_id?: number; department_id?: number; expected_return_date?: string }) =>
    request<{ id: number }>('/allocations', { method: 'POST', body: JSON.stringify(data) }),
  returnAllocation: (id: number, data: { return_condition_notes?: string }) =>
    request<{ success: boolean }>(`/allocations/${id}/return`, { method: 'PUT', body: JSON.stringify(data) }),
  listTransferRequests: () => request<{ transfers: TransferRequest[] }>('/allocations/transfer'),
  createTransferRequest: (data: { asset_id: number; from_user_id?: number; to_user_id?: number; reason?: string }) =>
    request<{ id: number }>('/allocations/transfer', { method: 'POST', body: JSON.stringify(data) }),
  approveTransfer: (id: number) =>
    request<{ success: boolean }>(`/allocations/transfer/${id}/approve`, { method: 'PUT' }),

  // Bookings
  listBookings: (params?: { asset_id?: number; user_id?: number; status?: string }) => {
    const q = new URLSearchParams()
    if (params?.asset_id) q.set('asset_id', String(params.asset_id))
    if (params?.user_id) q.set('user_id', String(params.user_id))
    if (params?.status) q.set('status', params.status)
    return request<{ bookings: Booking[] }>(`/bookings${q.toString() ? '?' + q : ''}`)
  },
  createBooking: (data: { asset_id: number; start_time: string; end_time: string; purpose?: string }) =>
    request<{ id: number }>('/bookings', { method: 'POST', body: JSON.stringify(data) }),
  cancelBooking: (id: number) =>
    request<{ success: boolean }>(`/bookings/${id}/cancel`, { method: 'PUT' }),

  // Maintenance
  listMaintenance: (params?: { status?: string; asset_id?: number }) => {
    const q = new URLSearchParams()
    if (params?.status) q.set('status', params.status)
    if (params?.asset_id) q.set('asset_id', String(params.asset_id))
    return request<{ maintenance: MaintenanceRequest[] }>(`/maintenance${q.toString() ? '?' + q : ''}`)
  },
  createMaintenance: (data: { asset_id: number; issue_description: string; priority?: string; photo_url?: string }) =>
    request<{ id: number }>('/maintenance', { method: 'POST', body: JSON.stringify(data) }),
  approveMaintenance: (id: number, data: { technician_name?: string }) =>
    request<{ success: boolean }>(`/maintenance/${id}/approve`, { method: 'PUT', body: JSON.stringify(data) }),
  resolveMaintenance: (id: number, data: { resolution_notes?: string }) =>
    request<{ success: boolean }>(`/maintenance/${id}/resolve`, { method: 'PUT', body: JSON.stringify(data) }),

  // Audits
  listAuditCycles: () => request<{ cycles: AuditCycle[] }>('/audits'),
  createAuditCycle: (data: { title: string; scope?: string; auditor_ids?: number[]; asset_ids?: number[] }) =>
    request<{ id: number }>('/audits', { method: 'POST', body: JSON.stringify(data) }),
  getAuditCycle: (id: number) => request<{ cycle: AuditCycle; items: AuditItem[] }>(`/audits/${id}`),
  updateAuditItem: (id: number, data: { status?: string; discrepancy_notes?: string }) =>
    request<{ success: boolean }>(`/audits/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  closeAuditCycle: (id: number) =>
    request<{ success: boolean }>(`/audits/${id}/close`, { method: 'PUT' }),

  // Reports
  getDashboardStats: () => request<{ stats: DashboardStats }>('/reports/dashboard'),
  getActivityLogs: (limit?: number) =>
    request<{ logs: ActivityLog[] }>(`/reports/activity${limit ? '?limit=' + limit : ''}`),
  getCategoryBreakdown: () => request<{ breakdown: { category_name: string; count: number; value: number }[] }>('/reports/category-breakdown'),
  getStatusBreakdown: () => request<{ breakdown: { status: string; count: number }[] }>('/reports/status-breakdown'),
  getAllocationTrend: () => request<{ trend: { date: string; count: number }[] }>('/reports/allocation-trend'),

  // Notifications
  listNotifications: () => request<{ notifications: Notification[] }>('/notifications'),
  markRead: (id: number) => request<{ success: boolean }>(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllRead: () => request<{ success: boolean }>('/notifications/read-all', { method: 'PUT' }),
  deleteNotification: (id: number) => request<{ success: boolean }>(`/notifications/${id}`, { method: 'DELETE' }),
}

import type { User, Department, AssetCategory, Asset, Allocation, TransferRequest, Booking, MaintenanceRequest, AuditCycle, AuditItem, Notification, ActivityLog, DashboardStats } from './types'
