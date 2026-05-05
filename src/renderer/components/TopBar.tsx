import { Moon, Sun, LogOut, Settings } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { AdminSession } from '../../lib/types'
import logoIcon from '../../images/i-able-logo.png'

interface TopBarProps {
  session: AdminSession | null
  onLogout: () => void
  onOpenUpdateSettings: () => void
}

export function TopBar({
  session,
  onLogout,
  onOpenUpdateSettings,
}: TopBarProps) {
  const { theme, toggleTheme } = useTheme()

  return (
    <div
      className={`h-16 border-b flex items-center justify-between px-6 transition-colors ${
        theme.isDark
          ? 'bg-gray-900 border-gray-800'
          : 'bg-white border-gray-200'
      }`}
    >
      <div className="flex items-center gap-3">
        <img
          src={logoIcon}
          alt="i-Able Logo"
          className="h-8 w-8 object-contain"
        />
        <h1 className={`text-xl font-bold ${
          theme.isDark ? 'text-white' : 'text-gray-900'
        }`}>
          i-Able Admin
        </h1>
        <div className={`w-1 h-6 ${theme.isDark ? 'bg-yellow-500' : 'bg-yellow-600'} rounded`} />
      </div>

      <div className="flex items-center gap-4">
        {session && (
          <div className={`text-sm ${theme.isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            <div className="font-medium">{session.name}</div>
            <div className="capitalize text-xs opacity-75">{session.role} Admin</div>
          </div>
        )}

        <button
          onClick={onOpenUpdateSettings}
          className={`p-2 rounded-lg transition-colors ${
            theme.isDark
              ? 'bg-gray-800 hover:bg-gray-700 text-gray-200'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
          title="App updates"
        >
          <Settings size={20} />
        </button>

        <button
          onClick={toggleTheme}
          className={`p-2 rounded-lg transition-colors ${
            theme.isDark
              ? 'bg-gray-800 hover:bg-gray-700 text-yellow-400'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
          title="Toggle theme"
        >
          {theme.isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {session && (
          <button
            onClick={onLogout}
            className="p-2 rounded-lg transition-colors bg-red-600 hover:bg-red-700 text-white"
            title="Logout"
          >
            <LogOut size={20} />
          </button>
        )}
      </div>
    </div>
  )
}
