const { contextBridge, ipcRenderer } = require('electron')

const electronAPI = {
  getDatabaseStatus: () =>
    ipcRenderer.invoke('config:getDatabaseStatus'),
  saveDatabaseConfig: (databaseUrl) =>
    ipcRenderer.invoke('config:saveDatabase', databaseUrl),
  clearDatabaseConfig: () =>
    ipcRenderer.invoke('config:clearDatabase'),
  adminSignup: (request) =>
    ipcRenderer.invoke('admin:signup', request),
  adminLogin: (request) =>
    ipcRenderer.invoke('admin:login', request),
  adminLogout: () =>
    ipcRenderer.invoke('admin:logout'),
  getSession: () =>
    ipcRenderer.invoke('admin:getSession'),
  getAdminCount: () =>
    ipcRenderer.invoke('admin:count'),
  getAllAdmins: () =>
    ipcRenderer.invoke('admin:getAll'),
  getAppointments: () =>
    ipcRenderer.invoke('appointments:getAll'),
  searchAppointments: (query) =>
    ipcRenderer.invoke('appointments:search', query),
  getAppointmentById: (id) =>
    ipcRenderer.invoke('appointments:getById', id),
  updateAppointmentStatus: (id, status, internalNotes) =>
    ipcRenderer.invoke('appointments:updateStatus', id, status, internalNotes),
  getUpdateSettings: () =>
    ipcRenderer.invoke('updates:getSettings'),
  saveUpdateSettings: (settings) =>
    ipcRenderer.invoke('updates:saveSettings', settings),
  getUpdateStatus: () =>
    ipcRenderer.invoke('updates:getStatus'),
  checkForAppUpdates: () =>
    ipcRenderer.invoke('updates:check'),
  downloadAppUpdate: () =>
    ipcRenderer.invoke('updates:download'),
  installAppUpdate: () =>
    ipcRenderer.invoke('updates:install'),
  onUpdateStatusChanged: (callback) => {
    const listener = (_event, status) => callback(status)
    ipcRenderer.on('updates:stateChanged', listener)
    return () => ipcRenderer.removeListener('updates:stateChanged', listener)
  },
}

try {
  contextBridge.exposeInMainWorld('electronAPI', electronAPI)
  console.log('[preload] electronAPI exposed successfully')
} catch (err) {
  console.error('[preload] Failed to expose electronAPI:', err)
}
