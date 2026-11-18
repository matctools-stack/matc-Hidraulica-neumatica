import test from 'node:test';
import assert from 'node:assert/strict';
import {
  authenticateOfflineUser,
  buildAppLoginShareUrl,
  buildAuthSession,
  buildPreviewShareSession,
  buildPreviewShareUrl,
  createOfflineUserRecord,
  extractPreviewParamsFromUrl,
  generateAccessKey,
  generatePreviewShareCode,
  generateSampleProLicenseKey,
  getRolePermissions,
  isOfflineUserExpired,
  isPrivateDevHost,
  isSessionExpired,
  resolvePreviewBaseUrl,
  updateOfflineUserRecord,
  validateOfflineLicenseKey,
  validatePreviewShareCode,
  verifyPasswordPBKDF2,
} from './offlineAuth';

test('PBKDF2 password hashing verifies valid credentials and rejects wrong passwords', async () => {
  const user = await createOfflineUserRecord({
    username: 'eng_marcos',
    displayName: 'Marcos Silva',
    role: 'engineer',
    password: 'fluid-secret-password',
  });

  assert.equal(
    await verifyPasswordPBKDF2('fluid-secret-password', user.saltHex, user.passwordHashHex),
    true
  );
  assert.equal(
    await verifyPasswordPBKDF2('wrong-password', user.saltHex, user.passwordHashHex),
    false
  );
});

test('Role permission matrix restricts operator from editing or user management', () => {
  const admin = getRolePermissions('admin');
  const engineer = getRolePermissions('engineer');
  const operator = getRolePermissions('operator');

  assert.equal(admin.canManageUsers, true);
  assert.equal(engineer.canManageUsers, false);
  assert.equal(engineer.canEditCircuit, true);
  assert.equal(operator.canEditCircuit, false);
  assert.equal(operator.canRunSimulation, true);
});

test('Offline license key generator & validator round-trip cleanly', () => {
  const key = generateSampleProLicenseKey('IND2026X');
  const ok = validateOfflineLicenseKey(key);
  assert.equal(ok.valid, true);
  assert.equal(ok.tier, 'Industrial Pro');

  const bad = validateOfflineLicenseKey('FCS-PRO-IND2-026X-00');
  assert.equal(bad.valid, false);
});

test('Offline session expiry check respects TTL', async () => {
  const user = await createOfflineUserRecord({
    username: 'op1',
    displayName: 'Operador',
    role: 'operator',
    password: '123',
  });
  const activeSession = buildAuthSession(user, 'Community Offline', 12);
  assert.equal(isSessionExpired(activeSession), false);

  const expiredSession = buildAuthSession(user, 'Community Offline', -1);
  assert.equal(isSessionExpired(expiredSession), true);
});

test('generateAccessKey creates formatted access keys for Aluno, Professor, and Admin', () => {
  const alunoKey = generateAccessKey('operator');
  const profKey = generateAccessKey('engineer');
  const adminKey = generateAccessKey('admin');

  assert.match(alunoKey, /^FCS-ALUNO-[A-Z0-9]{6}$/);
  assert.match(profKey, /^FCS-PROF-[A-Z0-9]{6}$/);
  assert.match(adminKey, /^FCS-ADMIN-[A-Z0-9]{6}$/);
});

test('updateOfflineUserRecord updates admin username and password securely and rejects duplicates/invalid inputs', async () => {
  const admin = await createOfflineUserRecord({
    id: 'usr_admin_default',
    username: 'admin',
    displayName: 'Administrador Local',
    role: 'admin',
    password: 'fluid2026',
  });
  const eng = await createOfflineUserRecord({
    id: 'usr_eng_default',
    username: 'engenheiro',
    displayName: 'Eng. Hidráulico',
    role: 'engineer',
    password: 'eng2026',
  });

  // Duplicate username rejected
  const dup = await updateOfflineUserRecord(admin, [admin, eng], {
    username: 'engenheiro',
    displayName: 'Admin',
  });
  assert.equal(dup.ok, false);

  // Short password rejected
  const shortPw = await updateOfflineUserRecord(admin, [admin, eng], {
    username: 'admin',
    displayName: 'Admin',
    newPassword: '123',
  });
  assert.equal(shortPw.ok, false);

  // Valid username + password update
  const updated = await updateOfflineUserRecord(admin, [admin, eng], {
    username: 'GestorLab',
    displayName: 'Marcos Gestor',
    newPassword: 'novaSenha2026',
  });
  assert.equal(updated.ok, true);
  if (updated.ok) {
    assert.equal(updated.user.username, 'gestorlab');
    assert.equal(updated.user.displayName, 'Marcos Gestor');
    assert.equal(
      await verifyPasswordPBKDF2('novaSenha2026', updated.user.saltHex, updated.user.passwordHashHex),
      true
    );
    assert.equal(
      await verifyPasswordPBKDF2('fluid2026', updated.user.saltHex, updated.user.passwordHashHex),
      false
    );
  }
});

test('Creating Aluno (operator) account and updating operator password authenticate cleanly', async () => {
  const operador = await createOfflineUserRecord({
    id: 'usr_op_default',
    username: 'operador',
    displayName: 'Operador Bancada',
    role: 'operator',
    password: 'op2026',
  });
  const alunoKey = generateAccessKey('operator');
  const aluno = await createOfflineUserRecord({
    username: 'Aluno01 ',
    displayName: 'Aluno Um',
    role: 'operator',
    password: ` ${alunoKey} `,
  });

  // Authenticate newly created Aluno (even with pasted surrounding spaces)
  const authAluno = await authenticateOfflineUser([operador, aluno], 'ALUNO01', ` ${alunoKey} `);
  assert.equal(authAluno.ok, true);
  if (authAluno.ok) {
    assert.equal(authAluno.user.role, 'operator');
  }

  // Update operador password and verify login works with new password & rejects old
  const opEdited = await updateOfflineUserRecord(operador, [operador, aluno], {
    username: 'operador',
    displayName: 'Operador Bancada',
    newPassword: ' novaOp2026 ',
  });
  assert.equal(opEdited.ok, true);
  if (opEdited.ok) {
    const authOpNew = await authenticateOfflineUser([opEdited.user, aluno], 'operador', 'novaOp2026');
    assert.equal(authOpNew.ok, true);

    const authOpOld = await authenticateOfflineUser([opEdited.user, aluno], 'operador', 'op2026');
    assert.equal(authOpOld.ok, false);
  }
});

test('Account expiration date (expiresAt) blocks expired logins and allows renewed/cleared accounts', async () => {
  const expiredAluno = await createOfflineUserRecord({
    username: 'aluno_exp',
    displayName: 'Aluno Expirado',
    role: 'operator',
    password: 'alunoPassword1',
    expiresAt: '2020-01-01',
  });
  assert.equal(expiredAluno.expiresAt, '2020-01-01');
  assert.equal(isOfflineUserExpired(expiredAluno, new Date('2026-06-01T12:00:00Z')), true);

  const authExpired = await authenticateOfflineUser([expiredAluno], 'aluno_exp', 'alunoPassword1');
  assert.equal(authExpired.ok, false);
  if (!authExpired.ok) {
    assert.equal(authExpired.reason, 'expired');
  }

  // Renew expiration to future date -> login succeeds
  const renewedRes = await updateOfflineUserRecord(expiredAluno, [expiredAluno], {
    username: 'aluno_exp',
    displayName: 'Aluno Expirado',
    expiresAt: '2099-12-31',
  });
  assert.equal(renewedRes.ok, true);
  if (renewedRes.ok) {
    assert.equal(isOfflineUserExpired(renewedRes.user, new Date('2026-06-01T12:00:00Z')), false);
    const authRenewed = await authenticateOfflineUser([renewedRes.user], 'aluno_exp', 'alunoPassword1');
    assert.equal(authRenewed.ok, true);

    // Clear expiration -> indefinite access
    const clearedRes = await updateOfflineUserRecord(renewedRes.user, [renewedRes.user], {
      username: 'aluno_exp',
      displayName: 'Aluno Expirado',
      expiresAt: '',
    });
    assert.equal(clearedRes.ok, true);
    if (clearedRes.ok) {
      assert.equal(clearedRes.user.expiresAt, undefined);
      assert.equal(isOfflineUserExpired(clearedRes.user), false);
    }
  }
});

test('updateOfflineUserRecord updates active status atomically and blocks/reactivates authentication', async () => {
  const op = await createOfflineUserRecord({
    id: 'usr_op_status',
    username: 'operador',
    displayName: 'Operador Bancada',
    role: 'operator',
    password: 'op2026',
  });

  const blocked = await updateOfflineUserRecord(op, [op], {
    username: 'operador',
    displayName: 'Operador Bancada',
    role: 'operator',
    active: false,
    expiresAt: '2026-11-18',
  });
  assert.equal(blocked.ok, true);
  if (blocked.ok) {
    assert.equal(blocked.user.active, false);
    assert.equal(blocked.user.expiresAt, '2026-11-18');
    const authBlocked = await authenticateOfflineUser([blocked.user], 'operador', 'op2026');
    assert.equal(authBlocked.ok, false);
    if (!authBlocked.ok) {
      assert.equal(authBlocked.reason, 'inactive');
    }

    const reactivated = await updateOfflineUserRecord(blocked.user, [blocked.user], {
      username: 'operador',
      displayName: 'Operador Bancada',
      role: 'engineer',
      active: true,
      expiresAt: '2099-12-31',
    });
    assert.equal(reactivated.ok, true);
    if (reactivated.ok) {
      assert.equal(reactivated.user.active, true);
      assert.equal(reactivated.user.role, 'engineer');
      const authActive = await authenticateOfflineUser([reactivated.user], 'operador', 'op2026');
      assert.equal(authActive.ok, true);
    }
  }
});

test('Preview share code signs mode/expiry, rejects tampering/expiration, and isolates creation tools to Admin only', () => {
  // Full preview code without expiry
  const fullCode = generatePreviewShareCode({ accessLevel: 'full' });
  assert.match(fullCode, /^MATC-FULL-LIVE-[A-Z0-9]{6}-[0-9A-F]{4}$/);

  const validFull = validatePreviewShareCode(fullCode);
  assert.equal(validFull.valid, true);
  if (validFull.valid) {
    assert.equal(validFull.accessLevel, 'full');
    assert.equal(validFull.expiresAt, undefined);
  }

  // Tampering mode VIEW -> FULL or altering signature fails validation
  const viewCode = generatePreviewShareCode({ accessLevel: 'view', expiresAt: '2099-12-31' });
  assert.match(viewCode, /^MATC-VIEW-20991231-[A-Z0-9]{6}-[0-9A-F]{4}$/);
  const tamperedMode = viewCode.replace('MATC-VIEW-', 'MATC-FULL-');
  const tamperedRes = validatePreviewShareCode(tamperedMode);
  assert.equal(tamperedRes.valid, false);
  if (!tamperedRes.valid) {
    assert.equal(tamperedRes.reason, 'invalid_signature');
  }

  // Expired code fails validation
  const expiredCode = generatePreviewShareCode({ accessLevel: 'full', expiresAt: '2020-05-01' });
  const expiredRes = validatePreviewShareCode(expiredCode, new Date('2026-11-18T12:00:00Z'));
  assert.equal(expiredRes.valid, false);
  if (!expiredRes.valid) {
    assert.equal(expiredRes.reason, 'expired');
  }

  // Permissions isolation: Full preview gets all simulator tools, ZERO admin/creation access
  const fullPreviewSession = buildPreviewShareSession({
    code: fullCode,
    accessLevel: 'full',
    label: 'Turma A',
  });
  assert.notEqual(fullPreviewSession.role, 'admin');
  assert.equal(fullPreviewSession.isPreviewShare, true);

  const fullPreviewPerms = getRolePermissions(fullPreviewSession.role, fullPreviewSession);
  assert.equal(fullPreviewPerms.canEditCircuit, true);
  assert.equal(fullPreviewPerms.canRunSimulation, true);
  assert.equal(fullPreviewPerms.canSaveProjects, true);
  assert.equal(fullPreviewPerms.canExportFiles, true);
  assert.equal(fullPreviewPerms.canManageUsers, false);
  assert.equal(fullPreviewPerms.canViewAuditLog, false);
  assert.equal(fullPreviewPerms.canAccessCreationTools, false);

  // Only genuine admin has creation/admin tools
  const adminPerms = getRolePermissions('admin');
  const engPerms = getRolePermissions('engineer');
  const opPerms = getRolePermissions('operator');
  assert.equal(adminPerms.canAccessCreationTools, true);
  assert.equal(engPerms.canAccessCreationTools, false);
  assert.equal(opPerms.canAccessCreationTools, false);

  // URL resolver preserves the active host and strips existing query/hash params
  const resolved = resolvePreviewBaseUrl(
    'https://ais-dev-hrwgv2jgv5ehjwbexshnub-103644245631.us-east1.run.app/?old=1#foo'
  );
  assert.equal(resolved, 'https://ais-dev-hrwgv2jgv5ehjwbexshnub-103644245631.us-east1.run.app');

  const shareUrl = buildPreviewShareUrl(resolved, fullCode, 'Turma A');
  assert.ok(shareUrl.startsWith('https://ais-dev-hrwgv2jgv5ehjwbexshnub-103644245631.us-east1.run.app/?'));
  assert.ok(shareUrl.includes(`preview=${fullCode}`));
  assert.ok(!shareUrl.includes('skipIntro=1'));

  const extractedFromQuery = extractPreviewParamsFromUrl(shareUrl);
  assert.equal(extractedFromQuery.code, fullCode);
  assert.equal(extractedFromQuery.label, 'Turma A');
  assert.equal(extractedFromQuery.skipIntro, false);

  const extractedExplicitSkip = extractPreviewParamsFromUrl(`${shareUrl}&skipIntro=1`);
  assert.equal(extractedExplicitSkip.code, fullCode);
  assert.equal(extractedExplicitSkip.skipIntro, true);

  const extractedFromHash = extractPreviewParamsFromUrl(
    `https://ais-dev-hrwgv2jgv5ehjwbexshnub-103644245631.us-east1.run.app/#preview=${fullCode}`
  );
  assert.equal(extractedFromHash.code, fullCode);
  assert.equal(extractedFromHash.skipIntro, false);

  const subpathUrl = buildPreviewShareUrl('https://example.com/sim/index.html', fullCode);
  assert.equal(
    subpathUrl,
    `https://example.com/sim/index.html?preview=${fullCode}`
  );

  // Private dev host detection & clean login-required share URL
  assert.equal(
    isPrivateDevHost('https://ais-dev-hrwgv2jgv5ehjwbexshnub-103644245631.us-east1.run.app/?foo=1'),
    true
  );
  assert.equal(isPrivateDevHost('http://localhost:3000/'), true);
  assert.equal(
    isPrivateDevHost('https://fluid-circuit-studio-12345.us-east1.run.app/'),
    false
  );
  assert.equal(
    buildAppLoginShareUrl('https://fluid-circuit-studio-12345.us-east1.run.app/?preview=OLD#hash'),
    'https://fluid-circuit-studio-12345.us-east1.run.app/'
  );
});



