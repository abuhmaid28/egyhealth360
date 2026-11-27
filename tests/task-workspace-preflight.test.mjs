import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  OFFICIAL_REPO,
  OFFICIAL_REPO_ID,
  VERDICT,
  EXIT_CODE,
  evaluatePreflight,
  inspectLocalGitWorkspace,
  normalizePathString,
  parseCliArgs,
  pathsOverlap,
  redactSecrets,
  runPreflightCli,
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
    const git = (...args) => execFileSync('git', args, { cwd: tmpDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    git('init', '-b', 'main');
    git('config', 'user.email', 'test@example.invalid');
    git('config', 'user.name', 'Test User');
    writeFileSync(path.join(tmpDir, 'README.md'), 'hello\n');
    git('add', 'README.md');
    git('commit', '-m', 'init');
    git('remote', 'add', 'origin', 'https://github.com/abuhmaid28/egyhealth360.git');
    const baseSha = git('rev-parse', 'HEAD');
    git('switch', '-c', 'task/g2-d1-workspace-preflight');

    const beforeStatus = git('status', '--porcelain=v1');
    const beforeHead = git('rev-parse', 'HEAD');
    const beforeRefs = git('for-each-ref');

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

    // Read-only invariant: repo index, HEAD, and refs must be untouched.
    assert.equal(git('status', '--porcelain=v1'), beforeStatus);
    assert.equal(git('rev-parse', 'HEAD'), beforeHead);
    assert.equal(git('for-each-ref'), beforeRefs);

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
    });
    assert.equal(fetchDirty.fetchPerformed, false);
    assert.equal(fetchDirty.fetchErrorCode, 'FETCH_REFUSED_DIRTY_WORKSPACE');
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('fetch mode refuses when gitCommonDir is shared with an active peer worktree', () => {
  const tmpRoot = mkdtempSync(path.join(os.tmpdir(), 'eh204-wt-'));
  try {
    const mainDir = path.join(tmpRoot, 'main');
    const wtDir = path.join(tmpRoot, 'peer-wt');
    const git = (cwd, ...args) =>
      execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

    execFileSync('git', ['init', '-b', 'main', mainDir], { encoding: 'utf8' });
    git(mainDir, 'config', 'user.email', 'test@example.invalid');
    git(mainDir, 'config', 'user.name', 'Test User');
    writeFileSync(path.join(mainDir, 'README.md'), 'hello\n');
    git(mainDir, 'add', 'README.md');
    git(mainDir, 'commit', '-m', 'init');
    git(mainDir, 'remote', 'add', 'origin', 'https://github.com/abuhmaid28/egyhealth360.git');
    const baseSha = git(mainDir, 'rev-parse', 'HEAD');
    git(mainDir, 'worktree', 'add', '-b', 'task/peer', wtDir);

    const local = inspectLocalGitWorkspace({
      workspacePath: wtDir,
      authorizedBaseSha: baseSha,
      remoteTaskSha: null,
      peerWorkspaces: [mainDir],
      mode: 'fetch',
      fetchRefs: ['main'],
    });
    assert.equal(local.isWorktree, true);
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
