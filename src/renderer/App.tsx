import { useState, useEffect } from 'react'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { AuthPage } from './components/AuthPage'
import { Dashboard } from './components/Dashboard'
import { AdminSession } from '../lib/types'

function AppContent() {
  const { theme } = useTheme()
  const [session, setSession] = useState<AdminSession | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    checkSession()
  }, [])

  const checkSession = async () => {
    try {
      const response = await window.electronAPI.getSession()
      if (response.success && response.data) {
        setSession(response.data)
      }
    } catch (error) {
      console.error('Failed to check session:', error)
    } finally {
      setIsInitializing(false)
    }
  }

  const handleLoginSuccess = (adminSession: AdminSession) => {
    setSession(adminSession)
  }

  const handleLogout = async () => {
    try {
      await window.electronAPI.adminLogout()
      setSession(null)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (isInitializing) {
    return (
      <div
        className={`h-screen w-screen flex items-center justify-center ${
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
            Loading...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`${
        theme.isDark ? 'dark bg-gray-950' : 'light bg-white'
      }`}
      style={{ height: '100vh', width: '100vw' }}
    >
      {session ? (
        <Dashboard session={session} onLogout={handleLogout} />
      ) : (
        <AuthPage onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  )
}

export function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}
