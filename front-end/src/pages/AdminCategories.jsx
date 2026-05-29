import { useEffect, useMemo, useState } from 'react';
import { Edit3, Plus, RefreshCcw, Save, Trash2, X } from 'lucide-react';
import api, { getApiError } from '../services/api.js';
import { formatDate } from '../services/lookups.js';

const emptyForm = {
  name: '',
  description: '',
  sort_order: 0,
  color: '',
  icon: ''
};

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const activeCount = useMemo(() => categories.filter((item) => item.is_active).length, [categories]);

  async function loadCategories() {
    setLoading(true);
    setError('');

    try {
      const { data } = await api.get('/categories/admin');
      setCategories(data.data || data.categories || []);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  function setField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setError('');
  }

  function startEdit(category) {
    setEditingId(category.id);
    setForm({
      name: category.name || '',
      description: category.description || '',
      sort_order: category.sort_order || 0,
      color: category.color || '',
      icon: category.icon || ''
    });
    setError('');
    setSuccess('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        ...form,
        sort_order: Number(form.sort_order || 0)
      };
      if (editingId) {
        await api.put(`/categories/admin/${editingId}`, payload);
        setSuccess('Categoria atualizada com sucesso.');
      } else {
        await api.post('/categories/admin', payload);
        setSuccess('Categoria criada com sucesso.');
      }
      resetForm();
      await loadCategories();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleCategory(category) {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await api.patch(`/categories/admin/${category.id}/toggle`);
      await loadCategories();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(category) {
    if (!window.confirm(`Remover a categoria ${category.name}?`)) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await api.delete(`/categories/admin/${category.id}`);
      await loadCategories();
      setSuccess('Categoria removida.');
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="section-title">Categorias</h1>
          <p className="section-subtitle">{activeCount} categorias ativas</p>
        </div>
        <button className="btn btn-secondary" type="button" onClick={loadCategories}>
          <RefreshCcw size={16} aria-hidden="true" />
          Atualizar
        </button>
      </div>

      <section className="panel panel-pad">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-ink">{editingId ? 'Editar categoria' : 'Nova categoria'}</h2>
          {editingId && (
            <button className="btn btn-secondary" type="button" onClick={resetForm}>
              <X size={16} aria-hidden="true" />
              Cancelar
            </button>
          )}
        </div>

        {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}
        {success && <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{success}</div>}

        <form className="grid gap-4 lg:grid-cols-5" onSubmit={handleSubmit}>
          <label className="field lg:col-span-2">
            <span className="label">Nome</span>
            <input className="input" maxLength={80} required value={form.name} onChange={(event) => setField('name', event.target.value)} />
          </label>
          <label className="field lg:col-span-2">
            <span className="label">Descrição</span>
            <input className="input" value={form.description} onChange={(event) => setField('description', event.target.value)} />
          </label>
          {/* <label className="field">
            <span className="label">Ordem</span>
            <input className="input" type="number" value={form.sort_order} onChange={(event) => setField('sort_order', event.target.value)} />
          </label> */}
          {/* <label className="field">
            <span className="label">Cor</span>
            <input className="input" placeholder="#2563eb" value={form.color} onChange={(event) => setField('color', event.target.value)} />
          </label>
          <label className="field lg:col-span-3">
            <span className="label">Ícone</span>
            <input className="input" placeholder="Ex.: monitor, radio, printer" value={form.icon} onChange={(event) => setField('icon', event.target.value)} />
          </label> */}
          <div className="flex items-end lg:col-span-5">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {editingId ? <Save size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
              {editingId ? 'Salvar categoria' : 'Criar categoria'}
            </button>
          </div>
        </form>
      </section>

      {loading ? (
        <div className="empty-state">Carregando categorias...</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Descrição</th>
                <th>Ordem</th>
                <th>Status</th>
                <th>Atualizada em</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {categories.map((category) => (
                <tr key={category.id}>
                  <td className="font-semibold text-ink">{category.name}</td>
                  <td>{category.description || '-'}</td>
                  <td>{category.sort_order ?? 0}</td>
                  <td>
                    <button className="btn btn-secondary min-w-24" type="button" disabled={saving} onClick={() => toggleCategory(category)}>
                      {category.is_active ? 'Ativa' : 'Inativa'}
                    </button>
                  </td>
                  <td>{formatDate(category.updated_at)}</td>
                  <td className="text-right">
                    <div className="inline-flex gap-2">
                      <button className="icon-btn" type="button" title="Editar" onClick={() => startEdit(category)}>
                        <Edit3 size={16} aria-hidden="true" />
                      </button>
                      <button className="icon-btn text-danger" type="button" title="Remover" disabled={saving} onClick={() => deleteCategory(category)}>
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!categories.length && <div className="empty-state rounded-none border-0">Nenhuma categoria encontrada.</div>}
        </div>
      )}
    </main>
  );
}
