import { useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import { TopBar } from './TopBar'
import { SearchBar } from './SearchBar'
import { AppointmentList } from './AppointmentList'
import { DetailPanel } from './DetailPanel'
import { AppointmentRequest, AdminSession } from '../../lib/types'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface DashboardProps {
  session: AdminSession | null
  onLogout: () => void
}

export function Dashboard({ session, onLogout }: DashboardProps) {
  const { theme } = useTheme()
  const [appointments, setAppointments] = useState<AppointmentRequest[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastSearch, setLastSearch] = useState('')

  useEffect(() => {
    loadAppointments()
  }, [])

  const loadAppointments = async () => {
    setIsLoading(true)
    setError('')
    try {
      const response = await window.electronAPI.getAppointments()
      if (response.success) {
        setAppointments(response.data || [])
        setSelectedId(null)
      } else {
        setError(response.error || 'Failed to load appointments')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load appointments')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = async (query: string) => {
    setLastSearch(query)
    if (!query.trim()) {
      loadAppointments()
      return
    }

    setIsLoading(true)
    setError('')
    try {
      const response = await window.electronAPI.searchAppointments(query)
      if (response.success) {
        setAppointments(response.data || [])
        setSelectedId(null)
      } else {
        setError(response.error || 'Search failed')
      }
    } catch (err: any) {
      setError(err.message || 'Search failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateStatus = async (
    id: number,
    status: string,
    internalNotes?: string,
  ) => {
    try {
      const response = await window.electronAPI.updateAppointmentStatus(
        id,
        status,
        internalNotes,
      )
      if (response.success) {
        // Update the local state
        setAppointments((prev) =>
          prev.map((apt) =>
            apt.id === id ? response.data! : apt,
          ),
        )
      } else {
        throw new Error(response.error || 'Failed to update')
      }
    } catch (err: any) {
      throw err
    }
  }

  const selectedAppointment = appointments.find((apt) => apt.id === selectedId) || null

  return (
    <div
      className={`h-screen flex flex-col ${
        theme.isDark
          ? 'bg-gray-950 text-white'
          : 'bg-white text-gray-900'
      }`}
    >
      <TopBar session={session} onLogout={onLogout} />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div
          className={`flex flex-col w-full lg:w-96 border-r ${
            theme.isDark ? 'border-gray-800' : 'border-gray-200'
          }`}
        >
          <SearchBar onSearch={handleSearch} isLoading={isLoading} />

          {error && (
            <div className="p-4 bg-red-500/20 border-b border-red-500/50 flex gap-3">
              <AlertCircle size={20} className="text-red-300 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-300">Error loading data</p>
                <p className="text-xs text-red-200">{error}</p>
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col overflow-hidden">
            <AppointmentList
              appointments={appointments}
              selectedId={selectedId}
              onSelect={setSelectedId}
              isLoading={isLoading && appointments.length === 0}
            />
          </div>

          {appointments.length > 0 && !isLoading && (
            <div
              className={`p-4 border-t ${
                theme.isDark ? 'border-gray-800' : 'border-gray-200'
              } text-xs ${theme.isDark ? 'text-gray-500' : 'text-gray-600'}`}
            >
              {lastSearch ? (
                <>
                  <p className="font-medium mb-2">
                    {appointments.length} result{appointments.length !== 1 ? 's' : ''} found
                  </p>
                  <button
                    onClick={() => handleSearch('')}
                    className="text-yellow-500 hover:text-yellow-400 font-medium"
                  >
                    Clear search
                  </button>
                </>
              ) : (
                <div className="flex items-center justify-between">
                  <span>{appointments.length} appointment{appointments.length !== 1 ? 's' : ''}</span>
                  <button
                    onClick={loadAppointments}
                    disabled={isLoading}
                    className="text-yellow-500 hover:text-yellow-400 transition-colors disabled:opacity-50"
                    title="Refresh appointments"
                  >
                    <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Detail Panel */}
        <DetailPanel
          appointment={selectedAppointment}
          onClose={() => setSelectedId(null)}
          onSave={handleUpdateStatus}
          isLoading={isLoading}
          adminSession={session}
        />
      </div>
    </div>
  )
}
