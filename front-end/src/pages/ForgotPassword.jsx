import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Send } from 'lucide-react';
import { useForm } from 'react-hook-form';
import api, { getApiError } from '../services/api.js';

export default function ForgotPassword() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { isSubmitting }
  } = useForm();

  async function onSubmit(values) {
    setError('');
    setMessage('');

    try {
      const { data } = await api.post('/auth/forgot-password', values);
      setMessage(data.message);
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
          <h1 className="section-title">Redefinir senha</h1>
          <p className="section-subtitle">Enviaremos um link temporário</p>
        </div>

        {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}
        {message && <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</div>}

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <label className="field">
            <span className="label">E-mail</span>
            <span className="relative block">
              <Mail className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18} aria-hidden="true" />
              <input className="input pl-10" type="email" autoComplete="email" required {...register('email')} />
            </span>
          </label>

          <button className="btn btn-primary w-full" type="submit" disabled={isSubmitting}>
            <Send size={16} aria-hidden="true" />
            Enviar link
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
