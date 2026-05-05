import { getDatabase } from './db.js'
import { AppointmentRequest } from './types.js'

export async function getAppointments(): Promise<AppointmentRequest[]> {
  const db = getDatabase()
  const result = await db.query(
     `SELECT 
       id, full_name, phone, email, service, session_type, preferred_date, preferred_time,
       notes, status, internal_notes, contacted_at, created_at
     FROM appointment_requests
     ORDER BY created_at DESC`,
  )
  return result.rows
}

export async function getAppointmentById(
  id: number,
): Promise<AppointmentRequest | null> {
  const db = getDatabase()
  const result = await db.query(
     `SELECT 
       id, full_name, phone, email, service, session_type, preferred_date, preferred_time,
       notes, status, internal_notes, contacted_at, created_at
     FROM appointment_requests
     WHERE id = $1`,
    [id],
  )
  return result.rows[0] || null
}

export async function searchAppointments(
  query: string,
): Promise<AppointmentRequest[]> {
  const db = getDatabase()
  const searchTerm = `%${query}%`

  const result = await db.query(
     `SELECT 
       id, full_name, phone, email, service, session_type, preferred_date, preferred_time,
       notes, status, internal_notes, contacted_at, created_at
     FROM appointment_requests
     WHERE full_name ILIKE $1
        OR phone ILIKE $1
        OR email ILIKE $1
        OR service ILIKE $1
        OR session_type ILIKE $1
     ORDER BY created_at DESC`,
    [searchTerm],
  )
  return result.rows
}

export async function updateAppointmentStatus(
  id: number,
  status: string,
  internalNotes?: string,
): Promise<AppointmentRequest> {
  const db = getDatabase()

  const validStatuses = ['new', 'contacted', 'confirmed', 'completed', 'cancelled']
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}`)
  }

  const contactedAt =
    status === 'contacted' ? 'NOW()' : 'contacted_at'

  const result = await db.query(
    `UPDATE appointment_requests
      SET status = $1, 
          internal_notes = $2,
          contacted_at = ${contactedAt}
      WHERE id = $3
      RETURNING 
        id, full_name, phone, email, service, session_type, preferred_date, preferred_time,
        notes, status, internal_notes, contacted_at, created_at`,
    [status, internalNotes ?? null, id],
  )

  if (result.rows.length === 0) {
    throw new Error('Appointment not found')
  }

  return result.rows[0]
}
