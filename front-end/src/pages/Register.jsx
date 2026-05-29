import { Link, useNavigate } from 'react-router-dom';
import { Building2, Mail, UserRound, UserRoundPlus, Briefcase } from 'lucide-react'; // Adicionado ícone Briefcase
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext.jsx';
import { getApiError } from '../services/api.js';
import { useEffect, useState } from 'react';
import api from '../services/api.js';
import backgroundImage from '../images/logogtf-login.png';
import logoHorizontal from '../images/logohorizontal.png';

export default function Register() {
  const navigate = useNavigate();
  const { register: createAccount } = useAuth();
  
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { isSubmitting }
  } = useForm({
    defaultValues: {
      role: 'user',
      sector: '',
      broadcaster_id: ''
    }
  });

  const [broadcasters, setBroadcasters] = useState([]);
  
  useEffect(() => { 
    loadBroadcasters(); 
  }, []);

  async function onSubmit(values) {
    setError('');

    try {
      const payload = {
        ...values,
        role: 'user'
      };

      const user = await createAccount(payload);
      navigate(user.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    } catch (err) {
      setError(getApiError(err));
    }
  }

  async function loadBroadcasters() {
    try {
      const { data } = await api.get('/broadcasters', {
        headers: {
          Authorization: undefined
        }
      });
      setBroadcasters(data.broadcasters || data.data || []);
    } catch (err) {
      console.error("Erro ao carregar emissoras no Register:", err);
      setBroadcasters([]);
    }
  }  

  return (
    <main className="auth-page" style={{ backgroundImage: `url(${backgroundImage})` }}>
      <section className="panel w-full max-w-lg panel-pad backdrop-blur-sm bg-surface/95 z-10">
        <div className="mb-6 text-center">
          <img 
            src={logoHorizontal} 
            alt="Grupo Torre Forte" 
            className="mb-4 h-auto w-full max-w-[240px] object-contain mx-auto"
          />
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
            <span className="label">Emissora (Rádio)</span> 
            <span className="relative block"> 
              <Building2 className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18} aria-hidden="true" /> 
              
              <select 
                className="input pl-10 pr-4 bg-white" 
                required 
                {...register('broadcaster_id')}
              >
                <option value="">Selecione uma emissora</option> 
                {broadcasters.map((broadcaster) => (
                  <option key={broadcaster.id} value={broadcaster.id}>
                    {broadcaster.name}
                  </option>
                ))}
              </select>
            </span> 
          </label>

          <label className="field">
            <span className="label">Setor</span>
            <span className="relative block">
              <Briefcase className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18} aria-hidden="true" />
              <input 
                className="input pl-10" 
                placeholder="Ex: TI, Financeiro, Comercial, Produção" 
                required 
                {...register('sector')} 
              />
            </span>
          </label>

          <label className="field">
            <span className="label">Senha</span>
            <input className="input" type="password" minLength={8} autoComplete="new-password" required {...register('password')} />
          </label>

          <button className="btn btn-primary w-full" type="submit" disabled={isSubmitting}>
            <UserRoundPlus size={16} aria-hidden="true" />
            Cadastrar
          </button>
        </form>

        <div className="mt-5 text-sm text-center">
          <Link className="font-semibold text-brand hover:underline" to="/login">
            Voltar para login
          </Link>
        </div>
      </section>
    </main>
  );
}