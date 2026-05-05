import { useMemo } from 'react'
import { useTheme } from '../context/ThemeContext'
import { AppointmentRequest } from '../../lib/types'
import {
  Calendar,
  Clock,
  Mail,
  MapPin,
  Monitor,
  Phone,
} from 'lucide-react'

interface AppointmentTableProps {
  appointments: AppointmentRequest[]
  selectedId: number | null
  onSelect: (id: number) => void
  isLoading: boolean
}

function getStatusColor(status: string, isDark: boolean) {
  const statusColors: Record<string, { bg: string; text: string; ring: string }> = {
    new: isDark
      ? { bg: 'bg-blue-500/15', text: 'text-blue-200', ring: 'ring-blue-400/20' }
      : { bg: 'bg-blue-50', text: 'text-blue-800', ring: 'ring-blue-200' },
    contacted: isDark
      ? { bg: 'bg-amber-500/15', text: 'text-amber-200', ring: 'ring-amber-400/20' }
      : { bg: 'bg-amber-50', text: 'text-amber-800', ring: 'ring-amber-200' },
    confirmed: isDark
      ? { bg: 'bg-emerald-500/15', text: 'text-emerald-200', ring: 'ring-emerald-400/20' }
      : { bg: 'bg-emerald-50', text: 'text-emerald-800', ring: 'ring-emerald-200' },
    completed: isDark
      ? { bg: 'bg-slate-500/15', text: 'text-slate-200', ring: 'ring-slate-400/20' }
      : { bg: 'bg-slate-100', text: 'text-slate-700', ring: 'ring-slate-200' },
    cancelled: isDark
      ? { bg: 'bg-red-500/15', text: 'text-red-200', ring: 'ring-red-400/20' }
      : { bg: 'bg-red-50', text: 'text-red-800', ring: 'ring-red-200' },
  }

  return statusColors[status] || statusColors.new
}

function isOnlineSession(sessionType: string) {
  return sessionType.toLowerCase().includes('online')
}

function getSortValue(appointment: AppointmentRequest) {
  const date = new Date(appointment.preferred_date)
  const dateValue = Number.isNaN(date.getTime())
    ? Number.MAX_SAFE_INTEGER
    : date.getTime()
  const [hours = 23, minutes = 59] = (appointment.preferred_time || '23:59')
    .slice(0, 5)
    .split(':')
    .map((part) => Number(part))

  return dateValue + ((hours * 60) + minutes) * 60_000
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'No date'
  }

  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatRequestedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Unknown'
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function AppointmentTable({
  appointments,
  selectedId,
  onSelect,
  isLoading,
}: AppointmentTableProps) {
  const { theme } = useTheme()
  const sortedAppointments = useMemo(
    () => [...appointments].sort((a, b) => getSortValue(a) - getSortValue(b)),
    [appointments],
  )

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div
          className={`inline-block animate-spin ${
            theme.isDark ? 'text-yellow-500' : 'text-yellow-600'
          }`}
        >
          <div className="h-8 w-8 rounded-full border-3 border-current border-t-transparent" />
        </div>
      </div>
    )
  }

  if (appointments.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
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

  const headerClass = theme.isDark
    ? 'border-gray-800 bg-gray-950 text-gray-400'
    : 'border-gray-200 bg-slate-50 text-slate-500'
  const cellBorderClass = theme.isDark ? 'border-gray-800' : 'border-slate-200'

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className={`border-b px-4 py-3 text-xs ${
          theme.isDark
            ? 'border-gray-800 bg-gray-950 text-gray-400'
            : 'border-slate-200 bg-white text-slate-500'
        }`}
      >
        Sorted by appointment date, earliest first
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[1060px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              {[
                '#',
                'Date',
                'Time',
                'Client',
                'Service',
                'Session',
                'Phone',
                'Email',
                'Status',
                'Requested',
              ].map((heading, index) => (
                <th
                  key={heading}
                  className={`sticky top-0 z-10 border-b px-3 py-2 text-left text-[11px] font-semibold uppercase ${headerClass} ${
                    index === 0 ? 'border-l' : ''
                  } border-r`}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedAppointments.map((appointment, index) => {
              const isSelected = selectedId === appointment.id
              const statusColors = getStatusColor(appointment.status, theme.isDark)
              const sessionType = appointment.session_type || 'In person'
              const SessionIcon = isOnlineSession(sessionType) ? Monitor : MapPin

              return (
                <tr
                  key={appointment.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(appointment.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onSelect(appointment.id)
                    }
                  }}
                  className={`cursor-pointer outline-none transition-colors ${
                    isSelected
                      ? theme.isDark
                        ? 'bg-yellow-500/10'
                        : 'bg-yellow-50'
                      : theme.isDark
                        ? 'bg-gray-950 hover:bg-gray-900'
                        : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  <td
                    className={`border-b border-l border-r px-3 py-3 text-xs ${cellBorderClass} ${
                      theme.isDark ? 'text-gray-500' : 'text-slate-500'
                    }`}
                  >
                    {index + 1}
                  </td>
                  <td className={`border-b border-r px-3 py-3 font-medium ${cellBorderClass}`}>
                    {formatDate(appointment.preferred_date)}
                  </td>
                  <td className={`border-b border-r px-3 py-3 ${cellBorderClass}`}>
                    <span className="inline-flex items-center gap-1">
                      <Clock size={14} />
                      {appointment.preferred_time || 'N/A'}
                    </span>
                  </td>
                  <td className={`border-b border-r px-3 py-3 ${cellBorderClass}`}>
                    <div className="max-w-[180px] truncate font-medium">
                      {appointment.full_name}
                    </div>
                  </td>
                  <td className={`border-b border-r px-3 py-3 ${cellBorderClass}`}>
                    <div className="max-w-[220px] truncate">{appointment.service}</div>
                  </td>
                  <td className={`border-b border-r px-3 py-3 ${cellBorderClass}`}>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${
                        theme.isDark
                          ? 'bg-slate-800 text-slate-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      <SessionIcon size={13} />
                      {sessionType}
                    </span>
                  </td>
                  <td className={`border-b border-r px-3 py-3 ${cellBorderClass}`}>
                    <span className="inline-flex items-center gap-1">
                      <Phone size={14} />
                      {appointment.phone}
                    </span>
                  </td>
                  <td className={`border-b border-r px-3 py-3 ${cellBorderClass}`}>
                    <span className="inline-flex max-w-[220px] items-center gap-1">
                      <Mail size={14} className="shrink-0" />
                      <span className="truncate">{appointment.email || 'N/A'}</span>
                    </span>
                  </td>
                  <td className={`border-b border-r px-3 py-3 ${cellBorderClass}`}>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${statusColors.bg} ${statusColors.text} ${statusColors.ring}`}
                    >
                      {appointment.status}
                    </span>
                  </td>
                  <td
                    className={`border-b border-r px-3 py-3 text-xs ${cellBorderClass} ${
                      theme.isDark ? 'text-gray-400' : 'text-slate-600'
                    }`}
                  >
                    {formatRequestedAt(appointment.created_at)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
