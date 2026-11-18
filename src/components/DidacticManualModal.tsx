import React, { useMemo, useState } from 'react';
import { BookOpen, Search, X } from 'lucide-react';

interface ManualSection {
  id: string;
  title: string;
  subtitle: string;
  steps: string[];
  tips?: string;
}

const MANUAL_SECTIONS: ManualSection[] = [
  {
    id: 'overview',
    title: '1. Visão Geral do Simulador',
    subtitle: 'Ambiente completo de estudos e projetos hidráulicos e pneumáticos (ISO 1219)',
    steps: [
      'Alterne entre o modo Hidráulica e Pneumática no canto direito da barra de ferramentas para trabalhar com óleo pressurizado ou ar comprimido.',
      'Use a Biblioteca Hierárquica à esquerda para localizar elementos de alimentação, atuadores, válvulas direcionais, válvulas de pressão, válvulas contínuas, sensores e componentes elétricos/Ladder.',
      'Clique ou arraste um componente da biblioteca para adicioná-lo ao diagrama. Use a barra de busca ("Buscar símbolo ISO...") para filtrar rapidamente.',
      'Use a roda do mouse para zoom e segure o botão do meio (scroll) ou ative a ferramenta Mão (Pan) para deslocar a área de trabalho.',
    ],
    tips: 'Dica: clique no botão Ajustar à Tela (1:1 / Fit) na barra superior para centralizar todo o circuito visível.',
  },
  {
    id: 'wiring',
    title: '2. Montagem, Ligações e Derivação (Junção T)',
    subtitle: 'Conexão ponto a ponto, derivação no meio de tubulações e seleção por área',
    steps: [
      'Para ligar dois componentes, clique na porta de origem (círculo) e depois na porta de destino.',
      'Conexão no meio de uma linha: após clicar na porta de origem, passe o mouse sobre qualquer tubulação existente até destacar o ponto de encaixe e clique para criar automaticamente uma derivação conectada.',
      'Para ajustar o traçado de uma tubulação ortogonal, clique e arraste qualquer segmento horizontal ou vertical do tubo.',
      'Seleção por Área (2 cliques): ative "Seleção por área" na barra superior, dê o 1º clique para fixar o vértice inicial, mova o cursor e dê o 2º clique (ou arraste) para selecionar múltiplos itens.',
    ],
    tips: 'Pressione Esc a qualquer momento para cancelar uma ligação pendente ou limpar a seleção por área.',
  },
  {
    id: 'valves_elec',
    title: '3. Botoeiras, Solenoides e Válvulas Direcionais',
    subtitle: 'Acionamento elétrico em +24V / 0V e vinculação por marcas (Y1, Y2, K1)',
    steps: [
      'Dê duplo clique sobre qualquer componente (cilindro, válvula direcional, solenoide, relé, manômetro ou botoeira) para abrir sua janela de propriedades.',
      'Em uma válvula direcional (ex.: 4/2, 5/2 ou 5/3), configure o acionamento elétrico por solenoide e informe a "Marca solenoide" (ex.: Y1 no lado esquerdo, Y2 no lado direito).',
      'No circuito elétrico, conecte +24V → Botoeira (Pulsador/Interruptor) → Solenoide de Válvula (com a mesma marca Y1) → 0V.',
      'Inicie a simulação (botão Play verde) e clique diretamente sobre a botoeira ou interruptor no diagrama para fechar o contato, energizar Y1, comutar a válvula e liberar o fluxo para o atuador.',
    ],
    tips: 'Você também pode comutar manualmente uma válvula clicando em suas extremidades esquerda/direita ou no indicador superior.',
  },
  {
    id: 'simulation',
    title: '4. Simulação, Osciloscópio e Opções',
    subtitle: 'Análise em tempo real, gráficos e personalização visual no menu Opções',
    steps: [
      'Simulação...: defina cores de linha (sem pressão, transmissor de pressão, vapor, corrente, digital Lo/Hi), velocidade (tempo real, contínuo ou fator de desaceleração 1:N), etiquetas e compatibilidade LOGO!Soft.',
      'Conexão de OPC/DDE...: selecione comunicação externa desativada, EasyPort direto, OPC ou DDE (Servidor/Tema).',
      'Som...: habilite ou silencie separadamente cliques e ruídos de Interruptor, Relé, Válvula, Cilindro e Indicador acústico.',
      'Didática...: ajuste a velocidade da animação (Lenta ↔ Rápida) e apresentação contínua manual ou automática.',
      'Grade... e Diagrama de atribuição de terminais...: configure largura (Grosso/Médio/Fino), estilo (Ponto/Cruz/Linha), otimização de bornes e visualize a tabela ao vivo de marcas (X1-1 ou 1X1).',
    ],
    tips: 'Use "Salvar configuração atual" ou "Salvar configuração ao sair" no menu Opções para manter suas preferências.',
  },
  {
    id: 'admin_shortcuts',
    title: '5. Administração Offline, Projetos e Atalhos',
    subtitle: 'Controle de acesso, alteração de usuário/senha do Admin e exportação',
    steps: [
      'No menu Configurações (disponível para Administrador), utilize o painel "Credenciais do Administrador" para editar seu nome de usuário, nome de exibição e senha de acesso.',
      'Também em Configurações, crie contas e gere chaves de acesso PBKDF2-SHA256 para Professores e Alunos ou edite usuários existentes na tabela.',
      'No menu Projetos / Arquivo, salve diagramas localmente, abra exemplos prontos ou exporte arquivos .fcproj e pacotes de backup.',
      'Atalhos úteis: Ctrl+Z (Desfazer), Ctrl+Y (Refazer), Ctrl+C / Ctrl+V (Copiar/Colar), Ctrl+X (Recortar), Ctrl+A (Selecionar Tudo), R (Rotacionar 90°), Del (Excluir seleção).',
    ],
    tips: 'Sempre que alterar o usuário ou senha do administrador, utilize as novas credenciais na tela de desbloqueio.',
  },
];

interface DidacticManualModalProps {
  open: boolean;
  initialTopic?: string | null;
  onClose: () => void;
}

export const DidacticManualModal: React.FC<DidacticManualModalProps> = ({
  open,
  initialTopic,
  onClose,
}) => {
  const mappedInitial = useMemo(() => {
    switch (initialTopic) {
      case 'simulation':
      case 'opc_dde':
      case 'sound':
      case 'didactic':
      case 'grid':
      case 'terminal':
        return 'simulation';
      default:
        return 'overview';
    }
  }, [initialTopic]);

  const [selectedId, setSelectedId] = useState<string>(mappedInitial);
  const [search, setSearch] = useState('');

  React.useEffect(() => {
    if (open) {
      setSelectedId(mappedInitial);
    }
  }, [open, mappedInitial]);

  if (!open) return null;

  const filteredSections = MANUAL_SECTIONS.filter((sec) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      sec.title.toLowerCase().includes(q) ||
      sec.subtitle.toLowerCase().includes(q) ||
      sec.steps.some((s) => s.toLowerCase().includes(q))
    );
  });

  const activeSection =
    filteredSections.find((s) => s.id === selectedId) ?? filteredSections[0] ?? MANUAL_SECTIONS[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Manual Didático de Uso"
      data-testid="didactic-manual-modal"
      className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/55 p-4"
    >
      <div className="w-full max-w-4xl max-h-[88vh] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
            <div>
              <h2 className="text-sm font-semibold">
                Didático — Manual de Uso (Matc Hidráulica / Neumática)
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Guia prático de montagem de circuitos, comandos elétricos, simulação e configurações
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Fechar manual didático"
            onClick={onClose}
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row">
          {/* Sidebar */}
          <aside className="w-full md:w-72 shrink-0 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex flex-col">
            <div className="p-3 border-b border-slate-200 dark:border-slate-800">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  aria-label="Pesquisar no manual"
                  placeholder="Pesquisar tópico no manual..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>

            <nav aria-label="Capítulos do manual" className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredSections.map((sec) => {
                const isSelected = activeSection?.id === sec.id;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setSelectedId(sec.id)}
                    className={`w-full px-3 py-2 rounded text-left text-xs transition-colors ${
                      isSelected
                        ? 'bg-sky-600 text-white font-medium'
                        : 'hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {sec.title}
                  </button>
                );
              })}
              {filteredSections.length === 0 && (
                <p className="p-3 text-xs text-slate-500">Nenhum tópico encontrado para "{search}".</p>
              )}
            </nav>
          </aside>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {activeSection.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {activeSection.subtitle}
              </p>
            </div>

            <ol className="space-y-3">
              {activeSection.steps.map((step, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 text-xs leading-relaxed"
                >
                  <span className="w-5 h-5 rounded-full bg-sky-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="text-slate-700 dark:text-slate-200">{step}</span>
                </li>
              ))}
            </ol>

            {activeSection.tips && (
              <div className="p-3.5 rounded-lg border border-sky-200 dark:border-sky-900/60 bg-sky-50/70 dark:bg-sky-950/30 text-xs text-sky-900 dark:text-sky-200 leading-relaxed">
                {activeSection.tips}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/80 text-xs">
          <span className="text-slate-500 dark:text-slate-400">
            Matc Hidráulica / Neumática · Guia Didático Integrado
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-sky-600 hover:bg-sky-700 text-white font-medium"
          >
            Fechar Manual
          </button>
        </div>
      </div>
    </div>
  );
};
