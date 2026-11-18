import React, { useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Loader2,
  Monitor,
  Smartphone,
  Terminal,
  X,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { isElectronRuntime } from '../storage/localDb';

interface DesktopPackageModalProps {
  open: boolean;
  onClose: () => void;
}

const BUILD_COMMANDS = `npm install --legacy-peer-deps
npm install -D --legacy-peer-deps electron electron-builder
npm run electron:build:win`;

export const DesktopPackageModal: React.FC<DesktopPackageModalProps> = ({ open, onClose }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);
  const inElectron = isElectronRuntime();

  if (!open) return null;

  const handleCopyCommands = async () => {
    try {
      await navigator.clipboard.writeText(BUILD_COMMANDS);
      setCopiedCmd(true);
      window.setTimeout(() => setCopiedCmd(false), 2000);
    } catch {
      // Ignore clipboard permission errors in restricted contexts
    }
  };

  const handleDownloadZip = async () => {
    setDownloadingZip(true);
    setZipError(null);
    try {
      const { WINDOWS_PACKAGE_ZIP_BASE64 } = await import('../data/windowsPackageBase64');
      let bytes: Uint8Array;
      if (WINDOWS_PACKAGE_ZIP_BASE64 && WINDOWS_PACKAGE_ZIP_BASE64.length > 100) {
        const binaryString = atob(WINDOWS_PACKAGE_ZIP_BASE64);
        const arr = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i += 1) {
          arr[i] = binaryString.charCodeAt(i);
        }
        bytes = arr;
      } else {
        const res = await fetch('./fluid-circuit-studio-windows.zip', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!res.ok) {
          throw new Error(`Erro HTTP ${res.status} ao baixar pacote.`);
        }
        bytes = new Uint8Array(await res.arrayBuffer());
      }

      if (bytes.length < 100 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
        throw new Error('Pacote inválido: assinatura PK do arquivo ZIP não encontrada.');
      }

      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/zip' });
      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = 'FluidCircuitStudio-Windows.zip';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    } catch (err) {
      setZipError(err instanceof Error ? err.message : 'Falha ao baixar o arquivo ZIP.');
    } finally {
      setDownloadingZip(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="desktop-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
    >
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Monitor className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <div>
              <h2 id="desktop-modal-title" className="text-base font-semibold text-slate-900 dark:text-white">
                Aplicativo Desktop (.EXE) e Instalação Offline (PWA)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ambiente atual: {inElectron ? 'Executável Nativo Electron (.exe)' : 'Aplicação Web / PWA Offline'}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Fechar janela desktop"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs text-slate-600 dark:text-slate-300 overflow-y-auto">
          {/* Option 1: Instant Desktop PWA Install */}
          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold text-sm text-slate-900 dark:text-white">
                1. Instalação Direta como App Desktop (PWA Offline — Sem Terminal)
              </div>
              {isInstalled && (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Instalado
                </span>
              )}
            </div>
            <p className="leading-relaxed">
              O Service Worker armazena todos os scripts, ícones e o motor de simulação em cache local
              para abrir em janela própria na área de trabalho do Windows, macOS ou Linux mesmo sem internet.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {isInstallable && (
                <button
                  type="button"
                  onClick={install}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-sky-600 hover:bg-sky-700 text-white font-medium"
                >
                  <Download className="w-3.5 h-3.5" />
                  Instalar App na Área de Trabalho
                </button>
              )}
              {isIOS && !isInstalled && (
                <button
                  type="button"
                  onClick={() => setShowIOSGuide((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 font-medium"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  Instalar no iPhone / iPad
                </button>
              )}
              {!isInstallable && !isInstalled && !isIOS && (
                <span className="text-[11px] text-slate-500">
                  No Chrome ou Edge, clique no ícone de instalação (computador com seta) na barra de endereços para criar o atalho desktop offline.
                </span>
              )}
            </div>
            {showIOSGuide && (
              <div className="mt-2 p-3 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px]">
                1. Toque em Compartilhar no Safari · 2. Selecione Adicionar à Tela de Início.
              </div>
            )}
          </div>

          {/* Option 2: Native Windows .EXE Electron Build */}
          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-semibold text-sm text-slate-900 dark:text-white">
                <Terminal className="w-4 h-4 text-sky-600" />
                2. Compilar Executável Nativo Windows (.EXE / Setup + Portable)
              </div>
              <button
                type="button"
                onClick={handleCopyCommands}
                className="flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {copiedCmd ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" /> Copiado
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copiar comandos
                  </>
                )}
              </button>
            </div>

            <div className="p-3 rounded-md border border-sky-200 dark:border-sky-900/60 bg-sky-50/70 dark:bg-sky-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="font-semibold text-xs text-slate-900 dark:text-white">
                  Pacote Completo Pronto para Windows (.ZIP)
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300">
                  Contém código-fonte, build pronto em <code className="font-mono">dist/</code>, wrapper Electron e{' '}
                  <code className="font-mono">GERAR_EXE_WINDOWS.bat</code> (automático).
                </div>
              </div>
              <button
                type="button"
                disabled={downloadingZip}
                onClick={handleDownloadZip}
                data-testid="btn-download-windows-zip"
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-md bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white font-medium shrink-0 transition-colors"
              >
                {downloadingZip ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Gerando ZIP...
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    Baixar Pacote (.ZIP)
                  </>
                )}
              </button>
            </div>

            {zipError && (
              <div className="p-2.5 rounded border border-red-300 bg-red-50 text-red-700 text-[11px]">
                {zipError}
              </div>
            )}

            <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
              <li>
                <strong>Baixe e extraia</strong> o arquivo <code className="font-mono bg-slate-200/70 dark:bg-slate-800 px-1 rounded">FluidCircuitStudio-Windows.zip</code> para uma pasta no seu PC (ex.:{' '}
                <code className="font-mono bg-slate-200/70 dark:bg-slate-800 px-1 rounded">C:\Projetos\fluid-circuit-studio</code>).
              </li>
              <li>
                Dê dois cliques em <code className="font-mono bg-slate-200/70 dark:bg-slate-800 px-1 rounded">GERAR_EXE_WINDOWS.bat</code> para gerar os executáveis automaticamente, <strong>ou</strong> abra o PowerShell <strong>dentro da pasta extraída</strong> e execute:
              </li>
            </ol>

            <pre className="p-3 rounded-md bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto leading-relaxed">
{`cd "C:\\FluidCircuitStudio"
npm install --legacy-peer-deps
npm install -D --legacy-peer-deps electron electron-builder
npm run electron:build:win
# Saída em dist-desktop/:
#   FluidCircuitStudio-Setup-1.0.0.exe (Instalador)
#   FluidCircuitStudio-Portable-1.0.0.exe (Portátil)`}
            </pre>

            <div className="flex items-start gap-2 p-2.5 rounded border border-amber-300/70 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-[11px]">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div>
                <strong>Atenção:</strong> Nunca execute em{' '}
                <code className="font-mono">C:\WINDOWS\system32</code>. Se aparecer o erro{' '}
                <code className="font-mono">Missing script: "electron:build:win"</code>, significa que o PowerShell não está dentro da pasta do projeto onde fica o <code className="font-mono">package.json</code>.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
