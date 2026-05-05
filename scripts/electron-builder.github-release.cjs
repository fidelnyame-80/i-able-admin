const fs = require('fs')
const path = require('path')
const packageJson = require('../package.json')

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

const versionFilePath = path.join(
  __dirname,
  '..',
  'build',
  'github-release-version.json',
)

if (!fs.existsSync(versionFilePath)) {
  throw new Error(
    'Missing build/github-release-version.json. Run npm run prepare:release-version first.',
  )
}

const versionData = JSON.parse(fs.readFileSync(versionFilePath, 'utf8'))
const detectedRepo =
  parseGithubRepo(
    process.env.AUTO_UPDATE_GITHUB_REPOSITORY || process.env.GITHUB_REPOSITORY,
  )
  || parseGithubRepo(
    typeof packageJson.repository === 'string'
      ? packageJson.repository
      : packageJson.repository?.url,
  )

if (!detectedRepo) {
  throw new Error(
    'Could not determine the GitHub owner/repository for release publishing.',
  )
}

module.exports = {
  ...packageJson.build,
  npmRebuild: false,
  publish: [
    {
      provider: 'github',
      owner: detectedRepo.owner,
      repo: detectedRepo.repo,
      releaseType: 'release',
    },
  ],
  extraMetadata: {
    version: versionData.version,
  },
}
