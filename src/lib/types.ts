export interface AppointmentRequest {
  id: number
  full_name: string
  phone: string
  email: string
  service: string
  preferred_date: string
  preferred_time: string
  notes: string
  status: 'new' | 'contacted' | 'confirmed' | 'completed' | 'cancelled'
  internal_notes: string | null
  contacted_at: string | null
  created_at: string
}

export interface AdminUser {
  id: number
  name: string
  email: string
  role: 'master' | 'director' | 'dev'
  created_at: string
}

export interface AdminSession {
  id: number
  name: string
  email: string
  role: 'master' | 'director' | 'dev'
}

export interface SignupRequest {
  name: string
  email: string
  password: string
  role: 'master' | 'director' | 'dev'
}

export interface LoginRequest {
  email: string
  password: string
}
