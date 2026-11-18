import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { Request, Response } from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const PBKDF2_ITERATIONS = 100_000;
const DATA_DIR = path.resolve(__dirname, '.data');
const STORE_PATH = path.join(DATA_DIR, 'auth-store.json');

type UserRole = 'admin' | 'engineer' | 'operator';

interface StoredUser {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  saltHex: string;
  passwordHashHex: string;
  active: boolean;
  createdAt: string;
  expiresAt?: string;
  lastLoginAt?: string;
}

interface StoredAuditLog {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  action: string;
  detail: string;
}

interface SharedAccessEntry {
  codigo: string;
  conteudo: string;
  criado: number;
  expiracao: number | null;
  criadoPor?: string;
}

interface AuthStoreData {
  users: StoredUser[];
  auditLogs: StoredAuditLog[];
  publicAppUrl: string;
  permanentLink: SharedAccessEntry;
  compartilhamentos: SharedAccessEntry[];
}

function hashPasswordSync(password: string, saltHex: string): string {
  const saltBuf = Buffer.from(saltHex.trim(), 'hex');
  return crypto
    .pbkdf2Sync(password, saltBuf, PBKDF2_ITERATIONS, 32, 'sha256')
    .toString('hex');
}

function verifyPasswordSync(
  password: string,
  saltHex: string,
  expectedHashHex: string
): boolean {
  const check = (candidate: string): boolean => {
    const computed = hashPasswordSync(candidate, saltHex);
    if (computed.length !== expectedHashHex.length) return false;
    return crypto.timingSafeEqual(
      Buffer.from(computed, 'utf8'),
      Buffer.from(expectedHashHex, 'utf8')
    );
  };
  if (check(password)) return true;
  const trimmed = password.trim();
  if (trimmed && trimmed !== password) {
    return check(trimmed);
  }
  return false;
}

function isUserExpired(expiresAt?: string): boolean {
  const raw = expiresAt?.trim();
  if (!raw) return false;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split('-').map(Number);
    const endOfDay = new Date(y, m - 1, d, 23, 59, 59, 999);
    return Date.now() > endOfDay.getTime();
  }
  const parsed = Date.parse(raw);
  if (!Number.isFinite(parsed)) return false;
  return Date.now() > parsed;
}

function buildDefaultUser(params: {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  password: string;
}): StoredUser {
  const saltHex = crypto.randomBytes(16).toString('hex');
  return {
    id: params.id,
    username: params.username.trim().toLowerCase(),
    displayName: params.displayName.trim(),
    role: params.role,
    saltHex,
    passwordHashHex: hashPasswordSync(params.password, saltHex),
    active: true,
    createdAt: new Date().toISOString(),
  };
}

function createPermanentLink(conteudo?: string, criadoPor = 'admin'): SharedAccessEntry {
  return {
    codigo: crypto.randomBytes(16).toString('hex'),
    conteudo:
      (conteudo && conteudo.trim()) ||
      'Acesso permanente ao Fluid Circuit Studio (MATC Hidráulica / Neumática).',
    criado: Date.now(),
    expiracao: null,
    criadoPor,
  };
}

function createInitialStore(): AuthStoreData {
  const permanentLink = createPermanentLink();
  return {
    users: [
      buildDefaultUser({
        id: 'usr_admin_default',
        username: 'admin',
        displayName: 'Administrador Local',
        role: 'admin',
        password: 'fluid2026',
      }),
      buildDefaultUser({
        id: 'usr_eng_default',
        username: 'engenheiro',
        displayName: 'Eng. Hidráulico',
        role: 'engineer',
        password: 'eng2026',
      }),
      buildDefaultUser({
        id: 'usr_op_default',
        username: 'operador',
        displayName: 'Operador Bancada',
        role: 'operator',
        password: 'op2026',
      }),
    ],
    auditLogs: [],
    publicAppUrl: '',
    permanentLink,
    compartilhamentos: [permanentLink],
  };
}

function loadStoreFromDisk(): AuthStoreData {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf8');
      const parsed = JSON.parse(raw) as Partial<AuthStoreData>;
      if (Array.isArray(parsed.users) && parsed.users.length > 0) {
        const existingPermanent =
          parsed.permanentLink && typeof parsed.permanentLink.codigo === 'string'
            ? { ...parsed.permanentLink, expiracao: null }
            : createPermanentLink();
        const loaded: AuthStoreData = {
          users: parsed.users,
          auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
          publicAppUrl: typeof parsed.publicAppUrl === 'string' ? parsed.publicAppUrl : '',
          permanentLink: existingPermanent,
          compartilhamentos: [existingPermanent],
        };
        if (!parsed.permanentLink) {
          persistStoreToDisk(loaded);
        }
        return loaded;
      }
    }
  } catch (err) {
    console.warn('[auth-store] Falha ao ler persistência em disco, recriando seed inicial:', err);
  }
  const initial = createInitialStore();
  persistStoreToDisk(initial);
  return initial;
}

function persistStoreToDisk(data: AuthStoreData): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.warn('[auth-store] Não foi possível salvar em disco (usando memória):', err);
  }
}

const store: AuthStoreData = loadStoreFromDisk();

// Banco de compartilhamento único e permanente (/gerar-link -> /acesso/:codigo)
const compartilhamentos = new Map<string, SharedAccessEntry>();
compartilhamentos.set(store.permanentLink.codigo, store.permanentLink);

function syncCompartilhamentosToDisk(): void {
  compartilhamentos.clear();
  compartilhamentos.set(store.permanentLink.codigo, store.permanentLink);
  store.compartilhamentos = [store.permanentLink];
  persistStoreToDisk(store);
}

function resolveShareBaseUrl(req: Request): string {
  if (store.publicAppUrl) {
    return store.publicAppUrl.replace(/\/+$/, '');
  }
  const forwardedProto = (req.header('x-forwarded-proto') || '').split(',')[0]?.trim();
  const forwardedHost = (req.header('x-forwarded-host') || '').split(',')[0]?.trim();
  const proto = forwardedProto || req.protocol || 'https';
  const host = forwardedHost || req.get('host') || '';
  if (host) {
    return `${proto}://${host}`.replace(/\/+$/, '');
  }
  if (process.env.APP_URL) {
    return process.env.APP_URL.trim().replace(/\/+$/, '');
  }
  return `http://localhost:${PORT}`;
}

// Active admin API tokens (token -> { userId, expiresAtMs })
const adminTokens = new Map<string, { userId: string; expiresAtMs: number }>();

function issueAdminToken(userId: string): string {
  const token = `adm_${crypto.randomBytes(24).toString('hex')}`;
  adminTokens.set(token, {
    userId,
    expiresAtMs: Date.now() + 24 * 60 * 60 * 1000,
  });
  return token;
}

function requireAdminToken(req: Request, res: Response): { userId: string } | null {
  const headerToken = (req.header('x-admin-token') || '').trim();
  if (!headerToken) {
    res.status(401).json({ error: 'Token de administrador obrigatório.' });
    return null;
  }
  const record = adminTokens.get(headerToken);
  if (!record || Date.now() > record.expiresAtMs) {
    if (record) adminTokens.delete(headerToken);
    res.status(401).json({ error: 'Sessão de administrador expirada. Faça login novamente.' });
    return null;
  }
  const user = store.users.find((u) => u.id === record.userId);
  if (!user || !user.active || user.role !== 'admin' || isUserExpired(user.expiresAt)) {
    adminTokens.delete(headerToken);
    res.status(403).json({ error: 'Permissão restrita ao Administrador.' });
    return null;
  }
  return { userId: user.id };
}

function pushAuditLog(entry: Omit<StoredAuditLog, 'id' | 'timestamp'>): StoredAuditLog {
  const full: StoredAuditLog = {
    id: `log_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    timestamp: new Date().toISOString(),
    userId: String(entry.userId || 'unknown').slice(0, 80),
    username: String(entry.username || 'unknown').slice(0, 80),
    action: String(entry.action || 'LOGIN_SUCCESS').slice(0, 60),
    detail: String(entry.detail || '').slice(0, 400),
  };
  store.auditLogs = [full, ...store.auditLogs].slice(0, 200);
  persistStoreToDisk(store);
  return full;
}

function sanitizePublicAppUrl(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return '';
  }
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/config/public-url', (_req, res) => {
    res.json({ publicAppUrl: store.publicAppUrl });
  });

  app.post('/api/auth/login', (req, res) => {
    const rawUsername = typeof req.body?.username === 'string' ? req.body.username : '';
    const rawPassword = typeof req.body?.password === 'string' ? req.body.password : '';
    const cleanUser = rawUsername.trim().toLowerCase();

    if (!cleanUser || !rawPassword.trim()) {
      res.status(400).json({ ok: false, reason: 'invalid_input' });
      return;
    }

    const user = store.users.find((u) => u.username.trim().toLowerCase() === cleanUser);
    if (!user) {
      pushAuditLog({
        userId: 'unknown',
        username: cleanUser,
        action: 'LOGIN_FAILED',
        detail: 'Usuário não encontrado.',
      });
      res.json({ ok: false, reason: 'not_found' });
      return;
    }

    if (!user.active) {
      pushAuditLog({
        userId: user.id,
        username: user.username,
        action: 'LOGIN_FAILED',
        detail: 'Conta desativada pelo administrador.',
      });
      res.json({
        ok: false,
        reason: 'inactive',
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          role: user.role,
          active: user.active,
          expiresAt: user.expiresAt,
        },
      });
      return;
    }

    if (isUserExpired(user.expiresAt)) {
      pushAuditLog({
        userId: user.id,
        username: user.username,
        action: 'LOGIN_FAILED',
        detail: `Conta expirada em ${user.expiresAt ?? 'data anterior'}.`,
      });
      res.json({
        ok: false,
        reason: 'expired',
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          role: user.role,
          active: user.active,
          expiresAt: user.expiresAt,
        },
      });
      return;
    }

    const matched = verifyPasswordSync(rawPassword, user.saltHex, user.passwordHashHex);
    if (!matched) {
      pushAuditLog({
        userId: user.id,
        username: user.username,
        action: 'LOGIN_FAILED',
        detail: 'Chave de acesso incorreta.',
      });
      res.json({ ok: false, reason: 'invalid_password' });
      return;
    }

    user.lastLoginAt = new Date().toISOString();
    persistStoreToDisk(store);

    pushAuditLog({
      userId: user.id,
      username: user.username,
      action: 'LOGIN_SUCCESS',
      detail: `Acesso concedido (${user.role}) em Web App.`,
    });

    const adminToken = user.role === 'admin' ? issueAdminToken(user.id) : undefined;
    res.json({
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        active: user.active,
        createdAt: user.createdAt,
        expiresAt: user.expiresAt,
        lastLoginAt: user.lastLoginAt,
      },
      adminToken,
    });
  });

  app.post('/api/auth/logout', (req, res) => {
    const headerToken = (req.header('x-admin-token') || '').trim();
    if (headerToken) {
      adminTokens.delete(headerToken);
    }
    res.json({ ok: true });
  });

  app.get('/api/admin/users', (req, res) => {
    if (!requireAdminToken(req, res)) return;
    const sorted = [...store.users].sort((a, b) => a.username.localeCompare(b.username));
    res.json({ users: sorted });
  });

  app.put('/api/admin/users', (req, res) => {
    if (!requireAdminToken(req, res)) return;
    const incoming = req.body?.user as Partial<StoredUser> | undefined;
    if (
      !incoming ||
      typeof incoming.id !== 'string' ||
      typeof incoming.username !== 'string' ||
      typeof incoming.displayName !== 'string' ||
      typeof incoming.saltHex !== 'string' ||
      typeof incoming.passwordHashHex !== 'string'
    ) {
      res.status(400).json({ error: 'Dados da conta inválidos.' });
      return;
    }

    const cleanUsername = incoming.username.trim().toLowerCase();
    const role: UserRole =
      incoming.role === 'admin' || incoming.role === 'engineer' || incoming.role === 'operator'
        ? incoming.role
        : 'operator';

    const duplicate = store.users.find(
      (u) => u.id !== incoming.id && u.username.trim().toLowerCase() === cleanUsername
    );
    if (duplicate) {
      res.status(409).json({ error: `O usuário "${cleanUsername}" já está cadastrado.` });
      return;
    }

    const normalized: StoredUser = {
      id: incoming.id,
      username: cleanUsername,
      displayName: incoming.displayName.trim(),
      role,
      saltHex: incoming.saltHex.trim(),
      passwordHashHex: incoming.passwordHashHex.trim(),
      active: Boolean(incoming.active),
      createdAt:
        typeof incoming.createdAt === 'string' && incoming.createdAt
          ? incoming.createdAt
          : new Date().toISOString(),
      expiresAt:
        typeof incoming.expiresAt === 'string' && incoming.expiresAt.trim()
          ? incoming.expiresAt.trim()
          : undefined,
      lastLoginAt:
        typeof incoming.lastLoginAt === 'string' && incoming.lastLoginAt
          ? incoming.lastLoginAt
          : undefined,
    };

    const idx = store.users.findIndex((u) => u.id === normalized.id);
    if (idx >= 0) {
      store.users[idx] = normalized;
    } else {
      store.users.push(normalized);
    }
    persistStoreToDisk(store);
    res.json({ ok: true, user: normalized });
  });

  app.get('/api/admin/audit', (req, res) => {
    if (!requireAdminToken(req, res)) return;
    res.json({ logs: store.auditLogs.slice(0, 120) });
  });

  app.post('/api/audit', (req, res) => {
    const entry = req.body as Partial<StoredAuditLog> | undefined;
    if (!entry || typeof entry.action !== 'string') {
      res.status(400).json({ error: 'Registro de auditoria inválido.' });
      return;
    }
    const created = pushAuditLog({
      userId: typeof entry.userId === 'string' ? entry.userId : 'unknown',
      username: typeof entry.username === 'string' ? entry.username : 'unknown',
      action: entry.action,
      detail: typeof entry.detail === 'string' ? entry.detail : '',
    });
    res.json({ ok: true, entry: created });
  });

  app.put('/api/admin/public-url', (req, res) => {
    if (!requireAdminToken(req, res)) return;
    const raw = req.body?.publicAppUrl;
    if (typeof raw === 'string' && raw.trim() === '') {
      store.publicAppUrl = '';
      persistStoreToDisk(store);
      res.json({ ok: true, publicAppUrl: '' });
      return;
    }
    const clean = sanitizePublicAppUrl(raw);
    if (!clean) {
      res.status(400).json({ error: 'Informe uma URL válida começando com https://' });
      return;
    }
    store.publicAppUrl = clean;
    persistStoreToDisk(store);
    res.json({ ok: true, publicAppUrl: clean });
  });

  // Obter ou rotacionar o link único permanente do app (restrito ao Administrador, sem vencimento)
  const handleGenerateShareLink = (req: Request, res: Response): void => {
    const admin = requireAdminToken(req, res);
    if (!admin) return;

    const rotacionar = Boolean(req.body?.rotacionar);
    const rawConteudo = typeof req.body?.conteudo === 'string' ? req.body.conteudo.trim() : '';
    const adminUser = store.users.find((u) => u.id === admin.userId);

    if (rotacionar || !store.permanentLink?.codigo) {
      store.permanentLink = createPermanentLink(
        rawConteudo || store.permanentLink?.conteudo,
        adminUser?.username ?? 'admin'
      );
      syncCompartilhamentosToDisk();
      pushAuditLog({
        userId: admin.userId,
        username: adminUser?.username ?? 'admin',
        action: 'PREVIEW_SHARE_CREATED',
        detail: `Link único permanente atualizado (/acesso/${store.permanentLink.codigo.slice(0, 8)}...).`,
      });
    } else if (rawConteudo && rawConteudo !== store.permanentLink.conteudo) {
      store.permanentLink.conteudo = rawConteudo.slice(0, 2000);
      syncCompartilhamentosToDisk();
    }

    const baseUrl = resolveShareBaseUrl(req);
    const link = `${baseUrl}/acesso/${store.permanentLink.codigo}`;

    res.json({
      sucesso: true,
      codigo: store.permanentLink.codigo,
      link,
      validade: 'Permanente (sem vencimento)',
      expiracao: null,
    });
  };

  app.post('/gerar-link', handleGenerateShareLink);
  app.post('/api/gerar-link', handleGenerateShareLink);

  app.get('/api/admin/compartilhamentos', (req, res) => {
    if (!requireAdminToken(req, res)) return;
    const baseUrl = resolveShareBaseUrl(req);
    const entry = store.permanentLink;
    res.json({
      compartilhamentos: [
        {
          codigo: entry.codigo,
          conteudo: entry.conteudo,
          criado: new Date(entry.criado).toISOString(),
          expiracao: null,
          validade: 'Permanente (sem vencimento)',
          link: `${baseUrl}/acesso/${entry.codigo}`,
        },
      ],
    });
  });

  // Acessar o aplicativo diretamente pelo link único permanente (apresentação + login)
  app.get('/acesso/:codigo', (req, res) => {
    const codigo = String(req.params.codigo || '').trim();
    const dados = compartilhamentos.get(codigo);

    if (!dados || codigo !== store.permanentLink.codigo) {
      res.status(404).send(`<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Link inválido · MATC</title>
  <link rel="icon" type="image/png" href="/app-logo.png" />
</head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#020617;color:#f8fafc;font-family:'Plus Jakarta Sans',Arial,sans-serif;padding:24px;">
  <main style="max-width:440px;width:100%;background:#0f172a;border:1px solid #1e293b;border-radius:16px;padding:28px;text-align:center;">
    <img src="/app-logo.png" alt="Fluid Circuit Studio" style="width:64px;height:64px;border-radius:14px;object-fit:contain;margin-bottom:14px;" />
    <h1 style="margin:0 0 8px;font-size:18px;color:#f8fafc;">Link inválido.</h1>
    <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.5;">
      Este link de acesso não é válido. Solicite o link oficial ao Administrador.
    </p>
  </main>
</body>
</html>`);
      return;
    }

    res.redirect(302, `/?acesso=${encodeURIComponent(dados.codigo)}`);
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Fluid Circuit Studio] Server running on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
