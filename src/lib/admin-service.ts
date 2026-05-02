import bcrypt from 'bcryptjs'
import { getDatabase } from './db.js'
import {
  AdminUser,
  AdminSession,
  SignupRequest,
  LoginRequest,
} from './types.js'

const SALT_ROUNDS = 10
const MAX_ADMIN_ACCOUNTS = 3

export async function getAdminCount(): Promise<number> {
  const db = getDatabase()
  const result = await db.query('SELECT COUNT(*) as count FROM admin_users')
  return parseInt(result.rows[0].count, 10)
}

export async function adminSignup(request: SignupRequest): Promise<AdminUser> {
  const db = getDatabase()

  // Check admin count limit
  const count = await getAdminCount()
  if (count >= MAX_ADMIN_ACCOUNTS) {
    throw new Error(
      `Maximum admin accounts (${MAX_ADMIN_ACCOUNTS}) already created`,
    )
  }

  // Check for duplicate email
  const emailExists = await db.query(
    'SELECT id FROM admin_users WHERE email = $1',
    [request.email],
  )
  if (emailExists.rows.length > 0) {
    throw new Error('Email already registered')
  }

  // Check for duplicate role
  const roleExists = await db.query(
    'SELECT id FROM admin_users WHERE role = $1',
    [request.role],
  )
  if (roleExists.rows.length > 0) {
    throw new Error(`${request.role} admin already exists`)
  }

  // Hash password
  const passwordHash = await bcrypt.hash(request.password, SALT_ROUNDS)

  // Insert admin
  const result = await db.query(
    `INSERT INTO admin_users (name, email, role, password_hash, created_at)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING id, name, email, role, created_at`,
    [request.name, request.email, request.role, passwordHash],
  )

  return result.rows[0]
}

export async function adminLogin(
  request: LoginRequest,
): Promise<AdminSession> {
  const db = getDatabase()

  const result = await db.query(
    'SELECT id, name, email, role, password_hash FROM admin_users WHERE email = $1',
    [request.email],
  )

  if (result.rows.length === 0) {
    throw new Error('account not found')
  }

  const admin = result.rows[0]
  const passwordMatch = await bcrypt.compare(
    request.password,
    admin.password_hash,
  )

  if (!passwordMatch) {
    throw new Error('Invalid email or password')
  }

  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
  }
}

export async function getAllAdmins(): Promise<AdminUser[]> {
  const db = getDatabase()
  const result = await db.query(
    'SELECT id, name, email, role, created_at FROM admin_users ORDER BY created_at ASC',
  )
  return result.rows
}
