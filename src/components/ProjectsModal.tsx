import React, { useRef, useState } from 'react';
import { FolderOpen, Save, Trash2, Upload, Download, X } from 'lucide-react';
import type { CircuitProject } from '../types/circuit';

interface ProjectsModalProps {
  open: boolean;
  projects: CircuitProject[];
  activeProject: CircuitProject;
  canSave: boolean;
  canDelete: boolean;
  onClose: () => void;
  onLoadProject: (project: CircuitProject) => void;
  onSaveAsNew: (name: string, description: string) => Promise<void>;
  onDeleteProject: (id: string) => Promise<void>;
  onExportProject: (project: CircuitProject) => void;
  onImportProject: (project: CircuitProject) => Promise<void>;
}

export const ProjectsModal: React.FC<ProjectsModalProps> = ({
  open,
  projects,
  activeProject,
  canSave,
  canDelete,
  onClose,
  onLoadProject,
  onSaveAsNew,
  onDeleteProject,
  onExportProject,
  onImportProject,
}) => {
  const [newName, setNewName] = useState(activeProject.name);
  const [newDesc, setNewDesc] = useState(activeProject.description);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (open) {
      setNewName(
        activeProject.isPreset ? `${activeProject.name} (Local)` : activeProject.name
      );
      setNewDesc(activeProject.description);
      setErrorMsg(null);
    }
  }, [open, activeProject.id, activeProject.name, activeProject.description, activeProject.isPreset]);

  if (!open) return null;

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!newName.trim()) {
      setErrorMsg('Informe um nome para salvar o projeto localmente.');
      return;
    }
    await onSaveAsNew(newName.trim(), newDesc.trim());
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as CircuitProject;
      if (!parsed.name || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.pipes)) {
        setErrorMsg('Arquivo .fcproj inválido.');
        return;
      }
      await onImportProject(parsed);
    } catch {
      setErrorMsg('Não foi possível ler o arquivo de projeto.');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="projects-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
    >
      <div className="w-full max-w-3xl max-h-[88vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 id="projects-modal-title" className="text-base font-semibold text-slate-900 dark:text-white">
              Projetos Locais e Persistência IndexedDB
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Todos os circuitos são salvos localmente no navegador e sincronizados no desktop .exe.
            </p>
          </div>
          <button
            type="button"
            aria-label="Fechar janela de projetos"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {errorMsg && (
            <div role="alert" className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300">
              {errorMsg}
            </div>
          )}

          {/* Save Current as Local Copy */}
          {canSave && (
            <form
              onSubmit={handleSaveSubmit}
              className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3"
            >
              <div className="text-xs font-semibold text-slate-900 dark:text-white">
                Salvar Circuito Atual no Banco Local
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="save-project-name" className="block text-[11px] text-slate-500 mb-1">
                    Nome do Projeto
                  </label>
                  <input
                    id="save-project-name"
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="save-project-desc" className="block text-[11px] text-slate-500 mb-1">
                    Descrição Técnica
                  </label>
                  <input
                    id="save-project-desc"
                    type="text"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-sky-600 hover:bg-sky-700 text-white text-xs font-medium whitespace-nowrap"
                >
                  <Save className="w-3.5 h-3.5" />
                  Salvar Novo Projeto Local
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Importar .fcproj
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".fcproj,.json"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </form>
          )}

          {/* Stored Projects List */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
              Circuitos Armazenados ({projects.length})
            </h3>
            <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
              {projects.map((proj) => {
                const isCurrent = proj.id === activeProject.id;
                return (
                  <div
                    key={proj.id}
                    className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isCurrent ? 'bg-sky-50/60 dark:bg-sky-950/30' : 'bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {proj.name}
                        </span>
                        {isCurrent && (
                          <span className="text-[11px] font-medium text-sky-600 dark:text-sky-400">
                            · Aberto
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {proj.fluid === 'hydraulic' ? 'Hidráulica' : 'Pneumática'} ·{' '}
                        {proj.nodes.length} componentes · {proj.pipes.length} tubulações · Autor:{' '}
                        {proj.authorName}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          onLoadProject(proj);
                          onClose();
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium hover:opacity-90 whitespace-nowrap"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        Abrir
                      </button>
                      <button
                        type="button"
                        aria-label={`Exportar ${proj.name}`}
                        onClick={() => onExportProject(proj)}
                        className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      {canDelete && !proj.isPreset && (
                        <button
                          type="button"
                          aria-label={`Excluir ${proj.name}`}
                          onClick={() => onDeleteProject(proj.id)}
                          className="p-1.5 rounded-md border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
