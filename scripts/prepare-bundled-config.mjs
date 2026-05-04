import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const envPath = path.join(projectRoot, '.env')
const buildDir = path.join(projectRoot, 'build')
const outputPath = path.join(buildDir, 'default-config.json')

dotenv.config({ path: envPath })

const databaseUrl = process.env.DATABASE_URL?.trim() || ''
const payload = databaseUrl
  ? {
      databaseUrl,
      generatedAt: new Date().toISOString(),
      source: 'package-script',
    }
  : {}

fs.mkdirSync(buildDir, { recursive: true })
fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')

if (databaseUrl) {
  console.log('Bundled database config prepared for packaging.')
} else {
  console.log(
    'No DATABASE_URL was found. Wrote an empty bundled config for packaging.',
  )
}
