import type { AuthSession, OfflineUser, UserRole } from '../types/circuit';

const PBKDF2_ITERATIONS = 100_000;

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex: string): Uint8Array {
  const clean = hex.trim();
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function generateSaltHex(lengthBytes = 16): string {
  const buf = new Uint8Array(lengthBytes);
  globalThis.crypto.getRandomValues(buf);
  return toHex(buf);
}

export async function hashPasswordPBKDF2(
  password: string,
  saltHex: string
): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await globalThis.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const saltBytes = fromHex(saltHex);
  const bits = await globalThis.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  return toHex(new Uint8Array(bits));
}

export async function verifyPasswordPBKDF2(
  password: string,
  saltHex: string,
  expectedHashHex: string
): Promise<boolean> {
  const computed = await hashPasswordPBKDF2(password, saltHex);
  if (computed.length !== expectedHashHex.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ expectedHashHex.charCodeAt(i);
  }
  return diff === 0;
}

export async function verifyPasswordMatch(
  password: string,
  saltHex: string,
  expectedHashHex: string
): Promise<boolean> {
  if (await verifyPasswordPBKDF2(password, saltHex, expectedHashHex)) {
    return true;
  }
  const trimmed = password.trim();
  if (trimmed && trimmed !== password) {
    return verifyPasswordPBKDF2(trimmed, saltHex, expectedHashHex);
  }
  return false;
}

export function normalizeExpirationDate(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-').map(Number);
    const probe = new Date(y, m - 1, d);
    if (
      probe.getFullYear() === y &&
      probe.getMonth() === m - 1 &&
      probe.getDate() === d
    ) {
      return trimmed;
    }
    return undefined;
  }
  const ms = Date.parse(trimmed);
  return Number.isFinite(ms) ? trimmed : undefined;
}

export function isOfflineUserExpired(
  user: Pick<OfflineUser, 'expiresAt'>,
  now: Date = new Date()
): boolean {
  const raw = user.expiresAt?.trim();
  if (!raw) return false;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split('-').map(Number);
    const endOfDay = new Date(y, m - 1, d, 23, 59, 59, 999);
    return now.getTime() > endOfDay.getTime();
  }
  const parsed = Date.parse(raw);
  if (!Number.isFinite(parsed)) return false;
  return now.getTime() > parsed;
}

export async function createOfflineUserRecord(params: {
  id?: string;
  username: string;
  displayName: string;
  role: UserRole;
  password: string;
  expiresAt?: string;
}): Promise<OfflineUser> {
  const saltHex = generateSaltHex(16);
  const cleanPassword = params.password.trim() || params.password;
  const passwordHashHex = await hashPasswordPBKDF2(cleanPassword, saltHex);
  const expiresAt = normalizeExpirationDate(params.expiresAt);
  return {
    id: params.id ?? `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    username: params.username.trim().toLowerCase(),
    displayName: params.displayName.trim(),
    role: params.role,
    saltHex,
    passwordHashHex,
    active: true,
    createdAt: new Date().toISOString(),
    ...(expiresAt ? { expiresAt } : {}),
  };
}

export async function updateOfflineUserRecord(
  target: OfflineUser,
  existingUsers: OfflineUser[],
  updates: {
    username: string;
    displayName: string;
    role?: UserRole;
    active?: boolean;
    newPassword?: string;
    expiresAt?: string | null;
  }
): Promise<{ ok: true; user: OfflineUser } | { ok: false; error: string }> {
  const cleanUsername = updates.username.trim().toLowerCase();
  const cleanDisplay = updates.displayName.trim();

  if (cleanUsername.length < 3) {
    return { ok: false, error: 'O nome de usuário deve ter pelo menos 3 caracteres.' };
  }
  if (/\s/.test(cleanUsername)) {
    return { ok: false, error: 'O nome de usuário não pode conter espaços.' };
  }
  if (!cleanDisplay) {
    return { ok: false, error: 'Informe o nome de exibição do usuário.' };
  }
  if (
    existingUsers.some(
      (u) => u.id !== target.id && u.username.trim().toLowerCase() === cleanUsername
    )
  ) {
    return { ok: false, error: `O usuário "${cleanUsername}" já está em uso.` };
  }

  let saltHex = target.saltHex;
  let passwordHashHex = target.passwordHashHex;
  const rawNewPassword = updates.newPassword ?? '';
  const cleanNewPassword = rawNewPassword.trim();
  if (rawNewPassword.length > 0) {
    if (cleanNewPassword.length < 4) {
      return { ok: false, error: 'A nova senha deve ter pelo menos 4 caracteres.' };
    }
    saltHex = generateSaltHex(16);
    passwordHashHex = await hashPasswordPBKDF2(cleanNewPassword, saltHex);
  }

  const nextExpiresAt =
    updates.expiresAt === undefined
      ? target.expiresAt
      : normalizeExpirationDate(updates.expiresAt);

  const nextUser: OfflineUser = {
    ...target,
    username: cleanUsername,
    displayName: cleanDisplay,
    role: updates.role ?? target.role,
    active: updates.active ?? target.active,
    saltHex,
    passwordHashHex,
  };
  if (nextExpiresAt) {
    nextUser.expiresAt = nextExpiresAt;
  } else {
    delete nextUser.expiresAt;
  }

  return {
    ok: true,
    user: nextUser,
  };
}

export async function authenticateOfflineUser(
  users: OfflineUser[],
  username: string,
  password: string,
  now: Date = new Date()
): Promise<
  | { ok: true; user: OfflineUser }
  | { ok: false; reason: 'not_found' | 'inactive' | 'expired' | 'invalid_password'; user?: OfflineUser }
> {
  const cleanUser = username.trim().toLowerCase();
  if (!cleanUser || !password.trim()) {
    return { ok: false, reason: 'not_found' };
  }
  const user = users.find((u) => u.username.trim().toLowerCase() === cleanUser);
  if (!user) {
    return { ok: false, reason: 'not_found' };
  }
  if (!user.active) {
    return { ok: false, reason: 'inactive', user };
  }
  if (isOfflineUserExpired(user, now)) {
    return { ok: false, reason: 'expired', user };
  }
  const valid = await verifyPasswordMatch(password, user.saltHex, user.passwordHashHex);
  if (!valid) {
    return { ok: false, reason: 'invalid_password', user };
  }
  return { ok: true, user };
}

export interface RolePermissions {
  canEditCircuit: boolean;
  canRunSimulation: boolean;
  canSaveProjects: boolean;
  canDeleteProjects: boolean;
  canExportFiles: boolean;
  canManageUsers: boolean;
  canViewAuditLog: boolean;
  /** True ONLY for authenticated Admin accounts outside Preview Share mode */
  canAccessCreationTools: boolean;
}

export function getRolePermissions(
  role: UserRole,
  session?: Pick<AuthSession, 'isPreviewShare' | 'previewAccessLevel'> | null
): RolePermissions {
  if (session?.isPreviewShare) {
    const fullPreview = session.previewAccessLevel !== 'view';
    return {
      canEditCircuit: fullPreview,
      canRunSimulation: true,
      canSaveProjects: fullPreview,
      canDeleteProjects: fullPreview,
      canExportFiles: true,
      canManageUsers: false,
      canViewAuditLog: false,
      canAccessCreationTools: false,
    };
  }

  switch (role) {
    case 'admin':
      return {
        canEditCircuit: true,
        canRunSimulation: true,
        canSaveProjects: true,
        canDeleteProjects: true,
        canExportFiles: true,
        canManageUsers: true,
        canViewAuditLog: true,
        canAccessCreationTools: true,
      };
    case 'engineer':
      return {
        canEditCircuit: true,
        canRunSimulation: true,
        canSaveProjects: true,
        canDeleteProjects: true,
        canExportFiles: true,
        canManageUsers: false,
        canViewAuditLog: true,
        canAccessCreationTools: false,
      };
    case 'operator':
      return {
        canEditCircuit: false,
        canRunSimulation: true,
        canSaveProjects: false,
        canDeleteProjects: false,
        canExportFiles: true,
        canManageUsers: false,
        canViewAuditLog: false,
        canAccessCreationTools: false,
      };
  }
}

/**
 * Validates deterministic offline license key format: FCS-PRO-XXXX-XXXX-CC
 * where CC is a 2-hex-digit XOR/sum checksum of the preceding characters.
 */
export function validateOfflineLicenseKey(rawKey: string): {
  valid: boolean;
  tier: 'Community Offline' | 'Industrial Pro';
  reason?: string;
} {
  const key = rawKey.trim().toUpperCase();
  if (!key) {
    return { valid: false, tier: 'Community Offline', reason: 'Chave vazia.' };
  }
  const match = /^FCS-PRO-([A-Z0-9]{4})-([A-Z0-9]{4})-([0-9A-F]{2})$/.exec(key);
  if (!match) {
    return {
      valid: false,
      tier: 'Community Offline',
      reason: 'Formato esperado: FCS-PRO-XXXX-XXXX-CC',
    };
  }
  const payload = `${match[1]}${match[2]}`;
  let sum = 0x5a;
  for (let i = 0; i < payload.length; i++) {
    sum = (sum + payload.charCodeAt(i) * (i + 3)) & 0xff;
  }
  const expectedChecksum = sum.toString(16).padStart(2, '0').toUpperCase();
  if (match[3] !== expectedChecksum) {
    return {
      valid: false,
      tier: 'Community Offline',
      reason: 'Assinatura offline inválida.',
    };
  }
  return { valid: true, tier: 'Industrial Pro' };
}

export function generateSampleProLicenseKey(seed = 'LAB2026A'): string {
  const clean = seed.toUpperCase().replace(/[^A-Z0-9]/g, '').padEnd(8, 'X').slice(0, 8);
  const seg1 = clean.slice(0, 4);
  const seg2 = clean.slice(4, 8);
  let sum = 0x5a;
  for (let i = 0; i < clean.length; i++) {
    sum = (sum + clean.charCodeAt(i) * (i + 3)) & 0xff;
  }
  const checksum = sum.toString(16).padStart(2, '0').toUpperCase();
  return `FCS-PRO-${seg1}-${seg2}-${checksum}`;
}

export function buildAuthSession(
  user: OfflineUser,
  licenseTier: 'Community Offline' | 'Industrial Pro' = 'Community Offline',
  ttlHours = 24
): AuthSession {
  const now = new Date();
  const expires = new Date(now.getTime() + ttlHours * 3600 * 1000);
  return {
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    signedInAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    offlineToken: `off_${generateSaltHex(12)}`,
    licenseTier,
  };
}

export function isSessionExpired(session: AuthSession | null): boolean {
  if (!session) return true;
  return new Date(session.expiresAt).getTime() <= Date.now();
}

export function generateAccessKey(role: UserRole): string {
  const prefix = role === 'operator' ? 'ALUNO' : role === 'engineer' ? 'PROF' : 'ADMIN';
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const buf = new Uint8Array(6);
  globalThis.crypto.getRandomValues(buf);
  let code = '';
  for (let i = 0; i < buf.length; i += 1) {
    code += alphabet[buf[i] % alphabet.length];
  }
  return `FCS-${prefix}-${code}`;
}

const PREVIEW_SHARE_SALT = 'MATC-HIDRAULICA-PREVIEW-ONLY-V1#94C7';

function computePreviewShareSignature(modeTag: string, expTag: string, nonce: string): string {
  const input = `${PREVIEW_SHARE_SALT}|${modeTag}|${expTag}|${nonce}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b1;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 ^= (ch + ((i + 1) * 17)) & 0xff;
    h2 = Math.imul(h2, 0x85ebca6b) >>> 0;
  }
  const mixed = ((h1 ^ (h2 >>> 13) ^ (h1 >>> 16)) & 0xffff) >>> 0;
  return mixed.toString(16).padStart(4, '0').toUpperCase();
}

/**
 * Generates a tamper-evident offline Preview Share code:
 * MATC-<FULL|VIEW>-<LIVE|YYYYMMDD>-<NONCE6>-<SIG4>
 * Always grants preview-only access (never admin or creation environment access).
 */
export function generatePreviewShareCode(options: {
  accessLevel?: 'full' | 'view';
  expiresAt?: string | null;
} = {}): string {
  const modeTag = options.accessLevel === 'view' ? 'VIEW' : 'FULL';
  const normExp = normalizeExpirationDate(options.expiresAt);
  const expTag =
    normExp && /^\d{4}-\d{2}-\d{2}$/.test(normExp) ? normExp.replace(/-/g, '') : 'LIVE';

  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const buf = new Uint8Array(6);
  globalThis.crypto.getRandomValues(buf);
  let nonce = '';
  for (let i = 0; i < buf.length; i += 1) {
    nonce += alphabet[buf[i] % alphabet.length];
  }
  const sig = computePreviewShareSignature(modeTag, expTag, nonce);
  return `MATC-${modeTag}-${expTag}-${nonce}-${sig}`;
}

export type PreviewShareValidationResult =
  | {
      valid: true;
      code: string;
      accessLevel: 'full' | 'view';
      expiresAt?: string;
    }
  | {
      valid: false;
      reason: 'invalid_format' | 'invalid_signature' | 'expired';
      message: string;
    };

export function validatePreviewShareCode(
  rawCode: string,
  now: Date = new Date()
): PreviewShareValidationResult {
  const clean = rawCode.trim().toUpperCase().replace(/\s+/g, '');
  if (!clean) {
    return {
      valid: false,
      reason: 'invalid_format',
      message: 'Informe o código de compartilhamento do Preview.',
    };
  }
  const match = /^MATC-(FULL|VIEW)-(LIVE|\d{8})-([A-Z0-9]{6})-([0-9A-F]{4})$/.exec(clean);
  if (!match) {
    return {
      valid: false,
      reason: 'invalid_format',
      message: 'Formato de código inválido. Esperado: MATC-FULL-LIVE-XXXXXX-XXXX.',
    };
  }

  const [, modeTag, expTag, nonce, providedSig] = match;
  const expectedSig = computePreviewShareSignature(modeTag, expTag, nonce);
  if (providedSig !== expectedSig) {
    return {
      valid: false,
      reason: 'invalid_signature',
      message: 'Código do Preview inválido ou adulterado. Solicite um código válido ao Administrador.',
    };
  }

  let expiresAt: string | undefined;
  if (expTag !== 'LIVE') {
    const formatted = `${expTag.slice(0, 4)}-${expTag.slice(4, 6)}-${expTag.slice(6, 8)}`;
    const normalized = normalizeExpirationDate(formatted);
    if (!normalized) {
      return {
        valid: false,
        reason: 'invalid_format',
        message: 'Data de validade inválida no código do Preview.',
      };
    }
    expiresAt = normalized;
    if (isOfflineUserExpired({ expiresAt }, now)) {
      return {
        valid: false,
        reason: 'expired',
        message: 'Este código do Preview expirou. Solicite um novo link ao Administrador.',
      };
    }
  }

  return {
    valid: true,
    code: clean,
    accessLevel: modeTag === 'VIEW' ? 'view' : 'full',
    ...(expiresAt ? { expiresAt } : {}),
  };
}

export function buildPreviewShareSession(params: {
  code: string;
  accessLevel: 'full' | 'view';
  label?: string;
  expiresAt?: string;
  ttlHours?: number;
}): AuthSession {
  const now = new Date();
  const ttlHours = params.ttlHours ?? 24;
  const expires = new Date(now.getTime() + ttlHours * 3600 * 1000);
  const cleanLabel = params.label?.trim();
  return {
    userId: `preview_${params.code.slice(-11).toLowerCase()}`,
    username: 'preview',
    displayName:
      cleanLabel ||
      (params.accessLevel === 'full' ? 'Preview Completo' : 'Preview Simulação'),
    // Never 'admin': preview sessions are strictly isolated from admin/creation tools
    role: params.accessLevel === 'full' ? 'engineer' : 'operator',
    signedInAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    offlineToken: `prv_${generateSaltHex(12)}`,
    licenseTier: 'Industrial Pro',
    isPreviewShare: true,
    previewShareCode: params.code,
    previewAccessLevel: params.accessLevel,
  };
}

/**
 * Resolves the active base URL of the running application (stripped of query/hash)
 * so generated Preview share links always point to the real active host.
 */
export function resolvePreviewBaseUrl(currentHref?: string): string {
  const fallback =
    typeof window !== 'undefined' && window.location?.href ? window.location.href : '';
  const raw = (currentHref ?? fallback).trim();
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return raw.split('?')[0].split('#')[0].replace(/\/+$/, '');
  }
}

export function isPrivateDevHost(urlOrHref?: string): boolean {
  const raw = (
    urlOrHref ??
    (typeof window !== 'undefined' && window.location?.href ? window.location.href : '')
  ).trim();
  if (!raw) return false;
  try {
    const host = new URL(raw).hostname.toLowerCase();
    return (
      host.startsWith('ais-dev-') ||
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0'
    );
  } catch {
    return false;
  }
}

export function buildAppLoginShareUrl(baseUrl: string): string {
  const cleanBase = resolvePreviewBaseUrl(baseUrl) || baseUrl.trim().replace(/\/+$/, '');
  if (!cleanBase) return '';
  try {
    const parsed = new URL(cleanBase);
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return cleanBase;
  }
}

export function buildPreviewShareUrl(
  baseUrl: string,
  code: string,
  label?: string
): string {
  const cleanBase = resolvePreviewBaseUrl(baseUrl) || baseUrl.trim().replace(/\/+$/, '');
  const cleanCode = code.trim().toUpperCase();
  try {
    const parsed = new URL(cleanBase);
    parsed.searchParams.set('preview', cleanCode);
    if (label && label.trim()) {
      parsed.searchParams.set('label', label.trim().slice(0, 48));
    }
    return parsed.toString();
  } catch {
    const params = new URLSearchParams();
    params.set('preview', cleanCode);
    if (label && label.trim()) {
      params.set('label', label.trim().slice(0, 48));
    }
    return `${cleanBase}/?${params.toString()}`;
  }
}

export function extractPreviewParamsFromUrl(href?: string): {
  code: string;
  label?: string;
  skipIntro: boolean;
} {
  const raw = (
    href ?? (typeof window !== 'undefined' && window.location?.href ? window.location.href : '')
  ).trim();
  if (!raw) {
    return { code: '', skipIntro: false };
  }
  try {
    const parsed = new URL(raw);
    const searchCode = (
      parsed.searchParams.get('preview') ??
      parsed.searchParams.get('code') ??
      ''
    ).trim();
    const searchLabel = parsed.searchParams.get('label')?.trim() || undefined;
    const searchSkip = parsed.searchParams.get('skipIntro') === '1';

    if (searchCode) {
      return { code: searchCode, label: searchLabel, skipIntro: searchSkip };
    }

    const hashRaw = parsed.hash.replace(/^#/, '').replace(/^\?/, '');
    if (hashRaw) {
      const hashParams = new URLSearchParams(hashRaw);
      const hashCode = (
        hashParams.get('preview') ??
        hashParams.get('code') ??
        ''
      ).trim();
      const hashLabel = hashParams.get('label')?.trim() || undefined;
      const hashSkip = hashParams.get('skipIntro') === '1';
      if (hashCode) {
        return { code: hashCode, label: hashLabel, skipIntro: hashSkip || searchSkip };
      }
    }

    return { code: '', skipIntro: searchSkip };
  } catch {
    return { code: '', skipIntro: false };
  }
}

