import { useState, type FormEvent } from 'react'
import { User, Mail, Lock, UserPlus } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { SignupRequest } from '../../lib/types'

interface SignupFormProps {
  onSubmit: (request: SignupRequest) => Promise<void>
  isLoading: boolean
  canSignup: boolean
  remainingSlots: number
}

export function SignupForm({
  onSubmit,
  isLoading,
  canSignup,
  remainingSlots,
}: SignupFormProps) {
  const { theme } = useTheme()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState<'master' | 'director' | 'dev'>('director')
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    try {
      await onSubmit({ name, email, password, role })
    } catch (err: any) {
      setError(err.message || 'Signup failed')
    }
  }

  if (!canSignup) {
    return (
      <div
        className={`w-full max-w-sm p-4 rounded-lg border-2 ${
          theme.isDark
            ? 'bg-gray-800 border-gray-700'
            : 'bg-gray-50 border-gray-300'
        }`}
      >
        <p
          className={`text-center font-medium ${
            theme.isDark ? 'text-gray-300' : 'text-gray-700'
          }`}
        >
          All 3 admin accounts are created.
        </p>
        <p
          className={`text-center text-sm mt-2 ${
            theme.isDark ? 'text-gray-400' : 'text-gray-600'
          }`}
        >
          Please login to continue.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
      <div
        className={`p-3 rounded-lg text-sm ${
          theme.isDark
            ? 'bg-blue-500/20 border border-blue-500/50 text-blue-300'
            : 'bg-blue-50 border border-blue-200 text-blue-800'
        }`}
      >
        {remainingSlots === 3
          ? 'Create the first admin account (Master Admin)'
          : `${remainingSlots} admin account${remainingSlots === 1 ? '' : 's'} remaining`}
      </div>

      <div>
        <label
          className={`block text-sm font-medium mb-2 ${
            theme.isDark ? 'text-gray-300' : 'text-gray-700'
          }`}
        >
          Full Name
        </label>
        <div
          className={`flex items-center border rounded-lg px-4 py-2 ${
            theme.isDark
              ? 'bg-gray-800 border-gray-700 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          }`}
        >
          <User size={20} className={theme.isDark ? 'text-gray-500' : 'text-gray-400'} />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            className={`ml-3 w-full bg-transparent outline-none ${
              theme.isDark ? 'placeholder-gray-600' : 'placeholder-gray-400'
            }`}
          />
        </div>
      </div>

      <div>
        <label
          className={`block text-sm font-medium mb-2 ${
            theme.isDark ? 'text-gray-300' : 'text-gray-700'
          }`}
        >
          Email
        </label>
        <div
          className={`flex items-center border rounded-lg px-4 py-2 ${
            theme.isDark
              ? 'bg-gray-800 border-gray-700 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          }`}
        >
          <Mail size={20} className={theme.isDark ? 'text-gray-500' : 'text-gray-400'} />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
            className={`ml-3 w-full bg-transparent outline-none ${
              theme.isDark ? 'placeholder-gray-600' : 'placeholder-gray-400'
            }`}
          />
        </div>
      </div>

      <div>
        <label
          className={`block text-sm font-medium mb-2 ${
            theme.isDark ? 'text-gray-300' : 'text-gray-700'
          }`}
        >
          Role
        </label>
        <select
          value={role}
          onChange={(e) =>
            setRole(e.target.value as 'master' | 'director' | 'dev')
          }
          className={`w-full border rounded-lg px-4 py-2 font-medium ${
            theme.isDark
              ? 'bg-gray-800 border-gray-700 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          }`}
        >
          <option value="master">Master Admin</option>
          <option value="director">Director Admin</option>
          <option value="dev">Dev Admin</option>
        </select>
      </div>

      <div>
        <label
          className={`block text-sm font-medium mb-2 ${
            theme.isDark ? 'text-gray-300' : 'text-gray-700'
          }`}
        >
          Password
        </label>
        <div
          className={`flex items-center border rounded-lg px-4 py-2 ${
            theme.isDark
              ? 'bg-gray-800 border-gray-700 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          }`}
        >
          <Lock size={20} className={theme.isDark ? 'text-gray-500' : 'text-gray-400'} />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={`ml-3 w-full bg-transparent outline-none ${
              theme.isDark ? 'placeholder-gray-600' : 'placeholder-gray-400'
            }`}
          />
        </div>
      </div>

      <div>
        <label
          className={`block text-sm font-medium mb-2 ${
            theme.isDark ? 'text-gray-300' : 'text-gray-700'
          }`}
        >
          Confirm Password
        </label>
        <div
          className={`flex items-center border rounded-lg px-4 py-2 ${
            theme.isDark
              ? 'bg-gray-800 border-gray-700 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          }`}
        >
          <Lock size={20} className={theme.isDark ? 'text-gray-500' : 'text-gray-400'} />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className={`ml-3 w-full bg-transparent outline-none ${
              theme.isDark ? 'placeholder-gray-600' : 'placeholder-gray-400'
            }`}
          />
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-medium py-2 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <UserPlus size={20} />
        {isLoading ? 'Creating account...' : 'Create Account'}
      </button>
    </form>
  )
}
