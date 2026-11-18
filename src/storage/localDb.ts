import { PRESET_PROJECTS } from '../data/presets';
import { createOfflineUserRecord } from '../security/offlineAuth';
import type {
  AuditLogEntry,
  AuthSession,
  CircuitProject,
  OfflineUser,
  PreviewShareRecord,
} from '../types/circuit';

const DB_NAME = 'fluid_circuit_studio_db';
const DB_VERSION = 1;

const STORE_PROJECTS = 'projects';
const STORE_USERS = 'users';
const STORE_AUDIT = 'auditLogs';
const STORE_META = 'meta';

const SESSION_KEY = 'fcs_offline_session_v1';
const LICENSE_KEY = 'fcs_offline_license_v1';
const DRAFT_KEY = 'fcs_autosave_draft_v1';
const PREVIEW_SHARES_KEY = 'fcs_preview_share_codes_v1';

interface ElectronDesktopBridge {
  isElectron: boolean;
  platform: string;
  appVersion: string;
  syncVault?: (payload: {
    projects: CircuitProject[];
    auditLogs: AuditLogEntry[];
  }) => Promise<boolean>;
  exportProjectFile?: (filename: string, content: string) => Promise<boolean>;
}

declare global {
  interface Window {
    fluidDesktop?: ElectronDesktopBridge;
  }
}

export function isElectronRuntime(): boolean {
  return typeof window !== 'undefined' && Boolean(window.fluidDesktop?.isElectron);
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB indisponível neste ambiente.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_USERS)) {
        db.createObjectStore(STORE_USERS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_AUDIT)) {
        db.createObjectStore(STORE_AUDIT, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Falha ao abrir IndexedDB.'));
  });
}

async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as T[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

async function putInStore<T>(storeName: string, value: T): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteFromStore(storeName: string, key: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

let seedPromise: Promise<void> | null = null;

export async function ensureLocalDatabaseSeeded(): Promise<void> {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    try {
      const existingUsers = await getAllFromStore<OfflineUser>(STORE_USERS);
      if (existingUsers.length === 0) {
        const admin = await createOfflineUserRecord({
          id: 'usr_admin_default',
          username: 'admin',
          displayName: 'Administrador Local',
          role: 'admin',
          password: 'fluid2026',
        });
        const engineer = await createOfflineUserRecord({
          id: 'usr_eng_default',
          username: 'engenheiro',
          displayName: 'Eng. Hidráulico',
          role: 'engineer',
          password: 'eng2026',
        });
        const operator = await createOfflineUserRecord({
          id: 'usr_op_default',
          username: 'operador',
          displayName: 'Operador Bancada',
          role: 'operator',
          password: 'op2026',
        });
        await putInStore(STORE_USERS, admin);
        await putInStore(STORE_USERS, engineer);
        await putInStore(STORE_USERS, operator);
      }

      const existingProjects = await getAllFromStore<CircuitProject>(STORE_PROJECTS);
      if (existingProjects.length === 0) {
        for (const preset of PRESET_PROJECTS) {
          await putInStore(STORE_PROJECTS, preset);
        }
      }
    } catch (err) {
      seedPromise = null;
      throw err;
    }
  })();
  return seedPromise;
}

export async function listProjects(): Promise<CircuitProject[]> {
  await ensureLocalDatabaseSeeded();
  const list = await getAllFromStore<CircuitProject>(STORE_PROJECTS);
  return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveProject(project: CircuitProject): Promise<CircuitProject> {
  await ensureLocalDatabaseSeeded();
  const updated: CircuitProject = {
    ...project,
    updatedAt: new Date().toISOString(),
  };
  await putInStore(STORE_PROJECTS, updated);
  await syncElectronVaultIfAvailable();
  return updated;
}

export async function removeProject(projectId: string): Promise<void> {
  await deleteFromStore(STORE_PROJECTS, projectId);
  await syncElectronVaultIfAvailable();
}

const ADMIN_TOKEN_KEY = 'fcs_admin_api_token_v1';
const PUBLIC_URL_KEY = 'fcs_public_app_url_v1';

export function getAdminApiToken(): string {
  try {
    return sessionStorage.getItem(ADMIN_TOKEN_KEY) ?? '';
  } catch {
    return '';
  }
}

export function setAdminApiToken(token: string | null | undefined): void {
  try {
    if (!token) {
      sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    } else {
      sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
    }
  } catch {
    // Ignore storage restriction
  }
}

export function clearAdminApiToken(): void {
  const token = getAdminApiToken();
  setAdminApiToken(null);
  if (token && canUseServerApi()) {
    void fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'X-Admin-Token': token },
    }).catch(() => undefined);
  }
}

function canUseServerApi(): boolean {
  if (isElectronRuntime()) return false;
  if (typeof window === 'undefined' || typeof fetch === 'undefined') return false;
  return window.location.protocol === 'http:' || window.location.protocol === 'https:';
}

export type ServerLoginResult =
  | {
      reachable: true;
      ok: true;
      user: Pick<
        OfflineUser,
        'id' | 'username' | 'displayName' | 'role' | 'active' | 'createdAt' | 'expiresAt' | 'lastLoginAt'
      >;
      adminToken?: string;
    }
  | {
      reachable: true;
      ok: false;
      reason: 'not_found' | 'inactive' | 'expired' | 'invalid_password' | 'invalid_input';
      user?: Partial<OfflineUser>;
    }
  | { reachable: false };

export async function authenticateOnServer(
  username: string,
  password: string
): Promise<ServerLoginResult> {
  if (!canUseServerApi()) return { reachable: false };
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return { reachable: false };
    }
    const data = await res.json();
    if (data && data.ok === true && data.user) {
      if (typeof data.adminToken === 'string' && data.adminToken) {
        setAdminApiToken(data.adminToken);
      } else {
        setAdminApiToken(null);
      }
      return {
        reachable: true,
        ok: true,
        user: data.user,
        adminToken: data.adminToken,
      };
    }
    if (data && data.ok === false && typeof data.reason === 'string') {
      return {
        reachable: true,
        ok: false,
        reason: data.reason,
        user: data.user,
      };
    }
    return { reachable: false };
  } catch {
    return { reachable: false };
  }
}

export async function loadPublicAppUrl(): Promise<string> {
  let local = '';
  try {
    local = localStorage.getItem(PUBLIC_URL_KEY) ?? '';
  } catch {
    local = '';
  }
  if (!canUseServerApi()) return local;
  try {
    const res = await fetch('/api/config/public-url');
    if (res.ok) {
      const data = await res.json();
      if (typeof data?.publicAppUrl === 'string' && data.publicAppUrl.trim()) {
        try {
          localStorage.setItem(PUBLIC_URL_KEY, data.publicAppUrl.trim());
        } catch {
          // Ignore
        }
        return data.publicAppUrl.trim();
      }
    }
  } catch {
    // Fallback to localStorage
  }
  return local;
}

export async function savePublicAppUrl(url: string): Promise<{ ok: boolean; url: string; error?: string }> {
  const clean = url.trim().replace(/\/+$/, '');
  if (clean) {
    try {
      const parsed = new URL(clean);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { ok: false, url: '', error: 'Informe uma URL válida começando com https://' };
      }
    } catch {
      return { ok: false, url: '', error: 'Informe uma URL válida começando com https://' };
    }
  }
  try {
    if (clean) {
      localStorage.setItem(PUBLIC_URL_KEY, clean);
    } else {
      localStorage.removeItem(PUBLIC_URL_KEY);
    }
  } catch {
    // Ignore
  }
  const token = getAdminApiToken();
  if (canUseServerApi() && token) {
    try {
      const res = await fetch('/api/admin/public-url', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': token,
        },
        body: JSON.stringify({ publicAppUrl: clean }),
      });
      if (res.ok) {
        const data = await res.json();
        return { ok: true, url: typeof data?.publicAppUrl === 'string' ? data.publicAppUrl : clean };
      }
    } catch {
      // Keep local save
    }
  }
  return { ok: true, url: clean };
}

export interface ExclusiveShareLinkItem {
  codigo: string;
  conteudo: string;
  link: string;
  validade?: string;
  criado?: string;
  expiracao: string | null;
}

export async function generateExclusiveShareLink(params?: {
  conteudo?: string;
  rotacionar?: boolean;
}): Promise<
  | { ok: true; item: ExclusiveShareLinkItem }
  | { ok: false; error: string }
> {
  if (!canUseServerApi()) {
    return {
      ok: false,
      error: 'A geração do link requer o aplicativo em modo servidor web.',
    };
  }
  const token = getAdminApiToken();
  if (!token) {
    return {
      ok: false,
      error: 'Faça login novamente como Administrador para acessar o link.',
    };
  }
  try {
    const res = await fetch('/gerar-link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': token,
      },
      body: JSON.stringify({
        conteudo: params?.conteudo,
        rotacionar: Boolean(params?.rotacionar),
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.sucesso || !data?.link) {
      return {
        ok: false,
        error: data?.erro || data?.error || 'Não foi possível obter o link único.',
      };
    }
    return {
      ok: true,
      item: {
        codigo: String(data.codigo || ''),
        conteudo: params?.conteudo ?? '',
        link: String(data.link),
        validade: String(data.validade || 'Permanente (sem vencimento)'),
        expiracao: null,
      },
    };
  } catch {
    return {
      ok: false,
      error: 'Servidor indisponível para obter o link único.',
    };
  }
}

export async function listExclusiveShareLinks(): Promise<ExclusiveShareLinkItem[]> {
  const token = getAdminApiToken();
  if (!canUseServerApi() || !token) return [];
  try {
    const res = await fetch('/api/admin/compartilhamentos', {
      headers: { 'X-Admin-Token': token },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.compartilhamentos)
      ? (data.compartilhamentos as ExclusiveShareLinkItem[])
      : [];
  } catch {
    return [];
  }
}

export async function listUsers(): Promise<OfflineUser[]> {
  await ensureLocalDatabaseSeeded();
  const token = getAdminApiToken();
  if (canUseServerApi() && token) {
    try {
      const res = await fetch('/api/admin/users', {
        headers: { 'X-Admin-Token': token },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.users) && data.users.length > 0) {
          const remoteUsers = data.users as OfflineUser[];
          for (const u of remoteUsers) {
            await putInStore(STORE_USERS, u);
          }
          return remoteUsers.sort((a, b) => a.username.localeCompare(b.username));
        }
      }
    } catch {
      // Fall back to local IndexedDB when offline
    }
  }
  const users = await getAllFromStore<OfflineUser>(STORE_USERS);
  return users.sort((a, b) => a.username.localeCompare(b.username));
}

export async function saveUser(user: OfflineUser): Promise<void> {
  await ensureLocalDatabaseSeeded();
  const normalized: OfflineUser = {
    ...user,
    username: user.username.trim().toLowerCase(),
    displayName: user.displayName.trim(),
  };
  await putInStore(STORE_USERS, normalized);

  const token = getAdminApiToken();
  if (canUseServerApi() && token) {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': token,
        },
        body: JSON.stringify({ user: normalized }),
      });
      if (!res.ok && res.status === 409) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || 'Usuário já cadastrado no servidor.');
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('cadastrado')) {
        throw err;
      }
      // Keep local IndexedDB write when offline
    }
  }
}

export async function findUserByUsername(
  username: string
): Promise<OfflineUser | undefined> {
  const users = await listUsers();
  const norm = username.trim().toLowerCase();
  return users.find((u) => u.username.trim().toLowerCase() === norm);
}

export async function listAuditLogs(): Promise<AuditLogEntry[]> {
  const token = getAdminApiToken();
  if (canUseServerApi() && token) {
    try {
      const res = await fetch('/api/admin/audit', {
        headers: { 'X-Admin-Token': token },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.logs)) {
          return (data.logs as AuditLogEntry[]).slice(0, 120);
        }
      }
    } catch {
      // Fall back to local IndexedDB
    }
  }
  const logs = await getAllFromStore<AuditLogEntry>(STORE_AUDIT);
  return logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 120);
}

export async function appendAuditLog(
  entry: Omit<AuditLogEntry, 'id' | 'timestamp'>
): Promise<AuditLogEntry> {
  const full: AuditLogEntry = {
    ...entry,
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
  };
  await putInStore(STORE_AUDIT, full);
  if (canUseServerApi()) {
    void fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    }).catch(() => undefined);
  }
  void syncElectronVaultIfAvailable();
  return full;
}

async function syncElectronVaultIfAvailable(): Promise<void> {
  if (!window.fluidDesktop?.syncVault) return;
  try {
    const [projects, auditLogs] = await Promise.all([
      getAllFromStore<CircuitProject>(STORE_PROJECTS),
      getAllFromStore<AuditLogEntry>(STORE_AUDIT),
    ]);
    await window.fluidDesktop.syncVault({ projects, auditLogs });
  } catch {
    // Non-blocking desktop mirror sync
  }
}

export function loadStoredSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function saveStoredSession(session: AuthSession | null): void {
  try {
    if (!session) {
      localStorage.removeItem(SESSION_KEY);
    } else {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  } catch {
    // Ignore storage quota exceptions
  }
}

export function loadLicenseTier(): 'Community Offline' | 'Industrial Pro' {
  return 'Industrial Pro';
}

export function saveLicenseTier(tier: 'Community Offline' | 'Industrial Pro'): void {
  try {
    localStorage.setItem(LICENSE_KEY, tier);
  } catch {
    // Ignore
  }
}

export function saveAutosaveDraft(project: CircuitProject): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(project));
  } catch {
    // Ignore
  }
}

export function loadAutosaveDraft(): CircuitProject | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CircuitProject;
  } catch {
    return null;
  }
}

export function loadPreviewShareCodes(): PreviewShareRecord[] {
  try {
    const raw = localStorage.getItem(PREVIEW_SHARES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PreviewShareRecord[]) : [];
  } catch {
    return [];
  }
}

export function savePreviewShareCodes(records: PreviewShareRecord[]): void {
  try {
    localStorage.setItem(PREVIEW_SHARES_KEY, JSON.stringify(records));
  } catch {
    // Ignore storage quota exceptions
  }
}

export function isPreviewShareCodeRevoked(code: string): boolean {
  const norm = code.trim().toUpperCase();
  if (!norm) return false;
  return loadPreviewShareCodes().some(
    (item) => item.code.trim().toUpperCase() === norm && item.revoked
  );
}
