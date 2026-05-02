import { useState, type FormEvent } from 'react'
import { Mail, Lock, LogIn } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { LoginRequest } from '../../lib/types'

interface LoginFormProps {
  onSubmit: (request: LoginRequest) => Promise<void>
  isLoading: boolean
}

export function LoginForm({ onSubmit, isLoading }: LoginFormProps) {
  const { theme } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    try {
      await onSubmit({ email, password })
    } catch (err: any) {
      setError(err.message || 'Login failed')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
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
        <LogIn size={20} />
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  )
}
