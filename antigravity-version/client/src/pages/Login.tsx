import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, Mail, Lock, User, ArrowRight, Shield, Briefcase, Users, UserCircle } from 'lucide-react'
import { useAuth } from '../lib/auth'
import type { Role } from '../lib/types'
import { ParticleField } from '../components/ParticleField'

const roleOptions: { value: Role; label: string; icon: React.ReactNode; color: string; description: string }[] = [
  { value: 'admin', label: 'Admin', icon: <Shield size={18} />, color: 'border-primary-500 bg-primary-50 text-primary-700', description: 'Full system access' },
  { value: 'asset_manager', label: 'Asset Manager', icon: <Briefcase size={18} />, color: 'border-accent-500 bg-accent-50 text-accent-700', description: 'Manage assets & approvals' },
  { value: 'department_head', label: 'Department Head', icon: <Users size={18} />, color: 'border-success-500 bg-success-50 text-success-700', description: 'Approve within department' },
  { value: 'employee', label: 'Employee', icon: <UserCircle size={18} />, color: 'border-slate-400 bg-slate-50 text-slate-600', description: 'View & request resources' },
]

export function Login() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<Role>('employee')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    if (mode === 'signin') {
      const { error } = await signIn(email, password)
      if (error) setError(error)
      else navigate('/')
    } else {
      if (!fullName.trim()) {
        setError('Please enter your full name')
        setLoading(false)
        return
      }
      const { error } = await signUp(email, password, fullName, role)
      if (error) setError(error)
      else navigate('/')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      <ParticleField density={0.5} />

      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-700 via-primary-600 to-accent-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Package size={28} />
            </div>
            <span className="text-2xl font-bold">AssetFlow</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Enterprise Asset &<br />Resource Management
          </h1>
          <p className="text-lg text-primary-100 mb-10 max-w-md">
            Track, allocate, and maintain your organization's assets through a centralized ERP platform.
          </p>
          <div className="space-y-4 max-w-md">
            {[
              'Full asset lifecycle management with 7 states',
              'Conflict-free allocation with transfer workflows',
              'Time-slot booking with overlap validation',
              'Maintenance approval workflow & audit cycles',
            ].map((feat) => (
              <div key={feat} className="flex items-center gap-3 text-primary-100">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-300" />
                <span className="text-sm">{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white relative z-10">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center">
              <Package size={22} className="text-white" />
            </div>
            <span className="font-bold text-xl text-slate-900">AssetFlow</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            {mode === 'signin' ? 'Sign in to your AssetFlow account' : 'Select your role and get started'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="label">Full Name</label>
                  <div className="relative">
                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      className="input pl-10"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jane Doe"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Select Your Role</label>
                  <div className="grid grid-cols-2 gap-2">
                    {roleOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setRole(opt.value)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                          role === opt.value
                            ? opt.color
                            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        {opt.icon}
                        <div className="text-left">
                          <div className="text-xs font-semibold">{opt.label}</div>
                          <div className="text-[10px] opacity-70 leading-tight">{opt.description}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="input pl-10"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                />
              </div>
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="input pl-10"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {error && (
              <div className="bg-error-50 border border-error-200 text-error-700 text-sm rounded-lg px-3 py-2 animate-slide-up">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null) }}
              className="text-primary-600 font-medium hover:underline"
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>

          {mode === 'signin' && (
            <div className="mt-6 p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-500 space-y-1">
              <p className="font-medium text-slate-600">Demo accounts (password: Demo1234!):</p>
              <p>admin@assetflow.demo · manager@assetflow.demo</p>
              <p>head@assetflow.demo · priya@assetflow.demo · raj@assetflow.demo</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
