import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LockKeyhole, LogIn, Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext.jsx';
import { getApiError } from '../services/api.js';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { isSubmitting }
  } = useForm();

  async function onSubmit(values) {
    setError('');

    try {
      const user = await login(values);
      navigate(user.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    } catch (err) {
      setError(getApiError(err));
    }
  }

  return (
    <main className="auth-page">
      <section className="panel w-full max-w-md panel-pad">
        <div className="mb-6">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-md bg-brand text-sm font-black text-white">
            GTF
          </div>
          <h1 className="section-title">Entrar</h1>
          <p className="section-subtitle">Help Desk Interno</p>
        </div>

        {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <label className="field">
            <span className="label">E-mail</span>
            <span className="relative block">
              <Mail className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18} aria-hidden="true" />
              <input className="input pl-10" type="email" autoComplete="email" required {...register('email')} />
            </span>
          </label>

          <label className="field">
            <span className="label">Senha</span>
            <span className="relative block">
              <LockKeyhole className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18} aria-hidden="true" />
              <input className="input pl-10" type="password" autoComplete="current-password" required {...register('password')} />
            </span>
          </label>

          <button className="btn btn-primary w-full" type="submit" disabled={isSubmitting}>
            <LogIn size={16} aria-hidden="true" />
            Entrar
          </button>
        </form>

        <div className="mt-5 flex flex-wrap justify-between gap-3 text-sm">
          <Link className="font-semibold text-brand hover:underline" to="/forgot-password">
            Esqueci minha senha
          </Link>
          <Link className="font-semibold text-brand hover:underline" to="/register">
            Criar conta
          </Link>
        </div>
      </section>
    </main>
  );
}
