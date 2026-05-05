import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const releaseDir = path.join(projectRoot, 'release')
const stagedDir = path.join(releaseDir, 'updates', 'win')

function readLatestMetadata() {
  const latestPath = path.join(releaseDir, 'latest.yml')
  if (!fs.existsSync(latestPath)) {
    throw new Error('Missing required update file: latest.yml')
  }

  const contents = fs.readFileSync(latestPath, 'utf8')
  const pathMatch = contents.match(/^path:\s*([^\r\n]+)\s*$/m)
  if (!pathMatch) {
    throw new Error('Could not find the installer path in release/latest.yml')
  }

  return {
    fileName: pathMatch[1].trim(),
    raw: contents,
  }
}

function findInstallerFile(expectedFileName) {
  const directPath = path.join(releaseDir, expectedFileName)
  if (fs.existsSync(directPath)) {
    return {
      sourcePath: directPath,
      targetFileName: expectedFileName,
    }
  }

  const normalizedExpectedName = expectedFileName.replace(/-/g, ' ')
  const fallbackPath = path.join(releaseDir, normalizedExpectedName)
  if (fs.existsSync(fallbackPath)) {
    return {
      sourcePath: fallbackPath,
      targetFileName: expectedFileName,
    }
  }

  const releaseFiles = fs
    .readdirSync(releaseDir)
    .filter((fileName) => fileName.toLowerCase().endsWith('.exe'))
    .sort()

  if (releaseFiles.length > 0) {
    return {
      sourcePath: path.join(releaseDir, releaseFiles[releaseFiles.length - 1]),
      targetFileName: expectedFileName,
    }
  }

  throw new Error(`Could not find the installer file for ${expectedFileName}`)
}

if (!fs.existsSync(releaseDir)) {
  throw new Error('The release directory does not exist. Run the package step first.')
}

fs.mkdirSync(stagedDir, { recursive: true })
const copied = []
const latestMetadata = readLatestMetadata()

fs.copyFileSync(path.join(releaseDir, 'latest.yml'), path.join(stagedDir, 'latest.yml'))
copied.push('latest.yml')

const installer = findInstallerFile(latestMetadata.fileName)
const installerTargetPath = path.join(stagedDir, installer.targetFileName)
fs.copyFileSync(installer.sourcePath, installerTargetPath)
copied.push(installer.targetFileName)

const installerBlockmapSource = `${installer.sourcePath}.blockmap`
if (fs.existsSync(installerBlockmapSource)) {
  const installerBlockmapTarget = path.join(
    stagedDir,
    `${installer.targetFileName}.blockmap`,
  )
  fs.copyFileSync(installerBlockmapSource, installerBlockmapTarget)
  copied.push(`${installer.targetFileName}.blockmap`)
}

console.log(`Staged ${copied.length} update file(s) to ${stagedDir}`)
