-- i-Able Admin Database Setup
-- Run these migrations in your Neon Postgres database

-- 1. Create the admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('master', 'director', 'dev')),
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Ensure appointment_requests has status columns
-- If the table already has these columns, the ALTER will be skipped
DO $$ BEGIN
  IF to_regclass('public.appointment_requests') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointment_requests' AND column_name = 'status') THEN
    ALTER TABLE appointment_requests
    ADD COLUMN status TEXT NOT NULL DEFAULT 'new';
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.appointment_requests') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointment_requests' AND column_name = 'internal_notes') THEN
    ALTER TABLE appointment_requests
    ADD COLUMN internal_notes TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.appointment_requests') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointment_requests' AND column_name = 'contacted_at') THEN
    ALTER TABLE appointment_requests
    ADD COLUMN contacted_at TIMESTAMPTZ;
  END IF;
END $$;

-- 3. Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_appointment_requests_status ON appointment_requests(status);
CREATE INDEX IF NOT EXISTS idx_appointment_requests_created_at ON appointment_requests(created_at DESC);

-- Verify tables exist and have correct structure
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
