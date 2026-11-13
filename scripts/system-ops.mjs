#!/usr/bin/env node
/**
 * Detached system operations runner.
 *
 * The admin console writes a job file (never user-supplied arguments) and
 * spawns this script in its own process group, so a build or restart cannot
 * cut the operation short. Every command below is fixed; the job file only
 * chooses between known operations and carries already-validated values.
 *
 * Progress is written atomically to `<backupDir>/jobs/<id>.status.json` and is
 * reconciled into the database by the admin app when it polls.
 */

import { spawn } from 'node:child_process'
import { createReadStream, createWriteStream } from 'node:fs'
import * as fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import zlib from 'node:zlib'
import { pipeline } from 'node:stream/promises'

const ID_RE = /^[a-z0-9]{20,40}$/i
const SAFE_NAME_RE = /^[A-Za-z0-9._@-]{1,100}$/
const BRANCH_RE = /^[A-Za-z0-9._/-]{1,100}$/
const COMMIT_RE = /^[0-9a-f]{40}$/

const jobPath = process.argv[2]
if (!jobPath) {
  process.stderr.write('usage: system-ops.mjs <job.json>\n')
  process.exit(2)
}

const job = JSON.parse(await fs.readFile(jobPath, 'utf8'))
const appDir = process.cwd()
const backupDir = path.resolve(appDir, process.env.BACKUP_DIR ?? '.backups')
const jobsDir = path.join(backupDir, 'jobs')
const statusPath = path.join(jobsDir, `${job.id}.status.json`)
const status = {
  id: job.id,
  type: job.type,
  status: 'running',
  phase: 'starting',
  message: '',
  steps: [],
  startedAt: new Date().toISOString(),
  finishedAt: null,
  result: null,
  safety: null,
  error: null,
}

function fail(message) {
  throw new Error(message)
}

async function writeStatus(patch = {}) {
  Object.assign(status, patch)
  await fs.mkdir(jobsDir, { recursive: true })
  const tmp = `${statusPath}.tmp`
  await fs.writeFile(tmp, JSON.stringify(status))
  await fs.rename(tmp, statusPath)
}

async function step(phase, message) {
  status.steps.push({ at: new Date().toISOString(), phase, message, ok: true })
  if (status.steps.length > 120) status.steps.splice(0, status.steps.length - 120)
  await writeStatus({ phase, message })
}

function tail(text, max = 1600) {
  const clean = (text ?? '').toString().trim()
  return clean.length > max ? `…${clean.slice(-max)}` : clean
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? appDir,
      env: { ...process.env, ...(options.env ?? {}) },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => {
      stdout += chunk
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk
    })
    child.on('error', (error) => reject(error))
    child.on('close', (code) => {
      if (code === 0) return resolve({ stdout, stderr })
      reject(
        new Error(
          `${command} ${args[0] ?? ''} exited ${code}${stderr ? `: ${tail(stderr)}` : ''}`,
        ),
      )
    })
  })
}

function runNpm(args) {
  // Node cannot spawn npm.cmd directly on Windows; the arguments here are
  // fixed strings, never user input.
  if (process.platform === 'win32') {
    return run(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', `npm ${args.join(' ')}`])
  }
  return run('npm', args)
}

// GNU tar reads `D:` in an absolute Windows path as a remote host and treats
// backslashes as escapes, so Windows paths are handed over in forward-slash
// form. Linux (the deployment target) needs neither adjustment.
function tarArgs(args) {
  const normalized =
    process.platform === 'win32'
      ? args.map((arg) => (arg.includes('\\') ? arg.replace(/\\/g, '/') : arg))
      : args
  return process.platform === 'win32' ? ['--force-local', ...normalized] : normalized
}

function databaseConfig() {
  const url = process.env.DATABASE_URL
  if (!url) fail('DATABASE_URL is not set for this process.')
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    fail('DATABASE_URL is not a valid connection string.')
  }
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''))
  if (!database) fail('DATABASE_URL does not name a database.')
  const host = parsed.hostname
  const port = parsed.port || '3306'
  // mysqldump cannot read TiDB; the managed provider owns those backups.
  if (host.includes('tidbcloud.com') || port === '4000') {
    fail('The configured database is TiDB. Use the database provider backup tooling instead.')
  }
  return {
    host,
    port,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database,
  }
}

function mysqlArgs(database, extra = []) {
  return [
    '--protocol=TCP',
    '--host',
    database.host,
    '--port',
    database.port,
    '--user',
    database.user,
    '--default-character-set=utf8mb4',
    ...extra,
    database.database,
  ]
}

function dumpEnv(database) {
  return { MYSQL_PWD: database.password }
}

async function dumpDatabase(outFile, onStep) {
  const database = databaseConfig()
  const base = [
    '--single-transaction',
    '--quick',
    '--routines',
    '--events',
    '--default-character-set=utf8mb4',
  ]
  const variants = [['--no-tablespaces', ...base], base]
  let lastError = null

  for (const flags of variants) {
    await fs.rm(outFile, { force: true })
    const args = mysqlArgs(database, flags)
    const child = spawn('mysqldump', args, {
      cwd: appDir,
      env: { ...process.env, ...dumpEnv(database) },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stderr = ''
    child.stderr.on('data', (chunk) => {
      stderr += chunk
    })
    const closed = new Promise((resolve) => {
      child.on('close', resolve)
      child.on('error', () => resolve(-1))
    })
    try {
      await pipeline(child.stdout, zlib.createGzip({ level: 6 }), createWriteStream(outFile))
    } catch (error) {
      lastError = error
    }
    const code = await closed
    if (code === 0) {
      onStep?.()
      return
    }
    lastError = new Error(`mysqldump exited ${code}: ${tail(stderr)}`)
    // Only an unrecognised option is worth retrying without it.
    if (!/unknown option/i.test(stderr) && !/unrecognized option/i.test(stderr)) break
  }
  await fs.rm(outFile, { force: true })
  throw lastError ?? new Error('mysqldump failed.')
}

function mediaDir() {
  return path.resolve(appDir, process.env.MEDIA_STORAGE_DIR ?? '.uploads')
}

async function archiveDirectory(dir, outFile) {
  const exists = await fs
    .stat(dir)
    .then((stat) => stat.isDirectory())
    .catch(() => false)
  if (!exists) {
    // An empty archive is still a valid backup of "no files yet".
    await fs.mkdir(dir, { recursive: true })
  }
  await run('tar', tarArgs(['-czf', outFile, '-C', path.dirname(dir), path.basename(dir)]))
}

async function sha256(file) {
  const hash = crypto.createHash('sha256')
  await pipeline(createReadStream(file), hash)
  return hash.digest('hex')
}

async function currentCommit() {
  const { stdout } = await run('git', ['rev-parse', 'HEAD']).catch(() => ({ stdout: '' }))
  return stdout.trim() || null
}

function stamp() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '')
}

async function createBackup(kind, backupId, label) {
  const safeId = String(backupId)
  if (!ID_RE.test(safeId)) fail('Invalid backup id.')
  await fs.mkdir(backupDir, { recursive: true })
  const base = `${stamp()}-${kind.toLowerCase()}-${safeId}`

  await step('backup', `${label}: preparing ${kind.toLowerCase()} backup`)

  if (kind === 'DATABASE') {
    const file = path.join(backupDir, `${base}.sql.gz`)
    await step('backup', 'Dumping the database')
    await dumpDatabase(file)
    return finishArchive(file)
  }

  const staging = path.join(backupDir, `tmp-${base}`)
  await fs.rm(staging, { recursive: true, force: true })
  await fs.mkdir(staging, { recursive: true })

  try {
    let databaseFile = null
    let filesFile = null

    if (kind === 'FULL' || kind === 'DATABASE') {
      databaseFile = path.join(staging, 'database.sql.gz')
      await step('backup', 'Dumping the database')
      await dumpDatabase(databaseFile)
    }
    if (kind === 'FULL' || kind === 'FILES') {
      filesFile = path.join(staging, 'uploads.tar.gz')
      await step('backup', 'Archiving uploaded files')
      await archiveDirectory(mediaDir(), filesFile)
    }

    const manifest = {
      version: 1,
      kind,
      createdAt: new Date().toISOString(),
      appCommit: await currentCommit(),
      mediaDir: path.basename(mediaDir()),
      database: databaseFile ? path.basename(databaseFile) : null,
      files: filesFile ? path.basename(filesFile) : null,
    }
    await fs.writeFile(path.join(staging, 'manifest.json'), JSON.stringify(manifest, null, 2))

    const file = path.join(backupDir, `${base}.tar.gz`)
    await step('backup', 'Packaging the archive')
    await run('tar', tarArgs(['-czf', file, '-C', staging, '.']))
    return await finishArchive(file)
  } finally {
    // A failed staging directory can hold a full database dump; never keep it.
    await fs.rm(staging, { recursive: true, force: true }).catch(() => undefined)
  }
}

async function finishArchive(file) {
  const stat = await fs.stat(file)
  await step('backup', 'Checksumming the archive')
  const checksum = await sha256(file)
  return {
    filename: path.basename(file),
    sizeBytes: stat.size,
    checksum,
    appCommit: await currentCommit(),
  }
}

function assertBackupFile(filename) {
  if (!filename || path.basename(filename) !== filename) fail('Invalid backup file name.')
  return path.join(backupDir, filename)
}

async function restoreDatabase(file) {
  const database = databaseConfig()
  await step('restore', 'Restoring the database')
  const child = spawn('mysql', mysqlArgs(database), {
    cwd: appDir,
    env: { ...process.env, ...dumpEnv(database) },
    stdio: ['pipe', 'ignore', 'pipe'],
  })
  let stderr = ''
  child.stderr.on('data', (chunk) => {
    stderr += chunk
  })
  const closed = new Promise((resolve) => {
    child.on('close', resolve)
    child.on('error', () => resolve(-1))
  })
  try {
    await pipeline(createReadStream(file), zlib.createGunzip(), child.stdin)
  } catch (error) {
    child.kill()
    throw new Error(`mysql import failed: ${tail(stderr) || error.message}`)
  }
  const code = await closed
  if (code !== 0) throw new Error(`mysql exited ${code}: ${tail(stderr)}`)
}

async function swapMediaDirectory(sourceDir) {
  const target = mediaDir()
  const previous = `${target}.pre-restore-${stamp()}`
  await fs.mkdir(path.dirname(target), { recursive: true })
  const exists = await fs
    .stat(target)
    .then(() => true)
    .catch(() => false)
  if (exists) await fs.rename(target, previous)
  try {
    await fs.rename(sourceDir, target)
  } catch (error) {
    if (exists) await fs.rename(previous, target).catch(() => undefined)
    throw error
  }
  return previous
}

async function restoreBackup(backup, safetyBackupId) {
  const kind = backup.kind
  const file = assertBackupFile(backup.filename)
  await fs.access(file)

  // A safety backup is the precondition for touching anything.
  const safety = await createBackup('FULL', safetyBackupId, 'Safety backup')
  await writeStatus({ safety })

  if (kind === 'DATABASE') {
    await restoreDatabase(file)
    return { safety }
  }

  const staging = path.join(backupDir, `restore-${job.id}`)
  await fs.rm(staging, { recursive: true, force: true })
  await fs.mkdir(staging, { recursive: true })

  try {
    // DATABASE archives are a bare .sql.gz; FILES and FULL archives carry a
    // manifest plus a nested uploads.tar.gz.
    await step('restore', 'Unpacking the archive')
    await run('tar', tarArgs(['-xzf', file, '-C', staging]))

    const manifest = JSON.parse(await fs.readFile(path.join(staging, 'manifest.json'), 'utf8'))
    if (kind === 'FULL' && manifest.database) {
      await restoreDatabase(path.join(staging, manifest.database))
    }
    if (manifest.files) {
      const uploadsTar = path.join(staging, manifest.files)
      const uploadsOut = path.join(staging, 'media')
      await fs.mkdir(uploadsOut, { recursive: true })
      await step('restore', 'Restoring uploaded files')
      await run('tar', tarArgs(['-xzf', uploadsTar, '-C', uploadsOut]))
      const entries = await fs.readdir(uploadsOut, { withFileTypes: true })
      const directory = entries.find((entry) => entry.isDirectory())
      if (!directory) fail('The archive does not contain a media directory.')
      await swapMediaDirectory(path.join(uploadsOut, directory.name))
    }
  } finally {
    await fs.rm(staging, { recursive: true, force: true }).catch(() => undefined)
  }

  return { safety }
}

function processManager(job) {
  const manager = job.processManager ?? 'none'
  if (!['pm2', 'systemctl', 'none'].includes(manager)) fail('Unknown process manager.')
  const name = job.processName ?? ''
  if (manager !== 'none' && !SAFE_NAME_RE.test(name)) {
    fail('Configure a valid process name before installing updates.')
  }
  return { manager, name }
}

async function activate() {
  const { manager, name } = processManager(job)
  if (manager === 'none') {
    await step('activate', 'Process manager is not configured; restart the service manually')
    return false
  }
  await step('activate', `Restarting ${name} through ${manager}`)
  await run(manager, manager === 'pm2' ? ['restart', name, '--update-env'] : ['restart', name])
  return true
}

async function healthCheck() {
  if (!job.healthUrl) return
  await step('health', 'Waiting for the application to answer')
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(job.healthUrl, { cache: 'no-store' })
      if (response.ok) {
        await step('health', 'Health check passed')
        return
      }
    } catch {
      // Keep waiting; the process may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }
  throw new Error('Health check did not pass within 60 seconds.')
}

async function installCode(commit) {
  const { stdout } = await run('git', ['rev-parse', '--verify', `${commit}^{commit}`]).catch(
    () => ({ stdout: '' }),
  )
  if (stdout.trim() !== commit) fail('The target commit is not available locally.')
  await step('install', `Checking out ${commit.slice(0, 7)}`)
  await run('git', ['checkout', '--detach', commit])
  await step('install', 'Installing dependencies')
  // The job inherits the service's environment, which usually carries
  // NODE_ENV=production; without --include=dev npm would skip the build-only
  // packages (Tailwind, TypeScript) and `next build` would fail.
  await runNpm(['ci', '--include=dev', '--no-audit', '--no-fund'])
  await step('install', 'Generating the Prisma client')
  await runNpm(['run', 'db:generate'])
  await step('migrate', 'Applying database migrations')
  await runNpm(['run', 'db:deploy'])
  await step('build', 'Building the application')
  await runNpm(['run', 'build'])
}

async function update() {
  const fromCommit = (await currentCommit()) ?? ''
  if (!COMMIT_RE.test(job.toCommit ?? '')) fail('Invalid target commit.')
  if (
    !BRANCH_RE.test(job.branch ?? '') ||
    (job.branch ?? '').includes('..') ||
    (job.branch ?? '').startsWith('-')
  ) {
    fail('Invalid branch name.')
  }

  const porcelain = (await run('git', ['status', '--porcelain'])).stdout.trim()
  if (porcelain) fail('The working tree has local changes; refusing to update.')

  if (!job.safetyBackupId) fail('An update requires a safety backup.')
  const safety = await createBackup('FULL', job.safetyBackupId, 'Safety backup')
  await writeStatus({ safety })

  await step('fetch', 'Fetching the selected branch')
  await run('git', ['fetch', '--prune', 'origin', job.branch])
  const remote = (await run('git', ['rev-parse', `origin/${job.branch}`])).stdout.trim()
  if (remote !== job.toCommit) {
    fail('The branch moved since the update check. Check again and retry.')
  }

  try {
    await installCode(job.toCommit)
    const restarted = await activate()
    if (restarted) await healthCheck()
    return { fromCommit, toCommit: job.toCommit, restarted }
  } catch (error) {
    await step('rollback', `Update failed (${error.message}); rolling the code back`)
    try {
      await installCode(fromCommit)
      const restarted = await activate()
      if (restarted) await healthCheck()
    } catch (rollbackError) {
      throw new Error(
        `${error.message} — automatic rollback also failed: ${rollbackError.message}`,
      )
    }
    const rolledBack = new Error(error.message)
    rolledBack.rolledBack = true
    throw rolledBack
  }
}

async function rollback() {
  const fromCommit = (await currentCommit()) ?? ''
  if (!COMMIT_RE.test(job.toCommit ?? '')) fail('Invalid rollback commit.')
  if (!job.safetyBackupId) fail('A rollback requires a safety backup.')
  const safety = await createBackup('FULL', job.safetyBackupId, 'Safety backup')
  await writeStatus({ safety })

  try {
    await installCode(job.toCommit)
    const restarted = await activate()
    if (restarted) await healthCheck()
    return { fromCommit, toCommit: job.toCommit, restarted }
  } catch (error) {
    await step('rollback', `Rollback failed (${error.message}); restoring the previous code`)
    await installCode(fromCommit)
    const restarted = await activate()
    if (restarted) await healthCheck()
    throw error
  }
}

function processAlive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return error.code === 'EPERM'
  }
}

async function acquireLock() {
  await fs.mkdir(backupDir, { recursive: true })
  const lockPath = path.join(backupDir, '.ops.lock')
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const handle = await fs.open(lockPath, 'wx')
      await handle.writeFile(String(process.pid))
      await handle.close()
      return lockPath
    } catch (error) {
      if (error.code !== 'EEXIST') throw error
      // A runner killed with the service it restarted leaves the lock behind;
      // an empty or dead pid means nobody holds it, so take it over at once
      // instead of blocking every operation for the two-hour fallback.
      const holder = Number((await fs.readFile(lockPath, 'utf8').catch(() => '')).trim())
      const info = await fs.stat(lockPath).catch(() => null)
      const expired = !info || Date.now() - info.mtimeMs > 2 * 60 * 60 * 1000
      if (!expired && holder && processAlive(holder)) {
        fail('Another system operation is already running.')
      }
      await fs.rm(lockPath, { force: true })
    }
  }
  fail('Could not acquire the operations lock.')
}

let lockPath = null
try {
  if (!ID_RE.test(job.id ?? '')) fail('Invalid operation id.')
  if (path.resolve(job.appDir ?? '') !== appDir) {
    fail('The job is not targeting this application directory.')
  }
  if (!['BACKUP', 'RESTORE', 'UPDATE', 'ROLLBACK'].includes(job.type)) {
    fail('Unknown operation type.')
  }

  lockPath = await acquireLock()
  await writeStatus({ status: 'running', phase: 'starting' })

  let result
  if (job.type === 'BACKUP') {
    result = await createBackup(job.kind, job.backupId, 'Backup')
  } else if (job.type === 'RESTORE') {
    result = await restoreBackup(job.backup, job.safetyBackupId)
  } else if (job.type === 'UPDATE') {
    result = await update()
  } else {
    result = await rollback()
  }

  await writeStatus({
    status: 'succeeded',
    phase: 'done',
    message: 'Operation completed.',
    result,
    finishedAt: new Date().toISOString(),
  })
} catch (error) {
  await writeStatus({
    status: error.rolledBack ? 'rolled-back' : 'failed',
    phase: 'failed',
    message: error.message,
    error: error.message,
    finishedAt: new Date().toISOString(),
  }).catch(() => undefined)
} finally {
  if (lockPath) await fs.rm(lockPath, { force: true }).catch(() => undefined)
}
