const { spawn } = require('child_process')

const electronPath = require('electron')
const electronArgs = process.argv.slice(2)
const env = { ...process.env }

delete env.ELECTRON_RUN_AS_NODE

const child = spawn(electronPath, electronArgs.length > 0 ? electronArgs : ['.'], {
  stdio: 'inherit',
  env,
  windowsHide: false,
})

let childClosed = false

child.on('close', (code, signal) => {
  childClosed = true

  if (code === null) {
    console.error(`${electronPath} exited with signal ${signal}`)
    process.exit(1)
  }

  process.exit(code)
})

for (const signal of ['SIGINT', 'SIGTERM', 'SIGUSR2']) {
  process.on(signal, () => {
    if (!childClosed) {
      child.kill(signal)
    }
  })
}
