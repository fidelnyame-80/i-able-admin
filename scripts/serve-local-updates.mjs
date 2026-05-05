import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const updatesDir = path.join(projectRoot, 'release', 'updates')
const host = process.env.UPDATE_SERVER_HOST?.trim() || '0.0.0.0'
const port = Number(process.env.UPDATE_SERVER_PORT || '4800')

const mimeTypes = {
  '.yml': 'text/yaml; charset=utf-8',
  '.exe': 'application/octet-stream',
  '.blockmap': 'application/octet-stream',
}

function sendFile(filePath, response) {
  const extension = path.extname(filePath).toLowerCase()
  response.writeHead(200, {
    'Content-Type': mimeTypes[extension] || 'application/octet-stream',
  })
  fs.createReadStream(filePath).pipe(response)
}

const server = http.createServer((request, response) => {
  const requestPath = request.url?.split('?')[0] || '/'
  const resolvedPath = path.normalize(
    path.join(updatesDir, decodeURIComponent(requestPath)),
  )

  if (!resolvedPath.startsWith(updatesDir)) {
    response.writeHead(403)
    response.end('Forbidden')
    return
  }

  let filePath = resolvedPath
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'latest.yml')
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    response.writeHead(404)
    response.end('Not found')
    return
  }

  sendFile(filePath, response)
})

server.listen(port, host, () => {
  console.log(`Serving local app updates from ${updatesDir}`)
  console.log(`Update feed URL: http://localhost:${port}/win`)
})
