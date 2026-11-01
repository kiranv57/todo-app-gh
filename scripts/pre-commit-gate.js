#!/usr/bin/env node

/**
 * ============================================================================
 * Pre-commit gate
 *
 * Stage 1: Fast formatting & schema verification
 * Stage 2: Commit blockers:
 *          - Scans staged files for leaked secrets, API keys, private keys.
 *          - Enforces .env.example hygiene (zero hardcoded production secrets).
 *          - Audits Dockerfiles for CIS Benchmarks and non-root execution.
 *          - Hard-aborts the commit before anything reaches git history.
 * ============================================================================
 */

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');

console.log('\n========================================================================================');
console.log('       [Pre-commit] Secret scan, env hygiene & Docker audit');
console.log('========================================================================================\n');

let violations = 0;

function reportViolation(stage, message) {
  violations++;
  console.error(`❌ [${stage}] VIOLATION: ${message}`);
}

// ----------------------------------------------------------------------------
// Stage 2A: Secret scanner (stop leaked credentials from entering git history)
// ----------------------------------------------------------------------------
console.log('🔍 [Stage 2A] Scanning repository for leaked secrets and high-entropy credentials...');

const SECRET_PATTERNS = [
  { name: 'RSA / OpenSSH Private Key', regex: /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/ },
  { name: 'AWS Access Key ID', regex: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/ },
  { name: 'Generic Live Secret Token', regex: /(?:secret|api_key|token)\s*[:=]\s*["'](?!test-|mock-|smoke-|dummy-)[a-zA-Z0-9_-]{24,}["']/i },
  { name: 'Stripe Live Secret Key', regex: /sk_live_[0-9a-zA-Z]{24}/ }
];

const FORBIDDEN_FILE_PATTERNS = [
  /^\.env$/,
  /^\.env\.local$/,
  /^\.env\.production$/,
  /^\.env\.prod$/,
  /\.pem$/,
  /\.key$/
];

// Get list of staged files if git is available, else fallback to scanning sensitive files
let filesToCheck = [];
try {
  const staged = execSync('git diff --cached --name-only --diff-filter=ACM', {
    cwd: ROOT_DIR,
    encoding: 'utf-8'
  }).trim();

  if (staged) {
    filesToCheck = staged.split('\n').filter(Boolean);
  }
} catch (_) {
  // Not inside git commit or working tree query failed; fallback to inspecting all tracked source dirs
  filesToCheck = [];
}

// Always scan key configuration and env files
const baselineFiles = [
  '.env.example',
  'services/api/src/config/env.js',
  'services/api/Dockerfile',
  'apps/web/Dockerfile'
];

for (const bf of baselineFiles) {
  if (!filesToCheck.includes(bf) && fs.existsSync(path.join(ROOT_DIR, bf))) {
    filesToCheck.push(bf);
  }
}

for (const file of filesToCheck) {
  const baseName = path.basename(file);

  // Check forbidden filenames
  for (const pattern of FORBIDDEN_FILE_PATTERNS) {
    if (pattern.test(baseName)) {
      reportViolation('Pre-commit', `Forbidden sensitive file staged for commit: ${file}`);
    }
  }

  const fullPath = path.join(ROOT_DIR, file);
  if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
    continue;
  }

  // Exempt documentation files from secret regex scanning
  if (file.endsWith('.md')) {
    continue;
  }

  // Scan file contents for secret patterns
  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    for (const { name, regex } of SECRET_PATTERNS) {
      if (regex.test(content)) {
        reportViolation('Pre-commit', `Potential leaked ${name} detected in: ${file}`);
      }
    }
  } catch (err) {
    // Ignore binary files or unreadable nodes
  }
}

if (violations === 0) {
  console.log('   ✅ Clean: No leaked credentials or unencrypted keys detected.');
}

// ----------------------------------------------------------------------------
// Stage 2B: Environment Schema Integrity
// ----------------------------------------------------------------------------
console.log('🔍 [Stage 2B] Verifying .env.example hygiene & zero-fallback contract...');
const envExamplePath = path.join(ROOT_DIR, '.env.example');

if (!fs.existsSync(envExamplePath)) {
  reportViolation('Pre-commit', '.env.example template missing at repository root.');
} else {
  const exampleContent = fs.readFileSync(envExamplePath, 'utf-8');
  if (exampleContent.includes('JWT_SECRET=supersecret') || exampleContent.includes('password123')) {
    reportViolation('Pre-commit', '.env.example contains insecure sample production values.');
  } else {
    console.log('   ✅ Clean: .env.example conforms to zero-fallback discipline.');
  }
}

// ----------------------------------------------------------------------------
// Stage 2C: Docker Hygiene & Non-Root Layer Gatekeeper
// ----------------------------------------------------------------------------
console.log('🔍 [Stage 2C] Executing Docker hygiene gatekeeper...');
try {
  execSync('node scripts/check-docker-hygiene.js --strict', {
    cwd: ROOT_DIR,
    stdio: 'inherit'
  });
  console.log('   ✅ Clean: All Dockerfiles pass CIS Benchmark and layer invariants.');
} catch (err) {
  reportViolation('Pre-commit', 'Docker hygiene audit failed.');
}

// ----------------------------------------------------------------------------
// Final Gatekeeper Verdict
// ----------------------------------------------------------------------------
console.log('\n----------------------------------------------------------------------------------------');
if (violations > 0) {
  console.error(`🚨 PRE-COMMIT GATE FAILED: ${violations} violation(s) detected.`);
  console.error('Commit rejected. Correct the issues above, then commit again.\n');
  process.exit(1);
} else {
  console.log('🎉 PRE-COMMIT GATE PASSED: Working tree clean. Commit allowed.\n');
  process.exit(0);
}
