import fs from 'fs'
import path from 'path'
import dns from 'dns/promises'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const envPath = path.join(projectRoot, '.env')
const buildDir = path.join(projectRoot, 'build')
const outputPath = path.join(buildDir, 'default-config.json')
const packageJsonPath = path.join(projectRoot, 'package.json')

if (process.env.GITHUB_ACTIONS !== 'true') {
  dotenv.config({ path: envPath })
}

const databaseUrl = process.env.DATABASE_URL?.trim() || ''
const updateProvider = (process.env.AUTO_UPDATE_PROVIDER?.trim().toLowerCase() || '')
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
const DNS_LOOKUP_TIMEOUT_MS = 2_000
const FALLBACK_DNS_SERVERS = ['1.1.1.1', '8.8.8.8', '9.9.9.9']

async function withTimeout(promise, timeoutMs) {
  let timeout = null
  const timeoutPromise = new Promise((_, reject) => {
    timeout = setTimeout(
      () => reject(new Error('DNS lookup timed out')),
      timeoutMs,
    )
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeout) {
      clearTimeout(timeout)
    }
  }
}

function getUniqueValues(values) {
  return [...new Set(values.filter(Boolean))]
}

async function resolveDatabaseHostFallbacks(rawDatabaseUrl) {
  if (!rawDatabaseUrl) {
    return []
  }

  let hostname = ''
  try {
    hostname = new URL(rawDatabaseUrl).hostname
  } catch {
    return []
  }

  const resolvedAddresses = []
  const lookupAttempts = [
    async () => {
      const results = await dns.lookup(hostname, { family: 4, all: true })
      return results.map((result) => result.address)
    },
    ...FALLBACK_DNS_SERVERS.map((server) => async () => {
      const resolver = new dns.Resolver()
      resolver.setServers([server])
      return resolver.resolve4(hostname)
    }),
  ]

  for (const lookup of lookupAttempts) {
    try {
      const addresses = await withTimeout(lookup(), DNS_LOOKUP_TIMEOUT_MS)
      resolvedAddresses.push(...addresses)
    } catch {
      // Packaging should still succeed if DNS is unavailable locally.
    }
  }

  return getUniqueValues(resolvedAddresses)
}

function parseGithubRepo(rawValue) {
  if (!rawValue) {
    return null
  }

  const trimmed = rawValue.trim()
  const shorthandMatch = trimmed.match(/^([\w.-]+)\/([\w.-]+)$/u)
  if (shorthandMatch) {
    return {
      owner: shorthandMatch[1],
      repo: shorthandMatch[2],
    }
  }

  const urlMatch = trimmed.match(
    /github\.com[:/]([\w.-]+)\/([\w.-]+?)(?:\.git)?$/u,
  )
  if (urlMatch) {
    return {
      owner: urlMatch[1],
      repo: urlMatch[2],
    }
  }

  return null
}

function detectGithubRepo() {
  const fromExplicitPair =
    process.env.AUTO_UPDATE_GITHUB_OWNER?.trim()
    && process.env.AUTO_UPDATE_GITHUB_REPO?.trim()
      ? {
          owner: process.env.AUTO_UPDATE_GITHUB_OWNER.trim(),
          repo: process.env.AUTO_UPDATE_GITHUB_REPO.trim(),
        }
      : null

  if (fromExplicitPair) {
    return fromExplicitPair
  }

  const fromRepositoryEnv = parseGithubRepo(
    process.env.AUTO_UPDATE_GITHUB_REPOSITORY || process.env.GITHUB_REPOSITORY,
  )
  if (fromRepositoryEnv) {
    return fromRepositoryEnv
  }

  const fromPackage = parseGithubRepo(
    typeof packageJson.repository === 'string'
      ? packageJson.repository
      : packageJson.repository?.url,
  )
  if (fromPackage) {
    return fromPackage
  }

  try {
    const remoteUrl = execSync('git remote get-url origin', {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString('utf8')

    return parseGithubRepo(remoteUrl)
  } catch {
    return null
  }
}

const updateUrl = process.env.AUTO_UPDATE_URL?.trim() || ''
const githubRepo = detectGithubRepo()
const shouldUseGenericProvider =
  updateProvider === 'generic' || (!!updateUrl && updateProvider !== 'github')
const shouldUseGithubProvider =
  updateProvider === 'github' || (!shouldUseGenericProvider && !!githubRepo)

const updateSettings = shouldUseGenericProvider
  ? {
      provider: 'generic',
      updateUrl,
      githubOwner: '',
      githubRepo: '',
      enabled: true,
      autoDownload: true,
      autoInstallOnQuit: true,
      checkIntervalMinutes: 5,
    }
  : shouldUseGithubProvider && githubRepo
    ? {
        provider: 'github',
        updateUrl: '',
        githubOwner: githubRepo.owner,
        githubRepo: githubRepo.repo,
        enabled: true,
        autoDownload: true,
        autoInstallOnQuit: true,
        checkIntervalMinutes: 5,
      }
    : null

const databaseHostFallbacks = await resolveDatabaseHostFallbacks(databaseUrl)

const payload = {
  ...(databaseUrl ? { databaseUrl } : {}),
  ...(databaseHostFallbacks.length > 0 ? { databaseHostFallbacks } : {}),
  ...(updateSettings ? { updateSettings } : {}),
  generatedAt: new Date().toISOString(),
  source: 'package-script',
}

fs.mkdirSync(buildDir, { recursive: true })
fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')

console.log(
  [
    databaseUrl
      ? 'Bundled database config prepared for packaging.'
      : 'No DATABASE_URL was found for the bundled config.',
    databaseHostFallbacks.length > 0
      ? `Bundled ${databaseHostFallbacks.length} database IP fallback(s) for DNS-resilient startup.`
      : 'No database IP fallback was bundled.',
    updateSettings
      ? updateSettings.provider === 'github'
        ? `Bundled GitHub auto-update config prepared for ${updateSettings.githubOwner}/${updateSettings.githubRepo}.`
        : 'Bundled generic auto-update URL prepared for packaging.'
      : 'No auto-update source was bundled for packaging.',
  ].join(' '),
)
