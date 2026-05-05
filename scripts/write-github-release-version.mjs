import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const packageJsonPath = path.join(projectRoot, 'package.json')
const buildDir = path.join(projectRoot, 'build')
const outputPath = path.join(buildDir, 'github-release-version.json')

function parseVersion(version) {
  const [coreVersion] = version.trim().split('-')
  const parts = coreVersion.split('.').map((part) => Number(part))

  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    throw new Error(`Unsupported version format: ${version}`)
  }

  return parts
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
const [major, minor, patch] = parseVersion(packageJson.version)
const runNumber = Math.max(1, Number(process.env.GITHUB_RUN_NUMBER || '1'))
const releaseVersion = `${major}.${minor}.${patch + runNumber}`

fs.mkdirSync(buildDir, { recursive: true })
fs.writeFileSync(
  outputPath,
  `${JSON.stringify({ version: releaseVersion }, null, 2)}\n`,
  'utf8',
)

console.log(`Prepared GitHub release version ${releaseVersion}`)
