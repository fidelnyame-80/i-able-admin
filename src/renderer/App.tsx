import { useState, useEffect } from 'react'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { AuthPage } from './components/AuthPage'
import { DatabaseSetupPage } from './components/DatabaseSetupPage'
import { Dashboard } from './components/Dashboard'
import { AdminSession, DatabaseStatus } from '../lib/types'

function AppContent() {
  const { theme } = useTheme()
  const [databaseStatus, setDatabaseStatus] = useState<DatabaseStatus | null>(null)
  const [session, setSession] = useState<AdminSession | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    initializeApp()
  }, [])

  const initializeApp = async () => {
    try {
      const databaseResponse = await window.electronAPI.getDatabaseStatus()
      if (databaseResponse.success && databaseResponse.data) {
        setDatabaseStatus(databaseResponse.data)

        if (databaseResponse.data.isReady) {
          const sessionResponse = await window.electronAPI.getSession()
          if (sessionResponse.success && sessionResponse.data) {
            setSession(sessionResponse.data)
          }
        } else {
          setSession(null)
        }
      }
    } catch (error) {
      console.error('Failed to initialize app:', error)
    } finally {
      setIsInitializing(false)
    }
  }

  const handleDatabaseStatus = (status: DatabaseStatus) => {
    setDatabaseStatus(status)

    if (status.isReady) {
      void initializeApp()
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

  const needsDatabaseSetup = !databaseStatus?.isReady
  if (needsDatabaseSetup) {
    return (
      <DatabaseSetupPage
        status={databaseStatus}
        onConfigured={handleDatabaseStatus}
      />
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
