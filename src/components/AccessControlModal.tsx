import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Pencil,
  RefreshCw,
  Share2,
  ShieldCheck,
  UserCog,
  UserPlus,
  X,
} from 'lucide-react';
import {
  createOfflineUserRecord,
  generateAccessKey,
  getRolePermissions,
  isOfflineUserExpired,
  normalizeExpirationDate,
  updateOfflineUserRecord,
} from '../security/offlineAuth';
import {
  appendAuditLog,
  listAuditLogs,
  listUsers,
  saveUser,
} from '../storage/localDb';
import type { AuditLogEntry, AuthSession, OfflineUser, UserRole } from '../types/circuit';

interface AccessControlModalProps {
  open: boolean;
  session: AuthSession;
  onClose: () => void;
  onSessionUpdated?: (updatedUser: OfflineUser) => void;
  onLicenseUpdated?: (tier: 'Community Offline' | 'Industrial Pro') => void;
  onOpenPreviewShare?: () => void;
}

function getRoleDisplayLabel(role: UserRole): string {
  switch (role) {
    case 'admin':
      return 'Administrador';
    case 'engineer':
      return 'Professor';
    case 'operator':
      return 'Aluno';
  }
}

function formatExpirationLabel(expiresAt?: string): string {
  const norm = normalizeExpirationDate(expiresAt);
  if (!norm) return 'Sem vencimento';
  if (/^\d{4}-\d{2}-\d{2}$/.test(norm)) {
    const [y, m, d] = norm.split('-');
    return `${d}/${m}/${y}`;
  }
  return new Date(norm).toLocaleDateString('pt-BR');
}

function getEffectiveStatusLabel(user: Pick<OfflineUser, 'active' | 'expiresAt'>): 'Bloqueado' | 'Expirado' | 'Ativo' {
  if (!user.active) return 'Bloqueado';
  if (isOfflineUserExpired(user)) return 'Expirado';
  return 'Ativo';
}

export const AccessControlModal: React.FC<AccessControlModalProps> = ({
  open,
  session,
  onClose,
  onSessionUpdated,
  onOpenPreviewShare,
}) => {
  const [users, setUsers] = useState<OfflineUser[]>([]);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [adminUsername, setAdminUsername] = useState(session.username);
  const [adminDisplayName, setAdminDisplayName] = useState(session.displayName);
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('operator');
  const [editActive, setEditActive] = useState(true);
  const [editPassword, setEditPassword] = useState('');
  const [editExpiresAt, setEditExpiresAt] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('operator');
  const [newPassword, setNewPassword] = useState(() => generateAccessKey('operator'));
  const [newExpiresAt, setNewExpiresAt] = useState('');
  const [issuedInvite, setIssuedInvite] = useState<{
    username: string;
    displayName: string;
    role: UserRole;
    accessKey: string;
    expiresAt?: string;
  } | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSavingAdmin, setIsSavingAdmin] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [recentlyUpdatedUserId, setRecentlyUpdatedUserId] = useState<string | null>(null);
  const highlightTimerRef = useRef<number | null>(null);

  const perms = getRolePermissions(session.role, session);

  const markRecentlyUpdated = (userId: string) => {
    setRecentlyUpdatedUserId(userId);
    if (highlightTimerRef.current !== null) {
      window.clearTimeout(highlightTimerRef.current);
    }
    highlightTimerRef.current = window.setTimeout(() => {
      setRecentlyUpdatedUserId(null);
      highlightTimerRef.current = null;
    }, 3000);
  };

  const upsertUserInList = (nextUser: OfflineUser) => {
    setUsers((prev) => {
      const exists = prev.some((item) => item.id === nextUser.id);
      const next = exists
        ? prev.map((item) => (item.id === nextUser.id ? nextUser : item))
        : [...prev, nextUser];
      return next.sort((a, b) => a.username.localeCompare(b.username));
    });
    markRecentlyUpdated(nextUser.id);
  };

  const prependAuditLog = (entry: AuditLogEntry) => {
    setLogs((prev) => [entry, ...prev.filter((item) => item.id !== entry.id)].slice(0, 120));
  };

  const refreshData = async () => {
    try {
      const [u, l] = await Promise.all([listUsers(), listAuditLogs()]);
      setUsers(u);
      setLogs(l);
      const current =
        u.find((item) => item.id === session.userId) ??
        u.find((item) => item.username.trim().toLowerCase() === session.username.trim().toLowerCase());
      if (current) {
        setAdminUsername(current.username);
        setAdminDisplayName(current.displayName);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Falha ao carregar contas locais.');
    }
  };

  useEffect(() => {
    if (open) {
      void refreshData();
      setAdminNewPassword('');
      setAdminConfirmPassword('');
      setShowAdminPassword(false);
      setEditingUserId(null);
      setEditActive(true);
      setEditPassword('');
      setEditExpiresAt('');
      setEditError(null);
      setShowEditPassword(false);
      setNewExpiresAt('');
      setFeedback(null);
      setErrorMsg(null);
      setCopiedInvite(false);
      setRecentlyUpdatedUserId(null);
    }
    return () => {
      if (highlightTimerRef.current !== null) {
        window.clearTimeout(highlightTimerRef.current);
        highlightTimerRef.current = null;
      }
    };
  }, [open]);

  if (!open) return null;

  const handleRoleChange = (role: UserRole) => {
    setNewRole(role);
    const trimmed = newPassword.trim();
    if (!trimmed || /^FCS-(ALUNO|PROF|ADMIN)-/.test(trimmed)) {
      setNewPassword(generateAccessKey(role));
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setFeedback(null);
    setCopiedInvite(false);

    const clean = newUsername.trim().toLowerCase();
    const keyVal = newPassword.trim();
    if (clean.length < 3 || /\s/.test(clean)) {
      setErrorMsg('O usuário deve ter pelo menos 3 caracteres e não pode conter espaços.');
      return;
    }
    if (!newDisplayName.trim() || keyVal.length < 4) {
      setErrorMsg('Preencha nome completo e chave de acesso / senha (mínimo 4 caracteres).');
      return;
    }

    setIsCreatingUser(true);
    try {
      const freshUsers = await listUsers();
      if (freshUsers.some((u) => u.username.trim().toLowerCase() === clean)) {
        setErrorMsg('Este usuário já existe.');
        return;
      }

      const record = await createOfflineUserRecord({
        username: clean,
        displayName: newDisplayName.trim(),
        role: newRole,
        password: keyVal,
        expiresAt: newExpiresAt || undefined,
      });
      await saveUser(record);
      upsertUserInList(record);
      setIssuedInvite({
        username: record.username,
        displayName: record.displayName,
        role: record.role,
        accessKey: keyVal,
        expiresAt: record.expiresAt,
      });
      setNewUsername('');
      setNewDisplayName('');
      setNewExpiresAt('');
      setNewPassword(generateAccessKey(newRole));
      setFeedback(
        `Conta "${record.username}" (${getRoleDisplayLabel(record.role)}) ativada — status: ${getEffectiveStatusLabel(record)}.`
      );
      const logEntry = await appendAuditLog({
        userId: session.userId,
        username: session.username,
        action: 'USER_CREATED',
        detail: `Chave de acesso emitida para ${getRoleDisplayLabel(record.role)}: ${record.username}${
          record.expiresAt ? ` (vencimento ${formatExpirationLabel(record.expiresAt)})` : ''
        }.`,
      });
      prependAuditLog(logEntry);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Falha ao criar conta.');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleRegenerateKey = async (target: OfflineUser) => {
    setErrorMsg(null);
    setFeedback(null);
    setCopiedInvite(false);
    setBusyUserId(target.id);
    try {
      const nextKey = generateAccessKey(target.role);
      const updated = await createOfflineUserRecord({
        id: target.id,
        username: target.username,
        displayName: target.displayName,
        role: target.role,
        password: nextKey,
        expiresAt: target.expiresAt,
      });
      updated.active = target.active;
      updated.createdAt = target.createdAt;
      updated.lastLoginAt = target.lastLoginAt;
      await saveUser(updated);
      upsertUserInList(updated);
      setIssuedInvite({
        username: target.username,
        displayName: target.displayName,
        role: target.role,
        accessKey: nextKey,
        expiresAt: target.expiresAt,
      });
      setFeedback(`Nova chave de acesso gerada para "${target.username}".`);
      const logEntry = await appendAuditLog({
        userId: session.userId,
        username: session.username,
        action: 'USER_TOGGLED',
        detail: `Nova chave de acesso gerada para ${target.username} (${getRoleDisplayLabel(target.role)}).`,
      });
      prependAuditLog(logEntry);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Falha ao gerar nova chave.');
    } finally {
      setBusyUserId(null);
    }
  };

  const handleCopyInvite = async () => {
    if (!issuedInvite) return;
    const expLine = issuedInvite.expiresAt
      ? `\nVencimento: ${formatExpirationLabel(issuedInvite.expiresAt)}`
      : '';
    const text = `Matc Hidráulica / Neumática - Acesso (${getRoleDisplayLabel(issuedInvite.role)})\nUsuário: ${issuedInvite.username}\nChave de Acesso: ${issuedInvite.accessKey}${expLine}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedInvite(true);
      window.setTimeout(() => setCopiedInvite(false), 2500);
    } catch {
      setFeedback(text);
    }
  };

  const handleToggleUser = async (target: OfflineUser) => {
    setErrorMsg(null);
    setEditError(null);
    if (target.id === session.userId) {
      setErrorMsg('Não é possível bloquear o próprio administrador conectado.');
      return;
    }
    const updated: OfflineUser = { ...target, active: !target.active };
    // Instant optimistic UI update
    upsertUserInList(updated);
    if (editingUserId === target.id) {
      setEditActive(updated.active);
    }
    setFeedback(
      `Status da conta "${updated.username}" atualizado para ${getEffectiveStatusLabel(updated)}.`
    );
    setBusyUserId(target.id);
    try {
      await saveUser(updated);
      const logEntry = await appendAuditLog({
        userId: session.userId,
        username: session.username,
        action: 'USER_TOGGLED',
        detail: `Usuário ${target.username} ${updated.active ? 'ativado' : 'bloqueado'}.`,
      });
      prependAuditLog(logEntry);
    } catch (err) {
      // Revert on storage error
      upsertUserInList(target);
      if (editingUserId === target.id) {
        setEditActive(target.active);
      }
      setFeedback(null);
      setErrorMsg(err instanceof Error ? err.message : 'Falha ao atualizar status da conta.');
    } finally {
      setBusyUserId(null);
    }
  };

  const handleSaveAdminCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setFeedback(null);

    const cleanAdminPass = adminNewPassword.trim();
    const cleanAdminConfirm = adminConfirmPassword.trim();
    if (cleanAdminPass !== cleanAdminConfirm) {
      setErrorMsg('A nova senha e a confirmação não coincidem.');
      return;
    }

    setIsSavingAdmin(true);
    try {
      const allUsers = await listUsers();
      const target =
        allUsers.find((u) => u.id === session.userId) ??
        allUsers.find((u) => u.username.trim().toLowerCase() === session.username.trim().toLowerCase());

      if (!target) {
        setErrorMsg('Registro do administrador não encontrado no cofre local.');
        return;
      }

      const res = await updateOfflineUserRecord(target, allUsers, {
        username: adminUsername,
        displayName: adminDisplayName,
        newPassword: cleanAdminPass || undefined,
      });

      if (!res.ok) {
        setErrorMsg(res.error);
        return;
      }

      await saveUser(res.user);
      upsertUserInList(res.user);
      setAdminUsername(res.user.username);
      setAdminDisplayName(res.user.displayName);
      onSessionUpdated?.(res.user);
      setAdminNewPassword('');
      setAdminConfirmPassword('');
      setFeedback(
        `Credenciais do administrador atualizadas para usuário "${res.user.username}".`
      );
      const logEntry = await appendAuditLog({
        userId: res.user.id,
        username: res.user.username,
        action: 'USER_TOGGLED',
        detail: `Credenciais do administrador atualizadas (${res.user.username}${cleanAdminPass ? ', senha alterada' : ''}).`,
      });
      prependAuditLog(logEntry);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Falha ao salvar credenciais do administrador.');
    } finally {
      setIsSavingAdmin(false);
    }
  };

  const startEditUser = (u: OfflineUser) => {
    setEditingUserId(u.id);
    setEditUsername(u.username);
    setEditDisplayName(u.displayName);
    setEditRole(u.role);
    setEditActive(u.active);
    setEditPassword('');
    setEditExpiresAt(normalizeExpirationDate(u.expiresAt) ?? '');
    setShowEditPassword(false);
    setEditError(null);
    setErrorMsg(null);
    setFeedback(null);
  };

  const handleSaveEditedUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId) return;
    setErrorMsg(null);
    setEditError(null);
    setFeedback(null);

    const cleanEditPass = editPassword.trim();
    if (cleanEditPass.length > 0 && cleanEditPass.length < 4) {
      const msg = 'A nova senha deve ter pelo menos 4 caracteres (ou deixe em branco para manter a atual).';
      setEditError(msg);
      setErrorMsg(msg);
      return;
    }

    setIsSavingEdit(true);
    try {
      const freshUsers = await listUsers();
      const target = freshUsers.find((u) => u.id === editingUserId) ?? users.find((u) => u.id === editingUserId);
      if (!target) {
        const msg = 'Conta não encontrada no cofre local.';
        setEditError(msg);
        setErrorMsg(msg);
        return;
      }

      const isSelf = target.id === session.userId;
      const res = await updateOfflineUserRecord(target, freshUsers, {
        username: editUsername,
        displayName: editDisplayName,
        role: isSelf ? target.role : editRole,
        active: isSelf ? target.active : editActive,
        newPassword: cleanEditPass || undefined,
        expiresAt: editExpiresAt.trim() ? editExpiresAt.trim() : null,
      });
      if (!res.ok) {
        setEditError(res.error);
        setErrorMsg(res.error);
        return;
      }

      await saveUser(res.user);
      // Instant UI update in table, header, and status badge
      upsertUserInList(res.user);
      if (isSelf) {
        setAdminUsername(res.user.username);
        setAdminDisplayName(res.user.displayName);
        onSessionUpdated?.(res.user);
      }
      setEditingUserId(null);
      setEditPassword('');
      setEditExpiresAt('');
      setEditError(null);
      setShowEditPassword(false);

      const nextStatusLabel = getEffectiveStatusLabel(res.user);
      setFeedback(
        `Conta "${res.user.username}" (${getRoleDisplayLabel(res.user.role)}) atualizada — Status: ${nextStatusLabel}${
          res.user.expiresAt ? ` · Vencimento: ${formatExpirationLabel(res.user.expiresAt)}` : ' · Sem vencimento'
        }${cleanEditPass ? ' · Senha alterada' : ''}.`
      );

      const logEntry = await appendAuditLog({
        userId: session.userId,
        username: session.username,
        action: 'USER_TOGGLED',
        detail: `Usuário ${target.username} atualizado para ${res.user.username} (${getRoleDisplayLabel(res.user.role)} · ${nextStatusLabel})${
          cleanEditPass ? ' (nova senha definida)' : ''
        }${res.user.expiresAt ? ` · vencimento ${formatExpirationLabel(res.user.expiresAt)}` : ''}.`,
      });
      prependAuditLog(logEntry);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar alterações da conta.';
      setEditError(msg);
      setErrorMsg(msg);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const editPreviewStatus = getEffectiveStatusLabel({
    active: editingUserId === session.userId ? true : editActive,
    expiresAt: normalizeExpirationDate(editExpiresAt),
  });
  const editPasswordTooShort = editPassword.trim().length > 0 && editPassword.trim().length < 4;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="access-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
    >
      <div className="w-full max-w-4xl max-h-[88vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <div>
              <h2 id="access-modal-title" className="text-base font-semibold text-slate-900 dark:text-white">
                {perms.canManageUsers
                  ? 'Configurações do Administrador e Chaves de Acesso'
                  : 'Auditoria e Sessão'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sessão: {session.displayName} ({getRoleDisplayLabel(session.role)}) · Aplicativo Ativo
                {perms.canManageUsers ? ' · Criptografia PBKDF2-SHA256' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {perms.canAccessCreationTools && onOpenPreviewShare && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                  onOpenPreviewShare();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-sky-600 hover:bg-sky-700 text-white text-xs font-medium"
              >
                <Share2 className="w-3.5 h-3.5" />
                Compartilhar
              </button>
            )}
            <button
              type="button"
              aria-label="Fechar controle de acesso"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Pinned notification bar — always visible regardless of scroll position */}
        {(errorMsg || feedback) && (
          <div className="px-5 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/80 space-y-2 shrink-0">
            {errorMsg && (
              <div
                role="alert"
                className="flex items-start justify-between gap-2 p-2.5 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 text-xs text-red-700 dark:text-red-300"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
                <button
                  type="button"
                  aria-label="Fechar alerta"
                  onClick={() => setErrorMsg(null)}
                  className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/40 shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {feedback && (
              <div
                role="status"
                className="flex items-start justify-between gap-2 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/50 text-xs text-emerald-700 dark:text-emerald-300"
              >
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{feedback}</span>
                </div>
                <button
                  type="button"
                  aria-label="Fechar confirmação"
                  onClick={() => setFeedback(null)}
                  className="p-0.5 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/40 shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Ready-to-send Access Key Card */}
          {issuedInvite && (
            <div className="p-4 rounded-lg border border-sky-300 dark:border-sky-800 bg-sky-50/80 dark:bg-sky-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-sky-800 dark:text-sky-300">
                  <KeyRound className="w-4 h-4" />
                  Chave de Acesso Pronta para Enviar ({getRoleDisplayLabel(issuedInvite.role)})
                </div>
                <div className="font-mono text-slate-800 dark:text-slate-100">
                  Usuário: <strong>{issuedInvite.username}</strong> · Chave:{' '}
                  <strong data-testid="issued-access-key">{issuedInvite.accessKey}</strong>
                  {issuedInvite.expiresAt && (
                    <>
                      {' '}
                      · Vencimento: <strong>{formatExpirationLabel(issuedInvite.expiresAt)}</strong>
                    </>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyInvite}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-sky-600 hover:bg-sky-700 text-white text-xs font-medium shrink-0"
              >
                {copiedInvite ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Chave Copiada
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copiar para Enviar
                  </>
                )}
              </button>
            </div>
          )}

          {/* Local Users Management */}
          {perms.canManageUsers ? (
            <div className="space-y-4">
              {/* Admin Self-Credentials Editor */}
              <form
                onSubmit={handleSaveAdminCredentials}
                data-testid="admin-credentials-form"
                className="p-4 rounded-lg border border-sky-200 dark:border-sky-900/60 bg-sky-50/40 dark:bg-sky-950/20 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                    <UserCog className="w-4 h-4 text-sky-600" />
                    Credenciais do Administrador (Editar Usuário e Senha)
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword((v) => !v)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 text-[11px] hover:bg-white dark:hover:bg-slate-800"
                  >
                    {showAdminPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {showAdminPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  <div>
                    <label htmlFor="admin-edit-username" className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Usuário do Admin
                    </label>
                    <input
                      id="admin-edit-username"
                      type="text"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label htmlFor="admin-edit-display" className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Nome de Exibição
                    </label>
                    <input
                      id="admin-edit-display"
                      type="text"
                      value={adminDisplayName}
                      onChange={(e) => setAdminDisplayName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                    />
                  </div>
                  <div>
                    <label htmlFor="admin-edit-password" className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Nova Senha
                    </label>
                    <input
                      id="admin-edit-password"
                      type={showAdminPassword ? 'text' : 'password'}
                      placeholder="Mínimo 4 caracteres"
                      value={adminNewPassword}
                      onChange={(e) => setAdminNewPassword(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label htmlFor="admin-edit-confirm" className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Confirmar Nova Senha
                    </label>
                    <input
                      id="admin-edit-confirm"
                      type={showAdminPassword ? 'text' : 'password'}
                      placeholder="Repita a nova senha"
                      value={adminConfirmPassword}
                      onChange={(e) => setAdminConfirmPassword(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Deixe os campos de senha em branco caso deseje alterar apenas o usuário ou nome.
                  </span>
                  <button
                    type="submit"
                    disabled={isSavingAdmin}
                    className="px-3.5 py-1.5 rounded-md bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-xs font-medium"
                  >
                    {isSavingAdmin ? 'Salvando...' : 'Salvar Usuário e Senha'}
                  </button>
                </div>
              </form>

              <form
                onSubmit={handleCreateUser}
                className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                    <UserPlus className="w-4 h-4 text-sky-600" />
                    Criar e Enviar Chave de Acesso — Aluno / Professor (PBKDF2-SHA256)
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewPassword(generateAccessKey(newRole))}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 text-[11px] font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <RefreshCw className="w-3 h-3" /> Gerar Chave
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 items-end">
                  <div>
                    <label htmlFor="new-user-username" className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Usuário
                    </label>
                    <input
                      id="new-user-username"
                      type="text"
                      aria-label="Nome de usuário"
                      placeholder="Usuário (ex: aluno01)"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                    />
                  </div>
                  <div>
                    <label htmlFor="new-user-display" className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Nome Completo
                    </label>
                    <input
                      id="new-user-display"
                      type="text"
                      aria-label="Nome de exibição"
                      placeholder="Nome Completo"
                      value={newDisplayName}
                      onChange={(e) => setNewDisplayName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                    />
                  </div>
                  <div>
                    <label htmlFor="new-user-role" className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Perfil
                    </label>
                    <select
                      id="new-user-role"
                      aria-label="Perfil de permissão"
                      value={newRole}
                      onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                      className="w-full px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                    >
                      <option value="operator">Aluno (Simular/Visualizar)</option>
                      <option value="engineer">Professor (Editar/Salvar)</option>
                      <option value="admin">Administrador (Total)</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="new-user-password" className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Chave / Senha
                    </label>
                    <input
                      id="new-user-password"
                      type="text"
                      aria-label="Chave de acesso"
                      placeholder="Chave de Acesso"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label htmlFor="new-user-expires" className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Vencimento (opcional)
                    </label>
                    <input
                      id="new-user-expires"
                      type="date"
                      aria-label="Vencimento da conta"
                      data-testid="new-user-expires"
                      value={newExpiresAt}
                      onChange={(e) => setNewExpiresAt(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="px-3.5 py-1.5 rounded-md bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-xs font-medium"
                >
                  {isCreatingUser ? 'Ativando...' : 'Ativar e Gerar Chave de Acesso'}
                </button>
              </form>

              {editingUserId && (
                <form
                  onSubmit={handleSaveEditedUser}
                  data-testid="edit-user-form"
                  className="p-3.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 space-y-2.5"
                >
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>
                      Editando conta:{' '}
                      <span className="font-mono text-sky-700 dark:text-sky-300">
                        {users.find((u) => u.id === editingUserId)?.username ?? editUsername}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingUserId(null);
                        setEditError(null);
                      }}
                      className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      Cancelar
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 items-start">
                    <div>
                      <label htmlFor="edit-user-username" className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                        Usuário
                      </label>
                      <input
                        id="edit-user-username"
                        type="text"
                        aria-label="Editar usuário da conta"
                        placeholder="Usuário"
                        value={editUsername}
                        onChange={(e) => {
                          setEditUsername(e.target.value);
                          setEditError(null);
                        }}
                        className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label htmlFor="edit-user-display" className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                        Nome
                      </label>
                      <input
                        id="edit-user-display"
                        type="text"
                        aria-label="Editar nome da conta"
                        placeholder="Nome de exibição"
                        value={editDisplayName}
                        onChange={(e) => {
                          setEditDisplayName(e.target.value);
                          setEditError(null);
                        }}
                        className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                      />
                    </div>
                    <div>
                      <label htmlFor="edit-user-role" className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                        Perfil
                      </label>
                      <select
                        id="edit-user-role"
                        aria-label="Editar perfil da conta"
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as UserRole)}
                        disabled={editingUserId === session.userId}
                        className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs disabled:opacity-60"
                      >
                        <option value="operator">Aluno</option>
                        <option value="engineer">Professor</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="edit-user-status" className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                        Status
                      </label>
                      <select
                        id="edit-user-status"
                        aria-label="Editar status da conta"
                        value={editActive ? 'active' : 'blocked'}
                        onChange={(e) => setEditActive(e.target.value === 'active')}
                        disabled={editingUserId === session.userId}
                        className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs disabled:opacity-60"
                      >
                        <option value="active">Ativo</option>
                        <option value="blocked">Bloqueado</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="edit-user-password" className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                        Nova Senha
                      </label>
                      <div className="relative">
                        <input
                          id="edit-user-password"
                          type={showEditPassword ? 'text' : 'password'}
                          aria-label="Nova senha da conta"
                          placeholder="Opcional (mín. 4 caract.)"
                          value={editPassword}
                          onChange={(e) => {
                            setEditPassword(e.target.value);
                            setEditError(null);
                          }}
                          className={`w-full px-2.5 py-1.5 pr-7 rounded border bg-white dark:bg-slate-950 text-xs font-mono ${
                            editPasswordTooShort
                              ? 'border-red-400 dark:border-red-600 focus:outline-red-500'
                              : 'border-slate-300 dark:border-slate-700'
                          }`}
                        />
                        <button
                          type="button"
                          aria-label={showEditPassword ? 'Ocultar nova senha' : 'Mostrar nova senha'}
                          onClick={() => setShowEditPassword((v) => !v)}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        >
                          {showEditPassword ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      {editPasswordTooShort && (
                        <p className="mt-1 text-[10px] text-red-600 dark:text-red-400">
                          Mínimo 4 caracteres (ou deixe em branco para manter a senha atual).
                        </p>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label htmlFor="edit-user-expires" className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                          Vencimento
                        </label>
                        {editExpiresAt && (
                          <button
                            type="button"
                            onClick={() => setEditExpiresAt('')}
                            className="text-[10px] text-sky-600 hover:underline"
                          >
                            Limpar
                          </button>
                        )}
                      </div>
                      <input
                        id="edit-user-expires"
                        type="date"
                        aria-label="Editar vencimento da conta"
                        data-testid="edit-user-expires"
                        value={editExpiresAt}
                        onChange={(e) => setEditExpiresAt(e.target.value)}
                        className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono"
                      />
                    </div>
                  </div>
                  {editError && (
                    <div
                      role="alert"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 text-[11px] text-red-700 dark:text-red-300"
                    >
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{editError}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
                    <span className="text-[11px] text-slate-600 dark:text-slate-300">
                      Status previsto:{' '}
                      <strong
                        className={
                          editPreviewStatus === 'Bloqueado'
                            ? 'text-red-600 dark:text-red-400'
                            : editPreviewStatus === 'Expirado'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }
                      >
                        {editPreviewStatus}
                      </strong>
                    </span>
                    <button
                      type="submit"
                      disabled={isSavingEdit}
                      className="px-3.5 py-1.5 rounded bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-xs font-medium"
                    >
                      {isSavingEdit ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                  </div>
                </form>
              )}

              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Usuário</th>
                      <th className="px-3 py-2 font-medium">Nome</th>
                      <th className="px-3 py-2 font-medium">Perfil</th>
                      <th className="px-3 py-2 font-medium">Vencimento</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {users.map((u) => {
                      const expired = isOfflineUserExpired(u);
                      const isRecentlyUpdated = recentlyUpdatedUserId === u.id;
                      const isBusy = busyUserId === u.id;
                      return (
                        <tr
                          key={u.id}
                          className={
                            isRecentlyUpdated
                              ? 'bg-emerald-50/70 dark:bg-emerald-950/30 transition-colors'
                              : editingUserId === u.id
                              ? 'bg-amber-50/50 dark:bg-amber-950/20 transition-colors'
                              : 'transition-colors'
                          }
                        >
                          <td className="px-3 py-2 font-mono">{u.username}</td>
                          <td className="px-3 py-2">{u.displayName}</td>
                          <td className="px-3 py-2">{getRoleDisplayLabel(u.role)}</td>
                          <td className="px-3 py-2 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                            {formatExpirationLabel(u.expiresAt)}
                          </td>
                          <td className="px-3 py-2">
                            <div className="inline-flex items-center gap-1.5">
                              {!u.active ? (
                                <span className="text-red-600 dark:text-red-400 font-medium">Bloqueado</span>
                              ) : expired ? (
                                <span className="text-amber-600 dark:text-amber-400 font-medium">Expirado</span>
                              ) : (
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Ativo</span>
                              )}
                              {isRecentlyUpdated && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                                  <Check className="w-3 h-3" /> Atualizado
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right space-x-1.5">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => startEditUser(u)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 text-[11px]"
                            >
                              <Pencil className="w-3 h-3" /> Editar
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleRegenerateKey(u)}
                              className="px-2 py-1 rounded border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950 disabled:opacity-50 text-[11px]"
                            >
                              Nova Chave
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleToggleUser(u)}
                              className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 text-[11px]"
                            >
                              {u.active ? 'Bloquear' : 'Reativar'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
              O gerenciamento e envio de chaves de acesso para Alunos e Professores é exclusivo do Administrador.
            </div>
          )}

          {/* Local Audit Logs */}
          {perms.canViewAuditLog && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Registro Local de Auditoria ({logs.length})
              </h3>
              <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {logs.map((entry) => (
                  <div key={entry.id} className="px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-mono font-medium text-slate-900 dark:text-white">
                        {entry.action}
                      </span>{' '}
                      <span className="text-slate-500">· {entry.username} ·</span>{' '}
                      <span className="text-slate-700 dark:text-slate-300">{entry.detail}</span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-400">
                      {new Date(entry.timestamp).toLocaleString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

