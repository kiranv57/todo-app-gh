#!/usr/bin/env node

/**
 * Docker Hygiene, Security & Blocker Gatekeeper Script
 *
 * Runs locally before commit, and in CI as a blocking pre-merge gate.
 * Enforces production-grade hygiene and security rules:
 *   1. Non-root USER in final runner stage (CIS Docker Benchmark).
 *   2. Bans 'COPY . .' before dependency installation (cache bust blocker).
 *   3. Bans whole-workspace copying (COPY --from=builder /app /app devDependencies leak).
 *   4. Requires atomic '--chown' on file copies in non-root runner stages.
 *   5. Requires PID 1 init process (tini / dumb-init) for signal handling.
 *   6. Warns on unpinned base image tags (e.g. ':latest').
 *
 * Usage:
 *   node scripts/check-docker-hygiene.js [--strict]
 */

const fs = require('node:fs');
const path = require('node:path');

const isStrict = process.argv.includes('--strict') || process.env.CI === 'true';
const rootDir = process.cwd();

console.log('\n========================================================================================');
console.log('            Docker Hygiene & Security Audit                                       ');
console.log('========================================================================================\n');

let violations = 0;
let warnings = 0;

function findDockerfiles(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (['node_modules', '.git', 'dist', '.turbo'].includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(findDockerfiles(fullPath));
    } else if (entry.name.startsWith('Dockerfile') || entry.name.endsWith('.dockerfile')) {
      results.push(fullPath);
    }
  }
  return results;
}

const dockerfiles = findDockerfiles(rootDir);

if (dockerfiles.length === 0) {
  console.log('   ℹ️  No Dockerfiles found to audit.');
}

for (const df of dockerfiles) {
  const relPath = path.relative(rootDir, df);
  console.log(`🔍 Checking: ${relPath}`);
  const content = fs.readFileSync(df, 'utf-8');
  const lines = content.split('\n');

  const stages = [];
  let currentStage = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    if (line.startsWith('#') || !line) continue;

    // Detect stages: FROM image AS stagename
    const fromMatch = line.match(/^FROM\s+(\S+)(?:\s+[aA][sS]\s+(\S+))?/i);
    if (fromMatch) {
      currentStage = {
        name: fromMatch[2] || `stage-${stages.length}`,
        baseImage: fromMatch[1],
        line: i + 1,
        hasUser: false,
        copiesWholeApp: false,
        hasSignalInit: false
      };
      stages.push(currentStage);
    }

    if (!currentStage) continue;

    // Check for USER instruction
    if (/^USER\s+/i.test(line)) {
      const user = line.replace(/^USER\s+/i, '').trim();
      if (user !== 'root' && user !== '0') {
        currentStage.hasUser = true;
      }
    }

    // Check for signal handler / entrypoint
    if (/ENTRYPOINT.*(tini|dumb-init)/i.test(line)) {
      currentStage.hasSignalInit = true;
    }

    // Check for devDependencies leak (COPY --from=builder /app /app)
    if (/COPY\s+--from=\S+\s+\/app\s+\/app/i.test(line) || /COPY\s+--from=\S+\s+\/app\/\s+\/app\//i.test(line)) {
      currentStage.copiesWholeApp = true;
      console.error(`   ❌ DEVDEPENDENCIES LEAK [Line ${i + 1}]: "${line}"`);
      console.error('      👉 Copying the entire build directory /app brings dev tools into production runner!');
      violations++;
    }

    // Check for cache bust: COPY . . before RUN install
    if (/^COPY\s+\.\s+\./i.test(line) || /^COPY\s+\.\/\s+\.\//i.test(line)) {
      const remainingLines = lines.slice(i + 1);
      const hasSubsequentInstall = remainingLines.some((l) => /RUN\s+.*(pnpm|npm|yarn)\s+install/i.test(l));
      if (hasSubsequentInstall) {
        console.error(`   ❌ CACHE BUST BLUNDER [Line ${i + 1}]: "COPY . ." before package install.`);
        console.error('      👉 Every code edit invalidates the cache and forces a full re-download.');
        violations++;
      }
    }

    // Check for unpinned latest tag (ignore internal stage references like 'FROM base')
    if (fromMatch) {
      const baseName = fromMatch[1];
      const isInternalStage = stages.slice(0, -1).some((s) => s.name && s.name.toLowerCase() === baseName.toLowerCase());
      if (!isInternalStage && (baseName.includes(':latest') || !baseName.includes(':'))) {
        console.warn(`   ⚠️  UNPINNED BASE TAG [Line ${i + 1}]: "${line}"`);
        console.warn('      👉 Base image should be pinned to specific patch (e.g. node:22-alpine) for reproducibility.');
        warnings++;
      }
    }

    // Check for atomic --chown when copying into the runner stage
    if (currentStage.name === 'runner' && /^COPY\s+--from=/i.test(line)) {
      if (!/--chown=/i.test(line)) {
        console.error(`   ❌ ATOMIC CHOWN MISSING [Line ${i + 1}]: "${line}"`);
        console.error('      👉 Missing `--chown=apprunner:nodejs` leaves files owned by root, causing EACCES crashes.');
        violations++;
      }
    }
  }

  // The final stage (the production runner) MUST have a non-root USER and signal init
  if (stages.length > 0) {
    const finalStage = stages[stages.length - 1];
    if (!finalStage.hasUser) {
      console.error(`   ❌ CIS BENCHMARK VIOLATION: Final stage "${finalStage.name}" does NOT specify a non-root USER!`);
      console.error('      👉 Root-running containers violate least privilege and risk host kernel escape.');
      violations++;
    } else {
      console.log(`   ✅ CIS Benchmark: Final stage runs as non-root user.`);
    }

    if (!finalStage.hasSignalInit) {
      console.warn(`   ⚠️  SIGNAL INIT: Final stage "${finalStage.name}" should configure tini/dumb-init as ENTRYPOINT.`);
      warnings++;
    } else {
      console.log(`   ✅ Signal handling: tini configured as PID 1.`);
    }
  }
}

console.log('\n----------------------------------------------------------------------------------------');
console.log(`Audit Summary: ${violations} critical violation(s), ${warnings} warning(s).`);

if (violations > 0 || (isStrict && warnings > 0)) {
  console.error('\n🛑 AUDIT BLOCKED: Resolve all critical Docker hygiene violations before proceeding.\n');
  process.exit(1);
} else {
  console.log('\n🎉 AUDIT COMPLETE: 100% Clean. Dockerfiles comply with enterprise standards.\n');
  process.exit(0);
}
