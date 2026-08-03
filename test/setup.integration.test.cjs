const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const test = require('node:test')

const projectRoot = path.resolve(__dirname, '..')
const electronDir = path.dirname(require.resolve('electron/package.json', { paths: [projectRoot] }))
const electronPathFile = path.join(electronDir, 'path.txt')
const backupPathFile = path.join(electronDir, 'path.txt.setup-test-backup')

test('setup repairs an incomplete Electron install when launched outside the project directory', () => {
  assert.equal(fs.existsSync(electronPathFile), true, 'test requires an initially healthy Electron install')
  assert.equal(fs.existsSync(backupPathFile), false, 'stale setup test backup must not exist')

  fs.renameSync(electronPathFile, backupPathFile)

  try {
    const result = spawnSync('cmd.exe', ['/d', '/c', path.join(projectRoot, 'setup.bat')], {
      cwd: os.tmpdir(),
      encoding: 'utf8',
      env: { ...process.env, CI: '1' },
      timeout: 120_000,
    })

    assert.equal(result.error, undefined, result.error?.message)
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
    assert.equal(
      fs.existsSync(electronPathFile),
      true,
      `setup exited successfully without restoring Electron's path.txt\n${result.stdout}\n${result.stderr}`,
    )

    const executableName = fs.readFileSync(electronPathFile, 'utf8').trim()
    assert.notEqual(executableName, '', 'Electron path.txt must not be empty')
    assert.equal(
      fs.existsSync(path.join(electronDir, 'dist', executableName)),
      true,
      'Electron executable referenced by path.txt must exist',
    )
  } finally {
    if (fs.existsSync(electronPathFile)) fs.rmSync(electronPathFile)
    if (fs.existsSync(backupPathFile)) fs.renameSync(backupPathFile, electronPathFile)
  }
})

test('start preflight repairs Electron before launching the application', () => {
  assert.equal(fs.existsSync(electronPathFile), true, 'test requires an initially healthy Electron install')
  assert.equal(fs.existsSync(backupPathFile), false, 'stale setup test backup must not exist')

  fs.renameSync(electronPathFile, backupPathFile)

  try {
    const result = spawnSync(
      'cmd.exe',
      ['/d', '/c', path.join(projectRoot, 'start.bat'), '--check-only'],
      {
        cwd: os.tmpdir(),
        encoding: 'utf8',
        env: { ...process.env, CI: '1' },
        timeout: 120_000,
      },
    )

    assert.equal(result.error, undefined, result.error?.message)
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
    assert.equal(
      fs.existsSync(electronPathFile),
      true,
      `start preflight did not repair Electron\n${result.stdout}\n${result.stderr}`,
    )
  } finally {
    if (fs.existsSync(electronPathFile)) fs.rmSync(electronPathFile)
    if (fs.existsSync(backupPathFile)) fs.renameSync(backupPathFile, electronPathFile)
  }
})
