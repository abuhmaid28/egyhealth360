import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  OFFICIAL_REPO,
  OFFICIAL_REPO_ID,
  VERDICT,
  EXIT_CODE,
  buildSanitizedExecEnv,
  createExecRunner,
  evaluatePreflight,
  inspectLocalGitWorkspace,
  normalizePathString,
  parseCliArgs,
  pathsOverlap,
  redactSecrets,
  runPreflightCli,
  runPreflightWorkflow,
  sanitizeText,
  validateBranchName,
  validateRemoteOriginUrl,
} from '../scripts/support/task-workspace-preflight.mjs';

const SHA_A = '407ca42b8b1f71bf9020367d581124b95989df57';
const SHA_B = '8f4642868f6147411e3e6e03582d95540872a2e9';
const SHA_C = '657db9c21dda5139e927294f9d0f75285f1db9f5';
const SHA_OLD = '40f3a0ecd64e0d9fe2389c9bd3efea4acaa63591';

function makeBaseInput(overrides = {}) {
  return {
    mode: 'verify',
    repo: OFFICIAL_REPO,
    issue: 204,
    branch: 'task/g2-d1-workspace-preflight',
    base: SHA_A,
    historicalBase: false,
    confirmScope: true,
    claimHolder: 'antigravity-local-2',
    executorType: 'antigravity-local',
    totalExecutors: 4,
    codexCloud: 1,
    agRemote: 1,
    agLocal: 2,
    codexLocal: 0,
    sameTaskActiveWriter: false,
    isolatedResources: true,
    disjointPaths: true,
    peerWorkspaces: ['C:/work/EgyHealth360-G2-Q1'],
    fetchRefs: [],
    ...overrides,
  };
}

function makeGitHub(overrides = {}) {
  return {
    reachable: true,
    repoId: OFFICIAL_REPO_ID,
    repoFullName: OFFICIAL_REPO,
    visibility: 'public',
    defaultBranch: 'main',
    mainHeadSha: SHA_A,
    agentsBlobSha: SHA_B,
    issue: {
      number: 204,
      state: 'OPEN',
      assigneesCount: 0,
      commentsCount: 2,
      latestCommentId: 7209774584,
      latestCommentCreatedAt: '2026-11-27T04:24:35Z',
      updatedAt: '2026-11-27T04:24:35Z',
    },
    targetBranch: {
      name: 'task/g2-d1-workspace-preflight',
      state: 'ABSENT',
      headSha: null,
    },
    ...overrides,
  };
}

function makeLocal(overrides = {}) {
  return {
    exists: true,
    isGitRepo: true,
    workspacePath: 'c:/work/egyhealth360-g2-d1',
    gitRoot: 'c:/work/egyhealth360-g2-d1',
    gitCommonDir: 'c:/work/egyhealth360-g2-d1/.git',
    isWorktree: false,
    remoteNames: ['origin'],
    originUrlCount: 1,
    originSanitized: 'https://github.com/abuhmaid28/egyhealth360.git',
    originValidation: { valid: true, trusted: true, hasEmbeddedCredentials: false, reasonCode: null },
    currentBranch: 'task/g2-d1-workspace-preflight',
    headSha: SHA_A,
    headTreeSha: '8c216b2bbbae1219ff0215b26db86d653bb719b7',
    dirtyCount: 0,
    dirtySamplePaths: [],
    hasBaseObject: true,
    hasRemoteTaskObject: null,
    baseIsAncestorOfHead: true,
    headIsAncestorOfRemoteTask: null,
    remoteTaskIsAncestorOfHead: null,
    fetchPerformed: false,
    fetchErrorCode: null,
    ...overrides,
  };
}

function sha256File(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function initSyntheticRepo(dir, { remoteUrl = 'https://github.com/abuhmaid28/egyhealth360.git', branch = 'main', fileContent = 'hello\n' } = {}) {
  mkdirSync(dir, { recursive: true });
  const cleanEnv = buildSanitizedExecEnv(process.env, 'git');
  const git = (...args) =>
    execFileSync('git', args, { cwd: dir, env: cleanEnv, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git('init', '-b', 'main');
  git('config', 'user.email', 'test@example.invalid');
  git('config', 'user.name', 'Test User');
  writeFileSync(path.join(dir, 'README.md'), fileContent);
  git('add', 'README.md');
  git('commit', '-m', 'init');
  if (remoteUrl) git('remote', 'add', 'origin', remoteUrl);
  const baseSha = git('rev-parse', 'HEAD');
  if (branch !== 'main') git('switch', '-c', branch);
  return { git, baseSha };
}

function snapshotRepo(dir) {
  const cleanEnv = buildSanitizedExecEnv(process.env, 'git');
  const git = (...args) =>
    execFileSync('git', args, { cwd: dir, env: cleanEnv, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  return {
    status: git('status', '--porcelain=v1'),
    head: git('rev-parse', 'HEAD'),
    refs: git('for-each-ref'),
    indexSha256: sha256File(path.join(dir, '.git', 'index')),
  };
}

test('pure classifier: new absent task branch at pinned main passes source check with caveat', () => {
  const res = evaluatePreflight({ input: makeBaseInput(), github: makeGitHub(), local: makeLocal() });
  assert.equal(res.verdict, VERDICT.PASS_FOR_SOURCE_CHECK);
  assert.equal(res.exitCode, EXIT_CODE.PASS_FOR_SOURCE_CHECK);
  assert.equal(res.branchRelation, 'NEW_BRANCH_AT_BASE');
  assert.equal(res.sourceCheckOnly, true);
  assert.equal(res.authorizesEditsOrMergeOrDeploy, false);
});

test('pure classifier: existing remote task branch CURRENT / BEHIND / AHEAD / DIVERGED / DIRTY / WRONG_REF', () => {
  const current = evaluatePreflight({
    input: makeBaseInput(),
    github: makeGitHub({ targetBranch: { name: 'task/g2-d1-workspace-preflight', state: 'EXISTS', headSha: SHA_C } }),
    local: makeLocal({ headSha: SHA_C, hasRemoteTaskObject: true }),
  });
  assert.equal(current.verdict, VERDICT.PASS_FOR_SOURCE_CHECK);
  assert.equal(current.branchRelation, 'CURRENT');

  const behind = evaluatePreflight({
    input: makeBaseInput(),
    github: makeGitHub({ targetBranch: { name: 'task/g2-d1-workspace-preflight', state: 'EXISTS', headSha: SHA_C } }),
    local: makeLocal({ headSha: SHA_A, hasRemoteTaskObject: true, headIsAncestorOfRemoteTask: true, remoteTaskIsAncestorOfHead: false }),
  });
  assert.equal(behind.verdict, VERDICT.BLOCKED);
  assert.equal(behind.branchRelation, 'BEHIND');
  assert.ok(behind.reasonCodes.includes('LOCAL_BEHIND_REMOTE'));

  const ahead = evaluatePreflight({
    input: makeBaseInput(),
    github: makeGitHub({ targetBranch: { name: 'task/g2-d1-workspace-preflight', state: 'EXISTS', headSha: SHA_A } }),
    local: makeLocal({ headSha: SHA_C, hasRemoteTaskObject: true, headIsAncestorOfRemoteTask: false, remoteTaskIsAncestorOfHead: true }),
  });
  assert.equal(ahead.verdict, VERDICT.REVIEW_REQUIRED);
  assert.equal(ahead.branchRelation, 'AHEAD');
  assert.ok(ahead.reasonCodes.includes('LOCAL_AHEAD_OF_REMOTE'));

  const diverged = evaluatePreflight({
    input: makeBaseInput(),
    github: makeGitHub({ targetBranch: { name: 'task/g2-d1-workspace-preflight', state: 'EXISTS', headSha: SHA_C } }),
    local: makeLocal({ headSha: SHA_OLD, hasRemoteTaskObject: true, headIsAncestorOfRemoteTask: false, remoteTaskIsAncestorOfHead: false }),
  });
  assert.equal(diverged.verdict, VERDICT.BLOCKED);
  assert.equal(diverged.branchRelation, 'DIVERGED');

  const dirty = evaluatePreflight({
    input: makeBaseInput(),
    github: makeGitHub(),
    local: makeLocal({ dirtyCount: 2, dirtySamplePaths: ['docs/TASK_WORKSPACE_PREFLIGHT.md'] }),
  });
  assert.equal(dirty.verdict, VERDICT.BLOCKED);
  assert.ok(dirty.reasonCodes.includes('DIRTY_WORKSPACE'));

  const wrongRef = evaluatePreflight({
    input: makeBaseInput(),
    github: makeGitHub({ targetBranch: { name: 'task/g2-d1-workspace-preflight', state: 'EXISTS', headSha: SHA_C } }),
    local: makeLocal({ currentBranch: 'main', headSha: SHA_C, hasRemoteTaskObject: true }),
  });
  assert.equal(wrongRef.verdict, VERDICT.REVIEW_REQUIRED);
  assert.equal(wrongRef.branchRelation, 'WRONG_REF');
});

test('distinguishes valid pinned historical base from stale branch or unapproved base drift', () => {
  const historicalPass = evaluatePreflight({
    input: makeBaseInput({ base: SHA_OLD, historicalBase: true, branch: 'task/g2-b1-dark-foundation' }),
    github: makeGitHub({ targetBranch: { name: 'task/g2-b1-dark-foundation', state: 'ABSENT', headSha: null } }),
    local: makeLocal({ currentBranch: 'task/g2-b1-dark-foundation', headSha: SHA_OLD }),
  });
  assert.equal(historicalPass.verdict, VERDICT.PASS_FOR_SOURCE_CHECK);
  assert.equal(historicalPass.branchRelation, 'NEW_BRANCH_AT_HISTORICAL_BASE');

  const unapprovedDrift = evaluatePreflight({
    input: makeBaseInput({ base: SHA_OLD, historicalBase: false }),
    github: makeGitHub({ mainHeadSha: SHA_A }),
    local: makeLocal({ headSha: SHA_OLD }),
  });
  assert.equal(unapprovedDrift.verdict, VERDICT.REVIEW_REQUIRED);
  assert.ok(unapprovedDrift.reasonCodes.includes('BASE_DRIFT_FROM_MAIN'));

  const staleLocalMain = evaluatePreflight({
    input: makeBaseInput({ base: SHA_A, historicalBase: false }),
    github: makeGitHub({ mainHeadSha: SHA_A }),
    local: makeLocal({ headSha: SHA_OLD }),
  });
  assert.equal(staleLocalMain.verdict, VERDICT.BLOCKED);
  assert.ok(staleLocalMain.reasonCodes.includes('LOCAL_HEAD_NOT_AT_AUTHORIZED_BASE'));
});

test('missing ancestry, unreachable/stale GitHub, closed issue, and AGENTS drift fail closed', () => {
  const missingAncestry = evaluatePreflight({
    input: makeBaseInput(),
    github: makeGitHub(),
    local: makeLocal({ hasBaseObject: false, baseIsAncestorOfHead: null }),
  });
  assert.equal(missingAncestry.verdict, VERDICT.REVIEW_REQUIRED);
  assert.equal(missingAncestry.branchRelation, 'MISSING_ANCESTRY');

  const unreachable = evaluatePreflight({
    input: makeBaseInput(),
    github: { reachable: false, errorCode: 'GITHUB_REPO_UNREACHABLE' },
    local: makeLocal(),
  });
  assert.equal(unreachable.verdict, VERDICT.BLOCKED);
  assert.notEqual(unreachable.verdict, VERDICT.PASS_FOR_SOURCE_CHECK);

  const closedIssue = evaluatePreflight({
    input: makeBaseInput(),
    github: makeGitHub({ issue: { number: 204, state: 'CLOSED', assigneesCount: 0, commentsCount: 0 } }),
    local: makeLocal(),
  });
  assert.equal(closedIssue.verdict, VERDICT.BLOCKED);
  assert.ok(closedIssue.reasonCodes.includes('ISSUE_NOT_OPEN'));

  const agentsDrift = evaluatePreflight({
    input: makeBaseInput({ expectedAgentsBlob: SHA_C }),
    github: makeGitHub({ agentsBlobSha: SHA_B }),
    local: makeLocal(),
  });
  assert.equal(agentsDrift.verdict, VERDICT.REVIEW_REQUIRED);
  assert.ok(agentsDrift.reasonCodes.includes('AGENTS_POLICY_DRIFT'));
});

test('concurrency & resource isolation checks reflect amendments 7209748645 and 7209750713', () => {
  // Multiple Antigravity Local executors allowed within cap of 4 when isolated
  const concurrentLocalOk = evaluatePreflight({
    input: makeBaseInput({ totalExecutors: 4, codexCloud: 1, agRemote: 1, agLocal: 2, codexLocal: 0 }),
    github: makeGitHub(),
    local: makeLocal(),
  });
  assert.equal(concurrentLocalOk.verdict, VERDICT.PASS_FOR_SOURCE_CHECK);

  // Codex local strictly blocked
  const codexLocalBlocked = evaluatePreflight({
    input: makeBaseInput({ executorType: 'codex-local', codexLocal: 1 }),
    github: makeGitHub(),
    local: makeLocal(),
  });
  assert.equal(codexLocalBlocked.verdict, VERDICT.BLOCKED);
  assert.ok(codexLocalBlocked.reasonCodes.includes('CODEX_LOCAL_PROHIBITED'));

  // Exceeding 4 total or 2 Codex Cloud or 1 Antigravity Remote blocked
  assert.equal(
    evaluatePreflight({ input: makeBaseInput({ totalExecutors: 5 }), github: makeGitHub(), local: makeLocal() }).verdict,
    VERDICT.BLOCKED,
  );
  assert.equal(
    evaluatePreflight({ input: makeBaseInput({ codexCloud: 3 }), github: makeGitHub(), local: makeLocal() }).verdict,
    VERDICT.BLOCKED,
  );
  assert.equal(
    evaluatePreflight({ input: makeBaseInput({ agRemote: 2 }), github: makeGitHub(), local: makeLocal() }).verdict,
    VERDICT.BLOCKED,
  );

  // Active same-task predecessor blocked; unknown ownership/concurrency/isolation -> REVIEW_REQUIRED
  assert.ok(
    evaluatePreflight({ input: makeBaseInput({ sameTaskActiveWriter: true }), github: makeGitHub(), local: makeLocal() }).reasonCodes.includes(
      'ACTIVE_PREDECESSOR_ON_SAME_TASK',
    ),
  );
  assert.equal(
    evaluatePreflight({
      input: makeBaseInput({ totalExecutors: undefined, isolatedResources: undefined, confirmScope: false }),
      github: makeGitHub(),
      local: makeLocal(),
    }).verdict,
    VERDICT.REVIEW_REQUIRED,
  );
});

test('invalid args, untrusted remote, duplicate remote, credential redaction, and output sanitizer', () => {
  assert.throws(() => parseCliArgs(['--issue', 'abc', '--branch', 'main', '--base', SHA_A]));
  assert.throws(() => parseCliArgs(['--issue', '204', '--branch', '../bad', '--base', SHA_A]));
  assert.throws(() => parseCliArgs(['--issue', '204', '--branch', 'task/ok', '--base', 'not-a-sha']));
  assert.throws(() => parseCliArgs(['--issue', '204', '--branch', 'task/ok', '--base', SHA_A, '--repo', 'evil/repo']));
  assert.throws(() => parseCliArgs(['--issue', '204', '--branch', 'task/ok', '--base', SHA_A, '--unknown-flag']));
  assert.throws(() => validateBranchName('-flag'));
  assert.throws(() => validateBranchName('feat/bad.lock'));

  const syntheticGhp = `ghp_${'1234567890abcdef'}`;
  const credUrl = validateRemoteOriginUrl(`https://x-access-token:${syntheticGhp}@github.com/abuhmaid28/egyhealth360.git`);
  assert.equal(credUrl.valid, false);
  assert.equal(credUrl.hasEmbeddedCredentials, true);
  assert.ok(!credUrl.sanitizedUrl.includes(syntheticGhp));
  assert.ok(credUrl.sanitizedUrl.includes('<REDACTED>@'));

  const untrusted = validateRemoteOriginUrl('https://github.com/other/egyhealth360.git');
  assert.equal(untrusted.valid, false);
  assert.equal(untrusted.reasonCode, 'UNTRUSTED_REMOTE_ORIGIN');

  const dupAndUntrusted = evaluatePreflight({
    input: makeBaseInput(),
    github: makeGitHub(),
    local: makeLocal({
      remoteNames: ['origin', 'mirror'],
      originUrlCount: 2,
      originValidation: untrusted,
    }),
  });
  assert.equal(dupAndUntrusted.verdict, VERDICT.BLOCKED);
  assert.ok(dupAndUntrusted.reasonCodes.includes('DUPLICATE_REMOTE'));
  assert.ok(dupAndUntrusted.reasonCodes.includes('UNTRUSTED_REMOTE_ORIGIN'));

  const syntheticPat = `github_pat_${'ABCDEFGHIJKLMNOP'}`;
  const syntheticBearer = `Bearer ${'synthetic_test_value_123'}`;
  const leaked = redactSecrets(`Authorization: ${syntheticBearer} ${syntheticPat}\nline2`);
  assert.ok(!leaked.includes('synthetic_test_value_123'));
  assert.ok(!leaked.includes(syntheticPat));
  assert.ok(sanitizeText('x'.repeat(500), 60).length <= 60);
});

test('Windows and POSIX path normalization and workspace overlap detection', () => {
  assert.equal(normalizePathString('C:\\work\\EgyHealth360-G2-D1\\', 'win32'), 'c:/work/egyhealth360-g2-d1');
  assert.equal(normalizePathString('/home/antigravity/work/g2-d1/', 'linux'), '/home/antigravity/work/g2-d1');
  assert.equal(pathsOverlap('C:\\Users\\Owner\\Repo', 'c:/users/owner/repo/sub', 'win32'), true);
  assert.equal(pathsOverlap('/work/g2-d1', '/work/g2-q1', 'linux'), false);

  const overlap = evaluatePreflight({
    input: makeBaseInput({ peerWorkspaces: ['C:\\work\\EgyHealth360-G2-D1'] }),
    github: makeGitHub(),
    local: makeLocal({ workspacePath: 'c:/work/egyhealth360-g2-d1' }),
  });
  assert.equal(overlap.verdict, VERDICT.BLOCKED);
  assert.ok(overlap.reasonCodes.includes('WORKSPACE_PATH_OVERLAP'));
});

test('synthetic local temporary git repository stays unmodified in read-only verify mode', () => {
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'eh204-preflight-'));
  try {
    const { git, baseSha } = initSyntheticRepo(tmpDir, { branch: 'task/g2-d1-workspace-preflight' });
    const before = snapshotRepo(tmpDir);

    const local = inspectLocalGitWorkspace({
      workspacePath: tmpDir,
      authorizedBaseSha: baseSha,
      remoteTaskSha: null,
      mode: 'verify',
    });

    assert.equal(local.isGitRepo, true);
    assert.equal(local.currentBranch, 'task/g2-d1-workspace-preflight');
    assert.equal(local.headSha, baseSha);
    assert.equal(local.dirtyCount, 0);
    assert.equal(local.originValidation.trusted, true);
    assert.equal(local.fetchPerformed, false);

    // Read-only invariant: repo index bytes, status, HEAD, and refs must be untouched.
    assert.deepEqual(snapshotRepo(tmpDir), before);

    const verdict = evaluatePreflight({
      input: makeBaseInput({ base: baseSha, peerWorkspaces: [] }),
      github: makeGitHub({ mainHeadSha: baseSha }),
      local,
    });
    assert.equal(verdict.verdict, VERDICT.PASS_FOR_SOURCE_CHECK);

    // Fetch mode must refuse when workspace is dirty, preserving local work.
    writeFileSync(path.join(tmpDir, 'dirty.txt'), 'wip\n');
    const fetchDirty = inspectLocalGitWorkspace({
      workspacePath: tmpDir,
      authorizedBaseSha: baseSha,
      remoteTaskSha: null,
      mode: 'fetch',
      fetchRefs: ['main'],
      fetchAuthorized: true,
    });
    assert.equal(fetchDirty.fetchPerformed, false);
    assert.equal(fetchDirty.fetchErrorCode, 'FETCH_REFUSED_DIRTY_WORKSPACE');
    assert.equal(git('rev-parse', 'HEAD'), baseSha);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('fetch mode refuses when gitCommonDir is shared with an active peer worktree', () => {
  const tmpRoot = mkdtempSync(path.join(os.tmpdir(), 'eh204-wt-'));
  try {
    const mainDir = path.join(tmpRoot, 'main');
    const wtDir = path.join(tmpRoot, 'peer-wt');
    const { git, baseSha } = initSyntheticRepo(mainDir);
    git('worktree', 'add', '-b', 'task/peer', wtDir);

    const local = inspectLocalGitWorkspace({
      workspacePath: wtDir,
      authorizedBaseSha: baseSha,
      remoteTaskSha: null,
      peerWorkspaces: [mainDir],
      mode: 'fetch',
      fetchRefs: ['main'],
      fetchAuthorized: true,
    });
    assert.equal(local.isWorktree, true);
    assert.equal(local.sharesCommonDirWithPeer, true);
    assert.equal(local.fetchPerformed, false);
    assert.equal(local.fetchErrorCode, 'FETCH_REFUSED_SHARED_GIT_COMMON_DIR');
  } finally {
    rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('runPreflightCli returns deterministic exit codes 0, 1, 2, 3 without network', () => {
  const origLog = console.log;
  const origErr = console.error;
  const captured = [];
  console.log = (msg) => captured.push(String(msg));
  console.error = (msg) => captured.push(String(msg));
  try {
    const cliErr = runPreflightCli(['--issue', 'bad']);
    assert.equal(cliErr, EXIT_CODE.CLI_ERROR);

    const baseArgs = [
      '--issue', '204',
      '--branch', 'task/g2-d1-workspace-preflight',
      '--base', SHA_A,
      '--claim-holder', 'ag-local-2',
      '--executor-type', 'antigravity-local',
      '--total-executors', '4',
      '--codex-cloud', '1',
      '--ag-remote', '1',
      '--ag-local', '2',
      '--codex-local', '0',
      '--same-task-active-writer', 'false',
      '--isolated-resources', 'true',
      '--disjoint-paths', 'true',
      '--json',
    ];

    const reviewCode = runPreflightCli(baseArgs, {
      readGitHub: () => makeGitHub(),
      inspectLocal: () => makeLocal(),
    });
    assert.equal(reviewCode, EXIT_CODE.REVIEW_REQUIRED);

    const passCode = runPreflightCli([...baseArgs, '--confirm-scope'], {
      readGitHub: () => makeGitHub(),
      inspectLocal: () => makeLocal(),
    });
    assert.equal(passCode, EXIT_CODE.PASS_FOR_SOURCE_CHECK);

    const blockedCode = runPreflightCli([...baseArgs, '--confirm-scope'], {
      readGitHub: () => ({ reachable: false, errorCode: 'GITHUB_REPO_UNREACHABLE' }),
      inspectLocal: () => makeLocal(),
    });
    assert.equal(blockedCode, EXIT_CODE.BLOCKED);
    assert.ok(captured.some((line) => line.includes('"verdict": "PASS_FOR_SOURCE_CHECK"')));
  } finally {
    console.log = origLog;
    console.error = origErr;
  }
});

test('fail-closed on null local headSha, null baseIsAncestorOfHead, missing remote task ancestry, and incomplete concurrency', () => {
  const nullHead = evaluatePreflight({
    input: makeBaseInput(),
    github: makeGitHub(),
    local: makeLocal({ headSha: null }),
  });
  assert.equal(nullHead.verdict, VERDICT.BLOCKED);
  assert.ok(nullHead.reasonCodes.includes('MISSING_LOCAL_HEAD'));

  const nullAncestry = evaluatePreflight({
    input: makeBaseInput(),
    github: makeGitHub({ targetBranch: { name: 'task/g2-d1-workspace-preflight', state: 'EXISTS', headSha: SHA_C } }),
    local: makeLocal({ headSha: SHA_C, hasRemoteTaskObject: true, baseIsAncestorOfHead: null }),
  });
  assert.equal(nullAncestry.verdict, VERDICT.REVIEW_REQUIRED);
  assert.ok(nullAncestry.reasonCodes.includes('BASE_ANCESTRY_UNKNOWN'));

  const missingRemoteTaskObj = evaluatePreflight({
    input: makeBaseInput(),
    github: makeGitHub({ targetBranch: { name: 'task/g2-d1-workspace-preflight', state: 'EXISTS', headSha: SHA_C } }),
    local: makeLocal({ headSha: SHA_C, hasRemoteTaskObject: false }),
  });
  assert.equal(missingRemoteTaskObj.verdict, VERDICT.REVIEW_REQUIRED);
  assert.equal(missingRemoteTaskObj.branchRelation, 'MISSING_ANCESTRY');
  assert.ok(missingRemoteTaskObj.reasonCodes.includes('MISSING_REMOTE_TASK_ANCESTRY'));

  const missingExecutorType = evaluatePreflight({
    input: makeBaseInput({ executorType: undefined, codexLocal: undefined }),
    github: makeGitHub(),
    local: makeLocal(),
  });
  assert.equal(missingExecutorType.verdict, VERDICT.REVIEW_REQUIRED);
  assert.ok(missingExecutorType.reasonCodes.includes('EXECUTOR_TYPE_UNKNOWN'));
  assert.ok(missingExecutorType.reasonCodes.includes('CONCURRENCY_COUNTS_UNKNOWN'));

  const badSum = evaluatePreflight({
    input: makeBaseInput({ totalExecutors: 4, codexCloud: 2, agRemote: 1, agLocal: 3, codexLocal: 0 }),
    github: makeGitHub(),
    local: makeLocal(),
  });
  assert.equal(badSum.verdict, VERDICT.BLOCKED);
  assert.ok(badSum.reasonCodes.includes('CONCURRENCY_SUM_INCONSISTENT'));
});

test('preserves full path for unstaged tracked modifications, checks pushurl, ssh://git@, and worktree fetch without peers', () => {
  const sshOk = validateRemoteOriginUrl('ssh://git@github.com/abuhmaid28/egyhealth360.git');
  assert.equal(sshOk.valid, true);
  assert.equal(sshOk.trusted, true);
  assert.equal(sshOk.hasEmbeddedCredentials, false);

  const sshPass = validateRemoteOriginUrl('ssh://git:secret@github.com/abuhmaid28/egyhealth360.git');
  assert.equal(sshPass.valid, false);
  assert.equal(sshPass.hasEmbeddedCredentials, true);
  assert.ok(!sshPass.sanitizedUrl.includes('secret'));

  assert.throws(() => parseCliArgs(['--issue', '204', '--branch', 'task/ok', '--base', SHA_A, '--total-executors', '   ']));

  const tmpRoot = mkdtempSync(path.join(os.tmpdir(), 'eh204-pushurl-'));
  try {
    const mainDir = path.join(tmpRoot, 'main');
    const wtDir = path.join(tmpRoot, 'wt');
    const cleanEnv = buildSanitizedExecEnv(process.env, 'git');
    const git = (cwd, ...args) =>
      execFileSync('git', args, { cwd, env: cleanEnv, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

    execFileSync('git', ['init', '-b', 'main', mainDir], { env: cleanEnv, encoding: 'utf8' });
    git(mainDir, 'config', 'user.email', 'test@example.invalid');
    git(mainDir, 'config', 'user.name', 'Test User');
    writeFileSync(path.join(mainDir, 'tracked.txt'), 'v1\n');
    git(mainDir, 'add', 'tracked.txt');
    git(mainDir, 'commit', '-m', 'init');
    git(mainDir, 'remote', 'add', 'origin', 'https://github.com/abuhmaid28/egyhealth360.git');
    git(mainDir, 'remote', 'set-url', '--push', 'origin', 'https://evil.example/fork.git');
    const baseSha = git(mainDir, 'rev-parse', 'HEAD');

    // Unstaged modification on tracked.txt produces ' M tracked.txt' in git status --porcelain=v1.
    writeFileSync(path.join(mainDir, 'tracked.txt'), 'v2\n');
    const localMain = inspectLocalGitWorkspace({
      workspacePath: mainDir,
      authorizedBaseSha: baseSha,
      remoteTaskSha: null,
      mode: 'verify',
    });
    assert.equal(localMain.dirtyCount, 1);
    assert.deepEqual(localMain.dirtySamplePaths, ['tracked.txt']);
    assert.equal(localMain.pushOriginValidation?.trusted, false);

    const pushCheck = evaluatePreflight({
      input: makeBaseInput({ base: baseSha, peerWorkspaces: [], redactPaths: true }),
      github: makeGitHub({ mainHeadSha: baseSha }),
      local: localMain,
    });
    assert.equal(pushCheck.verdict, VERDICT.BLOCKED);
    assert.ok(pushCheck.reasonCodes.includes('UNTRUSTED_REMOTE_ORIGIN'));
    assert.equal(pushCheck.local.workspacePath, '<REDACTED_LOCAL_PATH>');

    // Restore trusted pushurl before testing worktree isolation in fetch mode.
    git(mainDir, 'remote', 'set-url', '--push', 'origin', 'https://github.com/abuhmaid28/egyhealth360.git');
    git(mainDir, 'worktree', 'add', '-b', 'task/wt-test', wtDir);
    const wtFetch = inspectLocalGitWorkspace({
      workspacePath: wtDir,
      authorizedBaseSha: baseSha,
      remoteTaskSha: null,
      peerWorkspaces: [],
      mode: 'fetch',
      fetchRefs: ['main'],
      fetchAuthorized: true,
    });
    assert.equal(wtFetch.fetchPerformed, false);
    assert.equal(wtFetch.fetchErrorCode, 'FETCH_REFUSED_SHARED_GIT_COMMON_DIR');
  } finally {
    rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('gitRoot overlap detection and antigravityLocal concurrency receipt', () => {
  const subdirOverlap = evaluatePreflight({
    input: makeBaseInput({ peerWorkspaces: ['c:/work/egyhealth360-g2-d1'] }),
    github: makeGitHub(),
    local: makeLocal({
      workspacePath: 'c:/work/egyhealth360-g2-d1/apps/web',
      gitRoot: 'c:/work/egyhealth360-g2-d1',
    }),
  });
  assert.equal(subdirOverlap.verdict, VERDICT.BLOCKED);
  assert.ok(subdirOverlap.reasonCodes.includes('WORKSPACE_PATH_OVERLAP'));

  const gitRootOverlap = evaluatePreflight({
    input: makeBaseInput({ peerWorkspaces: ['c:/work/repo-root'] }),
    github: makeGitHub(),
    local: makeLocal({
      workspacePath: 'c:/work/symlink-alias',
      gitRoot: 'c:/work/repo-root',
    }),
  });
  assert.equal(gitRootOverlap.verdict, VERDICT.BLOCKED);
  assert.ok(gitRootOverlap.reasonCodes.includes('WORKSPACE_PATH_OVERLAP'));

  const report = evaluatePreflight({
    input: makeBaseInput({ totalExecutors: 4, codexCloud: 1, agRemote: 1, agLocal: 2, codexLocal: 0 }),
    github: makeGitHub(),
    local: makeLocal(),
  });
  assert.equal(report.concurrency.antigravityLocal, 2);
  assert.equal(report.sourceCheckOnly, true);
  assert.equal(report.authorizesEditsOrMergeOrDeploy, false);

  const scpOk = validateRemoteOriginUrl('git@github.com:abuhmaid28/egyhealth360.git');
  assert.equal(scpOk.valid, true);
  assert.equal(scpOk.trusted, true);
  assert.equal(scpOk.hasEmbeddedCredentials, false);

  const scpCred = validateRemoteOriginUrl('git:secret_value@github.com:abuhmaid28/egyhealth360.git');
  assert.equal(scpCred.valid, false);
  assert.equal(scpCred.hasEmbeddedCredentials, true);
  assert.equal(scpCred.reasonCode, 'REMOTE_CREDENTIAL_DETECTED');
  assert.ok(!scpCred.sanitizedUrl.includes('secret_value'));
  assert.ok(scpCred.sanitizedUrl.startsWith('<REDACTED>@github.com:'));
});

// --- G1.1-H / Issue #205 Workspace Isolation Hardening Regression Matrix ---

test('buildSanitizedExecEnv strips case-insensitive Git redirection and config injection variables while preserving trusted context', () => {
  const dirtyEnv = {
    PATH: process.env.PATH,
    SystemRoot: process.env.SystemRoot || 'C:\\Windows',
    HOME: '/home/tester',
    GH_TOKEN: `ghp_${'testtoken12345678'}`,
    GIT_DIR: '/evil/.git',
    git_dir: '/evil/.git',
    GIT_WORK_TREE: '/evil',
    git_work_tree: '/evil',
    GIT_INDEX_FILE: '/evil/.git/index',
    git_index_file: '/evil/.git/index',
    GIT_OBJECT_DIRECTORY: '/evil/.git/objects',
    GIT_ALTERNATE_OBJECT_DIRECTORIES: '/evil/.git/objects',
    gIt_CoMmOn_DiR: '/evil/.git',
    GIT_CONFIG_PARAMETERS: "'remote.origin.url=https://evil.example/repo.git'",
    GIT_CONFIG_COUNT: '1',
    GIT_CONFIG_KEY_0: 'core.fsmonitor',
    GIT_CONFIG_VALUE_0: 'evil',
    GIT_CONFIG: '/evil/gitconfig',
    GIT_CONFIG_GLOBAL: '/evil/gitconfig',
    GIT_CONFIG_SYSTEM: '/evil/gitconfig',
    GIT_SSH_COMMAND: 'evil-ssh',
    NODE_OPTIONS: '--require /evil/preload.cjs',
  };

  const gitEnv = buildSanitizedExecEnv(dirtyEnv, 'git');
  assert.equal(gitEnv.GIT_OPTIONAL_LOCKS, '0');
  assert.equal(gitEnv.GIT_TERMINAL_PROMPT, '0');
  assert.equal(gitEnv.GIT_CONFIG_COUNT, '0');
  for (const forbidden of [
    'GIT_DIR', 'git_dir', 'GIT_WORK_TREE', 'git_work_tree', 'GIT_INDEX_FILE', 'git_index_file',
    'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES', 'gIt_CoMmOn_DiR',
    'GIT_CONFIG_PARAMETERS', 'GIT_CONFIG_KEY_0', 'GIT_CONFIG_VALUE_0', 'GIT_CONFIG',
    'GIT_CONFIG_GLOBAL', 'GIT_CONFIG_SYSTEM', 'GIT_SSH_COMMAND', 'GH_TOKEN', 'NODE_OPTIONS',
  ]) {
    assert.equal(Object.hasOwn(gitEnv, forbidden), false, `Expected ${forbidden} to be stripped for git`);
  }

  const ghEnv = buildSanitizedExecEnv(dirtyEnv, 'gh');
  assert.equal(ghEnv.GH_TOKEN, dirtyEnv.GH_TOKEN);
  assert.equal(Object.hasOwn(ghEnv, 'GIT_DIR'), false);
  assert.equal(Object.hasOwn(ghEnv, 'git_index_file'), false);
});

test('immune to ambient GIT_DIR, GIT_WORK_TREE, GIT_INDEX_FILE, GIT_COMMON_DIR, GIT_OBJECT_DIRECTORY, config injection, and case-insensitive env while preserving unrelated synthetic repos', () => {
  const tmpRoot = mkdtempSync(path.join(os.tmpdir(), 'eh205-env-'));
  try {
    const targetDir = path.join(tmpRoot, 'target-repo');
    const otherDir = path.join(tmpRoot, 'other-repo');
    const target = initSyntheticRepo(targetDir, {
      remoteUrl: 'https://github.com/abuhmaid28/egyhealth360.git',
      branch: 'task/target',
      fileContent: 'target-v1\n',
    });
    const other = initSyntheticRepo(otherDir, {
      remoteUrl: 'https://github.com/evil/unrelated.git',
      branch: 'other-branch',
      fileContent: 'other-v1\n',
    });
    writeFileSync(path.join(otherDir, 'unrelated-dirty.txt'), 'secret-other\n');
    const targetBefore = snapshotRepo(targetDir);
    const otherBefore = snapshotRepo(otherDir);

    const poisonedRunner = createExecRunner({
      env: {
        ...process.env,
        GIT_DIR: path.join(otherDir, '.git'),
        git_dir: path.join(otherDir, '.git'),
        GIT_WORK_TREE: otherDir,
        git_work_tree: otherDir,
        GIT_INDEX_FILE: path.join(otherDir, '.git', 'index'),
        git_index_file: path.join(otherDir, '.git', 'index'),
        GIT_COMMON_DIR: path.join(otherDir, '.git'),
        gIt_CoMmOn_DiR: path.join(otherDir, '.git'),
        GIT_OBJECT_DIRECTORY: path.join(otherDir, '.git', 'objects'),
        GIT_ALTERNATE_OBJECT_DIRECTORIES: path.join(otherDir, '.git', 'objects'),
        GIT_CONFIG_PARAMETERS: "'remote.origin.url=https://injected.example/fork.git'",
        GIT_CONFIG_COUNT: '1',
        GIT_CONFIG_KEY_0: 'remote.origin.url',
        GIT_CONFIG_VALUE_0: 'https://injected.example/fork.git',
        GIT_CONFIG: path.join(otherDir, '.git', 'config'),
        GIT_CONFIG_GLOBAL: path.join(otherDir, '.git', 'config'),
      },
    });

    // Check against targetDir: must see targetDir, NOT otherDir, and must NOT treat other.baseSha as present.
    const localTarget = inspectLocalGitWorkspace({
      workspacePath: targetDir,
      authorizedBaseSha: target.baseSha,
      remoteTaskSha: null,
      mode: 'verify',
      runner: poisonedRunner,
    });
    assert.equal(localTarget.currentBranch, 'task/target');
    assert.equal(localTarget.headSha, target.baseSha);
    assert.equal(localTarget.dirtyCount, 0);
    assert.equal(localTarget.originSanitized, 'https://github.com/abuhmaid28/egyhealth360.git');
    assert.equal(localTarget.originValidation.trusted, true);
    assert.equal(localTarget.isWorktree, false);

    // Check that other.baseSha is NOT spoofed via GIT_OBJECT_DIRECTORY into targetDir.
    const otherObjProbe = inspectLocalGitWorkspace({
      workspacePath: targetDir,
      authorizedBaseSha: other.baseSha,
      remoteTaskSha: null,
      mode: 'verify',
      runner: poisonedRunner,
    });
    assert.equal(otherObjProbe.hasBaseObject, false);

    // Both synthetic repos (including unrelated otherDir) must remain completely untouched.
    assert.deepEqual(snapshotRepo(targetDir), targetBefore);
    assert.deepEqual(snapshotRepo(otherDir), otherBefore);
  } finally {
    rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('parent repository discovery, symlink/junction overlap, shared peer common-dir, and uninspectable peer fail closed', () => {
  const tmpRoot = mkdtempSync(path.join(os.tmpdir(), 'eh205-contain-'));
  try {
    const targetDir = path.join(tmpRoot, 'target-repo');
    const subdir = path.join(targetDir, 'apps', 'web');
    const { baseSha } = initSyntheticRepo(targetDir, { branch: 'task/target' });
    mkdirSync(subdir, { recursive: true });

    // 1. Parent checkout discovery from subdirectory -> BLOCKED WORKSPACE_NOT_GIT_ROOT.
    const subLocal = inspectLocalGitWorkspace({
      workspacePath: subdir,
      authorizedBaseSha: baseSha,
      mode: 'verify',
    });
    assert.equal(subLocal.workspaceMatchesGitRoot, false);
    const subVerdict = evaluatePreflight({
      input: makeBaseInput({ branch: 'task/target', base: baseSha, peerWorkspaces: [] }),
      github: makeGitHub({ mainHeadSha: baseSha, targetBranch: { name: 'task/target', state: 'ABSENT', headSha: null } }),
      local: subLocal,
    });
    assert.equal(subVerdict.verdict, VERDICT.BLOCKED);
    assert.ok(subVerdict.reasonCodes.includes('WORKSPACE_NOT_GIT_ROOT'));

    // 2. Symlink / Windows junction alias pointing to targetDir -> physical overlap & shared common-dir detected.
    const aliasDir = path.join(tmpRoot, 'alias-repo');
    const linkType = process.platform === 'win32' ? 'junction' : 'dir';
    symlinkSync(targetDir, aliasDir, linkType);

    const aliasLocal = inspectLocalGitWorkspace({
      workspacePath: aliasDir,
      authorizedBaseSha: baseSha,
      peerWorkspaces: [targetDir],
      mode: 'verify',
    });
    assert.equal(aliasLocal.workspacePath, normalizePathString(targetDir));
    assert.equal(aliasLocal.sharesCommonDirWithPeer, true);

    const aliasVerdict = evaluatePreflight({
      input: makeBaseInput({ branch: 'task/target', base: baseSha, peerWorkspaces: [targetDir] }),
      github: makeGitHub({ mainHeadSha: baseSha, targetBranch: { name: 'task/target', state: 'ABSENT', headSha: null } }),
      local: aliasLocal,
    });
    assert.equal(aliasVerdict.verdict, VERDICT.BLOCKED);
    assert.ok(aliasVerdict.reasonCodes.includes('WORKSPACE_PATH_OVERLAP'));
    assert.ok(aliasVerdict.reasonCodes.includes('SHARED_GIT_COMMON_DIR_WITH_PEER'));

    // 3. Uninspectable peer workspace (e.g. runner failure other than 'not a git repository') -> BLOCKED PEER_INSPECTION_FAILED.
    const brokenPeer = path.join(tmpRoot, 'broken-peer');
    mkdirSync(brokenPeer, { recursive: true });
    const baseRunner = createExecRunner();
    const failPeerRunner = (cmd, args, cwd, opts) => {
      if (cmd === 'git' && args[1] === '--git-common-dir' && normalizePathString(cwd) === normalizePathString(brokenPeer)) {
        return { ok: false, code: 128, timedOut: false, stdout: '', stderr: 'fatal: permission denied reading peer' };
      }
      return baseRunner(cmd, args, cwd, opts);
    };
    const peerFailLocal = inspectLocalGitWorkspace({
      workspacePath: targetDir,
      authorizedBaseSha: baseSha,
      peerWorkspaces: [brokenPeer],
      mode: 'verify',
      runner: failPeerRunner,
    });
    assert.equal(peerFailLocal.peerInspectionFailed, true);
    const peerFailVerdict = evaluatePreflight({
      input: makeBaseInput({ branch: 'task/target', base: baseSha, peerWorkspaces: [brokenPeer] }),
      github: makeGitHub({ mainHeadSha: baseSha, targetBranch: { name: 'task/target', state: 'ABSENT', headSha: null } }),
      local: peerFailLocal,
    });
    assert.equal(peerFailVerdict.verdict, VERDICT.BLOCKED);
    assert.ok(peerFailVerdict.reasonCodes.includes('PEER_INSPECTION_FAILED'));
  } finally {
    rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('strict concurrency validation rejects missing counts, negative/noninteger counts, sum mismatches, cap violations, and missing selected executor', () => {
  const baseArgs = { github: makeGitHub(), local: makeLocal() };

  // Missing agLocal must NOT pass (no longer defaults to 0).
  const missingAgLocal = evaluatePreflight({
    input: makeBaseInput({ agLocal: undefined }),
    ...baseArgs,
  });
  assert.equal(missingAgLocal.verdict, VERDICT.REVIEW_REQUIRED);
  assert.ok(missingAgLocal.reasonCodes.includes('CONCURRENCY_COUNTS_UNKNOWN'));

  // Missing codexCloud.
  const missingCloud = evaluatePreflight({
    input: makeBaseInput({ codexCloud: undefined }),
    ...baseArgs,
  });
  assert.equal(missingCloud.verdict, VERDICT.REVIEW_REQUIRED);
  assert.ok(missingCloud.reasonCodes.includes('CONCURRENCY_COUNTS_UNKNOWN'));

  // Negative, float, NaN, Infinity counts must be BLOCKED CONCURRENCY_COUNT_INVALID.
  for (const bad of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    const res = evaluatePreflight({
      input: makeBaseInput({ totalExecutors: 4, codexCloud: bad, agRemote: 1, agLocal: 2, codexLocal: 0 }),
      ...baseArgs,
    });
    assert.equal(res.verdict, VERDICT.BLOCKED);
    assert.ok(res.reasonCodes.includes('CONCURRENCY_COUNT_INVALID'));
  }

  // CLI rejects negative/noninteger counts as CLI_ERROR (exit 1).
  const origErr = console.error;
  console.error = () => {};
  try {
    assert.equal(runPreflightCli(['--issue', '204', '--branch', 'task/ok', '--base', SHA_A, '--ag-local', '-1']), EXIT_CODE.CLI_ERROR);
    assert.equal(runPreflightCli(['--issue', '204', '--branch', 'task/ok', '--base', SHA_A, '--ag-local', '1.5']), EXIT_CODE.CLI_ERROR);
  } finally {
    console.error = origErr;
  }

  // Sum < total and Sum > total must BOTH fail with CONCURRENCY_SUM_INCONSISTENT.
  const sumTooLow = evaluatePreflight({
    input: makeBaseInput({ totalExecutors: 4, codexCloud: 0, agRemote: 0, agLocal: 1, codexLocal: 0 }),
    ...baseArgs,
  });
  assert.equal(sumTooLow.verdict, VERDICT.BLOCKED);
  assert.ok(sumTooLow.reasonCodes.includes('CONCURRENCY_SUM_INCONSISTENT'));

  const sumTooHigh = evaluatePreflight({
    input: makeBaseInput({ totalExecutors: 2, codexCloud: 1, agRemote: 1, agLocal: 1, codexLocal: 0 }),
    ...baseArgs,
  });
  assert.equal(sumTooHigh.verdict, VERDICT.BLOCKED);
  assert.ok(sumTooHigh.reasonCodes.includes('CONCURRENCY_SUM_INCONSISTENT'));

  // Selected executor absent from projected active counts (count === 0).
  const absentAgLocal = evaluatePreflight({
    input: makeBaseInput({ executorType: 'antigravity-local', totalExecutors: 2, codexCloud: 1, agRemote: 1, agLocal: 0, codexLocal: 0 }),
    ...baseArgs,
  });
  assert.equal(absentAgLocal.verdict, VERDICT.BLOCKED);
  assert.ok(absentAgLocal.reasonCodes.includes('SELECTED_EXECUTOR_NOT_IN_COUNTS'));

  const absentCloud = evaluatePreflight({
    input: makeBaseInput({ executorType: 'codex-cloud', totalExecutors: 2, codexCloud: 0, agRemote: 1, agLocal: 1, codexLocal: 0 }),
    ...baseArgs,
  });
  assert.equal(absentCloud.verdict, VERDICT.BLOCKED);
  assert.ok(absentCloud.reasonCodes.includes('SELECTED_EXECUTOR_NOT_IN_COUNTS'));

  const absentRemote = evaluatePreflight({
    input: makeBaseInput({ executorType: 'antigravity-remote', totalExecutors: 2, codexCloud: 1, agRemote: 0, agLocal: 1, codexLocal: 0 }),
    ...baseArgs,
  });
  assert.equal(absentRemote.verdict, VERDICT.BLOCKED);
  assert.ok(absentRemote.reasonCodes.includes('SELECTED_EXECUTOR_NOT_IN_COUNTS'));
});

test('staged workflow executes ZERO fetch calls for every denied condition and succeeds with exact non-force refspec + post-fetch recheck when authorized', () => {
  const tmpRoot = mkdtempSync(path.join(os.tmpdir(), 'eh205-fetch-'));
  try {
    const targetDir = path.join(tmpRoot, 'target-repo');
    const bareRemote = path.join(tmpRoot, 'remote.git');
    const cleanEnv = buildSanitizedExecEnv(process.env, 'git');
    execFileSync('git', ['init', '--bare', '-b', 'main', bareRemote], { env: cleanEnv, encoding: 'utf8' });
    const { git, baseSha } = initSyntheticRepo(targetDir, { remoteUrl: bareRemote, branch: 'task/g2-d1-workspace-preflight' });
    git('push', 'origin', 'main');
    const targetBefore = snapshotRepo(targetDir);

    const buildMockRunner = (ghOverrides = {}, onFetch = null) => {
      const fetchCalls = [];
      const baseRunner = createExecRunner();
      const runner = (cmd, args, cwd, opts) => {
        if (cmd === 'gh') {
          const ep = args[1] ?? '';
          if (ghOverrides.unreachable) return { ok: false, code: 1, timedOut: false, stdout: '', stderr: 'network down' };
          if (ep === `repos/${OFFICIAL_REPO}`) return { ok: true, code: 0, stdout: JSON.stringify({ id: OFFICIAL_REPO_ID, full_name: OFFICIAL_REPO, visibility: 'public', default_branch: 'main' }), stderr: '' };
          if (ep.endsWith('/git/ref/heads/main')) return { ok: true, code: 0, stdout: JSON.stringify({ object: { sha: ghOverrides.mainHeadSha ?? baseSha } }), stderr: '' };
          if (ep.includes('/contents/AGENTS.md')) return { ok: true, code: 0, stdout: JSON.stringify({ sha: SHA_B }), stderr: '' };
          if (ep.endsWith('/issues/204')) return { ok: true, code: 0, stdout: JSON.stringify({ number: 204, state: ghOverrides.issueState ?? 'OPEN', assignees: [], comments: 1 }), stderr: '' };
          if (ep.includes('/comments')) return { ok: true, code: 0, stdout: JSON.stringify([{ id: 1, created_at: '2026-11-28T00:00:00Z' }]), stderr: '' };
          return { ok: false, code: 1, timedOut: false, stdout: '', stderr: 'HTTP 404 Not Found' };
        }
        if (cmd === 'git' && args[0] === 'ls-remote') {
          if (ghOverrides.remoteBranchSha) {
            return { ok: true, code: 0, stdout: `${ghOverrides.remoteBranchSha}\trefs/heads/task/g2-d1-workspace-preflight`, stderr: '' };
          }
          return { ok: false, code: 2, timedOut: false, stdout: '', stderr: '' };
        }
        if (cmd === 'git' && args[0] === 'fetch') {
          fetchCalls.push(args.join(' '));
          if (onFetch) onFetch();
          return baseRunner(cmd, args, cwd, opts);
        }
        return baseRunner(cmd, args, cwd, opts);
      };
      return { runner, fetchCalls };
    };

    const allowLocalBare = (url) => ({
      valid: true,
      trusted: url === bareRemote || url === 'https://github.com/abuhmaid28/egyhealth360.git',
      hasEmbeddedCredentials: false,
      sanitizedUrl: url,
      reasonCode: url === bareRemote ? null : 'UNTRUSTED_REMOTE_ORIGIN',
    });

    const baseCliInput = makeBaseInput({
      mode: 'fetch',
      workspace: targetDir,
      base: baseSha,
      peerWorkspaces: [],
      fetchRefs: ['main'],
    });

    // Denied cases — every single one must produce ZERO fetch calls and leave repo untouched.
    const deniedCases = [
      { name: 'missing scope confirmation', input: { ...baseCliInput, confirmScope: false } },
      { name: 'missing claim holder', input: { ...baseCliInput, claimHolder: '' } },
      { name: 'closed issue', input: { ...baseCliInput }, gh: { issueState: 'CLOSED' } },
      { name: 'unreachable GitHub', input: { ...baseCliInput }, gh: { unreachable: true } },
      { name: 'active competing writer', input: { ...baseCliInput, sameTaskActiveWriter: true } },
      { name: 'missing executor count', input: { ...baseCliInput, agLocal: undefined } },
      { name: 'inconsistent concurrency sum', input: { ...baseCliInput, totalExecutors: 4, agLocal: 1 } },
      { name: 'selected executor absent', input: { ...baseCliInput, totalExecutors: 2, agLocal: 0 } },
      { name: 'cap exceeded', input: { ...baseCliInput, totalExecutors: 5, agLocal: 3 } },
      { name: 'wrong branch', input: { ...baseCliInput, branch: 'task/other' } },
      { name: 'stale base head', input: { ...baseCliInput, base: SHA_OLD }, gh: { mainHeadSha: SHA_OLD } },
      { name: 'disallowed arbitrary fetch ref', input: { ...baseCliInput, fetchRefs: ['arbitrary-other-branch'] } },
      { name: 'untrusted remote check', input: { ...baseCliInput }, trust: () => ({ valid: false, trusted: false, hasEmbeddedCredentials: false, sanitizedUrl: 'https://evil.example/x.git', reasonCode: 'UNTRUSTED_REMOTE_ORIGIN' }) },
    ];

    for (const c of deniedCases) {
      const { runner, fetchCalls } = buildMockRunner(c.gh);
      const report = runPreflightWorkflow(c.input, {
        runner,
        allowTrustedRemoteCheck: c.trust ?? allowLocalBare,
      });
      assert.notEqual(report.verdict, VERDICT.PASS_FOR_SOURCE_CHECK, `Expected non-PASS for ${c.name}`);
      assert.equal(fetchCalls.length, 0, `Expected 0 fetch calls for ${c.name}, got ${fetchCalls.length}`);
      assert.deepEqual(snapshotRepo(targetDir), targetBefore, `Repo mutated on denied case ${c.name}`);
    }

    // Dirty source must also perform 0 fetch calls.
    writeFileSync(path.join(targetDir, 'dirty-temp.txt'), 'dirty\n');
    const dirtyMock = buildMockRunner();
    const dirtyReport = runPreflightWorkflow(baseCliInput, { runner: dirtyMock.runner, allowTrustedRemoteCheck: allowLocalBare });
    assert.equal(dirtyReport.verdict, VERDICT.BLOCKED);
    assert.equal(dirtyMock.fetchCalls.length, 0);
    rmSync(path.join(targetDir, 'dirty-temp.txt'));

    // Unexpected state drift between Stage 1 and Stage 3 must abort fetch with STATE_DRIFT_BEFORE_FETCH.
    let ghReads = 0;
    const driftRunnerBase = buildMockRunner();
    const driftRunner = (cmd, args, cwd, opts) => {
      if (cmd === 'gh' && (args[1] ?? '').endsWith('/git/ref/heads/main')) {
        ghReads++;
        const sha = ghReads === 1 ? baseSha : SHA_C;
        return { ok: true, code: 0, stdout: JSON.stringify({ object: { sha } }), stderr: '' };
      }
      return driftRunnerBase.runner(cmd, args, cwd, opts);
    };
    const driftReport = runPreflightWorkflow(baseCliInput, { runner: driftRunner, allowTrustedRemoteCheck: allowLocalBare });
    assert.equal(driftReport.verdict, VERDICT.REVIEW_REQUIRED);
    assert.ok(driftReport.reasonCodes.includes('BASE_DRIFT_FROM_MAIN'));
    assert.equal(driftRunnerBase.fetchCalls.length, 0);

    // Unexpected non-PASS-changing drift (e.g. target branch SHA changes under historicalBase) -> STATE_DRIFT_BEFORE_FETCH.
    let mainReads = 0;
    const histDriftBase = buildMockRunner();
    const histDriftRunner = (cmd, args, cwd, opts) => {
      if (cmd === 'gh' && (args[1] ?? '').endsWith('/git/ref/heads/main')) {
        mainReads++;
        const sha = mainReads === 1 ? baseSha : SHA_C;
        return { ok: true, code: 0, stdout: JSON.stringify({ object: { sha } }), stderr: '' };
      }
      return histDriftBase.runner(cmd, args, cwd, opts);
    };
    const histDriftReport = runPreflightWorkflow(
      { ...baseCliInput, historicalBase: true },
      { runner: histDriftRunner, allowTrustedRemoteCheck: allowLocalBare },
    );
    assert.equal(histDriftReport.verdict, VERDICT.BLOCKED);
    assert.ok(histDriftReport.reasonCodes.includes('STATE_DRIFT_BEFORE_FETCH'));
    assert.equal(histDriftBase.fetchCalls.length, 0);

    // Positive authorized fetch path: exact non-force refspec (`refs/heads/main:refs/remotes/origin/main`, no `+`).
    const okMock = buildMockRunner();
    const okReport = runPreflightWorkflow(baseCliInput, {
      runner: okMock.runner,
      allowTrustedRemoteCheck: allowLocalBare,
    });
    assert.equal(okReport.verdict, VERDICT.PASS_FOR_SOURCE_CHECK);
    assert.equal(okReport.local.fetchPerformed, true);
    assert.equal(okMock.fetchCalls.length, 1);
    assert.equal(okMock.fetchCalls[0], 'fetch --no-tags --no-prune origin refs/heads/main:refs/remotes/origin/main');
    assert.ok(!okMock.fetchCalls[0].includes('+refs/'));

    // Stage 4 post-fetch drift detection: if remote main advances during fetch, fail closed with STATE_DRIFT_AFTER_FETCH.
    let fetchDone = false;
    const postDriftBase = buildMockRunner({}, () => {
      fetchDone = true;
    });
    const postDriftRunner = (cmd, args, cwd, opts) => {
      if (cmd === 'gh' && (args[1] ?? '').endsWith('/git/ref/heads/main') && fetchDone) {
        return { ok: true, code: 0, stdout: JSON.stringify({ object: { sha: SHA_C } }), stderr: '' };
      }
      return postDriftBase.runner(cmd, args, cwd, opts);
    };
    const postDriftReport = runPreflightWorkflow(
      { ...baseCliInput, historicalBase: true },
      { runner: postDriftRunner, allowTrustedRemoteCheck: allowLocalBare },
    );
    assert.equal(postDriftReport.verdict, VERDICT.BLOCKED);
    assert.ok(postDriftReport.reasonCodes.includes('STATE_DRIFT_AFTER_FETCH'));
  } finally {
    rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('subprocess timeout, failed git inspection, and redacted error/dirty-path output fail closed without leaking private paths', () => {
  const tmpRoot = mkdtempSync(path.join(os.tmpdir(), 'eh205-fail-'));
  try {
    const repoDir = path.join(tmpRoot, 'repo');
    const { baseSha } = initSyntheticRepo(repoDir, { branch: 'task/target' });

    // 1. Real subprocess timeout with createExecRunner({ timeoutMs: 50 }).
    const fastTimeoutRunner = createExecRunner({ timeoutMs: 50 });
    const timedRes = fastTimeoutRunner(process.execPath, ['-e', 'setTimeout(() => {}, 2000)'], repoDir);
    assert.equal(timedRes.ok, false);
    assert.equal(timedRes.timedOut, true);
    assert.ok(timedRes.stderr.includes('timed out'));

    // End-to-end timeout verdicts in runPreflightWorkflow (GitHub timeout and Git timeout).
    const ghTimeoutReport = runPreflightWorkflow(makeBaseInput({ workspace: repoDir, base: baseSha, peerWorkspaces: [] }), {
      runner: (cmd, args, cwd, opts) => {
        if (cmd === 'gh') return { ok: false, code: 1, timedOut: true, stdout: '', stderr: 'Subprocess timed out' };
        return fastTimeoutRunner(cmd, args, cwd, opts);
      },
    });
    assert.equal(ghTimeoutReport.verdict, VERDICT.BLOCKED);
    assert.equal(ghTimeoutReport.github.errorCode, 'GITHUB_SUBPROCESS_TIMEOUT');

    const gitTimeoutReport = runPreflightWorkflow(makeBaseInput({ workspace: repoDir, base: baseSha, peerWorkspaces: [] }), {
      runner: (cmd) => {
        if (cmd === 'gh') return { ok: false, code: 1, timedOut: false, stdout: '', stderr: 'network down' };
        return { ok: false, code: 1, timedOut: true, stdout: '', stderr: 'Subprocess timed out' };
      },
    });
    assert.equal(gitTimeoutReport.verdict, VERDICT.BLOCKED);
    assert.ok(gitTimeoutReport.reasonCodes.includes('GIT_SUBPROCESS_TIMEOUT'));

    // 2. Failed git-dir / git-common-dir / worktree list must fail closed (never default isWorktree=false, worktreeCount=1).
    const brokenRunner = (cmd, args) => {
      assert.equal(cmd, 'git');
      if (args[0] === 'rev-parse' && args[1] === '--show-toplevel') return { ok: true, code: 0, timedOut: false, stdout: repoDir, stderr: '' };
      if (args[0] === 'rev-parse' && (args[1] === '--git-dir' || args[1] === '--git-common-dir')) return { ok: false, code: 128, timedOut: false, stdout: '', stderr: `fatal in ${repoDir}` };
      if (args[0] === 'worktree') return { ok: false, code: 1, timedOut: false, stdout: '', stderr: 'worktree list failed' };
      if (args[0] === 'remote' && args.length === 1) return { ok: true, code: 0, timedOut: false, stdout: 'origin', stderr: '' };
      if (args[0] === 'remote' && args[1] === 'get-url' && !args.includes('--push')) return { ok: true, code: 0, timedOut: false, stdout: 'https://github.com/abuhmaid28/egyhealth360.git', stderr: '' };
      if (args[0] === 'remote' && args.includes('--push')) return { ok: true, code: 0, timedOut: false, stdout: '', stderr: '' };
      if (args[0] === 'branch') return { ok: true, code: 0, timedOut: false, stdout: 'task/target', stderr: '' };
      if (args[0] === 'rev-parse' && args[1] === 'HEAD') return { ok: true, code: 0, timedOut: false, stdout: baseSha, stderr: '' };
      if (args[0] === 'rev-parse' && args[1] === 'HEAD^{tree}') return { ok: true, code: 0, timedOut: false, stdout: baseSha, stderr: '' };
      if (args[0] === 'status') return { ok: true, code: 0, timedOut: false, stdout: '', stderr: '' };
      if (args[0] === 'cat-file') return { ok: true, code: 0, timedOut: false, stdout: 'commit', stderr: '' };
      if (args[0] === 'merge-base') return { ok: true, code: 0, timedOut: false, stdout: '', stderr: '' };
      return { ok: false, code: 1, timedOut: false, stdout: '', stderr: 'err' };
    };
    const brokenLocal = inspectLocalGitWorkspace({ workspacePath: repoDir, authorizedBaseSha: baseSha, runner: brokenRunner });
    assert.equal(brokenLocal.inspectionFailed, true);
    assert.equal(brokenLocal.gitDirAmbiguous, true);
    assert.equal(brokenLocal.isWorktree, true);
    assert.equal(brokenLocal.worktreeCount, null);
    const brokenVerdict = evaluatePreflight({
      input: makeBaseInput({ branch: 'task/target', base: baseSha, peerWorkspaces: [] }),
      github: makeGitHub({ mainHeadSha: baseSha, targetBranch: { name: 'task/target', state: 'ABSENT', headSha: null } }),
      local: brokenLocal,
    });
    assert.equal(brokenVerdict.verdict, VERDICT.BLOCKED);
    assert.ok(brokenVerdict.reasonCodes.includes('GIT_INSPECTION_FAILED'));

    // 3. Redacted error output, originSanitized, dirtySamplePaths, and CLI argument errors protect private workstation paths.
    const privatePathWin = 'C:\\Users\\PrivatePerson\\secret\\dirty.txt';
    const privatePathPosix = '/home/privateperson/secret/err.txt';
    const redactedReport = evaluatePreflight({
      input: makeBaseInput({ workspace: 'C:\\Users\\PrivatePerson\\repo', redactPaths: true, peerWorkspaces: [] }),
      github: {
        reachable: false,
        errorCode: 'GITHUB_REPO_UNREACHABLE',
        error: `Failed reading ${privatePathWin} and ${privatePathPosix}`,
      },
      local: makeLocal({
        workspacePath: 'c:/users/privateperson/repo',
        gitRoot: 'c:/users/privateperson/repo',
        originSanitized: `file:///home/privateperson/local-origin.git`,
        dirtyCount: 2,
        dirtySamplePaths: [privatePathWin, privatePathPosix],
        error: `git failed in ${privatePathWin}`,
      }),
    });
    assert.equal(redactedReport.local.workspacePath, '<REDACTED_LOCAL_PATH>');
    assert.equal(redactedReport.local.gitRoot, '<REDACTED_LOCAL_PATH>');
    assert.ok(!redactedReport.local.originSanitized.includes('privateperson'));
    assert.deepEqual(redactedReport.local.dirtySamplePaths, ['<REDACTED_LOCAL_PATH>', '<REDACTED_LOCAL_PATH>']);
    assert.ok(!redactedReport.github.error.includes('PrivatePerson'));
    assert.ok(!redactedReport.github.error.includes('privateperson'));
    assert.ok(!redactedReport.local.error.includes('PrivatePerson'));

    const capturedCliErr = [];
    const origErr = console.error;
    console.error = (msg) => capturedCliErr.push(String(msg));
    try {
      const cliCode = runPreflightCli(['--issue', '204', '--branch', 'C:\\Users\\PrivatePerson\\bad', '--base', SHA_A, '--redact-paths']);
      assert.equal(cliCode, EXIT_CODE.CLI_ERROR);
      assert.ok(capturedCliErr.length > 0);
      assert.ok(!capturedCliErr.join('\n').includes('PrivatePerson'));
    } finally {
      console.error = origErr;
    }
  } finally {
    rmSync(tmpRoot, { recursive: true, force: true });
  }
});
