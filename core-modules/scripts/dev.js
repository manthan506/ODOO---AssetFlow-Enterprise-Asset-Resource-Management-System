import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const server = spawn('node', ['server/server.js'], { cwd: root, stdio: 'inherit' })
const client = spawn('npx', ['vite', '--port', process.env.PORT || '5173'], { cwd: join(root, 'client'), stdio: 'inherit', shell: true })

process.on('SIGTERM', () => { server.kill(); client.kill(); process.exit(0) })
process.on('SIGINT', () => { server.kill(); client.kill(); process.exit(0) })
