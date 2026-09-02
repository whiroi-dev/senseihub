import { useState, useEffect } from 'react';
import { api } from '../services/api';

interface DojoConfig {
  name: string;
  president: string;
  defaultShihan: string;
  defaultSensei: string;
  defaultAssociation: string;
  logoPrimaryUrl: string | null;
  logoSecondaryUrl: string | null;
  city: string;
  showShihanText: boolean;
  showKanjiText: boolean;
  diplomaBackground?: string;
  diplomaBackgroundImageUrl?: string | null;
}

export const ConfiguracoesPage = () => {
  const [config, setConfig] = useState<DojoConfig>({
    name: '', president: '', defaultShihan: '', defaultSensei: '', defaultAssociation: '',
    logoPrimaryUrl: null, logoSecondaryUrl: null, city: '', showShihanText: false, showKanjiText: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [urlInputPrimary, setUrlInputPrimary] = useState('');
  const [urlInputSecondary, setUrlInputSecondary] = useState('');
  const [showUrlInput, setShowUrlInput] = useState<{ primary: boolean; secondary: boolean }>({ primary: false, secondary: false });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data } = await api.get('/dojo/config');
      setConfig({
        name: data.name || '',
        president: data.president || '',
        defaultShihan: data.defaultShihan || '',
        defaultSensei: data.defaultSensei || '',
        defaultAssociation: data.defaultAssociation || '',
        logoPrimaryUrl: data.logoPrimaryUrl,
        logoSecondaryUrl: data.logoSecondaryUrl,
        city: data.city || '',
        showShihanText: data.showShihanText || false,
        showKanjiText: data.showKanjiText || false,
          diplomaBackground: data.diplomaBackground || 'sunset',
          diplomaBackgroundImageUrl: data.diplomaBackgroundImageUrl || null,
      });
    } catch (error) {
      console.error('Falha ao carregar configurações');
    } finally {
      setIsLoading(false);
    }
  };

    const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('logo', file);
    formData.append('type', 'background');

    try {
      const { data } = await api.post('/dojo/upload-logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setConfig(prev => ({
        ...prev,
        diplomaBackgroundImageUrl: data.url
      }));
    } catch (error) {
      alert('Erro ao fazer upload da imagem de fundo.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.put('/dojo/config', {
        name: config.name,
        president: config.president,
        defaultShihan: config.defaultShihan,
        defaultSensei: config.defaultSensei,
        defaultAssociation: config.defaultAssociation,
        city: config.city,
        showShihanText: config.showShihanText,
        showKanjiText: config.showKanjiText,
          diplomaBackground: config.diplomaBackground,
          diplomaBackgroundImageUrl: config.diplomaBackgroundImageUrl,
      });
      alert('Configurações salvas com sucesso!');
    } catch (error) {
      alert('Erro ao salvar as configurações.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'primary' | 'secondary') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('logo', file);
    formData.append('type', type);

    try {
      const { data } = await api.post('/dojo/upload-logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setConfig(prev => ({
        ...prev,
        [type === 'primary' ? 'logoPrimaryUrl' : 'logoSecondaryUrl']: data.url
      }));
    } catch (error) {
      alert(`Erro ao fazer upload da Logo ${type === 'primary' ? '1' : '2'}`);
    }
  };

  const handleRemoveLogo = async (type: 'primary' | 'secondary') => {
    if (!confirm(`Tem certeza que deseja remover a Logo ${type === 'primary' ? 'Primária' : 'Secundária'}?`)) return;
    try {
      await api.delete('/dojo/remove-logo', { data: { type } });
      setConfig(prev => ({
        ...prev,
        [type === 'primary' ? 'logoPrimaryUrl' : 'logoSecondaryUrl']: null
      }));
    } catch (error) {
      alert('Erro ao remover logo');
    }
  };

  const handleSetLogoUrl = async (type: 'primary' | 'secondary') => {
    const url = type === 'primary' ? urlInputPrimary : urlInputSecondary;
    if (!url.trim()) { alert('Cole uma URL válida'); return; }
    try {
      await api.put('/dojo/logo-url', { type, url: url.trim() });
      setConfig(prev => ({
        ...prev,
        [type === 'primary' ? 'logoPrimaryUrl' : 'logoSecondaryUrl']: url.trim()
      }));
      if (type === 'primary') setUrlInputPrimary('');
      else setUrlInputSecondary('');
      setShowUrlInput(prev => ({ ...prev, [type]: false }));
    } catch (error) {
      alert('Erro ao salvar URL da logo');
    }
  };

  const getLogoSrc = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `http://localhost:3000${url}`;
  };

  if (isLoading) return <div className="text-slate-400 text-center mt-10">Carregando painel...</div>;

  const renderLogoCard = (type: 'primary' | 'secondary', label: string, inputId: string) => {
    const logoUrl = type === 'primary' ? config.logoPrimaryUrl : config.logoSecondaryUrl;
    const urlInput = type === 'primary' ? urlInputPrimary : urlInputSecondary;
    const setUrlInput = type === 'primary' ? setUrlInputPrimary : setUrlInputSecondary;
    const isUrlOpen = type === 'primary' ? showUrlInput.primary : showUrlInput.secondary;

    return (
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 text-center">
        <span className="block text-sm font-medium text-slate-400 mb-4">{label}</span>
        
        {/* Preview da Logo */}
        {logoUrl ? (
          <div className="relative group mb-4">
            <img src={getLogoSrc(logoUrl)!} alt={label} className="h-24 mx-auto object-contain" />
            <button 
              onClick={() => handleRemoveLogo(type)} 
              className="absolute top-0 right-0 bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              title="Remover Logo"
            >
              ✕ Remover
            </button>
          </div>
        ) : (
          <div className="h-24 bg-slate-800 rounded mb-4 flex items-center justify-center text-slate-500 text-sm">Sem Logo</div>
        )}

        {/* Botões de Ação */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2 justify-center">
            <input type="file" id={inputId} className="hidden" accept="image/*" onChange={(e) => handleLogoUpload(e, type)} />
            <label htmlFor={inputId} className="cursor-pointer bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded text-sm transition flex items-center gap-1">
              📁 Arquivo
            </label>
            <button 
              onClick={() => setShowUrlInput(prev => ({ ...prev, [type]: !prev[type] }))}
              className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded text-sm transition flex items-center gap-1"
            >
              🔗 Colar URL
            </button>
          </div>
          
          {/* Campo URL Externa (imgur, etc) */}
          {isUrlOpen && (
            <div className="flex gap-2 mt-2">
              <input 
                type="text" 
                placeholder="https://i.imgur.com/sua-logo.png" 
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:border-red-500 outline-none"
              />
              <button 
                onClick={() => handleSetLogoUrl(type)}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm font-bold transition"
              >
                Salvar
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-100">Configurações do Dojo</h2>
      </div>

      <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 shadow-xl space-y-8">
        
        {/* Upload de Logos */}
        <section>
          <h3 className="text-lg font-semibold text-slate-200 mb-4 border-b border-slate-800 pb-2">Identidade Visual</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderLogoCard('primary', 'Logo Primária (Esquerda)', 'logo1')}
            {renderLogoCard('secondary', 'Logo Secundária (Direita)', 'logo2')}
          </div>
        </section>

        {/* Textos Padrão */}
        <section>
          <h3 className="text-lg font-semibold text-slate-200 mb-4 border-b border-slate-800 pb-2">Preenchimento Automático (Certificados)</h3>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="md:col-span-2">
              <label className="block text-sm text-slate-400 mb-1">Nome do Dojo (Instituição)</label>
              <input type="text" value={config.name} onChange={e => setConfig({...config, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:border-red-500 outline-none" />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Associação Responsável (Default)</label>
              <input type="text" value={config.defaultAssociation} onChange={e => setConfig({...config, defaultAssociation: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:border-red-500 outline-none" />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Presidente da Associação (Default)</label>
              <input type="text" value={config.president} onChange={e => setConfig({...config, president: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:border-red-500 outline-none" />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Nome do Shihan (Default)</label>
              <input type="text" value={config.defaultShihan} onChange={e => setConfig({...config, defaultShihan: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:border-red-500 outline-none" />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Nome do Sensei (Default)</label>
              <input type="text" value={config.defaultSensei} onChange={e => setConfig({...config, defaultSensei: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:border-red-500 outline-none" />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Cidade / UF</label>
              <input type="text" placeholder="Ex: Campo Grande - MS" value={config.city} onChange={e => setConfig({...config, city: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:border-red-500 outline-none" />
              <p className="text-xs text-slate-500 mt-1">Aparece na data do certificado: "Campo Grande - MS, 26 de agosto de 2026"</p>
            </div>

            <div className="md:col-span-2 bg-slate-900 border border-slate-700 rounded-lg p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-200">Exibir Texto "Shihan: Nome" no Painel da Logo</p>
                  <p className="text-xs text-slate-500 mt-1">O sistema adiciona esse texto dinamicamente (pega apenas o primeiro e último nome).</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setConfig({...config, showShihanText: !config.showShihanText})}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.showShihanText ? 'bg-red-600' : 'bg-slate-600'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.showShihanText ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between border-t border-slate-800 pt-4">
                <div>
                  <p className="text-sm font-medium text-slate-200">Exibir Kanji (拳志会 空手道) no Painel da Logo</p>
                  <p className="text-xs text-slate-500 mt-1">O sistema renderiza os caracteres japoneses abaixo da logo primária.</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setConfig({...config, showKanjiText: !config.showKanjiText})}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.showKanjiText ? 'bg-red-600' : 'bg-slate-600'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.showKanjiText ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>

            
              <div className="md:col-span-2 bg-slate-900 border border-slate-700 rounded-lg p-4 flex flex-col gap-4 mt-4">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">Personalização de Diplomas</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-200">Cor de Fundo (Dan)</p>
                    <p className="text-xs text-slate-500 mt-1">Este fundo será aplicado automaticamente em todas as Faixas Pretas.</p>
                  </div>
                  <select 
                    value={config.diplomaBackground || 'white'} 
                    onChange={e => setConfig({...config, diplomaBackground: e.target.value})} 
                    className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white outline-none focus:border-red-500 w-48 text-sm"
                  >
                    <option value="white">Branco Clássico</option>
                    <option value="sunset">Pôr do Sol (Pêssego)</option>
                    <option value="golden">Dourado Imperial</option>
                    <option value="silver">Prata Minimalista</option>
                    <option value="parchment">Pergaminho Antigo</option>
                    <option value="ruby">Rubi Marcial (Avermelhado)</option>
                    <option value="emerald">Esmeralda Dragão (Esverdeado)</option>
                    <option value="sapphire">Safira Samurai (Azulado)</option>
                    <option value="platinum">Platina Nobre (Cinza Metálico)</option>
                    <option value="sakura">Sakura / Cerejeira (Rosa Suave)</option>
                    <option value="copper">Cobre Antigo (Alaranjado)</option>
                    <option value="amethyst">Ametista Real (Roxo Suave)</option>
                    <option value="ocean">Oceano Pacífico (Ciano Claro)</option>
                    <option value="sand">Areia do Tatame (Bege)</option>
                    <option value="bamboo">Bambu (Amarelo Esverdeado)</option>
                    <option value="custom_image">🖼️ Imagem Personalizada</option>
                  </select>
                </div>
                
                {config.diplomaBackground === 'custom_image' && (
                  <div className="mt-4 border-t border-slate-800 pt-4">
                    <label className="block text-sm font-medium text-slate-300 mb-2">URL da Imagem de Fundo</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Ex: https://i.imgur.com/sua-imagem.jpg" 
                        value={config.diplomaBackgroundImageUrl || ''}
                        onChange={e => setConfig({...config, diplomaBackgroundImageUrl: e.target.value})}
                        className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:border-red-500 outline-none"
                      />
                      <input type="file" id="bg-upload" className="hidden" accept="image/*" onChange={handleBgUpload} />
                      <label htmlFor="bg-upload" className="cursor-pointer bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded text-sm transition flex items-center gap-1 font-bold">
                        📁 Enviar Arquivo
                      </label>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Dica: Use uma imagem com proporção A4 paisagem (aprox. 1122x794 pixels) e em alta resolução para melhor qualidade de impressão.</p>
                    
                    {config.diplomaBackgroundImageUrl && (
                      <div className="mt-3 rounded border border-slate-700 overflow-hidden bg-black/50" style={{ aspectRatio: '1.414/1' }}>
                        <img src={getLogoSrc(config.diplomaBackgroundImageUrl)!} alt="Preview Fundo" className="w-full h-full object-cover opacity-80" />
                      </div>
                    )}
                  </div>
                )}
              </div>


              <div className="md:col-span-2 flex justify-end mt-4">
              <button type="submit" disabled={isSaving} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded transition">
                {isSaving ? 'Salvando...' : 'Salvar Defaults'}
              </button>
            </div>
            
          </form>
        </section>
      </div>
    </div>
  );
};
