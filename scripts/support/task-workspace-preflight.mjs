#!/usr/bin/env node
/**
 * Fail-closed GitHub-first workspace freshness & preflight helper (G2-D1 / Issue #204; G1.1-H adoption candidate / Issue #205).
 * Uses Node built-ins, Git CLI, and GitHub CLI (`gh`) read-only APIs with zero shell interpolation.
 * A PASS_FOR_SOURCE_CHECK result never authorizes edits, merge, CI dispatch, or deployment.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, realpathSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const OFFICIAL_REPO = 'abuhmaid28/egyhealth360';
export const OFFICIAL_REPO_ID = 1414824472;

export const VERDICT = Object.freeze({
  PASS_FOR_SOURCE_CHECK: 'PASS_FOR_SOURCE_CHECK',
  REVIEW_REQUIRED: 'REVIEW_REQUIRED',
  BLOCKED: 'BLOCKED',
});

export const EXIT_CODE = Object.freeze({
  PASS_FOR_SOURCE_CHECK: 0,
  CLI_ERROR: 1,
  REVIEW_REQUIRED: 2,
  BLOCKED: 3,
});

export const CONCURRENCY_POLICY = Object.freeze({
  maxTotalExecutors: 4,
  maxCodexCloud: 2,
  maxAntigravityRemote: 1,
  maxCodexLocal: 0,
  allowMultipleAntigravityLocal: true,
  controllingAmendments: Object.freeze([
    'https://github.com/abuhmaid28/egyhealth360/issues/198#issuecomment-7209748645',
    'https://github.com/abuhmaid28/egyhealth360/issues/204#issuecomment-7209750713',
    'https://github.com/abuhmaid28/egyhealth360/issues/198#issuecomment-7209770604',
    'https://github.com/abuhmaid28/egyhealth360/issues/204#issuecomment-7209774584',
  ]),
});

export const DEFAULT_SUBPROCESS_TIMEOUT_MS = 15000;
export const DEFAULT_FETCH_TIMEOUT_MS = 30000;

const VALID_MODES = new Set(['verify', 'fetch']);
const VALID_EXECUTOR_TYPES = new Set(['antigravity-local', 'antigravity-remote', 'codex-cloud', 'codex-local']);
const SHA_RE = /^[0-9a-f]{40}$/i;
const REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

const TRUSTED_ENV_ALLOWLIST_UPPER = new Set([
  'PATH',
  'PATHEXT',
  'SYSTEMROOT',
  'WINDIR',
  'COMSPEC',
  'OS',
  'NUMBER_OF_PROCESSORS',
  'PROCESSOR_ARCHITECTURE',
  'PROGRAMFILES',
  'PROGRAMFILES(X86)',
  'COMMONPROGRAMFILES',
  'COMMONPROGRAMFILES(X86)',
  'TEMP',
  'TMP',
  'TMPDIR',
  'HOME',
  'USERPROFILE',
  'HOMEDRIVE',
  'HOMEPATH',
  'APPDATA',
  'LOCALAPPDATA',
  'XDG_CONFIG_HOME',
  'XDG_DATA_HOME',
  'XDG_CACHE_HOME',
  'XDG_STATE_HOME',
  'LANG',
  'LC_ALL',
  'LC_CTYPE',
  'TERM',
  'TZ',
  'SSH_AUTH_SOCK',
  'SSH_AGENT_PID',
  'HTTP_PROXY',
  'HTTPS_PROXY',
  'NO_PROXY',
  'ALL_PROXY',
  'SSL_CERT_FILE',
  'SSL_CERT_DIR',
  'GH_TOKEN',
  'GITHUB_TOKEN',
  'GH_HOST',
  'GH_CONFIG_DIR',
  'GH_ENTERPRISE_TOKEN',
  'GITHUB_ENTERPRISE_TOKEN',
]);

/**
 * Redact embedded URL credentials, GitHub tokens, auth headers, and secret assignments.
 */
export function redactSecrets(input) {
  if (typeof input !== 'string') return '';
  let text = input;
  // Exempt passwordless ssh://git@host while redacting all other userinfo credentials (including ssh://git:pass@ or https://user:token@).
  text = text.replace(/([a-z][a-z0-9+.-]*:\/\/)([^/\s@]+)@/gi, (full, scheme, userinfo) => {
    if (scheme.toLowerCase() === 'ssh://' && userinfo.toLowerCase() === 'git') return full;
    return `${scheme}<REDACTED>@`;
  });
  // Also redact SCP-style user:secret@host:path credentials while preserving passwordless git@host:path.
  text = text.replace(/(^|[\s"'(=])([^/\s@:]+:[^/\s@]+)@([A-Za-z0-9.-]+:)/g, '$1<REDACTED>@$3');
  text = text.replace(/\b(gh[pousr]_[A-Za-z0-9_]{8,}|github_pat_[A-Za-z0-9_]{12,})\b/g, '<REDACTED_TOKEN>');
  text = text.replace(/\b(Authorization\s*:\s*(?:Bearer|Basic|Token)\s+)([^\s,;]+)/gi, '$1<REDACTED>');
  text = text.replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/-]{12,}=*/gi, '$1 <REDACTED>');
  text = text.replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, '<REDACTED_PRIVATE_KEY>');
  text = text.replace(/\b([A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|API_KEY|COOKIE)[A-Z0-9_]*)=([^\s]+)/gi, '$1=<REDACTED>');
  return text;
}

/**
 * Redact private local workstation paths and OS usernames from text when --redact-paths is enabled.
 */
export function redactLocalPathsInText(input, knownPaths = []) {
  if (typeof input !== 'string') return '';
  let text = input;
  const candidates = new Set();
  for (const p of [os.homedir(), process.cwd(), ...knownPaths]) {
    if (typeof p !== 'string' || !p.trim()) continue;
    const trimmed = p.trim();
    candidates.add(trimmed);
    candidates.add(trimmed.replace(/\\/g, '/'));
    candidates.add(trimmed.replace(/\//g, '\\'));
  }
  const sorted = [...candidates].filter((c) => c.length >= 3).sort((a, b) => b.length - a.length);
  for (const candidate of sorted) {
    const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    text = text.replace(new RegExp(escaped, 'gi'), '<REDACTED_LOCAL_PATH>');
  }
  // Redact file:// URIs, Windows user profile paths (e.g., C:\Users\<username>\...), and POSIX home paths (/home/<user>, /Users/<user>).
  text = text.replace(/file:\/\/[^\s"'`,;)]+/gi, 'file://<REDACTED_LOCAL_PATH>');
  text = text.replace(/[A-Za-z]:[\\/]+Users[\\/]+[^\\/\s"'`,;]+(?:[\\/]+[^\s"'`,;)]*)?/gi, '<REDACTED_LOCAL_PATH>');
  text = text.replace(/(^|[\s"'`(=:])(?:\/home|\/Users)\/[^/\s"'`,;]+(?:\/[^\s"'`,;)]*)?/gi, '$1<REDACTED_LOCAL_PATH>');
  return text;
}

/**
 * Bound and sanitize arbitrary text (e.g., error summaries) before emitting to stdout/stderr.
 */
export function sanitizeText(input, maxLength = 300, options = {}) {
  let raw = String(input ?? '');
  if (options.redactPaths) {
    raw = redactLocalPathsInText(raw, options.knownPaths ?? []);
  }
  const redacted = redactSecrets(raw)
    .replace(/[\r\n\t]+/g, ' ')
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f\x7f]/g, '')
    .trim();
  if (redacted.length <= maxLength) return redacted;
  return `${redacted.slice(0, Math.max(0, maxLength - 14))}...(truncated)`;
}

/**
 * Build a sanitized subprocess environment that never inherits Git repository/index/object/config redirection variables.
 * Handles variable names case-insensitively (required on Windows and synthetic plain-object test environments).
 */
export function buildSanitizedExecEnv(baseEnv = process.env, tool = 'git') {
  const sanitized = {};
  const seenUpper = new Set();

  for (const [rawKey, rawValue] of Object.entries(baseEnv ?? {})) {
    if (typeof rawValue !== 'string') continue;
    const upper = rawKey.toUpperCase();
    // Never inherit any GIT_* ambient variable (GIT_DIR, GIT_WORK_TREE, GIT_INDEX_FILE, GIT_COMMON_DIR,
    // GIT_OBJECT_DIRECTORY, GIT_ALTERNATE_OBJECT_DIRECTORIES, GIT_CONFIG*, GIT_SSH*, etc.).
    if (upper.startsWith('GIT_')) continue;
    if (!TRUSTED_ENV_ALLOWLIST_UPPER.has(upper)) continue;
    if (seenUpper.has(upper)) continue;
    seenUpper.add(upper);

    // Keep GitHub auth tokens only for `gh`, not for local `git` subprocesses.
    if (tool === 'git' && (upper === 'GH_TOKEN' || upper === 'GITHUB_TOKEN' || upper === 'GH_ENTERPRISE_TOKEN' || upper === 'GITHUB_ENTERPRISE_TOKEN')) {
      continue;
    }

    // On Windows/case-insensitive environments, normalize trusted key names while preserving PATH case for POSIX/Windows spawn.
    sanitized[rawKey] = rawValue;
  }

  if (tool === 'git') {
    sanitized.GIT_OPTIONAL_LOCKS = '0';
    sanitized.GIT_TERMINAL_PROMPT = '0';
    sanitized.GIT_CONFIG_COUNT = '0';
  }
  return sanitized;
}

/**
 * Resolve a physical directory path using realpathSync.native when present on disk.
 */
export function resolvePhysicalPath(targetPath, platform = process.platform) {
  if (typeof targetPath !== 'string' || !targetPath.trim()) {
    return { ok: false, normalized: '', resolved: '', errorCode: 'INVALID_PATH' };
  }
  const trimmed = targetPath.trim();
  const isWin = platform === 'win32' || /^[A-Za-z]:[\\/]/.test(trimmed) || trimmed.startsWith('\\\\');
  const mod = isWin ? path.win32 : path.posix;
  const resolved = mod.resolve(trimmed);
  let physical = resolved;
  if (platform === process.platform && existsSync(resolved)) {
    try {
      physical = realpathSync.native(resolved);
    } catch {
      return { ok: false, normalized: '', resolved, errorCode: 'WORKSPACE_PATH_UNRESOLVABLE' };
    }
  }
  const normalized = physical.replace(/\\/g, '/').replace(/\/+$/, '');
  return {
    ok: true,
    resolved: physical,
    normalized: isWin ? normalized.toLowerCase() : normalized,
  };
}

/**
 * Normalize path presentation to forward slashes and resolve platform/8.3/symlink/junction semantics cleanly.
 */
export function normalizePathString(targetPath, platform = process.platform) {
  if (typeof targetPath !== 'string' || !targetPath.trim()) return '';
  const res = resolvePhysicalPath(targetPath, platform);
  if (res.ok) return res.normalized;
  const trimmed = targetPath.trim();
  const isWin = platform === 'win32' || /^[A-Za-z]:[\\/]/.test(trimmed) || trimmed.startsWith('\\\\');
  const mod = isWin ? path.win32 : path.posix;
  const normalized = mod.resolve(trimmed).replace(/\\/g, '/').replace(/\/+$/, '');
  return isWin ? normalized.toLowerCase() : normalized;
}

/**
 * Check whether two workspace/git paths refer to the same directory or one is nested inside the other.
 */
export function pathsOverlap(pathA, pathB, platform = process.platform) {
  const normA = normalizePathString(pathA, platform);
  const normB = normalizePathString(pathB, platform);
  if (!normA || !normB) return false;
  return normA === normB || normA.startsWith(`${normB}/`) || normB.startsWith(`${normA}/`);
}

export function validateIssueNumber(value) {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0 || num > 9999999) {
    throw new Error(`Invalid issue number: ${sanitizeText(value, 40)}`);
  }
  return num;
}

export function validateSha(value, label = 'sha') {
  if (typeof value !== 'string' || !SHA_RE.test(value.trim())) {
    throw new Error(`Invalid ${label}: expected 40-char hex SHA`);
  }
  return value.trim().toLowerCase();
}

export function validateBranchName(name) {
  if (typeof name !== 'string') throw new Error('Invalid branch name: expected string');
  const trimmed = name.trim();
  if (
    !trimmed ||
    trimmed.length > 200 ||
    trimmed.startsWith('-') ||
    trimmed.startsWith('/') ||
    trimmed.endsWith('/') ||
    trimmed.endsWith('.') ||
    trimmed.endsWith('.lock') ||
    trimmed.includes('..') ||
    trimmed.includes('//') ||
    trimmed.includes('@{') ||
    // eslint-disable-next-line no-control-regex
    /[\s~^:?*[\\\x00-\x1f\x7f]/.test(trimmed) ||
    trimmed.split('/').some((seg) => !seg || seg === '.' || seg.endsWith('.lock'))
  ) {
    throw new Error(`Invalid branch name: ${sanitizeText(trimmed, 80)}`);
  }
  return trimmed;
}

export function validateRepoSlug(repo = OFFICIAL_REPO) {
  const trimmed = String(repo ?? '').trim();
  if (!REPO_RE.test(trimmed) || trimmed.toLowerCase() !== OFFICIAL_REPO) {
    throw new Error(`Untrusted repository slug: only ${OFFICIAL_REPO} is allowed`);
  }
  return OFFICIAL_REPO;
}

/**
 * Validate remote origin URL against the official repository without permitting credentials or arbitrary hosts.
 */
export function validateRemoteOriginUrl(rawUrl, expectedRepo = OFFICIAL_REPO) {
  const trimmed = String(rawUrl ?? '').trim();
  if (!trimmed) {
    return { valid: false, trusted: false, hasEmbeddedCredentials: false, sanitizedUrl: '', reasonCode: 'MISSING_REMOTE_ORIGIN' };
  }
  const urlCredMatch = /^([a-z][a-z0-9+.-]*:\/\/)([^/\s@]+)@/i.exec(trimmed);
  const scpCredMatch = !urlCredMatch && /^([^/\s@:]+:[^/\s@]+)@[A-Za-z0-9.-]+:/i.exec(trimmed);
  const hasEmbeddedCredentials = Boolean(
    (urlCredMatch && !(urlCredMatch[1].toLowerCase() === 'ssh://' && urlCredMatch[2].toLowerCase() === 'git')) ||
      scpCredMatch,
  );
  const sanitizedUrl = redactSecrets(trimmed);

  if (hasEmbeddedCredentials) {
    return { valid: false, trusted: false, hasEmbeddedCredentials: true, sanitizedUrl, reasonCode: 'REMOTE_CREDENTIAL_DETECTED' };
  }

  const normalizedHttps = `https://github.com/${expectedRepo}`;
  const normalizedSsh = `git@github.com:${expectedRepo}`;
  const normalizedSshProto = `ssh://git@github.com/${expectedRepo}`;
  const stripped = trimmed.replace(/\/+$/, '').replace(/\.git$/i, '');

  const trusted =
    stripped.toLowerCase() === normalizedHttps.toLowerCase() ||
    stripped.toLowerCase() === normalizedSsh.toLowerCase() ||
    stripped.toLowerCase() === normalizedSshProto.toLowerCase();

  if (!trusted) {
    return { valid: false, trusted: false, hasEmbeddedCredentials: false, sanitizedUrl, reasonCode: 'UNTRUSTED_REMOTE_ORIGIN' };
  }
  return { valid: true, trusted: true, hasEmbeddedCredentials: false, sanitizedUrl, reasonCode: null };
}

function parseOptionalInt(value, flagName) {
  if (value === undefined || value === null) return undefined;
  const trimmed = String(value).trim();
  if (!trimmed || !/^\d+$/.test(trimmed)) throw new Error(`Invalid nonnegative integer for ${flagName}`);
  const num = Number(trimmed);
  if (!Number.isInteger(num) || num < 0 || num > 1000) {
    throw new Error(`Invalid integer for ${flagName}`);
  }
  return num;
}

function parseOptionalBool(value) {
  if (value === undefined) return undefined;
  if (value === true || value === 'true' || value === '1') return true;
  if (value === false || value === 'false' || value === '0') return false;
  throw new Error(`Invalid boolean value: ${sanitizeText(value, 20)}`);
}

/**
 * Parse and strictly validate CLI arguments. Unknown flags fail closed.
 */
export function parseCliArgs(argv) {
  const opts = {
    mode: 'verify',
    repo: OFFICIAL_REPO,
    workspace: process.cwd(),
    json: false,
    redactPaths: false,
    help: false,
    historicalBase: false,
    confirmScope: false,
    isolatedResources: undefined,
    disjointPaths: undefined,
    sameTaskActiveWriter: undefined,
    peerWorkspaces: [],
    fetchRefs: [],
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      opts.help = true;
      continue;
    }
    if (arg === '--json') {
      opts.json = true;
      continue;
    }
    if (arg === '--redact-paths') {
      opts.redactPaths = true;
      continue;
    }
    if (arg === '--historical-base') {
      opts.historicalBase = true;
      continue;
    }
    if (arg === '--confirm-scope') {
      opts.confirmScope = true;
      continue;
    }
    if (arg === '--allow-fetch') {
      opts.mode = 'fetch';
      continue;
    }

    const eqIdx = arg.indexOf('=');
    const flag = eqIdx > -1 ? arg.slice(0, eqIdx) : arg;
    const takeValue = () => {
      if (eqIdx > -1) return arg.slice(eqIdx + 1);
      if (i + 1 >= argv.length) throw new Error(`Missing value for ${flag}`);
      i++;
      return argv[i];
    };

    switch (flag) {
      case '--issue':
        opts.issue = validateIssueNumber(takeValue());
        break;
      case '--branch':
        opts.branch = validateBranchName(takeValue());
        break;
      case '--base':
        opts.base = validateSha(takeValue(), 'base');
        break;
      case '--expected-agents-blob':
        opts.expectedAgentsBlob = validateSha(takeValue(), 'expected-agents-blob');
        break;
      case '--workspace':
        opts.workspace = path.resolve(takeValue());
        break;
      case '--mode': {
        const mode = takeValue().trim();
        if (!VALID_MODES.has(mode)) throw new Error(`Invalid --mode: ${sanitizeText(mode, 20)}`);
        opts.mode = mode;
        break;
      }
      case '--repo':
        opts.repo = validateRepoSlug(takeValue());
        break;
      case '--claim-holder':
        opts.claimHolder = sanitizeText(takeValue(), 80);
        if (!opts.claimHolder) throw new Error('--claim-holder must be non-empty');
        break;
      case '--executor-type': {
        const t = takeValue().trim().toLowerCase();
        if (!VALID_EXECUTOR_TYPES.has(t)) throw new Error(`Invalid --executor-type: ${sanitizeText(t, 40)}`);
        opts.executorType = t;
        break;
      }
      case '--total-executors':
        opts.totalExecutors = parseOptionalInt(takeValue(), '--total-executors');
        break;
      case '--codex-cloud':
        opts.codexCloud = parseOptionalInt(takeValue(), '--codex-cloud');
        break;
      case '--ag-remote':
        opts.agRemote = parseOptionalInt(takeValue(), '--ag-remote');
        break;
      case '--ag-local':
        opts.agLocal = parseOptionalInt(takeValue(), '--ag-local');
        break;
      case '--codex-local':
        opts.codexLocal = parseOptionalInt(takeValue(), '--codex-local');
        break;
      case '--same-task-active-writer':
        opts.sameTaskActiveWriter = parseOptionalBool(takeValue());
        break;
      case '--isolated-resources':
        opts.isolatedResources = parseOptionalBool(takeValue());
        break;
      case '--disjoint-paths':
        opts.disjointPaths = parseOptionalBool(takeValue());
        break;
      case '--peer-workspace':
        opts.peerWorkspaces.push(path.resolve(takeValue()));
        break;
      case '--fetch-ref': {
        const ref = validateBranchName(takeValue());
        opts.fetchRefs.push(ref);
        break;
      }
      default:
        throw new Error(`Unknown or disallowed argument: ${sanitizeText(flag, 60)}`);
    }
  }

  if (!opts.help) {
    if (!opts.issue) throw new Error('Missing required --issue <number>');
    if (!opts.branch) throw new Error('Missing required --branch <name>');
    if (!opts.base) throw new Error('Missing required --base <40-hex-sha>');
  }
  return opts;
}

/**
 * Default safe subprocess runner using execFileSync with shell disabled, isolated sanitized env, explicit cwd, and bounded timeout.
 */
export function createExecRunner(options = {}) {
  const defaultTimeoutMs = Number.isInteger(options.timeoutMs) && options.timeoutMs > 0
    ? options.timeoutMs
    : DEFAULT_SUBPROCESS_TIMEOUT_MS;
  const baseEnv = options.env ?? process.env;

  return (cmd, args, cwd, callOptions = {}) => {
    const resolvedCwd = cwd ? path.resolve(String(cwd)) : process.cwd();
    if (!existsSync(resolvedCwd)) {
      return { ok: false, code: 1, timedOut: false, stdout: '', stderr: 'Working directory does not exist' };
    }
    try {
      if (!statSync(resolvedCwd).isDirectory()) {
        return { ok: false, code: 1, timedOut: false, stdout: '', stderr: 'Working directory is not a directory' };
      }
    } catch {
      return { ok: false, code: 1, timedOut: false, stdout: '', stderr: 'Working directory is inaccessible' };
    }

    const tool = path.basename(String(cmd)).toLowerCase().startsWith('gh') ? 'gh' : 'git';
    const timeoutMs = Number.isInteger(callOptions.timeoutMs) && callOptions.timeoutMs > 0
      ? callOptions.timeoutMs
      : defaultTimeoutMs;
    const env = buildSanitizedExecEnv(baseEnv, tool);

    try {
      const stdout = execFileSync(cmd, args, {
        cwd: resolvedCwd,
        env,
        timeout: timeoutMs,
        encoding: 'utf8',
        shell: false,
        windowsHide: true,
        maxBuffer: 8 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      // Preserve leading spaces on stdout (required by `git status --porcelain=v1`); only trim trailing line breaks.
      return { ok: true, code: 0, timedOut: false, stdout: stdout.replace(/[\r\n]+$/, ''), stderr: '' };
    } catch (error) {
      const timedOut = Boolean(
        error?.killed ||
          error?.code === 'ETIMEDOUT' ||
          error?.errno === 'ETIMEDOUT' ||
          (error?.signal === 'SIGTERM' && !error?.status),
      );
      return {
        ok: false,
        code: typeof error?.status === 'number' ? error.status : 1,
        timedOut,
        stdout: sanitizeText(error?.stdout?.toString?.('utf8') ?? '', 300),
        stderr: sanitizeText(
          timedOut ? `Subprocess timed out after ${timeoutMs}ms` : (error?.stderr?.toString?.('utf8') ?? error?.message ?? ''),
          300,
        ),
      };
    }
  };
}

/**
 * Read live GitHub repository, main/AGENTS.md pins, issue state, and target branch ref (read-only).
 */
export function readGitHubState({ repo = OFFICIAL_REPO, issueNumber, targetBranch, runner = createExecRunner() }) {
  repo = validateRepoSlug(repo);
  issueNumber = validateIssueNumber(issueNumber);
  targetBranch = validateBranchName(targetBranch);

  const api = (endpoint) => {
    const res = runner('gh', ['api', endpoint], process.cwd());
    if (!res.ok) return { ok: false, timedOut: Boolean(res.timedOut), error: res.stderr || res.stdout || 'gh api failed' };
    try {
      return { ok: true, timedOut: false, data: JSON.parse(res.stdout) };
    } catch {
      return { ok: false, timedOut: false, error: 'Malformed JSON from gh api' };
    }
  };

  const repoRes = api(`repos/${repo}`);
  if (!repoRes.ok) {
    return { reachable: false, errorCode: repoRes.timedOut ? 'GITHUB_SUBPROCESS_TIMEOUT' : 'GITHUB_REPO_UNREACHABLE', error: repoRes.error };
  }
  const repoMeta = repoRes.data;

  const mainRes = api(`repos/${repo}/git/ref/heads/main`);
  if (!mainRes.ok || !mainRes.data?.object?.sha) {
    return { reachable: false, errorCode: mainRes.timedOut ? 'GITHUB_SUBPROCESS_TIMEOUT' : 'GITHUB_MAIN_REF_UNREACHABLE', error: mainRes.error || 'Missing main SHA' };
  }

  const agentsRes = api(`repos/${repo}/contents/AGENTS.md?ref=main`);
  if (!agentsRes.ok || !agentsRes.data?.sha) {
    return { reachable: false, errorCode: agentsRes.timedOut ? 'GITHUB_SUBPROCESS_TIMEOUT' : 'GITHUB_AGENTS_UNREACHABLE', error: agentsRes.error || 'Missing AGENTS.md blob' };
  }

  const issueRes = api(`repos/${repo}/issues/${issueNumber}`);
  if (!issueRes.ok || !issueRes.data?.number) {
    return { reachable: false, errorCode: issueRes.timedOut ? 'GITHUB_SUBPROCESS_TIMEOUT' : 'GITHUB_ISSUE_UNREACHABLE', error: issueRes.error || 'Missing issue metadata' };
  }

  const totalComments = Number(issueRes.data.comments ?? 0);
  const latestPage = totalComments > 0 ? Math.ceil(totalComments / 100) : 1;
  const commentsRes = api(`repos/${repo}/issues/${issueNumber}/comments?per_page=100&page=${latestPage}`);
  if (!commentsRes.ok || !Array.isArray(commentsRes.data)) {
    return { reachable: false, errorCode: commentsRes.timedOut ? 'GITHUB_SUBPROCESS_TIMEOUT' : 'GITHUB_COMMENTS_UNREACHABLE', error: commentsRes.error || 'Missing comments' };
  }

  const branchRefEndpoint = `repos/${repo}/git/ref/heads/${targetBranch.split('/').map(encodeURIComponent).join('/')}`;
  const branchRes = runner('gh', ['api', branchRefEndpoint], process.cwd());
  if (branchRes.timedOut) {
    return { reachable: false, errorCode: 'GITHUB_SUBPROCESS_TIMEOUT', error: branchRes.stderr };
  }
  let branchState = 'UNKNOWN';
  let remoteTaskSha = null;

  if (branchRes.ok) {
    try {
      const parsed = JSON.parse(branchRes.stdout);
      // GitHub returns an array when targetBranch is a prefix of other refs; only accept exact single ref object.
      if (!Array.isArray(parsed) && parsed?.object?.sha && SHA_RE.test(parsed.object.sha)) {
        branchState = 'EXISTS';
        remoteTaskSha = parsed.object.sha.toLowerCase();
      }
    } catch {
      branchState = 'UNKNOWN';
    }
  }

  if (branchState === 'UNKNOWN') {
    const lsRes = runner('git', ['ls-remote', '--exit-code', `https://github.com/${repo}.git`, `refs/heads/${targetBranch}`], process.cwd());
    if (lsRes.timedOut) {
      return { reachable: false, errorCode: 'GITHUB_SUBPROCESS_TIMEOUT', error: lsRes.stderr };
    }
    if (lsRes.ok && lsRes.stdout) {
      const sha = lsRes.stdout.trim().split(/\s+/)[0]?.toLowerCase();
      if (SHA_RE.test(sha ?? '')) {
        branchState = 'EXISTS';
        remoteTaskSha = sha;
      }
    } else if (lsRes.code === 2 && !lsRes.stderr) {
      branchState = 'ABSENT';
    } else if (!branchRes.ok && /404|Not Found/i.test(branchRes.stderr)) {
      branchState = 'ABSENT';
    } else {
      return { reachable: false, errorCode: 'GITHUB_BRANCH_REF_UNREACHABLE', error: branchRes.stderr || lsRes.stderr };
    }
  }

  const comments = commentsRes.data;
  const latestComment = comments.length > 0 ? comments[comments.length - 1] : null;

  return {
    reachable: true,
    repoId: repoMeta.id,
    repoFullName: repoMeta.full_name,
    visibility: repoMeta.visibility ?? (repoMeta.private ? 'private' : 'public'),
    defaultBranch: repoMeta.default_branch,
    mainHeadSha: mainRes.data.object.sha.toLowerCase(),
    agentsBlobSha: agentsRes.data.sha.toLowerCase(),
    issue: {
      number: issueRes.data.number,
      state: String(issueRes.data.state ?? '').toUpperCase(),
      assigneesCount: Array.isArray(issueRes.data.assignees) ? issueRes.data.assignees.length : 0,
      commentsCount: totalComments || comments.length,
      latestCommentId: latestComment?.id ?? null,
      latestCommentCreatedAt: latestComment?.created_at ?? null,
      updatedAt: issueRes.data.updated_at ?? null,
    },
    targetBranch: {
      name: targetBranch,
      state: branchState,
      headSha: remoteTaskSha,
    },
  };
}

/**
 * Inspect peer workspace Git common-dir relationships safely without mutating peers.
 */
function inspectPeerCommonDirs({ peerWorkspaces, gitCommonDir, runner }) {
  let sharesCommonDirWithPeer = false;
  let peerInspectionFailed = false;
  let unverifiedPeerForFetch = false;

  for (const rawPeer of peerWorkspaces ?? []) {
    const peerResolved = resolvePhysicalPath(rawPeer);
    if (!peerResolved.ok) {
      peerInspectionFailed = true;
      unverifiedPeerForFetch = true;
      continue;
    }
    if (!existsSync(peerResolved.resolved)) {
      // A non-existent peer path cannot share an on-disk .git directory yet,
      // though fetch mode still requires explicit peer isolation verification.
      unverifiedPeerForFetch = true;
      continue;
    }
    try {
      if (!statSync(peerResolved.resolved).isDirectory()) {
        peerInspectionFailed = true;
        unverifiedPeerForFetch = true;
        continue;
      }
    } catch {
      peerInspectionFailed = true;
      unverifiedPeerForFetch = true;
      continue;
    }

    const peerCommonRes = runner('git', ['rev-parse', '--git-common-dir'], peerResolved.resolved);
    if (peerCommonRes.timedOut) {
      peerInspectionFailed = true;
      unverifiedPeerForFetch = true;
      continue;
    }
    if (!peerCommonRes.ok) {
      // Distinguish "not a git repository" (safe non-sharing) from ambiguous/unexpected inspection failure.
      if (!/not a git repository/i.test(peerCommonRes.stderr)) {
        peerInspectionFailed = true;
        unverifiedPeerForFetch = true;
      }
      continue;
    }

    const peerCommonRaw = peerCommonRes.stdout.trim();
    if (!peerCommonRaw) {
      peerInspectionFailed = true;
      unverifiedPeerForFetch = true;
      continue;
    }
    const peerCommonAbs = normalizePathString(path.resolve(peerResolved.resolved, peerCommonRaw));
    if (!peerCommonAbs || (gitCommonDir && peerCommonAbs === gitCommonDir)) {
      sharesCommonDirWithPeer = true;
    }
  }

  return { sharesCommonDirWithPeer, peerInspectionFailed, unverifiedPeerForFetch };
}

/**
 * Inspect local Git workspace (strictly read-only unless explicitly authorized after PASS_FOR_SOURCE_CHECK).
 */
export function inspectLocalGitWorkspace({
  workspacePath,
  authorizedBaseSha,
  remoteTaskSha,
  peerWorkspaces = [],
  mode = 'verify',
  fetchRefs = [],
  targetBranch = '',
  fetchAuthorized = false,
  expectedRepo = OFFICIAL_REPO,
  allowTrustedRemoteCheck = validateRemoteOriginUrl,
  runner = createExecRunner(),
}) {
  if (!workspacePath || !existsSync(workspacePath)) {
    return { exists: false, isGitRepo: false, errorCode: 'WORKSPACE_NOT_FOUND' };
  }
  try {
    if (!statSync(workspacePath).isDirectory()) {
      return { exists: true, isGitRepo: false, errorCode: 'WORKSPACE_NOT_A_DIRECTORY' };
    }
  } catch {
    return { exists: true, isGitRepo: false, errorCode: 'WORKSPACE_INACCESSIBLE' };
  }

  const physicalWorkspace = resolvePhysicalPath(workspacePath);
  if (!physicalWorkspace.ok) {
    return { exists: true, isGitRepo: false, errorCode: physicalWorkspace.errorCode || 'WORKSPACE_PATH_UNRESOLVABLE' };
  }

  const execCwd = physicalWorkspace.resolved;
  const git = (...args) => runner('git', args, execCwd);
  let timedOut = false;
  const trackTimeout = (res) => {
    if (res?.timedOut) timedOut = true;
    return res;
  };

  const rootRes = trackTimeout(git('rev-parse', '--show-toplevel'));
  if (!rootRes.ok || !rootRes.stdout.trim()) {
    return {
      exists: true,
      isGitRepo: false,
      timedOut,
      errorCode: timedOut ? 'GIT_SUBPROCESS_TIMEOUT' : 'NOT_A_GIT_REPOSITORY',
      error: rootRes.stderr || undefined,
    };
  }

  const rawGitRoot = rootRes.stdout.trim();
  const physicalGitRoot = resolvePhysicalPath(rawGitRoot);
  const normalizedWorkspacePath = physicalWorkspace.normalized;
  const normalizedGitRoot = physicalGitRoot.ok ? physicalGitRoot.normalized : '';
  const workspaceMatchesGitRoot = Boolean(normalizedWorkspacePath && normalizedGitRoot && normalizedWorkspacePath === normalizedGitRoot);

  const inspectionErrors = [];
  const gitDirRes = trackTimeout(git('rev-parse', '--git-dir'));
  const commonDirRes = trackTimeout(git('rev-parse', '--git-common-dir'));
  const gitDirRaw = gitDirRes.ok ? gitDirRes.stdout.trim() : '';
  const gitCommonDirRaw = commonDirRes.ok ? commonDirRes.stdout.trim() : '';
  if (!gitDirRes.ok || !gitDirRaw) inspectionErrors.push('GIT_DIR_INSPECTION_FAILED');
  if (!commonDirRes.ok || !gitCommonDirRaw) inspectionErrors.push('GIT_COMMON_DIR_INSPECTION_FAILED');

  const gitDir = gitDirRaw ? normalizePathString(path.resolve(execCwd, gitDirRaw)) : '';
  const gitCommonDir = gitCommonDirRaw ? normalizePathString(path.resolve(execCwd, gitCommonDirRaw)) : '';
  const gitDirAmbiguous = !gitDir || !gitCommonDir;
  const isWorktree = gitDirAmbiguous ? true : gitDir !== gitCommonDir;

  const worktreeListRes = trackTimeout(git('worktree', 'list', '--porcelain'));
  let worktreeCount = null;
  if (!worktreeListRes.ok || !worktreeListRes.stdout.trim()) {
    inspectionErrors.push('GIT_WORKTREE_LIST_FAILED');
  } else {
    worktreeCount = worktreeListRes.stdout.split(/\r?\n/).filter((l) => l.startsWith('worktree ')).length;
    if (worktreeCount < 1) inspectionErrors.push('GIT_WORKTREE_LIST_FAILED');
  }

  const remotesRes = trackTimeout(git('remote'));
  if (!remotesRes.ok) inspectionErrors.push('GIT_REMOTE_LIST_FAILED');
  const remoteNames = remotesRes.ok ? remotesRes.stdout.trim().split(/\r?\n/).filter(Boolean) : [];
  const originUrlsRes = trackTimeout(git('remote', 'get-url', '--all', 'origin'));
  const originUrls = originUrlsRes.ok ? originUrlsRes.stdout.trim().split(/\r?\n/).filter(Boolean) : [];
  const pushUrlsRes = trackTimeout(git('remote', 'get-url', '--all', '--push', 'origin'));
  const pushUrls = pushUrlsRes.ok ? pushUrlsRes.stdout.trim().split(/\r?\n/).filter(Boolean) : [];
  const primaryOrigin = originUrls[0] ?? '';
  const originValidation = allowTrustedRemoteCheck(primaryOrigin, expectedRepo);
  const pushValidations = pushUrls.map((u) => allowTrustedRemoteCheck(u, expectedRepo));
  const invalidPushValidation = pushValidations.find((v) => !v.trusted) ?? null;

  const branchRes = trackTimeout(git('branch', '--show-current'));
  if (!branchRes.ok) inspectionErrors.push('GIT_BRANCH_INSPECTION_FAILED');
  const currentBranch = branchRes.ok ? branchRes.stdout.trim() : '';
  const headRes = trackTimeout(git('rev-parse', 'HEAD'));
  const headShaStr = headRes.ok ? headRes.stdout.trim() : '';
  const headSha = headRes.ok && SHA_RE.test(headShaStr) ? headShaStr.toLowerCase() : null;
  const treeRes = trackTimeout(git('rev-parse', 'HEAD^{tree}'));
  const treeShaStr = treeRes.ok ? treeRes.stdout.trim() : '';
  const headTreeSha = treeRes.ok && SHA_RE.test(treeShaStr) ? treeShaStr.toLowerCase() : null;

  const statusRes = trackTimeout(git('status', '--porcelain=v1'));
  const gitStatusFailed = !statusRes.ok;
  const dirtyEntries = !gitStatusFailed && statusRes.stdout
    ? statusRes.stdout.split(/\r?\n/).filter(Boolean).map((line) => sanitizeText(line.slice(3), 120))
    : [];

  const peerCheck = inspectPeerCommonDirs({ peerWorkspaces, gitCommonDir, runner });

  // Evaluate fetch preconditions (strictly no network fetch unless explicitly authorized by full Stage 1-3 gates).
  let fetchPerformed = false;
  let fetchErrorCode = null;
  if (mode === 'fetch') {
    const refsToFetch = fetchRefs.length > 0 ? fetchRefs : ['main'];
    const invalidFetchRef = refsToFetch.some((r) => {
      try {
        const clean = validateBranchName(r);
        if (clean === 'main') return false;
        return !(targetBranch && clean === targetBranch);
      } catch {
        return true;
      }
    });

    if (timedOut) {
      fetchErrorCode = 'GIT_SUBPROCESS_TIMEOUT';
    } else if (gitStatusFailed || inspectionErrors.length > 0 || !workspaceMatchesGitRoot) {
      fetchErrorCode = !workspaceMatchesGitRoot ? 'FETCH_REFUSED_WORKSPACE_NOT_GIT_ROOT' : 'GIT_INSPECTION_FAILED';
    } else if (dirtyEntries.length > 0) {
      fetchErrorCode = 'FETCH_REFUSED_DIRTY_WORKSPACE';
    } else if (remoteNames.length !== 1 || originUrls.length !== 1 || pushUrls.length > 1 || !originValidation.trusted || invalidPushValidation) {
      fetchErrorCode = 'FETCH_REFUSED_UNTRUSTED_OR_DUPLICATE_REMOTE';
    } else if (gitDirAmbiguous || isWorktree || worktreeCount !== 1 || peerCheck.sharesCommonDirWithPeer || peerCheck.peerInspectionFailed) {
      fetchErrorCode = 'FETCH_REFUSED_SHARED_GIT_COMMON_DIR';
    } else if (peerCheck.unverifiedPeerForFetch) {
      fetchErrorCode = 'FETCH_REFUSED_UNVERIFIED_PEER';
    } else if (invalidFetchRef) {
      fetchErrorCode = 'DISALLOWED_FETCH_REF';
    } else if (fetchAuthorized !== true) {
      fetchErrorCode = 'FETCH_REQUIRES_PREFLIGHT_PASS';
    } else {
      for (const refName of refsToFetch) {
        const cleanRef = validateBranchName(refName);
        // Non-force refspec only (no leading `+`, no tags, no pruning, no wildcard refspecs).
        const fRes = trackTimeout(
          runner('git', ['fetch', '--no-tags', '--no-prune', 'origin', `refs/heads/${cleanRef}:refs/remotes/origin/${cleanRef}`], execCwd, {
            timeoutMs: DEFAULT_FETCH_TIMEOUT_MS,
          }),
        );
        if (!fRes.ok) {
          fetchErrorCode = fRes.timedOut ? 'GIT_SUBPROCESS_TIMEOUT' : 'FETCH_FAILED';
          break;
        }
      }
      if (!fetchErrorCode) fetchPerformed = true;
    }
  }

  const hasCommitObject = (sha) => {
    if (!sha) return false;
    const res = trackTimeout(git('cat-file', '-t', sha));
    return res.ok && res.stdout.trim() === 'commit';
  };
  const isAncestor = (ancestorSha, descendantSha) => {
    if (!ancestorSha || !descendantSha) return null;
    const res = trackTimeout(git('merge-base', '--is-ancestor', ancestorSha, descendantSha));
    if (res.ok) return true;
    if (res.code === 1 && !res.stderr) return false;
    return null;
  };

  const hasBaseObject = hasCommitObject(authorizedBaseSha);
  const hasRemoteTaskObject = remoteTaskSha ? hasCommitObject(remoteTaskSha) : null;

  return {
    exists: true,
    isGitRepo: true,
    timedOut,
    workspacePath: normalizedWorkspacePath,
    gitRoot: normalizedGitRoot,
    workspaceMatchesGitRoot,
    gitDir,
    gitCommonDir,
    gitDirAmbiguous,
    isWorktree,
    worktreeCount,
    sharesCommonDirWithPeer: peerCheck.sharesCommonDirWithPeer,
    peerInspectionFailed: peerCheck.peerInspectionFailed,
    inspectionFailed: inspectionErrors.length > 0,
    inspectionErrors,
    remoteNames,
    originUrlCount: originUrls.length,
    pushUrlCount: pushUrls.length,
    originSanitized: originValidation.sanitizedUrl,
    originValidation,
    pushOriginValidation: invalidPushValidation,
    currentBranch: currentBranch || '(detached)',
    headSha,
    headTreeSha,
    gitStatusFailed,
    dirtyCount: dirtyEntries.length,
    dirtySamplePaths: dirtyEntries.slice(0, 10),
    hasBaseObject,
    hasRemoteTaskObject,
    baseIsAncestorOfHead: hasBaseObject && headSha ? isAncestor(authorizedBaseSha, headSha) : null,
    headIsAncestorOfRemoteTask: remoteTaskSha && hasRemoteTaskObject && headSha ? isAncestor(headSha, remoteTaskSha) : null,
    remoteTaskIsAncestorOfHead: remoteTaskSha && hasRemoteTaskObject && headSha ? isAncestor(remoteTaskSha, headSha) : null,
    fetchPerformed,
    fetchErrorCode,
  };
}

function isValidCount(value) {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 1000;
}

/**
 * Pure deterministic classifier combining GitHub readback, local Git inspection, and concurrency/isolation checks.
 * Performs zero I/O or network calls.
 */
export function evaluatePreflight({
  input,
  github,
  local,
  concurrency = {},
  observedAt = new Date().toISOString(),
}) {
  const reasonCodes = [];
  const warnings = [];
  let blocked = false;
  let reviewRequired = false;

  const block = (code) => {
    blocked = true;
    if (!reasonCodes.includes(code)) reasonCodes.push(code);
  };
  const review = (code) => {
    reviewRequired = true;
    if (!reasonCodes.includes(code)) reasonCodes.push(code);
  };

  // 1. Live GitHub readback & repository identity (fail-closed if unreachable or mismatched).
  if (!github || github.reachable !== true) {
    block(github?.errorCode || 'GITHUB_READBACK_UNAVAILABLE');
  } else {
    if (github.repoId !== OFFICIAL_REPO_ID || github.repoFullName !== OFFICIAL_REPO) {
      block('REPO_IDENTITY_MISMATCH');
    }
    if (github.visibility !== 'public') {
      review('UNEXPECTED_REPO_VISIBILITY');
    }
    if (github.issue?.state !== 'OPEN') {
      block('ISSUE_NOT_OPEN');
    }
    if (!input.historicalBase && github.mainHeadSha && input.base !== github.mainHeadSha) {
      review('BASE_DRIFT_FROM_MAIN');
    }
    if (input.expectedAgentsBlob && github.agentsBlobSha && input.expectedAgentsBlob !== github.agentsBlobSha) {
      review('AGENTS_POLICY_DRIFT');
    }
  }

  // 2. Explicit human/executor scope & ownership confirmation (never infer from issue prose).
  if (!input.confirmScope) {
    review('SCOPE_CONFIRMATION_REQUIRED');
  }
  if (!input.claimHolder) {
    review('WRITER_CLAIM_UNCONFIRMED');
  }

  // 3. Authorized concurrency & resource-isolation policy (Amendments 7209748645 & 7209750713).
  // Convention: all category counts and total represent projected active executors INCLUDING the selected executor.
  const executorType = concurrency.executorType ?? input.executorType;
  const totalExecutors = concurrency.totalExecutors ?? input.totalExecutors;
  const codexCloud = concurrency.codexCloud ?? input.codexCloud;
  const antigravityRemote = concurrency.antigravityRemote ?? input.agRemote;
  const agLocal = concurrency.agLocal ?? input.agLocal;
  const codexLocal = concurrency.codexLocal ?? input.codexLocal;
  const sameTaskActiveWriter = concurrency.sameTaskActiveWriter ?? input.sameTaskActiveWriter;
  const isolatedResources = concurrency.isolatedResources ?? input.isolatedResources;
  const disjointPaths = concurrency.disjointPaths ?? input.disjointPaths;
  const peerWorkspaces = concurrency.peerWorkspaces ?? input.peerWorkspaces ?? [];

  if (!executorType || !VALID_EXECUTOR_TYPES.has(executorType)) {
    review('EXECUTOR_TYPE_UNKNOWN');
  } else if (executorType === 'codex-local') {
    block('CODEX_LOCAL_PROHIBITED');
  }
  if (typeof codexLocal === 'number' && Number.isFinite(codexLocal) && codexLocal > CONCURRENCY_POLICY.maxCodexLocal) {
    block('CODEX_LOCAL_PROHIBITED');
  }
  if (sameTaskActiveWriter === true) {
    block('ACTIVE_PREDECESSOR_ON_SAME_TASK');
  } else if (sameTaskActiveWriter !== false) {
    review('SAME_TASK_OWNERSHIP_UNKNOWN');
  }

  const allCounts = [totalExecutors, codexCloud, antigravityRemote, agLocal, codexLocal];
  const anyMissingCount = allCounts.some((c) => c === undefined || c === null);
  const anyInvalidCount = !anyMissingCount && allCounts.some((c) => !isValidCount(c));

  if (anyMissingCount) {
    review('CONCURRENCY_COUNTS_UNKNOWN');
  } else if (anyInvalidCount) {
    block('CONCURRENCY_COUNT_INVALID');
  } else {
    if (totalExecutors > CONCURRENCY_POLICY.maxTotalExecutors) block('CONCURRENCY_CAP_EXCEEDED');
    if (codexCloud > CONCURRENCY_POLICY.maxCodexCloud) block('CODEX_CLOUD_CAP_EXCEEDED');
    if (antigravityRemote > CONCURRENCY_POLICY.maxAntigravityRemote) block('ANTIGRAVITY_REMOTE_CAP_EXCEEDED');
    const sum = codexCloud + antigravityRemote + agLocal + codexLocal;
    if (sum !== totalExecutors) block('CONCURRENCY_SUM_INCONSISTENT');
    if (sum > CONCURRENCY_POLICY.maxTotalExecutors) block('CONCURRENCY_CAP_EXCEEDED');

    if (executorType && VALID_EXECUTOR_TYPES.has(executorType)) {
      const selectedCount =
        executorType === 'antigravity-local'
          ? agLocal
          : executorType === 'antigravity-remote'
            ? antigravityRemote
            : executorType === 'codex-cloud'
              ? codexCloud
              : codexLocal;
      if (selectedCount < 1 || totalExecutors < 1) {
        block('SELECTED_EXECUTOR_NOT_IN_COUNTS');
      }
    }
  }

  if (isolatedResources !== true) {
    review('RESOURCE_ISOLATION_UNVERIFIED');
  }
  if (disjointPaths !== true) {
    review('DISJOINT_PATHS_UNVERIFIED');
  }

  // Validate fetch refs when mode === 'fetch' (only exact 'main' or target branch permitted).
  if (input.mode === 'fetch' && Array.isArray(input.fetchRefs)) {
    for (const ref of input.fetchRefs) {
      if (ref !== 'main' && ref !== input.branch) {
        block('DISALLOWED_FETCH_REF');
        break;
      }
    }
  }

  // Check physical workspace, gitRoot, and gitCommonDir overlap against peer active workspaces (Windows & POSIX safe).
  if ((local?.workspacePath || local?.gitRoot || local?.gitCommonDir) && Array.isArray(peerWorkspaces)) {
    for (const peer of peerWorkspaces) {
      if (
        (local.workspacePath && pathsOverlap(local.workspacePath, peer)) ||
        (local.gitRoot && pathsOverlap(local.gitRoot, peer)) ||
        (local.gitCommonDir && pathsOverlap(local.gitCommonDir, peer))
      ) {
        block('WORKSPACE_PATH_OVERLAP');
        break;
      }
    }
  }

  // 4. Local Git workspace & freshness state classification.
  let branchRelation = 'UNKNOWN';
  if (!local || !local.exists) {
    block('WORKSPACE_NOT_FOUND');
  } else if (!local.isGitRepo) {
    if (local.timedOut) block('GIT_SUBPROCESS_TIMEOUT');
    block(local.errorCode || 'NOT_A_GIT_REPOSITORY');
  } else {
    if (local.timedOut) {
      block('GIT_SUBPROCESS_TIMEOUT');
    }
    if (local.inspectionFailed || local.gitDirAmbiguous) {
      block('GIT_INSPECTION_FAILED');
    }
    const resolvedMatchesRoot =
      local.workspaceMatchesGitRoot === true ||
      (local.workspaceMatchesGitRoot === undefined &&
        Boolean(local.workspacePath && local.gitRoot && normalizePathString(local.workspacePath) === normalizePathString(local.gitRoot)));
    if (!resolvedMatchesRoot) {
      block('WORKSPACE_NOT_GIT_ROOT');
    }
    if (local.sharesCommonDirWithPeer) {
      block('SHARED_GIT_COMMON_DIR_WITH_PEER');
    }
    if (local.peerInspectionFailed) {
      block('PEER_INSPECTION_FAILED');
    }
    if (local.fetchErrorCode) {
      block(local.fetchErrorCode);
    }
    if (local.gitStatusFailed) {
      block('GIT_STATUS_FAILED');
    }
    if ((local.remoteNames?.length ?? 0) > 1 || (local.originUrlCount ?? 0) > 1 || (local.pushUrlCount ?? 0) > 1) {
      block('DUPLICATE_REMOTE');
    }
    if (!local.originValidation?.trusted) {
      block(local.originValidation?.reasonCode || 'UNTRUSTED_REMOTE_ORIGIN');
    }
    if (local.pushOriginValidation && !local.pushOriginValidation.trusted) {
      block(local.pushOriginValidation.reasonCode || 'UNTRUSTED_PUSH_REMOTE_ORIGIN');
    }
    if ((local.dirtyCount ?? 0) > 0) {
      block('DIRTY_WORKSPACE');
    }
    if (!local.headSha) {
      block('MISSING_LOCAL_HEAD');
    }
    if (local.headSha && local.headTreeSha === null) {
      block('MISSING_LOCAL_TREE');
    }
    if (!local.hasBaseObject) {
      branchRelation = 'MISSING_ANCESTRY';
      review('MISSING_BASE_ANCESTRY');
    }

    const remoteBranch = github?.reachable ? github.targetBranch : null;
    if (!local.headSha) {
      branchRelation = 'MISSING_LOCAL_HEAD';
    } else if (remoteBranch?.state === 'ABSENT') {
      const onTargetOrDetachedAtBase =
        local.currentBranch === input.branch || local.currentBranch === 'main' || local.currentBranch === '(detached)';
      if (!onTargetOrDetachedAtBase) {
        if (local.hasBaseObject) branchRelation = 'WRONG_REF';
        review('WRONG_LOCAL_REF');
      }
      if (local.headSha !== input.base) {
        if (local.hasBaseObject && onTargetOrDetachedAtBase) branchRelation = 'STALE_OR_MISMATCHED_BASE_HEAD';
        block('LOCAL_HEAD_NOT_AT_AUTHORIZED_BASE');
      } else if (local.hasBaseObject && onTargetOrDetachedAtBase && local.headSha === input.base) {
        branchRelation = input.historicalBase ? 'NEW_BRANCH_AT_HISTORICAL_BASE' : 'NEW_BRANCH_AT_BASE';
      }
    } else if (remoteBranch?.state === 'EXISTS' && remoteBranch.headSha) {
      if (local.currentBranch !== input.branch) {
        if (local.hasBaseObject) branchRelation = 'WRONG_REF';
        review('WRONG_LOCAL_REF');
      } else if (!local.hasRemoteTaskObject) {
        branchRelation = 'MISSING_ANCESTRY';
        review('MISSING_REMOTE_TASK_ANCESTRY');
      } else if (local.baseIsAncestorOfHead === false) {
        branchRelation = 'BASE_NOT_IN_ANCESTRY';
        block('BASE_NOT_IN_ANCESTRY');
      } else if (local.baseIsAncestorOfHead !== true) {
        branchRelation = 'MISSING_ANCESTRY';
        review('BASE_ANCESTRY_UNKNOWN');
      } else if (local.headSha === remoteBranch.headSha) {
        branchRelation = 'CURRENT';
      } else if (local.headIsAncestorOfRemoteTask === true) {
        branchRelation = 'BEHIND';
        block('LOCAL_BEHIND_REMOTE');
      } else if (local.remoteTaskIsAncestorOfHead === true) {
        branchRelation = 'AHEAD';
        review('LOCAL_AHEAD_OF_REMOTE');
      } else {
        branchRelation = 'DIVERGED';
        block('LOCAL_DIVERGED_FROM_REMOTE');
      }
    } else if (github?.reachable) {
      branchRelation = 'UNKNOWN';
      review('REMOTE_BRANCH_STATE_UNKNOWN');
    }

    if (local.isWorktree || (local.worktreeCount ?? 1) > 1) {
      if (input.mode === 'fetch') {
        block('FETCH_REFUSED_SHARED_GIT_COMMON_DIR');
      } else {
        warnings.push('Workspace shares gitCommonDir with worktree(s); use a dedicated standalone clone for fetch operations.');
      }
    }
  }

  let verdict = VERDICT.PASS_FOR_SOURCE_CHECK;
  if (blocked) verdict = VERDICT.BLOCKED;
  else if (reviewRequired) verdict = VERDICT.REVIEW_REQUIRED;

  let nextAction = 'Ready for explicit claim/recheck immediately before edit or push (source-check PASS does not authorize edits, merge, or deploy).';
  if (verdict === VERDICT.BLOCKED) {
    nextAction = 'STOP: preserve existing dirty/local work, resolve blocking condition(s), and re-run preflight without destructive git resets.';
  } else if (verdict === VERDICT.REVIEW_REQUIRED) {
    nextAction = 'HOLD FOR REVIEW: verify missing ownership/concurrency/ancestry/base evidence and obtain explicit confirmation before proceeding.';
  }

  const knownPrivatePaths = [
    input.workspace,
    local?.workspacePath,
    local?.gitRoot,
    local?.gitCommonDir,
    ...(peerWorkspaces ?? []),
  ].filter(Boolean);
  const sanitizeErr = (value) =>
    value
      ? sanitizeText(value, 200, { redactPaths: Boolean(input.redactPaths), knownPaths: knownPrivatePaths })
      : undefined;

  const projectedDirtySamples = (local?.dirtySamplePaths ?? []).map((sample) => {
    if (!input.redactPaths) return sample;
    const isAbsoluteOrUserPath =
      /^[A-Za-z]:[\\/]/.test(sample) ||
      sample.startsWith('/') ||
      sample.startsWith('\\\\') ||
      /[\\/](?:Users|home)[\\/]/i.test(sample);
    if (isAbsoluteOrUserPath) return '<REDACTED_LOCAL_PATH>';
    return sanitizeText(sample, 120, { redactPaths: true, knownPaths: knownPrivatePaths });
  });

  return {
    schemaVersion: 1,
    verdict,
    exitCode: EXIT_CODE[verdict],
    sourceCheckOnly: true,
    authorizesEditsOrMergeOrDeploy: false,
    observedAt,
    branchRelation,
    reasonCodes: reasonCodes.length > 0 ? reasonCodes : ['SOURCE_CHECK_VERIFIED'],
    warnings: warnings.map((w) => sanitizeText(w, 250, { redactPaths: Boolean(input.redactPaths), knownPaths: knownPrivatePaths })),
    nextAction,
    caveats: [
      'Point-in-time snapshot; recheck remote refs immediately before any edit, claim, or push.',
      'Issue claims are procedural coordination, not atomic distributed locks.',
      'Preflight adoption candidate; does not activate or replace manual G1 preflight until reviewed, accepted, and merged.',
    ],
    input: {
      mode: input.mode,
      repo: input.repo,
      issue: input.issue,
      branch: input.branch,
      authorizedBase: input.base,
      historicalBase: Boolean(input.historicalBase),
      claimHolder: input.claimHolder || null,
    },
    github: github?.reachable
      ? {
          reachable: true,
          repoId: github.repoId,
          visibility: github.visibility,
          mainHeadSha: github.mainHeadSha,
          agentsBlobSha: github.agentsBlobSha,
          issueState: github.issue.state,
          latestCommentId: github.issue.latestCommentId,
          latestCommentCreatedAt: github.issue.latestCommentCreatedAt,
          targetBranchState: github.targetBranch.state,
          remoteTaskHeadSha: github.targetBranch.headSha,
        }
      : {
          reachable: false,
          errorCode: github?.errorCode || 'GITHUB_READBACK_UNAVAILABLE',
          ...(github?.error ? { error: sanitizeErr(github.error) } : {}),
        },
    local: local
      ? {
          workspacePath: input.redactPaths ? '<REDACTED_LOCAL_PATH>' : (local.workspacePath ?? null),
          gitRoot: input.redactPaths ? '<REDACTED_LOCAL_PATH>' : (local.gitRoot ?? null),
          isWorktree: Boolean(local.isWorktree),
          currentBranch: local.currentBranch ?? null,
          headSha: local.headSha ?? null,
          headTreeSha: local.headTreeSha ?? null,
          dirtyCount: local.dirtyCount ?? 0,
          dirtySamplePaths: projectedDirtySamples,
          originSanitized: local.originSanitized
            ? sanitizeText(local.originSanitized, 300, { redactPaths: Boolean(input.redactPaths), knownPaths: knownPrivatePaths })
            : null,
          fetchPerformed: Boolean(local.fetchPerformed),
          ...(local.error ? { error: sanitizeErr(local.error) } : {}),
        }
      : null,
    concurrency: {
      policyAmendments: CONCURRENCY_POLICY.controllingAmendments,
      countConvention: 'projected-active-including-selected',
      executorType: executorType ?? null,
      totalExecutors: totalExecutors ?? null,
      codexCloud: codexCloud ?? null,
      antigravityRemote: antigravityRemote ?? null,
      antigravityLocal: agLocal ?? null,
      codexLocal: codexLocal ?? null,
      sameTaskActiveWriter: sameTaskActiveWriter ?? null,
      isolatedResources: isolatedResources ?? null,
      disjointPaths: disjointPaths ?? null,
    },
  };
}

/**
 * Staged workflow orchestrator:
 * 1. Read-only observation (GitHub + local verify).
 * 2. Pure policy evaluation.
 * 3. Pre-side-effect recheck + authorized non-force exact-ref fetch (ONLY if mode === 'fetch' and Stage 2 & Stage 3 PASS_FOR_SOURCE_CHECK).
 * 4. Post-operation re-observation + re-evaluation.
 */
export function runPreflightWorkflow(input, deps = {}) {
  const runner = deps.runner ?? createExecRunner();
  const readGitHub = deps.readGitHub ?? readGitHubState;
  const inspectLocal = deps.inspectLocal ?? inspectLocalGitWorkspace;

  // Stage 1: Strictly read-only observation (always force mode: 'verify').
  const stage1Github = readGitHub({
    repo: input.repo,
    issueNumber: input.issue,
    targetBranch: input.branch,
    runner,
  });
  const stage1Local = inspectLocal({
    workspacePath: input.workspace,
    authorizedBaseSha: input.base,
    remoteTaskSha: stage1Github?.reachable ? stage1Github.targetBranch.headSha : null,
    peerWorkspaces: input.peerWorkspaces,
    mode: 'verify',
    fetchRefs: [],
    targetBranch: input.branch,
    fetchAuthorized: false,
    expectedRepo: input.repo,
    ...(deps.allowTrustedRemoteCheck ? { allowTrustedRemoteCheck: deps.allowTrustedRemoteCheck } : {}),
    runner,
  });

  // Stage 2: Policy evaluation.
  const stage2Report = evaluatePreflight({ input, github: stage1Github, local: stage1Local });
  if (input.mode !== 'fetch' || stage2Report.verdict !== VERDICT.PASS_FOR_SOURCE_CHECK) {
    return stage2Report;
  }

  // Stage 3a: Immediate pre-side-effect recheck before authorizing any fetch mutation.
  const recheckGithub = readGitHub({
    repo: input.repo,
    issueNumber: input.issue,
    targetBranch: input.branch,
    runner,
  });
  const recheckLocal = inspectLocal({
    workspacePath: input.workspace,
    authorizedBaseSha: input.base,
    remoteTaskSha: recheckGithub?.reachable ? recheckGithub.targetBranch.headSha : null,
    peerWorkspaces: input.peerWorkspaces,
    mode: 'verify',
    fetchRefs: [],
    targetBranch: input.branch,
    fetchAuthorized: false,
    expectedRepo: input.repo,
    ...(deps.allowTrustedRemoteCheck ? { allowTrustedRemoteCheck: deps.allowTrustedRemoteCheck } : {}),
    runner,
  });
  const recheckReport = evaluatePreflight({ input, github: recheckGithub, local: recheckLocal });

  const driftedBeforeFetch =
    recheckReport.verdict !== VERDICT.PASS_FOR_SOURCE_CHECK ||
    recheckGithub?.mainHeadSha !== stage1Github?.mainHeadSha ||
    recheckGithub?.targetBranch?.state !== stage1Github?.targetBranch?.state ||
    recheckGithub?.targetBranch?.headSha !== stage1Github?.targetBranch?.headSha ||
    recheckLocal?.currentBranch !== stage1Local?.currentBranch ||
    recheckLocal?.headSha !== stage1Local?.headSha ||
    recheckLocal?.dirtyCount !== stage1Local?.dirtyCount;

  if (driftedBeforeFetch) {
    if (recheckReport.verdict !== VERDICT.PASS_FOR_SOURCE_CHECK) {
      return recheckReport;
    }
    return {
      ...recheckReport,
      verdict: VERDICT.BLOCKED,
      exitCode: EXIT_CODE.BLOCKED,
      reasonCodes: ['STATE_DRIFT_BEFORE_FETCH'],
      nextAction: 'STOP: workspace or GitHub state changed before fetch; re-run read-only verify and inspect drift.',
    };
  }

  // Stage 3b: Explicit authorized side effect (exact non-force main/task ref fetch only).
  const fetchLocal = inspectLocal({
    workspacePath: input.workspace,
    authorizedBaseSha: input.base,
    remoteTaskSha: recheckGithub?.reachable ? recheckGithub.targetBranch.headSha : null,
    peerWorkspaces: input.peerWorkspaces,
    mode: 'fetch',
    fetchRefs: input.fetchRefs,
    targetBranch: input.branch,
    fetchAuthorized: true,
    expectedRepo: input.repo,
    ...(deps.allowTrustedRemoteCheck ? { allowTrustedRemoteCheck: deps.allowTrustedRemoteCheck } : {}),
    runner,
  });

  if (!fetchLocal.fetchPerformed || fetchLocal.fetchErrorCode) {
    const failedLocal = fetchLocal.fetchErrorCode ? fetchLocal : { ...fetchLocal, fetchErrorCode: 'FETCH_FAILED' };
    return evaluatePreflight({ input, github: recheckGithub, local: failedLocal });
  }

  // Stage 4: Post-operation re-verification of remote & local state.
  const postGithub = readGitHub({
    repo: input.repo,
    issueNumber: input.issue,
    targetBranch: input.branch,
    runner,
  });
  const postLocal = inspectLocal({
    workspacePath: input.workspace,
    authorizedBaseSha: input.base,
    remoteTaskSha: postGithub?.reachable ? postGithub.targetBranch.headSha : null,
    peerWorkspaces: input.peerWorkspaces,
    mode: 'verify',
    fetchRefs: [],
    targetBranch: input.branch,
    fetchAuthorized: false,
    expectedRepo: input.repo,
    ...(deps.allowTrustedRemoteCheck ? { allowTrustedRemoteCheck: deps.allowTrustedRemoteCheck } : {}),
    runner,
  });

  const finalReport = evaluatePreflight({
    input,
    github: postGithub,
    local: { ...postLocal, fetchPerformed: Boolean(fetchLocal.fetchPerformed) },
  });

  const driftedAfterFetch =
    postGithub?.reachable &&
    (postGithub.mainHeadSha !== recheckGithub.mainHeadSha ||
      postGithub.targetBranch.headSha !== recheckGithub.targetBranch.headSha ||
      postLocal?.headSha !== recheckLocal?.headSha);

  if (driftedAfterFetch && finalReport.verdict === VERDICT.PASS_FOR_SOURCE_CHECK) {
    return {
      ...finalReport,
      verdict: VERDICT.BLOCKED,
      exitCode: EXIT_CODE.BLOCKED,
      reasonCodes: ['STATE_DRIFT_AFTER_FETCH'],
      nextAction: 'STOP: state changed during fetch operation; inspect updated remote/local refs before continuing.',
    };
  }

  return finalReport;
}

export function formatHumanReport(report) {
  const lines = [
    `Preflight Verdict: ${report.verdict} (exit ${report.exitCode})`,
    `Observed At:       ${report.observedAt}`,
    `Branch Relation:   ${report.branchRelation}`,
    `Reason Codes:      ${report.reasonCodes.join(', ')}`,
    `Target:            Issue #${report.input.issue} | ${report.input.branch} | base ${report.input.authorizedBase}${report.input.historicalBase ? ' (historical pin)' : ''}`,
    `GitHub:            ${report.github.reachable ? `main=${report.github.mainHeadSha} agents=${report.github.agentsBlobSha} remoteBranch=${report.github.targetBranchState}${report.github.remoteTaskHeadSha ? `@${report.github.remoteTaskHeadSha}` : ''}` : `UNREACHABLE (${report.github.errorCode}${report.github.error ? `: ${report.github.error}` : ''})`}`,
    `Local:             ${report.local ? `branch=${report.local.currentBranch} head=${report.local.headSha} dirty=${report.local.dirtyCount}` : 'N/A'}`,
    `Next Action:       ${report.nextAction}`,
  ];
  if (report.warnings.length > 0) {
    lines.push(`Warnings:          ${report.warnings.join(' | ')}`);
  }
  return lines.join('\n');
}

export function runPreflightCli(argv = process.argv.slice(2), deps = {}) {
  const runner = deps.runner ?? createExecRunner();
  const redactRequested = argv.includes('--redact-paths');
  let input;
  try {
    input = parseCliArgs(argv);
  } catch (error) {
    const errMsg = sanitizeText(error.message, 250, { redactPaths: redactRequested });
    console.error(`Argument error: ${errMsg}`);
    return EXIT_CODE.CLI_ERROR;
  }

  if (input.help) {
    console.log(
      [
        'Usage: node scripts/support/task-workspace-preflight.mjs --issue <num> --branch <name> --base <sha> [options]',
        'Options:',
        '  --workspace <path>              Target workspace path (default: cwd)',
        '  --mode verify|fetch             verify (default, strictly read-only) or fetch (isolated standalone clone after PASS)',
        '  --historical-base               Mark authorized base as an intentional pinned historical commit',
        '  --expected-agents-blob <sha>    Verify remote AGENTS.md blob matches reviewed expectation',
        '  --confirm-scope                 Confirm controlling Issue + Owner authorization were manually verified',
        '  --claim-holder <id>             Explicit exclusive writer identifier',
        '  --executor-type <type>          antigravity-local | antigravity-remote | codex-cloud | codex-local',
        '  --total-executors <n>           Projected total concurrent executors INCLUDING selected executor (max 4)',
        '  --codex-cloud <n>               Projected Codex Cloud executors (max 2)',
        '  --ag-remote <n>                 Projected Antigravity Remote executors (max 1)',
        '  --ag-local <n>                  Projected Antigravity Local executors (required; flexible within total 4)',
        '  --codex-local <n>               Projected Codex Local executors (must be 0)',
        '  --same-task-active-writer bool  false if no active predecessor holds this task',
        '  --isolated-resources bool       true if clone/worktree, build/cache, DB/ports are isolated',
        '  --disjoint-paths bool           true if task file paths do not overlap active peers',
        '  --peer-workspace <path>         Active peer workspace path (repeatable)',
        '  --fetch-ref <branch>            Exact ref to fetch when --mode fetch (only main or --branch; repeatable)',
        '  --redact-paths                  Redact local workspace/gitRoot/dirty-sample paths and error paths in output',
        '  --json                          Emit sanitized JSON output',
      ].join('\n'),
    );
    return 0;
  }

  const report = runPreflightWorkflow(input, { ...deps, runner });
  console.log(input.json ? JSON.stringify(report, null, 2) : formatHumanReport(report));
  return report.exitCode;
}

const isDirectEntry =
  typeof process.argv[1] === 'string' &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectEntry) {
  process.exitCode = runPreflightCli(process.argv.slice(2));
}
