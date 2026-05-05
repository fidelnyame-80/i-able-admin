import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const packageJsonPath = path.join(projectRoot, 'package.json')
const buildDir = path.join(projectRoot, 'build')
const outputPath = path.join(buildDir, 'local-update-version.json')
const publishedLatestPath = path.join(
  projectRoot,
  'release',
  'updates',
  'win',
  'latest.yml',
)

function parseVersion(version) {
  const [coreVersion] = version.trim().split('-')
  const parts = coreVersion.split('.').map((part) => Number(part))

  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    throw new Error(`Unsupported version format: ${version}`)
  }

  return parts
}

function compareVersions(left, right) {
  const leftParts = parseVersion(left)
  const rightParts = parseVersion(right)

  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] > rightParts[index]) {
      return 1
    }

    if (leftParts[index] < rightParts[index]) {
      return -1
    }
  }

  return 0
}

function incrementPatch(version) {
  const [major, minor, patch] = parseVersion(version)
  return `${major}.${minor}.${patch + 1}`
}

function readPublishedVersion() {
  if (!fs.existsSync(publishedLatestPath)) {
    return null
  }

  const contents = fs.readFileSync(publishedLatestPath, 'utf8')
  const match = contents.match(/^version:\s*([^\r\n]+)\s*$/m)
  return match ? match[1].trim() : null
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
const publishedVersion = readPublishedVersion()
const baseVersion =
  publishedVersion && compareVersions(publishedVersion, packageJson.version) >= 0
    ? publishedVersion
    : packageJson.version
const nextVersion = incrementPatch(baseVersion)

fs.mkdirSync(buildDir, { recursive: true })
fs.writeFileSync(
  outputPath,
  `${JSON.stringify({ version: nextVersion }, null, 2)}\n`,
  'utf8',
)

console.log(`Prepared local update version ${nextVersion}`)
