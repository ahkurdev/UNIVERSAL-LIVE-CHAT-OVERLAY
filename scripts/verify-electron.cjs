const fs = require('node:fs')
const path = require('node:path')

function fail(message) {
  console.error(`[ERROR] ${message}`)
  process.exit(1)
}

let electronDirectory

try {
  electronDirectory = path.dirname(require.resolve('electron/package.json'))
} catch {
  fail('Paket Electron belum terinstall. Jalankan setup.bat.')
}

const pathFile = path.join(electronDirectory, 'path.txt')
if (!fs.existsSync(pathFile)) {
  fail('Binary Electron belum terinstall: path.txt tidak ditemukan.')
}

const executableName = fs.readFileSync(pathFile, 'utf8').trim()
if (!executableName) {
  fail('Binary Electron belum terinstall: path.txt kosong.')
}

const executablePath = path.join(electronDirectory, 'dist', executableName)
if (!fs.existsSync(executablePath)) {
  fail(`Executable Electron tidak ditemukan: ${executablePath}`)
}

console.log(`[OK] Electron siap: ${executablePath}`)
