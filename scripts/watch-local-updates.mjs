import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const watchRoots = [
  'src',
  'db',
  'resources',
  'scripts',
  'index.html',
  'package.json',
  'vite.config.ts',
  '.env',
]

let buildInProgress = false
let buildQueued = false
let debounceTimer = null

function queueBuild() {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  debounceTimer = setTimeout(() => {
    void runBuild()
  }, 1500)
}

function runCommand() {
  return new Promise((resolve, reject) => {
    const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
    const child = spawn(npmCommand, ['run', 'package:update-local'], {
      cwd: projectRoot,
      stdio: 'inherit',
      shell: false,
    })

    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`package:update-local exited with code ${code}`))
    })
  })
}

async function runBuild() {
  if (buildInProgress) {
    buildQueued = true
    return
  }

  buildInProgress = true
  console.log('Detected changes. Packaging and staging a new local update...')

  try {
    await runCommand()
    console.log('Local update package refreshed.')
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : 'Failed to refresh local update.',
    )
  } finally {
    buildInProgress = false
    if (buildQueued) {
      buildQueued = false
      queueBuild()
    }
  }
}

function watchPath(relativePath) {
  const targetPath = path.join(projectRoot, relativePath)
  if (!fs.existsSync(targetPath)) {
    return
  }

  const stat = fs.statSync(targetPath)
  if (stat.isDirectory()) {
    fs.watch(targetPath, { recursive: true }, queueBuild)
  } else {
    fs.watchFile(targetPath, { interval: 1000 }, queueBuild)
  }
}

for (const relativePath of watchRoots) {
  watchPath(relativePath)
}

console.log('Watching project files for local update packaging changes...')
console.log('Press Ctrl+C to stop.')
