# i-Able Admin Desktop App

A professional Electron desktop application for managing i-Able appointment requests. Built with Electron, React, Vite, and Tailwind CSS, connecting to Neon Postgres.

## Features

✅ **Authentication**
- Support for up to 3 admin accounts (Master, Director, Dev)
- Initial signup screen if no accounts exist
- Automatic account limit enforcement
- One account per role (if configured)
- Password hashing with bcrypt

✅ **Appointment Management**
- View all appointment requests from the public website
- Real-time search by name, email, phone, or service
- Status workflow: new → contacted → confirmed → completed/cancelled
- Update status and add internal notes (Director/Master only)
- Track when appointments were contacted
- Full appointment details in side panel

✅ **Professional UI**
- Light and dark mode with persistent theme preference
- i-Able branding (black/charcoal + gold accents in dark mode, white/gray + gold in light)
- Responsive sidebar and detail panel layout
- Loading, empty, and error states
- Smooth transitions and animations
- First-run database setup for installed Windows builds

✅ **Security**
- No direct database access from frontend
- Secure Electron IPC with contextBridge
- Password hashing (bcrypt)
- Saved local database configuration with Windows secure storage when available
- Environment variable fallback for development
- Parameterized SQL queries

## Prerequisites

- Node.js 16+ and npm/yarn/pnpm
- A Neon Postgres database (free tier available at https://neon.tech)
- Access to your public i-Able website database with `appointment_requests` table

## Installation

1. **Clone or setup the repo**
   ```bash
   cd "i-able admin"
   npm install
   ```

2. **Set up environment variables for development**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Neon Postgres connection string:
   ```env
   DATABASE_URL=postgresql://user:password@host/database
   NODE_ENV=development
   ```

   You can get your `DATABASE_URL` from Neon:
   - Go to https://console.neon.tech
   - Select your project and database
   - Copy the connection string from "Connection String"

   The packaged Windows app can also collect this connection string on first
   launch, so end users do not need to edit a `.env` file.

3. **Run database migrations manually (development only)**
   
   Execute the SQL file in your Neon database:
   - Go to Neon Console > SQL Editor
   - Open `db/migrations.sql`
   - Run all statements
   
   This will:
   - Create the `admin_users` table
   - Add `status`, `internal_notes`, and `contacted_at` columns to `appointment_requests`
   - Create indexes for better performance

   The installed Windows app will also run the safe setup automatically after a
   successful database connection is saved.

## Running the App

### Development Mode

```bash
npm run dev
```

This will start:
- Vite dev server on http://localhost:5173
- Electron app (auto-reloads on changes)

### Build for Production

```bash
npm run build
```

Outputs compiled code to `dist/` directory.

### Package for Distribution

```bash
npm run package
```

Creates a Windows NSIS installer in `release/`.

When you package the app, the current `DATABASE_URL` from your `.env` file is
also bundled into the installer automatically. That means the installed app can
open on another PC without asking for the database URL again.

Expected artifacts:
- `release/i-Able Admin-Setup-<version>.exe`
- `release/win-unpacked/`

## First Launch (Installed App)

On the first launch of the installed Windows app:
1. If the installer was built with a `DATABASE_URL`, the app connects automatically
2. If no bundled database URL exists, paste the Neon Postgres connection string into the setup screen
3. The app verifies the connection and applies the safe schema setup
4. Once the database is ready, the normal login/signup flow appears

The installed app stores the connection string in the Electron user data folder
and uses Windows secure storage when it is available.

## Admin Accounts

### Initial Setup

When you first launch the app:
1. No accounts exist, so you'll see the signup page
2. Create the **Master Admin** account
3. After that, create **Director Admin** and **Dev Admin** accounts (in any order)
4. Once all 3 accounts are created, signup is disabled

### Account Limits

- **Maximum 3 total admin accounts** - enforced in main process
- **One account per role** - Master, Director, Dev
- **Duplicate emails not allowed**

### Role Permissions

| Permission | Master | Director | Dev |
|-----------|--------|----------|-----|
| View appointments | ✓ | ✓ | ✓ |
| Update status | ✓ | ✓ | ✗ |
| Update internal notes | ✓ | ✓ | ✗ |
| Manage admin accounts | ✓ | ✗ | ✗ |

## Architecture

### Security Model

```
Electron Main Process
├── Database Pool (pg)
├── Neon Postgres Connection
├── Admin & Appointment Services
└── IPC Handlers

Preload Bridge (contextBridge)
├── Safe API exposure
└── No direct DB access

React/Vite Renderer
├── UI Components
├── Theme Context
└── IPC Calls only
```

**Key Security Principles:**
- Database credentials never exposed to renderer
- All DB queries execute in main process
- IPC API validated and permission-checked
- Passwords hashed before storage
- No secrets in renderer code

### Database Schema

**admin_users**
```sql
- id (BIGSERIAL PRIMARY KEY)
- name (TEXT NOT NULL)
- email (TEXT UNIQUE NOT NULL)
- role (TEXT CHECK 'master' | 'director' | 'dev')
- password_hash (TEXT NOT NULL, bcryptjs)
- created_at (TIMESTAMPTZ DEFAULT NOW())
```

**appointment_requests** (extended with)
```sql
- status (TEXT DEFAULT 'new')
  Values: 'new' | 'contacted' | 'confirmed' | 'completed' | 'cancelled'
- internal_notes (TEXT nullable)
- contacted_at (TIMESTAMPTZ nullable)
```

## Light/Dark Mode

- **Default:** Dark mode on first launch
- **Toggle:** Click the sun/moon icon in top-right
- **Persistence:** Theme preference saved to localStorage
- **i-Able Branding:**
  - Dark: Black (#111827) / Charcoal (#1f2937) with gold accents (#FFC700)
  - Light: White / Soft gray with gold/black accents

## File Structure

```
i-able admin/
├── src/
│   ├── main/
│   │   └── main.ts              # Electron main process
│   ├── renderer/
│   │   ├── components/          # React components
│   │   │   ├── AuthPage.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── AppointmentList.tsx
│   │   │   ├── DetailPanel.tsx
│   │   │   ├── LoginForm.tsx
│   │   │   ├── SignupForm.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   └── TopBar.tsx
│   │   ├── context/
│   │   │   └── ThemeContext.tsx # Theme state & persistence
│   │   ├── App.tsx              # Main app component
│   │   ├── index.tsx            # React entry point
│   │   └── styles.css           # Tailwind CSS
│   ├── lib/
│   │   ├── db.ts                # Database connection
│   │   ├── types.ts             # TypeScript interfaces
│   │   ├── admin-service.ts     # Admin DB operations
│   │   └── appointment-service.ts # Appointment DB operations
│   └── preload.ts               # Electron IPC bridge
├── db/
│   └── migrations.sql           # Database setup SQL
├── index.html                   # HTML entry point
├── vite.config.ts               # Vite config
├── tailwind.config.js           # Tailwind CSS config
├── postcss.config.js            # PostCSS config
├── tsconfig.json                # TypeScript config
├── package.json                 # Dependencies & scripts
├── .env.example                 # Environment variables template
├── .gitignore                   # Git ignore rules
└── README.md                    # This file
```

## Development Guide

### Adding a New Feature

1. **Database change?** → Add migration to `db/migrations.sql`
2. **New service?** → Create file in `src/lib/` (e.g., `src/lib/new-service.ts`)
3. **New IPC handler?** → Add to `src/main/main.ts` with `ipcMain.handle()`
4. **Expose to renderer?** → Add method to `src/preload.ts` in `electronAPI`
5. **New UI component?** → Create in `src/renderer/components/`
6. **Component uses IPC?** → Call `window.electronAPI.methodName()`

### Styling

- Uses **Tailwind CSS** for utility classes
- Dark mode: Use `theme.isDark` from `useTheme()` hook
- Colors: i-Able gold (#FFC700) for accents
- Responsive: Mobile-first, adjust for lg breakpoint (1024px)

### Database Queries

```typescript
// ✅ Always use parameterized queries
db.query('SELECT * FROM admin_users WHERE email = $1', [email])

// ❌ Never use string interpolation
db.query(`SELECT * FROM admin_users WHERE email = '${email}'`)
```

## Troubleshooting

### App fails to start with "DATABASE_URL not set"
- Ensure `.env` file exists and has `DATABASE_URL` set
- Check `DATABASE_URL` is a valid Neon connection string
- Verify database exists and is accessible

### Appointments not loading
- Check Neon database connection is active
- Run `db/migrations.sql` if `appointment_requests` table exists but columns are missing
- Check browser console (F12) for IPC errors
- Check app logs in terminal

### Login fails
- Verify admin account exists in `admin_users` table
- Check password is correct (case-sensitive)
- Try creating a new account if database was reset

### Theme not persisting
- Check browser localStorage isn't cleared
- Look for `i-able-admin-theme` key in DevTools Storage

## Performance Notes

- Appointments list uses in-memory search (suitable for < 10,000 records)
- For larger datasets, consider pagination or server-side search
- Database indexes created for common queries (status, created_at)
- IPC calls are async but not rate-limited (add if needed)

## Future Enhancements

- [ ] Admin account management (view/edit/delete admins)
- [ ] Bulk status updates
- [ ] Export appointments to CSV
- [ ] Email notifications
- [ ] Two-factor authentication
- [ ] Activity audit logs
- [ ] Custom appointment fields
- [ ] Appointment filtering by date range
- [ ] Desktop notifications
- [ ] Offline mode with sync

## License

Proprietary - i-Able Admin System

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review logs in terminal (dev mode) or event logs (production)
3. Check Neon database status
4. Verify environment variables are set
