import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve } from 'node:path'
import { createServer } from 'node:http'

const host = process.env.HOST ?? '0.0.0.0'
const port = Number(process.env.PORT ?? 3000)
const distDir = resolve('dist')
const indexFile = join(distDir, 'index.html')

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
}

function getFilePath(url) {
  const pathname = decodeURIComponent(new URL(url, 'http://localhost').pathname)
  const requestedPath = normalize(join(distDir, pathname))

  if (!requestedPath.startsWith(distDir)) {
    return null
  }

  if (existsSync(requestedPath) && statSync(requestedPath).isFile()) {
    return requestedPath
  }

  return indexFile
}

function sendFile(response, filePath) {
  const contentType = contentTypes[extname(filePath)] ?? 'application/octet-stream'

  response.writeHead(200, {
    'Cache-Control': filePath === indexFile ? 'no-cache' : 'public, max-age=31536000, immutable',
    'Content-Type': contentType,
  })

  createReadStream(filePath).pipe(response)
}

const server = createServer((request, response) => {
  if (!existsSync(indexFile)) {
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
    response.end('Build output not found. Run npm run build before starting the server.')
    return
  }

  const filePath = getFilePath(request.url ?? '/')

  if (filePath === null) {
    response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' })
    response.end('Forbidden')
    return
  }

  sendFile(response, filePath)
})

server.listen(port, host, () => {
  console.log(`Serving dist on http://${host}:${port}`)
})
