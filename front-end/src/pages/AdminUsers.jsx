import { useEffect, useMemo, useState } from 'react';
import { Edit3, KeyRound, Plus, RefreshCcw, Save, Search, Trash2, UserCheck, UserX, X } from 'lucide-react';
import api, { getApiError } from '../services/api.js';
import { formatDate } from '../services/lookups.js';

const emptyForm = {
  name: '',
  email: '',
  password: '',
  role: 'user',
  sector: '',
  broadcaster_id: ''
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [broadcasters, setBroadcasters] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadUsers(params = {}) {
    setLoading(true);
    setError('');

    try {
      const { data } = await api.get('/users', { params });
      setUsers(data.users);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
    loadBroadcasters();
  }, []);

  const activeCount = useMemo(() => users.filter((user) => user.is_active).length, [users]);

  function replaceUser(nextUser) {
    setUsers((current) => current.map((user) => (user.id === nextUser.id ? nextUser : user)));
  }

  async function loadBroadcasters() {
    try {
      const { data } = await api.get('/broadcasters');
      setBroadcasters(data.broadcasters || data.data || []);
    } catch {
      setBroadcasters([]);
    }
  }

  function setField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setError('');
  }

  function startEdit(user) {
    setEditingId(user.id);
    setForm({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role || 'user',
      sector: user.sector || '',
      broadcaster_id: user.broadcaster_id ? String(user.broadcaster_id) : ''
    });
    setError('');
    setSuccess('');
  }

  async function updateUser(userId, payload) {
    setSavingId(userId);
    setError('');

    try {
      const { data } = await api.patch(`/users/${userId}`, payload);
      replaceUser(data.user);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSavingId(null);
    }
  }

  function handleSearch(event) {
    event.preventDefault();
    loadUsers(search ? { search } : {});
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const currentSavingId = editingId || 'new';
    setSavingId(currentSavingId);
    setError('');
    setSuccess('');

    try {
      const payload = {
        name: form.name,
        email: form.email,
        role: form.role,
        sector: form.sector,
        broadcaster_id: form.broadcaster_id || null
      };

      if (!editingId) {
        payload.password = form.password;
        await api.post('/users/admin', payload);
        setSuccess('Usuário criado com sucesso.');
      } else {
        await api.patch(`/users/${editingId}`, payload);
        setSuccess('Usuário atualizado com sucesso.');
      }

      resetForm();
      await loadUsers(search ? { search } : {});
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSavingId(null);
    }
  }

  async function resetPassword(user) {
    if (!window.confirm(`Gerar token de redefinição para ${user.name}?`)) return;

    setSavingId(user.id);
    setError('');
    setSuccess('');

    try {
      const { data } = await api.put(`/users/admin/${user.id}/reset-password`);
      setSuccess(`Token de redefinição: ${data.token}`);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSavingId(null);
    }
  }

  async function deleteUser(user) {
    if (!window.confirm(`Remover o usuário ${user.name}?`)) return;

    setSavingId(user.id);
    setError('');
    setSuccess('');

    try {
      await api.delete(`/users/admin/${user.id}`);
      setUsers((current) => current.filter((item) => item.id !== user.id));
      setSuccess('Usuário removido.');
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <main className="page space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="section-title">Usuários</h1>
          <p className="section-subtitle">{activeCount} usuários ativos</p>
        </div>
        <button className="btn btn-secondary" type="button" onClick={() => loadUsers(search ? { search } : {})}>
          <RefreshCcw size={16} aria-hidden="true" />
          Atualizar
        </button>
      </div>

      <section className="panel panel-pad">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-ink">{editingId ? 'Editar usuário' : 'Novo usuário'}</h2>
          {editingId && (
            <button className="btn btn-secondary" type="button" onClick={resetForm}>
              <X size={16} aria-hidden="true" />
              Cancelar
            </button>
          )}
        </div>

        <form className="grid gap-4 lg:grid-cols-6" onSubmit={handleSubmit}>
          <label className="field lg:col-span-2">
            <span className="label">Nome</span>
            <input className="input" required value={form.name} onChange={(event) => setField('name', event.target.value)} />
          </label>
          <label className="field lg:col-span-2">
            <span className="label">E-mail</span>
            <input className="input" type="email" required value={form.email} onChange={(event) => setField('email', event.target.value)} />
          </label>
          {!editingId && (
            <label className="field lg:col-span-2">
              <span className="label">Senha inicial</span>
              <input className="input" type="password" minLength={8} required value={form.password} onChange={(event) => setField('password', event.target.value)} />
            </label>
          )}
          <label className="field">
            <span className="label">Permissão</span>
            <select className="input" value={form.role} onChange={(event) => setField('role', event.target.value)}>
              <option value="user">Comum</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <label className="field lg:col-span-2">
            <span className="label">Setor</span>
            <input className="input" required value={form.sector} onChange={(event) => setField('sector', event.target.value)} />
          </label>
          <label className="field lg:col-span-2">
            <span className="label">Emissora</span>
            <select className="input" value={form.broadcaster_id} onChange={(event) => setField('broadcaster_id', event.target.value)}>
              <option value="">Sem emissora</option>
              {broadcasters.map((broadcaster) => (
                <option key={broadcaster.id} value={broadcaster.id}>
                  {broadcaster.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end lg:col-span-1">
            <button 
              className="btn btn-primary w-full" 
              type="submit" 
              disabled={savingId === 'new' || (editingId !== null && savingId === editingId)}>
              {editingId ? <Save size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
              {editingId ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </section>

      <section className="panel panel-pad">
        <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={handleSearch}>
          <label className="field flex-1">
            <span className="label inline-flex items-center gap-2">
              <Search size={15} aria-hidden="true" />
              Busca
            </span>
            <input className="input" value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
          <button className="btn btn-primary" type="submit">
            Buscar
          </button>
        </form>
      </section>

      {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}
      {success && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{success}</div>}

      {loading ? (
        <div className="empty-state">Carregando usuários...</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Setor</th>
                <th>Permissão</th>
                <th>Status</th>
                <th>Criado em</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {users.map((item) => (
                <tr key={item.id}>
                  <td className="font-semibold text-ink">{item.name}</td>
                  <td className="break-all">{item.email}</td>
                  <td>{item.sector}</td>
                  <td>
                    <label className="sr-only" htmlFor={`role-${item.id}`}>
                      Permissão de {item.name}
                    </label>
                    <select
                      id={`role-${item.id}`}
                      className="input min-w-36"
                      value={item.role}
                      disabled={savingId === item.id}
                      onChange={(event) => updateUser(item.id, { role: event.target.value })}
                    >
                      <option value="user">Comum</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>
                    <span className={`inline-flex min-h-7 items-center rounded-full border px-2.5 text-xs font-semibold ${item.is_active ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-100 text-slate-700'}`}>
                      {item.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td>{formatDate(item.created_at)}</td>
                  <td className="text-right">
                    <div className="inline-flex gap-2">
                      <button className="icon-btn" type="button" title="Editar usuário" onClick={() => startEdit(item)}>
                        <Edit3 size={16} aria-hidden="true" />
                      </button>
                      <button className="icon-btn" type="button" title="Resetar senha" disabled={savingId === item.id} onClick={() => resetPassword(item)}>
                        <KeyRound size={16} aria-hidden="true" />
                      </button>
                      <button
                        className={item.is_active ? 'icon-btn text-danger' : 'icon-btn text-success'}
                        type="button"
                        title={item.is_active ? 'Desativar usuário' : 'Ativar usuário'}
                        disabled={savingId === item.id}
                        onClick={() => updateUser(item.id, { is_active: !item.is_active })}
                      >
                        {item.is_active ? <UserX size={16} aria-hidden="true" /> : <UserCheck size={16} aria-hidden="true" />}
                      </button>
                      <button className="icon-btn text-danger" type="button" title="Remover usuário" disabled={savingId === item.id} onClick={() => deleteUser(item)}>
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!users.length && <div className="empty-state rounded-none border-0">Nenhum usuário encontrado.</div>}
        </div>
      )}
    </main>
  );
}
