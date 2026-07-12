export type Role = 'admin' | 'asset_manager' | 'department_head' | 'employee'

export interface User {
  id: number
  name: string
  email: string
  role: Role
  department_id: number | null
  status: string
}

export interface Department {
  id: number
  name: string
  head_user_id: number | null
  head_name?: string | null
  parent_department_id: number | null
  status: string
  member_count?: number
}

export interface AssetCategory {
  id: number
  name: string
  custom_fields: string | Record<string, unknown>
  asset_count?: number
}

export interface Asset {
  id: number
  tag: string
  name: string
  category_id: number | null
  category_name?: string
  serial_number: string | null
  acquisition_date: string | null
  acquisition_cost: number
  condition: string
  location: string | null
  photo_url: string | null
  is_bookable: boolean
  status: string
  department_id: number | null
  department_name?: string
  created_by: number
  created_at: string
  allocated_user_name?: string | null
}

export interface Allocation {
  id: number
  asset_id: number
  user_id: number | null
  department_id: number | null
  allocated_by: number
  allocated_date: string
  expected_return_date: string | null
  actual_return_date: string | null
  return_condition_notes: string | null
  status: string
  created_at: string
  asset_name?: string
  asset_tag?: string
  user_name?: string
  allocated_by_name?: string
  department_name?: string
}

export interface TransferRequest {
  id: number
  asset_id: number
  from_user_id: number | null
  to_user_id: number | null
  to_department_id?: number | null
  requested_by: number
  reason: string | null
  status: string
  approved_by?: number | null
  approved_at?: string | null
  created_at: string
}

export interface Booking {
  id: number
  asset_id: number
  booked_by: number
  start_time: string
  end_time: string
  purpose: string | null
  status: string
  created_at: string
  asset_name?: string
  asset_tag?: string
  user_name?: string
}

export interface MaintenanceRequest {
  id: number
  asset_id: number
  raised_by: number
  issue_description: string
  priority: string
  photo_url: string | null
  status: string
  technician_name: string | null
  resolution_notes: string | null
  approved_by: number | null
  approved_at: string | null
  resolved_at: string | null
  created_at: string
  asset_name?: string
  asset_tag?: string
  raised_by_name?: string
  approved_by_name?: string
}

export interface AuditCycle {
  id: number
  title: string
  scope: string
  created_by: number
  created_by_name?: string
  status: string
  started_at: string
  completed_at: string | null
  total_items?: number
  discrepancy_count?: number
}

export interface AuditItem {
  id: number
  cycle_id: number
  asset_id: number
  expected_status: string
  actual_status: string | null
  status: string
  discrepancy_notes: string | null
  checked_by: number | null
  checked_at: string | null
  asset_name?: string
  asset_tag?: string
  asset_current_status?: string
}

export interface Notification {
  id: number
  user_id: number
  type: string
  message: string
  related_id: number | null
  related_type: string | null
  is_read: boolean
  created_at: string
}

export interface ActivityLog {
  id: number
  user_id: number
  action: string
  entity_type: string
  entity_id: number | null
  details: string | null
  created_at: string
  user_name?: string
}

export interface DashboardStats {
  totalAssets: number
  availableAssets: number
  allocatedAssets: number
  underMaintenance: number
  activeAllocations: number
  overdueAllocations: number
  pendingMaintenance: number
  upcomingBookings: number
  totalValue: number
  totalUsers: number
}
