import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  dialog,
} from 'electron'
import path from 'path'
import {
  closeDatabase,
  ensureDatabaseSetup,
  getDatabaseStatus,
  initializeDatabase,
  testDatabaseConnection,
} from '../lib/db.js'
import * as adminService from '../lib/admin-service.js'
import * as appointmentService from '../lib/appointment-service.js'
import { AdminSession, SignupRequest, LoginRequest } from '../lib/types.js'
import {
  clearStoredDatabaseConfig,
  saveDatabaseConfig,
} from '../lib/app-config.js'
import {
  checkForUpdates,
  downloadUpdate,
  getUpdateSettings,
  getUpdateStatus,
  installDownloadedUpdate,
  refreshUpdateConfiguration,
  saveUpdateSettings,
} from './update-manager.js'
import dotenv from 'dotenv'

dotenv.config()

const isDev = !app.isPackaged

let mainWindow: BrowserWindow | null = null
let currentSession: AdminSession | null = null

function getAppIconPath() {
  return isDev
    ? path.join(__dirname, '../../resources/i-able-logo.ico')
    : path.join(process.resourcesPath, 'icons/i-able-logo.ico')
}

function createWindow() {
  const preloadPath = path.join(__dirname, '../preload.js')
  console.log('[main] __dirname:', __dirname)
  console.log('[main] preloadPath:', preloadPath)

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    icon: getAppIconPath(),
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function createMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        isDev
          ? { label: 'Exit', accelerator: 'CmdOrCtrl+Q', role: 'quit' }
          : { label: 'Exit', accelerator: 'CmdOrCtrl+Q', role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
      ],
    },
    ...(isDev
      ? [
          {
            label: 'View',
            submenu: [
              { role: 'reload' },
              { role: 'forceReload' },
              { role: 'toggleDevTools' },
            ],
          } as Electron.MenuItemConstructorOptions,
        ]
      : []),
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

ipcMain.handle('config:getDatabaseStatus', async () => {
  try {
    const status = await getDatabaseStatus()
    return { success: true, data: status }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('config:saveDatabase', async (_event, databaseUrl: string) => {
  try {
    await testDatabaseConnection(databaseUrl)
    saveDatabaseConfig(databaseUrl)
    await ensureDatabaseSetup(databaseUrl)

    currentSession = null

    const status = await getDatabaseStatus()
    return { success: true, data: status }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('config:clearDatabase', async () => {
  try {
    clearStoredDatabaseConfig()
    currentSession = null
    await closeDatabase()
    await ensureDatabaseSetup()

    const status = await getDatabaseStatus()
    return { success: true, data: status }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('updates:getSettings', () => {
  return { success: true, data: getUpdateSettings() }
})

ipcMain.handle('updates:saveSettings', async (_event, settings) => {
  try {
    const savedSettings = await saveUpdateSettings(settings)
    return { success: true, data: savedSettings }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('updates:getStatus', () => {
  return { success: true, data: getUpdateStatus() }
})

ipcMain.handle('updates:check', async () => {
  try {
    const status = await checkForUpdates(true)
    return { success: true, data: status }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('updates:download', async () => {
  try {
    const status = await downloadUpdate()
    return { success: true, data: status }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('updates:install', () => {
  try {
    installDownloadedUpdate()
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// IPC Handlers
ipcMain.handle('admin:signup', async (_event, request: SignupRequest) => {
  try {
    await initializeDatabase()
    const adminCount = await adminService.getAdminCount()
    if (adminCount >= 3) {
      throw new Error('Maximum admin accounts already created')
    }
    const admin = await adminService.adminSignup(request)
    return { success: true, data: admin }
  } catch (error: any) {
    console.error('Signup error:', error.message)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('admin:login', async (_event, request: LoginRequest) => {
  try {
    await initializeDatabase()
    const session = await adminService.adminLogin(request)
    currentSession = session
    return { success: true, data: session }
  } catch (error: any) {
    console.error('Login error:', error.message)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('admin:logout', () => {
  currentSession = null
  return { success: true }
})

ipcMain.handle('admin:getSession', () => {
  return { success: true, data: currentSession }
})

ipcMain.handle('admin:count', async () => {
  try {
    await initializeDatabase()
    const count = await adminService.getAdminCount()
    return { success: true, data: count }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('admin:getAll', async () => {
  try {
    await initializeDatabase()
    if (!currentSession) {
      throw new Error('Not authenticated')
    }
    const admins = await adminService.getAllAdmins()
    return { success: true, data: admins }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('appointments:getAll', async () => {
  try {
    await initializeDatabase()
    if (!currentSession) {
      throw new Error('Not authenticated')
    }
    const appointments = await appointmentService.getAppointments()
    return { success: true, data: appointments }
  } catch (error: any) {
    console.error('Get appointments error:', error.message)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('appointments:search', async (_event, query: string) => {
  try {
    await initializeDatabase()
    if (!currentSession) {
      throw new Error('Not authenticated')
    }
    const appointments = await appointmentService.searchAppointments(query)
    return { success: true, data: appointments }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle(
  'appointments:updateStatus',
  async (_event, id: number, status: string, internalNotes?: string) => {
    try {
      await initializeDatabase()
      if (!currentSession) {
        throw new Error('Not authenticated')
      }
      // Only director and master can update status
      if (
        currentSession.role !== 'director' &&
        currentSession.role !== 'master'
      ) {
        throw new Error('Permission denied')
      }
      const appointment =
        await appointmentService.updateAppointmentStatus(
          id,
          status,
          internalNotes,
        )
      return { success: true, data: appointment }
    } catch (error: any) {
      console.error('Update status error:', error.message)
      return { success: false, error: error.message }
    }
  },
)

ipcMain.handle('appointments:getById', async (_event, id: number) => {
  try {
    await initializeDatabase()
    if (!currentSession) {
      throw new Error('Not authenticated')
    }
    const appointment = await appointmentService.getAppointmentById(id)
    return { success: true, data: appointment }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

app.on('ready', () => {
  try {
    createWindow()
    createMenu()
    void ensureDatabaseSetup().catch((error: any) => {
      console.warn('Database not ready during startup:', error.message)
    })
    void refreshUpdateConfiguration(true).catch((error: any) => {
      console.warn('Update manager failed to initialize:', error.message)
    })
  } catch (error) {
    console.error('Failed to initialize app:', error)
    dialog.showErrorBox(
      'Startup Error',
      'Failed to initialize the application window.',
    )
    app.quit()
  }
})

app.on('window-all-closed', () => {
  closeDatabase()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})
