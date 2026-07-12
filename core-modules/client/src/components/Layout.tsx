import { useState, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, ArrowLeftRight, Calendar, Wrench, ClipboardCheck,
  Building2, BarChart3, Bell, LogOut, Menu, X, ChevronDown,
} from 'lucide-react'
import { useAuth } from '../lib/auth'
import type { Role } from '../lib/types'
import { useNotifications } from '../lib/notifications'
import { ParticleField } from './ParticleField'

interface NavItem {
  to: string
  label: string
  icon: ReactNode
  roles?: Role[]
}

const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { to: '/assets', label: 'Assets', icon: <Package size={20} /> },
  { to: '/allocations', label: 'Allocations', icon: <ArrowLeftRight size={20} /> },
  { to: '/bookings', label: 'Bookings', icon: <Calendar size={20} /> },
  { to: '/maintenance', label: 'Maintenance', icon: <Wrench size={20} /> },
  { to: '/audits', label: 'Audits', icon: <ClipboardCheck size={20} /> },
  { to: '/organization', label: 'Organization', icon: <Building2 size={20} />, roles: ['admin'] },
  { to: '/reports', label: 'Reports', icon: <BarChart3 size={20} />, roles: ['admin', 'asset_manager', 'department_head'] },
  { to: '/activity', label: 'Activity & Alerts', icon: <Bell size={20} /> },
]

const roleLabels: Record<Role, string> = {
  admin: 'Administrator',
  asset_manager: 'Asset Manager',
  department_head: 'Department Head',
  employee: 'Employee',
}

const roleColors: Record<Role, string> = {
  admin: 'bg-primary-100 text-primary-700',
  asset_manager: 'bg-accent-100 text-accent-700',
  department_head: 'bg-success-100 text-success-700',
  employee: 'bg-slate-100 text-slate-600',
}

export function Layout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { unreadCount } = useNotifications()

  const handleSignOut = () => {
    signOut()
    navigate('/login')
  }

  const visibleItems = navItems.filter((item) => !item.roles || (user && item.roles.includes(user.role)))

  return (
    <div className="flex h-screen bg-slate-50 relative">
      <ParticleField density={0.3} />

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center gap-2 px-6 h-16 border-b border-slate-200">
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
            <Package size={18} className="text-white" />
          </div>
          <span className="font-bold text-lg text-slate-900">AssetFlow</span>
          <button className="ml-auto lg:hidden text-slate-400 hover:text-slate-600 transition-colors" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 hover:translate-x-1'
                }`
              }
            >
              {item.icon}
              <span>{item.label}</span>
              {item.to === '/activity' && unreadCount > 0 && (
                <span className="ml-auto bg-error-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center animate-fade-in">
                  {unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold text-sm">
              {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-slate-500 truncate">{user ? roleLabels[user.role] : ''}</p>
            </div>
            <button onClick={handleSignOut} className="text-slate-400 hover:text-error-600 p-1.5 rounded-lg hover:bg-error-50 transition-colors" title="Sign out">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden animate-fade-in" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        <header className="h-16 bg-white/80 backdrop-blur-sm border-b border-slate-200 flex items-center justify-between px-4 lg:px-6">
          <button className="lg:hidden text-slate-500 hover:text-slate-700 transition-colors" onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <div className="hidden lg:block">
            <h1 className="text-base font-semibold text-slate-800">Enterprise Asset & Resource Management</h1>
          </div>
          <div className="relative ml-auto">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <span className={`badge ${user ? roleColors[user.role] : ''}`}>{user ? roleLabels[user.role] : ''}</span>
              <ChevronDown size={16} className={`text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-56 card p-2 z-20 animate-slide-up">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-sm font-medium text-slate-900">{user?.name}</p>
                    <p className="text-xs text-slate-500">{user?.email}</p>
                  </div>
                  <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-error-600 hover:bg-error-50 mt-1 transition-colors">
                    <LogOut size={16} /> Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="max-w-7xl mx-auto animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  )
}
