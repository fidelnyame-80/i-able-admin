import { useState, useEffect } from 'react'
import { X, Save, AlertCircle } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { AppointmentRequest, AdminSession } from '../../lib/types'

interface DetailPanelProps {
  appointment: AppointmentRequest | null
  onClose: () => void
  onSave: (id: number, status: string, internalNotes?: string) => Promise<void>
  isLoading: boolean
  adminSession: AdminSession | null
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

export function DetailPanel({
  appointment,
  onClose,
  onSave,
  isLoading,
  adminSession,
}: DetailPanelProps) {
  const { theme } = useTheme()
  const [status, setStatus] = useState<string>('')
  const [internalNotes, setInternalNotes] = useState('')
  const [error, setError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    if (appointment) {
      setStatus(appointment.status)
      setInternalNotes(appointment.internal_notes || '')
      setError('')
      setSaveSuccess(false)
    }
  }, [appointment])

  const canEdit =
    adminSession && (adminSession.role === 'master' || adminSession.role === 'director')

  const handleSave = async () => {
    try {
      setError('')
      setSaveSuccess(false)
      if (!appointment) return

      await onSave(appointment.id, status, internalNotes)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to save')
    }
  }

  if (!appointment) return null

  const statusColors = getStatusColor(appointment.status, theme.isDark)

  return (
    <div
      className={`absolute inset-0 z-20 flex flex-col ${
        theme.isDark
          ? 'bg-gray-900 border-gray-800'
          : 'bg-white border-gray-200'
      } lg:relative lg:inset-auto lg:z-auto lg:min-w-0 lg:flex-1 lg:border-l`}
    >
      {/* Header */}
      <div
        className={`p-4 border-b ${
          theme.isDark ? 'border-gray-800' : 'border-gray-200'
        } flex items-center justify-between`}
      >
        <h2
          className={`font-bold text-lg ${
            theme.isDark ? 'text-white' : 'text-gray-900'
          }`}
        >
          Appointment Details
        </h2>
        <button
          onClick={onClose}
          className={`p-1 rounded hover:bg-gray-700 transition-colors ${
            theme.isDark ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Basic Info */}
        <div>
          <h3
            className={`font-semibold mb-3 ${
              theme.isDark ? 'text-white' : 'text-gray-900'
            }`}
          >
            {appointment.full_name}
          </h3>
          <div
            className={`space-y-2 text-sm ${
              theme.isDark ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            <div>
              <span className="font-medium">Phone:</span> {appointment.phone}
            </div>
            <div>
              <span className="font-medium">Email:</span> {appointment.email}
            </div>
            <div>
              <span className="font-medium">Service:</span> {appointment.service}
            </div>
          </div>
        </div>

        {/* Appointment Details */}
        <div>
          <h4
            className={`font-medium mb-2 ${
              theme.isDark ? 'text-gray-300' : 'text-gray-700'
            }`}
          >
            Appointment
          </h4>
          <div
            className={`space-y-2 text-sm ${
              theme.isDark ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            <div>
              <span className="font-medium">Date:</span>{' '}
              {new Date(appointment.preferred_date).toLocaleDateString()}
            </div>
            <div>
              <span className="font-medium">Time:</span> {appointment.preferred_time || 'N/A'}
            </div>
            <div>
              <span className="font-medium">Requested:</span>{' '}
              {new Date(appointment.created_at).toLocaleDateString()} at{' '}
              {new Date(appointment.created_at).toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Notes */}
        {appointment.notes && (
          <div>
            <h4
              className={`font-medium mb-2 ${
                theme.isDark ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              Client Notes
            </h4>
            <p
              className={`text-sm p-3 rounded ${
                theme.isDark
                  ? 'bg-gray-800 text-gray-300'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {appointment.notes}
            </p>
          </div>
        )}

        {/* Status Section */}
        <div className="border-t border-gray-700 pt-4">
          <h4
            className={`font-medium mb-3 ${
              theme.isDark ? 'text-gray-300' : 'text-gray-700'
            }`}
          >
            Status Management
          </h4>

          <div
            className={`mb-4 px-3 py-2 rounded-lg ${statusColors.bg}`}
          >
            <p className={`text-xs font-semibold ${statusColors.text}`}>
              Current: {appointment.status.toUpperCase()}
            </p>
          </div>

          {canEdit ? (
            <>
              <div className="mb-4">
                <label
                  className={`block text-sm font-medium mb-2 ${
                    theme.isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  Update Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 text-sm ${
                    theme.isDark
                      ? 'bg-gray-800 border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="mb-4">
                <label
                  className={`block text-sm font-medium mb-2 ${
                    theme.isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  Internal Notes
                </label>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Add notes for internal use..."
                  className={`w-full border rounded-lg px-3 py-2 text-sm resize-none ${
                    theme.isDark
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-600'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                  }`}
                  rows={4}
                />
              </div>

              {error && (
                <div className="mb-4 p-2 bg-red-500/20 border border-red-500/50 rounded-lg flex gap-2">
                  <AlertCircle size={16} className="text-red-300 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300">{error}</p>
                </div>
              )}

              {saveSuccess && (
                <div className="mb-4 p-2 bg-green-500/20 border border-green-500/50 rounded-lg">
                  <p className="text-xs text-green-300">Saved successfully!</p>
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-medium py-2 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={18} />
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <div className="p-3 bg-blue-500/20 border border-blue-500/50 rounded-lg flex gap-2">
              <AlertCircle size={16} className="text-blue-300 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-300">
                Only Directors and Master Admins can edit appointments.
              </p>
            </div>
          )}

          {appointment.contacted_at && (
            <div
              className={`mt-4 text-xs ${
                theme.isDark ? 'text-gray-500' : 'text-gray-600'
              }`}
            >
              <span className="font-medium">Last contacted:</span>{' '}
              {new Date(appointment.contacted_at).toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
