import { useTheme } from '../context/ThemeContext'
import { AppointmentRequest } from '../../lib/types'
import { Calendar, Clock, Phone, Mail } from 'lucide-react'

interface AppointmentListProps {
  appointments: AppointmentRequest[]
  selectedId: number | null
  onSelect: (id: number) => void
  isLoading: boolean
}

function getStatusColor(status: string, isDark: boolean) {
  const statusColors: Record<string, { bg: string; text: string }> = {
    new: isDark
      ? { bg: 'bg-blue-500/20', text: 'text-blue-300' }
      : { bg: 'bg-blue-100', text: 'text-blue-800' },
    contacted: isDark
      ? { bg: 'bg-yellow-500/20', text: 'text-yellow-300' }
      : { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    confirmed: isDark
      ? { bg: 'bg-green-500/20', text: 'text-green-300' }
      : { bg: 'bg-green-100', text: 'text-green-800' },
    completed: isDark
      ? { bg: 'bg-purple-500/20', text: 'text-purple-300' }
      : { bg: 'bg-purple-100', text: 'text-purple-800' },
    cancelled: isDark
      ? { bg: 'bg-red-500/20', text: 'text-red-300' }
      : { bg: 'bg-red-100', text: 'text-red-800' },
  }
  return statusColors[status] || statusColors['new']
}

export function AppointmentList({
  appointments,
  selectedId,
  onSelect,
  isLoading,
}: AppointmentListProps) {
  const { theme } = useTheme()

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div
          className={`inline-block animate-spin ${
            theme.isDark ? 'text-yellow-500' : 'text-yellow-600'
          }`}
        >
          <div className="w-8 h-8 border-3 border-current border-t-transparent rounded-full" />
        </div>
      </div>
    )
  }

  if (appointments.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Calendar
            size={48}
            className={`mx-auto mb-4 ${
              theme.isDark ? 'text-gray-700' : 'text-gray-300'
            }`}
          />
          <p
            className={`text-lg font-medium ${
              theme.isDark ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            No appointments found
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="space-y-2 p-4">
        {appointments.map((apt) => {
          const statusColors = getStatusColor(apt.status, theme.isDark)
          const isSelected = selectedId === apt.id

          return (
            <button
              key={apt.id}
              onClick={() => onSelect(apt.id)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                isSelected
                  ? theme.isDark
                    ? 'border-yellow-500 bg-yellow-500/10'
                    : 'border-yellow-500 bg-yellow-50'
                  : theme.isDark
                    ? 'border-gray-700 bg-gray-800 hover:border-gray-600'
                    : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3
                    className={`font-semibold truncate ${
                      theme.isDark ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    {apt.full_name}
                  </h3>
                  <div
                    className={`flex items-center gap-4 mt-2 text-xs ${
                      theme.isDark ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      <Phone size={14} />
                      {apt.phone}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail size={14} />
                      {apt.email}
                    </span>
                  </div>
                  <div
                    className={`flex items-center gap-4 mt-2 text-xs ${
                      theme.isDark ? 'text-gray-500' : 'text-gray-600'
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      <Calendar size={14} />
                      {new Date(apt.preferred_date).toLocaleDateString()}
                    </span>
                    {apt.preferred_time && (
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {apt.preferred_time}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 items-end">
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${statusColors.bg} ${statusColors.text}`}
                  >
                    {apt.status}
                  </span>
                  <span
                    className={`text-xs ${
                      theme.isDark ? 'text-gray-500' : 'text-gray-500'
                    }`}
                  >
                    {apt.service}
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
