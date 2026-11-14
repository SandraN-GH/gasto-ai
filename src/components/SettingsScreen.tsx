import {
  Check,
  Download,
  Loader2,
  LogOut,
  Moon,
  PenLine,
  Plus,
  Sun,
  Trash2,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useState } from 'react';
import type { Category } from '../types';
import { formatCurrencyInline } from '../utils/format';
import { CATEGORY_ICON_OPTIONS, CategoryIcon } from './CategoryIcon';
import { PWAInstallButton } from './PWAInstallButton';
import { ErrorStateCard } from './ScreenStates';

interface SettingsScreenProps {
  displayName: string;
  userEmail: string;
  darkMode: boolean;
  categories: Category[] | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onToggleTheme: () => void;
  onSignOut: () => Promise<void>;
  onExportCsv: () => Promise<void>;
  onCreateCategory: (payload: {
    name: string;
    color: string;
    icon: string;
    budget_cents?: number;
  }) => Promise<void>;
  onUpdateCategory: (
    id: string,
    payload: { name: string; color: string; icon: string }
  ) => Promise<void>;
  onDeleteCategory: (id: string, reassignTo?: string) => Promise<void>;
}

const COLOR_PRESETS = [
  '#6366F1',
  '#F97316',
  '#3B82F6',
  '#10B981',
  '#EC4899',
  '#8B5CF6',
  '#F59E0B',
  '#64748B',
];

export function SettingsScreen({
  displayName,
  userEmail,
  darkMode,
  categories,
  loading,
  error,
  onRetry,
  onToggleTheme,
  onSignOut,
  onExportCsv,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
}: SettingsScreenProps) {
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(COLOR_PRESETS[0]);
  const [newIcon, setNewIcon] = useState<string>('tag');
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#6366F1');
  const [editIcon, setEditIcon] = useState('tag');
  const [savingEdit, setSavingEdit] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reassignTargetId, setReassignTargetId] = useState<string>('');
  const [deleting, setDeleting] = useState(false);

  const [exporting, setExporting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const list = categories ?? [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed || creating) return;
    setActionError(null);
    setCreating(true);
    try {
      await onCreateCategory({
        name: trimmed,
        color: newColor,
        icon: newIcon,
      });
      setNewName('');
      setNewColor(COLOR_PRESETS[0]);
      setNewIcon('tag');
      setNewOpen(false);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Não foi possível criar a categoria.'
      );
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (cat: Category) => {
    setActionError(null);
    setDeletingId(null);
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditColor(cat.color || '#6366F1');
    setEditIcon(cat.icon || 'tag');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editName.trim() || savingEdit) return;
    setActionError(null);
    setSavingEdit(true);
    try {
      await onUpdateCategory(editingId, {
        name: editName.trim(),
        color: editColor,
        icon: editIcon,
      });
      setEditingId(null);
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : 'Não foi possível atualizar a categoria.'
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const startDelete = (cat: Category) => {
    setActionError(null);
    setEditingId(null);
    setDeletingId(cat.id);
    const fallback = list.find((c) => c.id !== cat.id);
    setReassignTargetId(fallback?.id ?? '');
  };

  const handleConfirmDelete = async () => {
    if (!deletingId || deleting) return;
    setActionError(null);
    setDeleting(true);
    try {
      await onDeleteCategory(deletingId, reassignTargetId || undefined);
      setDeletingId(null);
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : 'Não foi possível excluir a categoria.'
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async () => {
    setActionError(null);
    setExporting(true);
    try {
      await onExportCsv();
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : 'Não foi possível exportar o arquivo CSV.'
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-[30px] font-bold tracking-tight text-[var(--text-primary)]">
          Configurações
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Gerencie suas categorias, exportação de dados, aparência e conta
        </p>
      </div>

      {/* Gerenciamento de categorias */}
      <section className="tier-1-card rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Categorias de despesas
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Personalize nome, cor e ícone das suas categorias
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setActionError(null);
              setNewOpen((v) => !v);
            }}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            {newOpen ? <X size={14} /> : <Plus size={14} />}
            <span>{newOpen ? 'Fechar' : 'Nova categoria'}</span>
          </button>
        </div>

        {actionError && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-rose-500/12 border border-rose-500/30 text-xs text-rose-400"
          >
            {actionError}
          </div>
        )}

        {newOpen && (
          <form
            onSubmit={handleCreate}
            className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] space-y-4"
          >
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                Nome da categoria
              </label>
              <input
                type="text"
                required
                maxLength={40}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex.: Saúde, Assinaturas, Pets..."
                className="w-full h-10 px-3.5 rounded-xl bg-[var(--canvas)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-2">
              <span className="block text-xs font-medium text-[var(--text-muted)]">
                Cor
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    aria-label={`Selecionar cor ${c}`}
                    className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${
                      newColor === c
                        ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110'
                        : 'opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <span className="block text-xs font-medium text-[var(--text-muted)]">
                Ícone
              </span>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_ICON_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setNewIcon(opt.id)}
                    title={opt.label}
                    aria-label={opt.label}
                    className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                      newIcon === opt.id
                        ? 'border-indigo-500 bg-indigo-500/12'
                        : 'border-[var(--border-subtle)] hover:bg-[var(--canvas)]'
                    }`}
                  >
                    <CategoryIcon icon={opt.id} color={newColor} size="sm" />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={creating || !newName.trim()}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
              >
                {creating && <Loader2 size={14} className="animate-spin" />}
                <span>{creating ? 'Criando...' : 'Criar categoria'}</span>
              </button>
            </div>
          </form>
        )}

        {loading && !categories ? (
          <div className="space-y-3 py-2" aria-busy="true">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 rounded-xl bg-[var(--surface-2)] animate-pulse"
              />
            ))}
          </div>
        ) : error && !categories ? (
          <ErrorStateCard message={error} onRetry={onRetry} />
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {list.map((cat) => {
              const isEditing = editingId === cat.id;
              const isDeleting = deletingId === cat.id;

              if (isEditing) {
                return (
                  <form
                    key={cat.id}
                    onSubmit={handleSaveEdit}
                    className="py-4 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        required
                        maxLength={40}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        aria-label="Nome da categoria"
                        className="flex-1 h-10 px-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                      />
                      <div className="flex items-center gap-1.5">
                        {COLOR_PRESETS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setEditColor(c)}
                            aria-label={`Cor ${c}`}
                            className={`w-6 h-6 rounded-full cursor-pointer ${
                              editColor === c
                                ? 'ring-2 ring-offset-2 ring-indigo-500'
                                : 'opacity-75'
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {CATEGORY_ICON_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setEditIcon(opt.id)}
                          title={opt.label}
                          aria-label={opt.label}
                          className={`p-1 rounded-xl border transition-colors cursor-pointer ${
                            editIcon === opt.id
                              ? 'border-indigo-500 bg-indigo-500/12'
                              : 'border-[var(--border-subtle)]'
                          }`}
                        >
                          <CategoryIcon
                            icon={opt.id}
                            color={editColor}
                            size="sm"
                          />
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="h-9 px-3 rounded-lg border border-[var(--border-strong)] text-xs font-semibold text-[var(--text-muted)] cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={savingEdit || !editName.trim()}
                        className="h-9 px-3.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        {savingEdit ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Check size={13} />
                        )}
                        <span>Salvar</span>
                      </button>
                    </div>
                  </form>
                );
              }

              return (
                <div key={cat.id} className="py-3.5 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <CategoryIcon
                        icon={cat.icon}
                        color={cat.color ?? '#64748B'}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                          {cat.name}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] tabular-financial">
                          {cat.budget_cents > 0
                            ? `Teto: ${formatCurrencyInline(cat.budget_cents)}`
                            : 'Sem teto definido'}
                          {cat.is_default === 1 && ' · Padrão'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEdit(cat)}
                        aria-label={`Editar categoria ${cat.name}`}
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
                      >
                        <PenLine size={15} />
                      </button>
                      {list.length > 1 && (
                        <button
                          type="button"
                          onClick={() => startDelete(cat)}
                          aria-label={`Excluir categoria ${cat.name}`}
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/12 transition-colors cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>

                  {isDeleting && (
                    <div className="p-3 rounded-xl bg-rose-500/8 border border-rose-500/25 space-y-2.5">
                      <p className="text-xs text-[var(--text-primary)] font-medium">
                        Excluir "{cat.name}"? Despesas existentes serão movidas
                        para:
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={reassignTargetId}
                          onChange={(e) => setReassignTargetId(e.target.value)}
                          aria-label="Categoria de destino"
                          className="h-9 px-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] flex-1 min-w-[160px]"
                        >
                          {list
                            .filter((c) => c.id !== cat.id)
                            .map((other) => (
                              <option key={other.id} value={other.id}>
                                {other.name}
                              </option>
                            ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setDeletingId(null)}
                          className="h-9 px-3 rounded-lg border border-[var(--border-strong)] text-xs font-semibold text-[var(--text-muted)] cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          disabled={deleting}
                          onClick={handleConfirmDelete}
                          className="h-9 px-3.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          {deleting && (
                            <Loader2 size={13} className="animate-spin" />
                          )}
                          <span>Confirmar exclusão</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Exportação & Aparência */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="tier-1-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Exportação de dados
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
              Baixe todas as suas despesas em arquivo CSV compatível com Excel e
              Google Planilhas.
            </p>
          </div>
          <button
            type="button"
            disabled={exporting}
            onClick={handleExport}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-[var(--border-strong)] hover:bg-[var(--surface-2)] text-xs font-semibold text-[var(--text-primary)] transition-colors cursor-pointer self-start"
          >
            {exporting ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Download size={15} />
            )}
            <span>{exporting ? 'Gerando CSV...' : 'Exportar CSV'}</span>
          </button>
        </section>

        <section className="tier-1-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Tema e aplicativo
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
              Alterne entre o modo claro e o modo escuro ou instale o GastoIA na
              tela inicial do seu aparelho.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onToggleTheme}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-[var(--border-strong)] hover:bg-[var(--surface-2)] text-xs font-semibold text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              {darkMode ? <Sun size={15} /> : <Moon size={15} />}
              <span>
                {darkMode ? 'Alternar para tema claro' : 'Alternar para tema escuro'}
              </span>
            </button>
            <PWAInstallButton />
          </div>
        </section>
      </div>

      {/* Conta */}
      <section className="tier-1-card rounded-2xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-full bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0">
            <UserIcon size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
              {displayName}
            </p>
            <p className="text-xs text-[var(--text-muted)] truncate">
              {userEmail}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void onSignOut()}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-rose-500/12 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold transition-colors cursor-pointer"
        >
          <LogOut size={15} />
          <span>Sair da conta</span>
        </button>
      </section>
    </div>
  );
}
