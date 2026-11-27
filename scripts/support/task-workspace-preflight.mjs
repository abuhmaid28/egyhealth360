#!/usr/bin/env node
/**
 * Fail-closed GitHub-first workspace freshness & preflight helper (G2-D1 / Issue #204; G1.1 adoption candidate / Issue #205).
 * Uses Node built-ins, Git CLI, and GitHub CLI (`gh`) read-only APIs with zero shell interpolation.
 * A PASS_FOR_SOURCE_CHECK result never authorizes edits, merge, CI dispatch, or deployment.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
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

const VALID_MODES = new Set(['verify', 'fetch']);
const VALID_EXECUTOR_TYPES = new Set(['antigravity-local', 'antigravity-remote', 'codex-cloud', 'codex-local']);
const SHA_RE = /^[0-9a-f]{40}$/i;
const REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

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
 * Bound and sanitize arbitrary text (e.g., error summaries) before emitting to stdout/stderr.
 */
export function sanitizeText(input, maxLength = 300) {
  const redacted = redactSecrets(String(input ?? ''))
    .replace(/[\r\n\t]+/g, ' ')
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f\x7f]/g, '')
    .trim();
  if (redacted.length <= maxLength) return redacted;
  return `${redacted.slice(0, Math.max(0, maxLength - 14))}...(truncated)`;
}

/**
 * Normalize path presentation to forward slashes and resolve platform/8.3/symlink semantics cleanly.
 */
export function normalizePathString(targetPath, platform = process.platform) {
  if (typeof targetPath !== 'string' || !targetPath.trim()) return '';
  const trimmed = targetPath.trim();
  const isWin = platform === 'win32' || /^[A-Za-z]:[\\/]/.test(trimmed) || trimmed.startsWith('\\\\');
  const mod = isWin ? path.win32 : path.posix;
  let resolved = mod.resolve(trimmed);
  if (platform === process.platform && existsSync(resolved)) {
    try {
      resolved = realpathSync.native(resolved);
    } catch {
      // Keep resolved path when realpath fails on permissions/special paths.
    }
  }
  const normalized = resolved.replace(/\\/g, '/').replace(/\/+$/, '');
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
  if (!trimmed) throw new Error(`Invalid integer for ${flagName}`);
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
 * Default safe subprocess runner using execFileSync with shell disabled.
 */
export function createExecRunner() {
  return (cmd, args, cwd) => {
    try {
      const stdout = execFileSync(cmd, args, {
        cwd,
        encoding: 'utf8',
        shell: false,
        windowsHide: true,
        maxBuffer: 8 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      // Preserve leading spaces on stdout (required by `git status --porcelain=v1`); only trim trailing line breaks.
      return { ok: true, code: 0, stdout: stdout.replace(/[\r\n]+$/, ''), stderr: '' };
    } catch (error) {
      return {
        ok: false,
        code: typeof error.status === 'number' ? error.status : 1,
        stdout: sanitizeText(error.stdout?.toString?.('utf8') ?? '', 300),
        stderr: sanitizeText(error.stderr?.toString?.('utf8') ?? error.message ?? '', 300),
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
    if (!res.ok) return { ok: false, error: res.stderr || res.stdout || 'gh api failed' };
    try {
      return { ok: true, data: JSON.parse(res.stdout) };
    } catch {
      return { ok: false, error: 'Malformed JSON from gh api' };
    }
  };

  const repoRes = api(`repos/${repo}`);
  if (!repoRes.ok) {
    return { reachable: false, errorCode: 'GITHUB_REPO_UNREACHABLE', error: repoRes.error };
  }
  const repoMeta = repoRes.data;

  const mainRes = api(`repos/${repo}/git/ref/heads/main`);
  if (!mainRes.ok || !mainRes.data?.object?.sha) {
    return { reachable: false, errorCode: 'GITHUB_MAIN_REF_UNREACHABLE', error: mainRes.error || 'Missing main SHA' };
  }

  const agentsRes = api(`repos/${repo}/contents/AGENTS.md?ref=main`);
  if (!agentsRes.ok || !agentsRes.data?.sha) {
    return { reachable: false, errorCode: 'GITHUB_AGENTS_UNREACHABLE', error: agentsRes.error || 'Missing AGENTS.md blob' };
  }

  const issueRes = api(`repos/${repo}/issues/${issueNumber}`);
  if (!issueRes.ok || !issueRes.data?.number) {
    return { reachable: false, errorCode: 'GITHUB_ISSUE_UNREACHABLE', error: issueRes.error || 'Missing issue metadata' };
  }

  const totalComments = Number(issueRes.data.comments ?? 0);
  const latestPage = totalComments > 0 ? Math.ceil(totalComments / 100) : 1;
  const commentsRes = api(`repos/${repo}/issues/${issueNumber}/comments?per_page=100&page=${latestPage}`);
  if (!commentsRes.ok || !Array.isArray(commentsRes.data)) {
    return { reachable: false, errorCode: 'GITHUB_COMMENTS_UNREACHABLE', error: commentsRes.error || 'Missing comments' };
  }

  const branchRefEndpoint = `repos/${repo}/git/ref/heads/${targetBranch.split('/').map(encodeURIComponent).join('/')}`;
  const branchRes = runner('gh', ['api', branchRefEndpoint], process.cwd());
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
 * Inspect local Git workspace (read-only in verify mode; optional explicit single-ref fetch only when safe).
 */
export function inspectLocalGitWorkspace({
  workspacePath,
  authorizedBaseSha,
  remoteTaskSha,
  peerWorkspaces = [],
  mode = 'verify',
  fetchRefs = [],
  expectedRepo = OFFICIAL_REPO,
  allowTrustedRemoteCheck = validateRemoteOriginUrl,
  runner = createExecRunner(),
}) {
  if (!workspacePath || !existsSync(workspacePath)) {
    return { exists: false, isGitRepo: false, errorCode: 'WORKSPACE_NOT_FOUND' };
  }

  const git = (...args) => runner('git', args, workspacePath);
  const rootRes = git('rev-parse', '--show-toplevel');
  if (!rootRes.ok || !rootRes.stdout) {
    return { exists: true, isGitRepo: false, errorCode: 'NOT_A_GIT_REPOSITORY' };
  }

  const gitRoot = rootRes.stdout.trim();
  const gitDirRes = git('rev-parse', '--git-dir');
  const commonDirRes = git('rev-parse', '--git-common-dir');
  const gitDir = gitDirRes.ok ? path.resolve(workspacePath, gitDirRes.stdout.trim()) : '';
  const gitCommonDir = commonDirRes.ok ? path.resolve(workspacePath, commonDirRes.stdout.trim()) : '';
  const isWorktree = normalizePathString(gitDir) !== normalizePathString(gitCommonDir);
  const worktreeListRes = git('worktree', 'list', '--porcelain');
  const worktreeCount = worktreeListRes.ok
    ? worktreeListRes.stdout.split(/\r?\n/).filter((l) => l.startsWith('worktree ')).length
    : 1;

  const remotesRes = git('remote');
  const remoteNames = remotesRes.ok ? remotesRes.stdout.trim().split(/\r?\n/).filter(Boolean) : [];
  const originUrlsRes = git('remote', 'get-url', '--all', 'origin');
  const originUrls = originUrlsRes.ok ? originUrlsRes.stdout.trim().split(/\r?\n/).filter(Boolean) : [];
  const pushUrlsRes = git('remote', 'get-url', '--all', '--push', 'origin');
  const pushUrls = pushUrlsRes.ok ? pushUrlsRes.stdout.trim().split(/\r?\n/).filter(Boolean) : [];
  const primaryOrigin = originUrls[0] ?? '';
  const originValidation = allowTrustedRemoteCheck(primaryOrigin, expectedRepo);
  const pushValidations = pushUrls.map((u) => allowTrustedRemoteCheck(u, expectedRepo));
  const invalidPushValidation = pushValidations.find((v) => !v.trusted) ?? null;

  const branchRes = git('branch', '--show-current');
  const currentBranch = branchRes.ok ? branchRes.stdout.trim() : '';
  const headRes = git('rev-parse', 'HEAD');
  const headShaStr = headRes.stdout.trim();
  const headSha = headRes.ok && SHA_RE.test(headShaStr) ? headShaStr.toLowerCase() : null;
  const treeRes = git('rev-parse', 'HEAD^{tree}');
  const treeShaStr = treeRes.stdout.trim();
  const headTreeSha = treeRes.ok && SHA_RE.test(treeShaStr) ? treeShaStr.toLowerCase() : null;

  const statusRes = git('status', '--porcelain=v1');
  const gitStatusFailed = !statusRes.ok;
  const dirtyEntries = !gitStatusFailed && statusRes.stdout
    ? statusRes.stdout.split(/\r?\n/).filter(Boolean).map((line) => sanitizeText(line.slice(3), 120))
    : [];

  // Optional explicit safe fetch ONLY when mode === 'fetch' and all safety preconditions hold.
  let fetchPerformed = false;
  let fetchErrorCode = null;
  if (mode === 'fetch') {
    const sharesCommonDirWithPeer = peerWorkspaces.some((peer) => {
      const peerCommon = runner('git', ['rev-parse', '--git-common-dir'], peer);
      if (!peerCommon.ok) return false;
      return normalizePathString(path.resolve(peer, peerCommon.stdout.trim())) === normalizePathString(gitCommonDir);
    });

    if (gitStatusFailed) {
      fetchErrorCode = 'GIT_STATUS_FAILED';
    } else if (dirtyEntries.length > 0) {
      fetchErrorCode = 'FETCH_REFUSED_DIRTY_WORKSPACE';
    } else if (remoteNames.length !== 1 || originUrls.length !== 1 || pushUrls.length > 1 || !originValidation.trusted || invalidPushValidation) {
      fetchErrorCode = 'FETCH_REFUSED_UNTRUSTED_OR_DUPLICATE_REMOTE';
    } else if (isWorktree || worktreeCount > 1 || sharesCommonDirWithPeer) {
      fetchErrorCode = 'FETCH_REFUSED_SHARED_GIT_COMMON_DIR';
    } else {
      const refsToFetch = fetchRefs.length > 0 ? fetchRefs : ['main'];
      for (const refName of refsToFetch) {
        validateBranchName(refName);
        const fRes = git('fetch', '--no-tags', '--prune=no', 'origin', `+refs/heads/${refName}:refs/remotes/origin/${refName}`);
        if (!fRes.ok) {
          fetchErrorCode = 'FETCH_FAILED';
          break;
        }
      }
      if (!fetchErrorCode) fetchPerformed = true;
    }
  }

  const hasCommitObject = (sha) => {
    if (!sha) return false;
    const res = git('cat-file', '-t', sha);
    return res.ok && res.stdout.trim() === 'commit';
  };
  const isAncestor = (ancestorSha, descendantSha) => {
    if (!ancestorSha || !descendantSha) return null;
    const res = git('merge-base', '--is-ancestor', ancestorSha, descendantSha);
    if (res.ok) return true;
    if (res.code === 1 && !res.stderr) return false;
    return null;
  };

  const hasBaseObject = hasCommitObject(authorizedBaseSha);
  const hasRemoteTaskObject = remoteTaskSha ? hasCommitObject(remoteTaskSha) : null;

  return {
    exists: true,
    isGitRepo: true,
    workspacePath: normalizePathString(workspacePath),
    gitRoot: normalizePathString(gitRoot),
    gitCommonDir: normalizePathString(gitCommonDir),
    isWorktree,
    worktreeCount,
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
  const executorType = concurrency.executorType ?? input.executorType;
  const totalExecutors = concurrency.totalExecutors ?? input.totalExecutors;
  const codexCloud = concurrency.codexCloud ?? input.codexCloud;
  const antigravityRemote = concurrency.antigravityRemote ?? input.agRemote;
  const codexLocal = concurrency.codexLocal ?? input.codexLocal;
  const sameTaskActiveWriter = concurrency.sameTaskActiveWriter ?? input.sameTaskActiveWriter;
  const isolatedResources = concurrency.isolatedResources ?? input.isolatedResources;
  const disjointPaths = concurrency.disjointPaths ?? input.disjointPaths;
  const peerWorkspaces = concurrency.peerWorkspaces ?? input.peerWorkspaces ?? [];

  const agLocal = concurrency.agLocal ?? input.agLocal;

  if (!executorType || !VALID_EXECUTOR_TYPES.has(executorType)) {
    review('EXECUTOR_TYPE_UNKNOWN');
  } else if (executorType === 'codex-local') {
    block('CODEX_LOCAL_PROHIBITED');
  }
  if (typeof codexLocal === 'number' && codexLocal > CONCURRENCY_POLICY.maxCodexLocal) {
    block('CODEX_LOCAL_PROHIBITED');
  }
  if (sameTaskActiveWriter === true) {
    block('ACTIVE_PREDECESSOR_ON_SAME_TASK');
  } else if (sameTaskActiveWriter !== false) {
    review('SAME_TASK_OWNERSHIP_UNKNOWN');
  }

  if (
    typeof totalExecutors !== 'number' ||
    typeof codexCloud !== 'number' ||
    typeof antigravityRemote !== 'number' ||
    typeof codexLocal !== 'number'
  ) {
    review('CONCURRENCY_COUNTS_UNKNOWN');
  } else {
    if (totalExecutors > CONCURRENCY_POLICY.maxTotalExecutors) block('CONCURRENCY_CAP_EXCEEDED');
    if (codexCloud > CONCURRENCY_POLICY.maxCodexCloud) block('CODEX_CLOUD_CAP_EXCEEDED');
    if (antigravityRemote > CONCURRENCY_POLICY.maxAntigravityRemote) block('ANTIGRAVITY_REMOTE_CAP_EXCEEDED');
    const sum = codexCloud + antigravityRemote + (typeof agLocal === 'number' ? agLocal : 0) + codexLocal;
    if (sum > totalExecutors) block('CONCURRENCY_SUM_INCONSISTENT');
    if (sum > CONCURRENCY_POLICY.maxTotalExecutors) block('CONCURRENCY_CAP_EXCEEDED');
  }

  if (isolatedResources !== true) {
    review('RESOURCE_ISOLATION_UNVERIFIED');
  }
  if (disjointPaths !== true) {
    review('DISJOINT_PATHS_UNVERIFIED');
  }

  // Check physical workspace and gitRoot overlap against peer active workspaces (Windows & POSIX safe).
  if ((local?.workspacePath || local?.gitRoot) && Array.isArray(peerWorkspaces)) {
    for (const peer of peerWorkspaces) {
      if (
        (local.workspacePath && pathsOverlap(local.workspacePath, peer)) ||
        (local.gitRoot && pathsOverlap(local.gitRoot, peer))
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
    block(local.errorCode || 'NOT_A_GIT_REPOSITORY');
  } else {
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
      warnings.push('Workspace shares gitCommonDir with worktree(s); use a dedicated standalone clone for fetch operations.');
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

  return {
    schemaVersion: 1,
    verdict,
    exitCode: EXIT_CODE[verdict],
    sourceCheckOnly: true,
    authorizesEditsOrMergeOrDeploy: false,
    observedAt,
    branchRelation,
    reasonCodes: reasonCodes.length > 0 ? reasonCodes : ['SOURCE_CHECK_VERIFIED'],
    warnings,
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
          dirtySamplePaths: local.dirtySamplePaths ?? [],
          originSanitized: local.originSanitized ?? null,
          fetchPerformed: Boolean(local.fetchPerformed),
        }
      : null,
    concurrency: {
      policyAmendments: CONCURRENCY_POLICY.controllingAmendments,
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

export function formatHumanReport(report) {
  const lines = [
    `Preflight Verdict: ${report.verdict} (exit ${report.exitCode})`,
    `Observed At:       ${report.observedAt}`,
    `Branch Relation:   ${report.branchRelation}`,
    `Reason Codes:      ${report.reasonCodes.join(', ')}`,
    `Target:            Issue #${report.input.issue} | ${report.input.branch} | base ${report.input.authorizedBase}${report.input.historicalBase ? ' (historical pin)' : ''}`,
    `GitHub:            ${report.github.reachable ? `main=${report.github.mainHeadSha} agents=${report.github.agentsBlobSha} remoteBranch=${report.github.targetBranchState}${report.github.remoteTaskHeadSha ? `@${report.github.remoteTaskHeadSha}` : ''}` : `UNREACHABLE (${report.github.errorCode})`}`,
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
  let input;
  try {
    input = parseCliArgs(argv);
  } catch (error) {
    const errMsg = sanitizeText(error.message, 250);
    console.error(`Argument error: ${errMsg}`);
    return EXIT_CODE.CLI_ERROR;
  }

  if (input.help) {
    console.log(
      [
        'Usage: node scripts/support/task-workspace-preflight.mjs --issue <num> --branch <name> --base <sha> [options]',
        'Options:',
        '  --workspace <path>              Target workspace path (default: cwd)',
        '  --mode verify|fetch             verify (default, strictly read-only) or fetch (isolated clone only)',
        '  --historical-base               Mark authorized base as an intentional pinned historical commit',
        '  --expected-agents-blob <sha>    Verify remote AGENTS.md blob matches reviewed expectation',
        '  --confirm-scope                 Confirm controlling Issue + Owner authorization were manually verified',
        '  --claim-holder <id>             Explicit exclusive writer identifier',
        '  --executor-type <type>          antigravity-local | antigravity-remote | codex-cloud | codex-local',
        '  --total-executors <n>           Current total concurrent implementation executors (max 4)',
        '  --codex-cloud <n>               Current Codex Cloud executors (max 2)',
        '  --ag-remote <n>                 Current Antigravity Remote executors (max 1)',
        '  --ag-local <n>                  Current Antigravity Local executors (flexible within total 4)',
        '  --codex-local <n>               Current Codex Local executors (must be 0)',
        '  --same-task-active-writer bool  false if no active predecessor holds this task',
        '  --isolated-resources bool       true if clone/worktree, build/cache, DB/ports are isolated',
        '  --disjoint-paths bool           true if task file paths do not overlap active peers',
        '  --peer-workspace <path>         Active peer workspace path (repeatable)',
        '  --fetch-ref <branch>            Exact ref to fetch when --mode fetch (repeatable)',
        '  --redact-paths                  Redact local workspace/gitRoot paths in JSON output',
        '  --json                          Emit sanitized JSON output',
      ].join('\n'),
    );
    return 0;
  }

  const github = (deps.readGitHub ?? readGitHubState)({
    repo: input.repo,
    issueNumber: input.issue,
    targetBranch: input.branch,
    runner,
  });

  const local = (deps.inspectLocal ?? inspectLocalGitWorkspace)({
    workspacePath: input.workspace,
    authorizedBaseSha: input.base,
    remoteTaskSha: github?.reachable ? github.targetBranch.headSha : null,
    peerWorkspaces: input.peerWorkspaces,
    mode: input.mode,
    fetchRefs: input.fetchRefs,
    expectedRepo: input.repo,
    runner,
  });

  const report = evaluatePreflight({ input, github, local });
  console.log(input.json ? JSON.stringify(report, null, 2) : formatHumanReport(report));
  return report.exitCode;
}

const isDirectEntry =
  typeof process.argv[1] === 'string' &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectEntry) {
  process.exitCode = runPreflightCli(process.argv.slice(2));
}
