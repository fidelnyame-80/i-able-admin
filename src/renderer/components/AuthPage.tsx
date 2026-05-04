import { useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import { LoginForm } from './LoginForm'
import { SignupForm } from './SignupForm'
import { AdminSession, LoginRequest, SignupRequest } from '../../lib/types'
import logoIcon from '../../images/i-able-logo.png'

interface AuthPageProps {
  onLoginSuccess: (session: AdminSession) => void
  onOpenDatabaseSetup: () => void
}

export function AuthPage({
  onLoginSuccess,
  onOpenDatabaseSetup,
}: AuthPageProps) {
  const { theme } = useTheme()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [isLoading, setIsLoading] = useState(false)
  const [adminCount, setAdminCount] = useState(0)
  const [isCheckingSetup, setIsCheckingSetup] = useState(true)

  useEffect(() => {
    const checkSetup = async () => {
      try {
        if (!window.electronAPI?.getAdminCount) {
          setIsCheckingSetup(false)
          return
        }
        const response = await window.electronAPI.getAdminCount()
        if (response.success) {
          setAdminCount(response.data ?? 0)
          setMode(response.data === 0 ? 'signup' : 'login')
        }
      } catch (error) {
        console.error('Failed to check admin setup:', error)
      } finally {
        setIsCheckingSetup(false)
      }
    }
    checkSetup()
  }, [])

  const handleLogin = async (request: LoginRequest) => {
    setIsLoading(true)
    try {
      if (!window.electronAPI?.adminLogin) {
        throw new Error('account not found')
      }
      const response = await window.electronAPI.adminLogin(request)
      if (response.success) {
        onLoginSuccess(response.data!)
      } else {
        throw new Error(response.error || 'Login failed')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignup = async (request: SignupRequest) => {
    setIsLoading(true)
    try {
      if (!window.electronAPI?.adminSignup) {
        throw new Error('account not found')
      }
      const response = await window.electronAPI.adminSignup(request)
      if (response.success) {
        // Auto-login after signup
        await handleLogin({
          email: request.email,
          password: request.password,
        })
      } else {
        throw new Error(response.error || 'Signup failed')
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (isCheckingSetup) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          theme.isDark ? 'bg-gray-950' : 'bg-white'
        }`}
      >
        <div className="text-center">
          <div
            className={`inline-block animate-spin ${
              theme.isDark ? 'text-yellow-500' : 'text-yellow-600'
            } mb-4`}
          >
            <div className="w-12 h-12 border-4 border-current border-t-transparent rounded-full" />
          </div>
          <p
            className={`text-lg font-medium ${
              theme.isDark ? 'text-gray-300' : 'text-gray-700'
            }`}
          >
            Initializing...
          </p>
        </div>
      </div>
    )
  }

  const canSignup = adminCount < 3

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center px-4 ${
        theme.isDark
          ? 'bg-gradient-to-br from-gray-950 to-gray-900'
          : 'bg-gradient-to-br from-white to-gray-50'
      }`}
    >
      <div className="mb-8 text-center">
        <img
          src={logoIcon}
          alt="i-Able Logo"
          className="mx-auto mb-4 h-20 w-auto object-contain"
        />
        <div className="flex items-center justify-center gap-3 mb-4">
          <h1
            className={`text-4xl font-bold ${
              theme.isDark ? 'text-white' : 'text-gray-900'
            }`}
          >
            i-Able
          </h1>
          <div
            className={`w-2 h-10 ${
              theme.isDark ? 'bg-yellow-500' : 'bg-yellow-600'
            } rounded`}
          />
        </div>
        <p
          className={`text-lg ${
            theme.isDark ? 'text-gray-400' : 'text-gray-600'
          }`}
        >
          Admin Dashboard
        </p>
      </div>

      <div
        className={`p-8 rounded-xl border ${
          theme.isDark
            ? 'bg-gray-900 border-gray-800'
            : 'bg-white border-gray-200'
        }`}
      >
        {mode === 'login' ? (
          <>
            <h2
              className={`text-2xl font-bold mb-6 ${
                theme.isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              Welcome Back
            </h2>
            <LoginForm onSubmit={handleLogin} isLoading={isLoading} />
            {canSignup && (
              <p
                className={`text-center mt-6 text-sm ${
                  theme.isDark ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                No account yet?{' '}
                <button
                  onClick={() => setMode('signup')}
                  className="text-yellow-500 hover:text-yellow-400 font-medium"
                >
                  Create Account
                </button>
              </p>
            )}
            <p
              className={`text-center mt-4 text-sm ${
                theme.isDark ? 'text-gray-500' : 'text-gray-500'
              }`}
            >
              Need to change the database connection?{' '}
              <button
                onClick={onOpenDatabaseSetup}
                className="text-yellow-500 hover:text-yellow-400 font-medium"
              >
                Open setup
              </button>
            </p>
          </>
        ) : (
          <>
            <h2
              className={`text-2xl font-bold mb-6 ${
                theme.isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              Create Account
            </h2>
            <SignupForm
              onSubmit={handleSignup}
              isLoading={isLoading}
              canSignup={canSignup}
              remainingSlots={3 - adminCount}
            />
            <p
              className={`text-center mt-6 text-sm ${
                theme.isDark ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              Already have an account?{' '}
              <button
                onClick={() => setMode('login')}
                className="text-yellow-500 hover:text-yellow-400 font-medium"
              >
                Login
              </button>
            </p>
            <p
              className={`text-center mt-4 text-sm ${
                theme.isDark ? 'text-gray-500' : 'text-gray-500'
              }`}
            >
              Need to change the database connection?{' '}
              <button
                onClick={onOpenDatabaseSetup}
                className="text-yellow-500 hover:text-yellow-400 font-medium"
              >
                Open setup
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
