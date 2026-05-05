const fs = require('fs')
const path = require('path')
const packageJson = require('../package.json')

const versionFilePath = path.join(
  __dirname,
  '..',
  'build',
  'local-update-version.json',
)

if (!fs.existsSync(versionFilePath)) {
  throw new Error(
    'Missing build/local-update-version.json. Run npm run prepare:update-local first.',
  )
}

const versionData = JSON.parse(fs.readFileSync(versionFilePath, 'utf8'))

module.exports = {
  ...packageJson.build,
  npmRebuild: false,
  extraMetadata: {
    version: versionData.version,
  },
}
