import { Link, useNavigate } from 'react-router-dom';
import { Building2, Mail, UserRound, UserRoundPlus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext.jsx';
import { getApiError } from '../services/api.js';
import { useEffect, useState } from 'react';
import api from '../services/api.js';

export default function Register() {
  const navigate = useNavigate();
  const { register: createAccount } = useAuth();
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { isSubmitting }
  } = useForm();

  const [broadcasters, setBroadcasters] = useState([]);
  useEffect(() => { loadBroadcasters(); }, []);
  async function onSubmit(values) {
    setError('');

    try {
      const user = await createAccount(values);
      navigate(user.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    } catch (err) {
      setError(getApiError(err));
    }
  }
  async function loadBroadcasters() { try { const { data } = await api.get('/broadcasters'); setBroadcasters(data.broadcasters || data.data || []); } catch { setBroadcasters([]); } }
  return (
    <main className="auth-page">
      <section className="panel w-full max-w-lg panel-pad">
        <div className="mb-6">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-md bg-brand text-sm font-black text-white">
            GTF
          </div>
          <h1 className="section-title">Criar conta</h1>
          <p className="section-subtitle">Informe seus dados de acesso</p>
        </div>

        {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <label className="field">
            <span className="label">Nome</span>
            <span className="relative block">
              <UserRound className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18} aria-hidden="true" />
              <input className="input pl-10" autoComplete="name" required {...register('name')} />
            </span>
          </label>

          <label className="field">
            <span className="label">E-mail</span>
            <span className="relative block">
              <Mail className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18} aria-hidden="true" />
              <input className="input pl-10" type="email" autoComplete="email" required {...register('email')} />
            </span>
          </label>

          <label className="field"> 
            <span className="label">Emissora</span> 
            <span className="relative block"> 
              <Building2 className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18} aria-hidden="true" /> 
              <select className="input pl-10" required {...register('broadcaster_id')} >
                 <option value="">Selecione uma emissora</option> 
                 {broadcasters.map((broadcaster) => ( <option key={broadcaster.id} value={broadcaster.id}> {broadcaster.name} </option> ))} 
                 </select> 
            </span> </label>

          <label className="field">
            <span className="label">Senha</span>
            <input className="input" type="password" minLength={8} autoComplete="new-password" required {...register('password')} />
          </label>

          <button className="btn btn-primary w-full" type="submit" disabled={isSubmitting}>
            <UserRoundPlus size={16} aria-hidden="true" />
            Cadastrar
          </button>
        </form>

        <div className="mt-5 text-sm">
          <Link className="font-semibold text-brand hover:underline" to="/login">
            Voltar para login
          </Link>
        </div>
      </section>
    </main>
  );
}
