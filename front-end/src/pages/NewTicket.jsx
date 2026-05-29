import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext.jsx';
import api, { getApiError } from '../services/api.js';
import { categoryLabels, defaultCategories, labelFor, priorities, priorityLabels } from '../services/lookups.js';

const allowedAttachmentTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];
const maxAttachmentKbByType = {
  'image/jpeg': 2 * 1024,
  'image/png': 2 * 1024,
  'image/webp': 2 * 1024,
  'video/mp4': 10 * 1024
};

export default function NewTicket() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [categories, setCategories] = useState(defaultCategories);
  const [attachments, setAttachments] = useState([]);
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { isSubmitting }
  } = useForm({
    defaultValues: {
      category: 'Radio',
      priority: 'Media',
      location: user?.sector || ''
    }
  });

  useEffect(() => {
    let mounted = true;

    async function loadCategories() {
      try {
        const { data } = await api.get('/tickets/categories');
        if (mounted && data.categories?.length) {
          setCategories(data.categories.map((category) => category.name));
        }
      } catch {
        setCategories(defaultCategories);
      }
    }

    loadCategories();
    return () => {
      mounted = false;
    };
  }, []);

  async function onSubmit(values) {
    setError('');

    try {
      const { data } = await api.post('/tickets', { ...values, attachments });
      navigate(`/tickets/${data.ticket.id}`);
    } catch (err) {
      setError(getApiError(err));
    }
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleFilesChange(event) {
    const files = Array.from(event.target.files || []);
    setError('');

    if (files.length > 3) {
      setError('Envie no máximo 3 anexos por chamado.');
      event.target.value = '';
      return;
    }

    const invalidType = files.find((file) => !allowedAttachmentTypes.includes(file.type));
    if (invalidType) {
      setError('Tipo de anexo não permitido. Envie JPG, PNG, WEBP ou MP4.');
      event.target.value = '';
      return;
    }

    const oversizedFile = files.find((file) => Math.ceil(file.size / 1024) > maxAttachmentKbByType[file.type]);
    if (oversizedFile) {
      setError('Anexo excede o tamanho máximo permitido. Imagens até 2MB e vídeo MP4 até 10MB.');
      event.target.value = '';
      return;
    }

    try {
      const nextAttachments = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          mime_type: file.type,
          size_kb: Math.ceil(file.size / 1024),
          data_base64: await fileToBase64(file)
        }))
      );
      setAttachments(nextAttachments);
    } catch {
      setError('Não foi possível carregar os anexos.');
    }
  }

  return (
    <main className="page space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="section-title">Novo chamado</h1>
          <p className="section-subtitle">Solicitação de suporte de TI</p>
        </div>
        <button className="btn btn-secondary" type="button" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar
        </button>
      </div>

      <section className="panel panel-pad">
        {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}

        <form className="grid gap-4 lg:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
          <label className="field lg:col-span-2">
            <span className="label">Título</span>
            <input className="input" maxLength={160} required {...register('title')} />
          </label>

          <label className="field">
            <span className="label">Categoria</span>
            <select className="input" required {...register('category')}>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {labelFor(categoryLabels, category)}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="label">Prioridade</span>
            <select className="input" required {...register('priority')}>
              {priorities.map((priority) => (
                <option key={priority} value={priority}>
                  {labelFor(priorityLabels, priority)}
                </option>
              ))}
            </select>
          </label>

          <label className="field lg:col-span-2">
            <span className="label">Localização/Setor</span>
            <input className="input" required {...register('location')} />
          </label>

          {/* <label className="field">
            <span className="label">Tipo do problema</span>
            <input className="input" placeholder="Ex.: Sem áudio, internet lenta" {...register('problem_type')} />
          </label>

          <label className="field">
            <span className="label">Ambiente afetado</span>
            <input className="input" placeholder="Ex.: Estúdio, recepção, torre" {...register('affected_environment')} />
          </label>

          <label className="field">
            <span className="label">Equipamento afetado</span>
            <input className="input" placeholder="Ex.: PC, transmissor, impressora" {...register('affected_equipment')} />
          </label>

          <label className="field">
            <span className="label">Patrimônio</span>
            <input className="input" placeholder="Número de patrimônio, se houver" {...register('patrimony_number')} />
          </label> */}

          <label className="field lg:col-span-2">
            <span className="label">Descrição detalhada</span>
            <textarea className="textarea" required {...register('description')} />
          </label>

          <label className="field lg:col-span-2">
            <span className="label">Fotos/Vídeo do problema</span>
            <input className="input" type="file" accept="image/jpeg,image/png,image/webp,video/mp4" multiple onChange={handleFilesChange} />
            <span className="text-xs text-slate-500">Até 3 arquivos. Imagens até 2MB e vídeo MP4 até 10MB.</span>
            {attachments.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {attachments.map((attachment) => (
                  <span className="rounded-full border border-line bg-muted px-3 py-1 text-xs font-semibold text-slate-700" key={attachment.name}>
                    {attachment.name} ({attachment.size_kb} KB)
                  </span>
                ))}
              </div>
            )}
          </label>

          <div className="flex justify-end lg:col-span-2">
            <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
              <Save size={16} aria-hidden="true" />
              Abrir chamado
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
