import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  Globe,
  Link2,
  Lock,
  Pencil,
  X,
} from 'lucide-react';
import { isPrivateDevHost, resolvePreviewBaseUrl } from '../security/offlineAuth';
import {
  appendAuditLog,
  generateExclusiveShareLink,
  listExclusiveShareLinks,
  loadPublicAppUrl,
  savePublicAppUrl,
  type ExclusiveShareLinkItem,
} from '../storage/localDb';
import type { AuthSession } from '../types/circuit';

interface PreviewShareModalProps {
  open: boolean;
  session: AuthSession;
  onClose: () => void;
}

export const PreviewShareModal: React.FC<PreviewShareModalProps> = ({
  open,
  session,
  onClose,
}) => {
  const [savedPublicUrl, setSavedPublicUrl] = useState('');
  const [draftPublicUrl, setDraftPublicUrl] = useState('');
  const [editingPublicUrl, setEditingPublicUrl] = useState(false);
  const [activeLink, setActiveLink] = useState<ExclusiveShareLinkItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const currentBaseUrl = resolvePreviewBaseUrl();
  const runningOnPrivateDevHost = isPrivateDevHost(currentBaseUrl);

  useEffect(() => {
    if (!open || session.role !== 'admin' || session.isPreviewShare) return;
    setCopied(false);
    setErrorMsg(null);
    let cancelled = false;

    const init = async () => {
      setLoading(true);
      try {
        const [storedUrl, existingLinks] = await Promise.all([
          loadPublicAppUrl(),
          listExclusiveShareLinks(),
        ]);
        if (cancelled) return;
        const cleanStored = storedUrl.trim();
        setSavedPublicUrl(cleanStored);
        setDraftPublicUrl(cleanStored);
        setEditingPublicUrl(runningOnPrivateDevHost && !cleanStored);

        if (existingLinks.length > 0) {
          setActiveLink(existingLinks[0]);
        } else {
          const generated = await generateExclusiveShareLink();
          if (cancelled) return;
          if (generated.ok) {
            setActiveLink(generated.item);
          } else {
            setErrorMsg(generated.error);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void init();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      cancelled = true;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, session.role, session.isPreviewShare, runningOnPrivateDevHost, onClose]);

  if (!open || session.role !== 'admin' || session.isPreviewShare) {
    return null;
  }

  const shareUrl = activeLink?.link ?? '';
  const isEffectiveLinkPrivate = shareUrl
    ? isPrivateDevHost(shareUrl)
    : runningOnPrivateDevHost && !savedPublicUrl;

  const handleSavePublicUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const trimmed = draftPublicUrl.trim();
    if (trimmed && isPrivateDevHost(trimmed)) {
      setErrorMsg(
        'O endereço "ais-dev-..." é privado do editor e sempre dá Erro 403 em outros computadores. Cole a URL pública do Deploy (Cloud Run).'
      );
      return;
    }
    const res = await savePublicAppUrl(trimmed);
    if (!res.ok) {
      setErrorMsg(res.error ?? 'Informe uma URL válida começando com https://');
      return;
    }
    setSavedPublicUrl(res.url);
    setDraftPublicUrl(res.url);
    setEditingPublicUrl(false);

    const refreshed = await listExclusiveShareLinks();
    if (refreshed.length > 0) {
      setActiveLink(refreshed[0]);
    } else {
      const gen = await generateExclusiveShareLink();
      if (gen.ok) setActiveLink(gen.item);
    }

    await appendAuditLog({
      userId: session.userId,
      username: session.username,
      action: 'PREVIEW_SHARE_CREATED',
      detail: res.url
        ? `Domínio público configurado para o link único permanente: ${res.url}`
        : 'Domínio público personalizado removido.',
    });
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      const input = document.getElementById('floating-preview-share-url') as HTMLInputElement | null;
      if (input) {
        input.focus();
        input.select();
        document.execCommand?.('copy');
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2200);
      }
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Link único permanente do aplicativo"
      data-testid="floating-share-menu"
      onClick={(e) => e.stopPropagation()}
      className="fixed top-9 right-3 z-50 w-[26rem] max-w-[calc(100vw-1.5rem)] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-3.5 space-y-2.5 text-xs"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
          <Link2 className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
          <span>Link Único do App</span>
          {!isEffectiveLinkPrivate ? (
            <span className="ml-1 inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Ativo · Sem vencimento
            </span>
          ) : (
            <span className="ml-1 inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Aguardando Deploy
            </span>
          )}
        </div>
        <button
          type="button"
          aria-label="Fechar menu compartilhar"
          onClick={onClose}
          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {isEffectiveLinkPrivate && (
        <div className="rounded-md border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-2 text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>Por que dá Erro 403 em outros computadores</span>
          </div>
          <p className="leading-snug text-amber-800 dark:text-amber-300">
            Você está no endereço privado <code className="font-mono">ais-dev-...</code> do editor.
            Clique em <strong>Deploy app (Cloud Run)</strong> no topo direito da plataforma e cole o
            endereço público abaixo (ou abra o app já pelo link publicado).
          </p>
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="rounded-md border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-2.5 py-2 text-[11px] font-medium text-red-700 dark:text-red-300"
        >
          {errorMsg}
        </div>
      )}

      {editingPublicUrl ? (
        <form onSubmit={handleSavePublicUrl} className="space-y-2">
          <label
            htmlFor="public-app-url-input"
            className="flex items-center gap-1 text-[11px] font-medium text-slate-700 dark:text-slate-300"
          >
            <Globe className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>Domínio Público do App (Cloud Run / Servidor)</span>
          </label>
          <input
            id="public-app-url-input"
            type="url"
            value={draftPublicUrl}
            onChange={(e) => setDraftPublicUrl(e.target.value)}
            placeholder="https://seu-app-xxxxx.run.app"
            className="w-full px-2.5 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-[11px] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <div className="flex items-center justify-end gap-2">
            {savedPublicUrl && (
              <button
                type="button"
                onClick={() => {
                  setDraftPublicUrl(savedPublicUrl);
                  setErrorMsg(null);
                  setEditingPublicUrl(false);
                }}
                className="px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-medium"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              className="px-3 py-1.5 rounded-md bg-sky-600 hover:bg-sky-700 text-white text-xs font-medium"
            >
              Salvar Domínio
            </button>
          </div>
        </form>
      ) : (
        <>
          <input
            id="floating-preview-share-url"
            data-testid="generated-preview-url"
            type="text"
            readOnly
            value={loading ? 'Carregando link único...' : shareUrl}
            onFocus={(e) => e.currentTarget.select()}
            onClick={(e) => e.currentTarget.select()}
            className="w-full px-2.5 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-[11px] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setDraftPublicUrl(savedPublicUrl || (!runningOnPrivateDevHost ? currentBaseUrl : ''));
                setErrorMsg(null);
                setEditingPublicUrl(true);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-medium"
            >
              <Pencil className="w-3 h-3" />
              Domínio Público
            </button>
            <button
              type="button"
              data-testid="btn-copy-preview-link"
              disabled={!shareUrl || loading}
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-medium"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Link Copiado
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copiar Link
                </>
              )}
            </button>
          </div>
        </>
      )}

      <p className="flex items-start gap-1.5 text-[10.5px] text-slate-500 dark:text-slate-400 leading-snug pt-0.5 border-t border-slate-100 dark:border-slate-800">
        <Lock className="w-3 h-3 shrink-0 mt-0.5 text-slate-400" />
        <span>
          Link único e permanente (<strong>sem prazo de vencimento</strong>). Carrega a apresentação
          e exige apenas <strong>usuário e senha</strong> cadastrados em Configurações.
        </span>
      </p>
    </div>
  );
};
