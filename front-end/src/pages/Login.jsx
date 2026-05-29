import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LockKeyhole, LogIn, Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext.jsx';
import { getApiError } from '../services/api.js';
import backgroundImage from '../images/logogtf-login.png';
import logoHorizontal from '../images/logohorizontal.png';

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
    <main 
      className="auth-page" 
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <div className="absolute inset-0 bg-slate-900/10 pointer-events-none" />

      <section className="panel w-full max-w-md panel-pad backdrop-blur-sm bg-surface/95 z-10">
        <div className="mb-6">
          <img 
            src={logoHorizontal} 
            alt="Grupo Torre Forte" 
            className="mb-4 h-auto w-full max-w-[240px] object-contain mx-auto"
          />
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