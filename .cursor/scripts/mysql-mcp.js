#!/usr/bin/env node
const { spawn } = require('node:child_process')
const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')

const envPath = resolve(__dirname, '../../new_talweeh/server/.env')
const env = {}

for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue

  const separator = trimmed.indexOf('=')
  if (separator === -1) continue

  const key = trimmed.slice(0, separator).trim()
  let value = trimmed.slice(separator + 1).trim()

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1)
  }

  env[key] = value
}

const host = env.tajDB_HOST || env.DB_HOST || 'localhost'
const database = env.DB_NAME
const port = env.DB_PORT || '3306'
const user = env.DB_USER
const password = env.DB_PASSWORD || ''

if (!host || !database || !user) {
  console.error('Missing required MySQL MCP env values: host, DB_NAME, or DB_USER')
  process.exit(1)
}

const command = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const child = spawn(command, [
  '-y',
  '@executeautomation/database-server',
  '--mysql',
  '--host',
  host,
  '--database',
  database,
  '--port',
  port,
  '--user',
  user,
  '--password',
  password,
], {
  stdio: 'inherit',
  env: process.env,
})

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  process.exit(code ?? 0)
})
