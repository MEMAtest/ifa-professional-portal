#!/usr/bin/env node
// ================================================================
// Service Role Usage Audit
// Flags API routes that use getSupabaseServiceClient without firm scoping
// ================================================================

import fs from 'fs'
import path from 'path'

const baseDir = path.resolve('src/app/api')

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walk(full))
    } else if (entry.isFile() && entry.name === 'route.ts') {
      files.push(full)
    }
  }
  return files
}

const routes = walk(baseDir)
const results = []

for (const file of routes) {
  const content = fs.readFileSync(file, 'utf8')
  if (!content.includes('getSupabaseServiceClient')) continue

  const hasFirmId = content.includes('firm_id') || content.includes('firmId')
  if (!hasFirmId) {
    results.push(file)
  }
}

if (results.length === 0) {
  console.log('✅ No unscoped getSupabaseServiceClient usages found.')
  process.exit(0)
}

console.log('⚠️ Potentially unscoped service-role usages (manual review required):')
for (const file of results) {
  console.log(`- ${file}`)
}
console.log(`\nTotal: ${results.length}`)
