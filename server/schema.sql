-- ============================================================
-- AssetFlow — MySQL Schema
-- Enterprise Asset & Resource Management System
-- ============================================================

CREATE DATABASE IF NOT EXISTS assetflow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE assetflow;

-- USERS (all roles live here; role assigned by admin, never self-selected)
CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  head_user_id INT,
  parent_department_id INT,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('employee','department_head','asset_manager','admin') DEFAULT 'employee',
  department_id INT,
  status ENUM('active','inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

ALTER TABLE departments ADD CONSTRAINT fk_head FOREIGN KEY (head_user_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE departments ADD CONSTRAINT fk_parent FOREIGN KEY (parent_department_id) REFERENCES departments(id) ON DELETE SET NULL;

-- ASSET CATEGORIES
CREATE TABLE IF NOT EXISTS asset_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  custom_fields JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ASSETS
CREATE TABLE IF NOT EXISTS assets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tag VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  category_id INT,
  serial_number VARCHAR(100),
  acquisition_date DATE,
  acquisition_cost DECIMAL(12,2),
  condition VARCHAR(50) DEFAULT 'good',
  location VARCHAR(150),
  photo_url TEXT,
  is_bookable BOOLEAN DEFAULT FALSE,
  status ENUM('available','allocated','reserved','under_maintenance','lost','retired','disposed') DEFAULT 'available',
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES asset_categories(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ALLOCATIONS (who holds what, right now)
CREATE TABLE IF NOT EXISTS allocations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  asset_id INT NOT NULL,
  user_id INT,
  department_id INT,
  allocated_by INT,
  allocated_date DATE DEFAULT (CURRENT_DATE),
  expected_return_date DATE,
  actual_return_date DATE,
  return_condition_notes TEXT,
  status ENUM('active','returned','transferred') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (allocated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- TRANSFER REQUESTS (used when asset already allocated)
CREATE TABLE IF NOT EXISTS transfer_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  asset_id INT NOT NULL,
  from_user_id INT,
  to_user_id INT,
  to_department_id INT,
  requested_by INT NOT NULL,
  reason TEXT,
  status ENUM('pending','approved','rejected','completed') DEFAULT 'pending',
  approved_by INT,
  approved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
  FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE
);

-- RESOURCE BOOKINGS (time-slot, overlap-checked)
CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  asset_id INT NOT NULL,
  booked_by INT NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  purpose TEXT,
  status ENUM('upcoming','ongoing','completed','cancelled') DEFAULT 'upcoming',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
  FOREIGN KEY (booked_by) REFERENCES users(id) ON DELETE CASCADE
);

-- MAINTENANCE REQUESTS (approval workflow)
CREATE TABLE IF NOT EXISTS maintenance_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  asset_id INT NOT NULL,
  raised_by INT NOT NULL,
  issue_description TEXT NOT NULL,
  priority ENUM('low','medium','high','critical') DEFAULT 'medium',
  photo_url TEXT,
  status ENUM('pending','approved','rejected','in_progress','resolved') DEFAULT 'pending',
  technician_name VARCHAR(100),
  resolution_notes TEXT,
  approved_by INT,
  approved_at TIMESTAMP NULL,
  resolved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
  FOREIGN KEY (raised_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- AUDIT CYCLES
CREATE TABLE IF NOT EXISTS audit_cycles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  department_id INT,
  location VARCHAR(150),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status ENUM('open','in_progress','closed') DEFAULT 'open',
  created_by INT NOT NULL,
  closed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_cycle_auditors (
  audit_cycle_id INT NOT NULL,
  user_id INT NOT NULL,
  PRIMARY KEY (audit_cycle_id, user_id),
  FOREIGN KEY (audit_cycle_id) REFERENCES audit_cycles(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  audit_cycle_id INT NOT NULL,
  asset_id INT NOT NULL,
  auditor_id INT,
  verification ENUM('pending','verified','missing','damaged') DEFAULT 'pending',
  notes TEXT,
  checked_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_cycle_asset (audit_cycle_id, asset_id),
  FOREIGN KEY (audit_cycle_id) REFERENCES audit_cycles(id) ON DELETE CASCADE,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
  FOREIGN KEY (auditor_id) REFERENCES users(id) ON DELETE SET NULL
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(50),
  message TEXT,
  related_id INT,
  related_type VARCHAR(50),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ACTIVITY LOGS (audit trail of everything)
CREATE TABLE IF NOT EXISTS activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(100),
  entity_type VARCHAR(50),
  entity_id INT,
  details JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- INDEXES
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_category ON assets(category_id);
CREATE INDEX idx_allocations_asset ON allocations(asset_id);
CREATE INDEX idx_allocations_status ON allocations(status);
CREATE INDEX idx_bookings_asset_time ON bookings(asset_id, start_time, end_time);
CREATE INDEX idx_maintenance_asset ON maintenance_requests(asset_id);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at);
