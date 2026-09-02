import { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';

interface Rank { id: string; name: string; color: string; phrase?: string; sortOrder: number; }
interface Student { id: string; name: string; currentRank?: Rank; currentRankId?: string; }
interface DojoConfig {
  defaultAssociation?: string;
  defaultShihan?: string;
  president?: string;
  logoPrimaryUrl?: string;
  logoSecondaryUrl?: string;
  city?: string;
  showShihanText?: boolean;
  showKanjiText?: boolean;
    diplomaBackground?: string;
    diplomaBackgroundImageUrl?: string | null;
}

export const CertificadosPage = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [dojoConfig, setDojoConfig] = useState<DojoConfig | null>(null);
  const [search, setSearch] = useState('');
  
  const [selectedRankId, setSelectedRankId] = useState('');
  const [formData, setFormData] = useState({
    associationName: 'Associação de Karatê',
    shihanName: '',
    presidentName: '',
    issueDate: new Date().toISOString().split('T')[0]
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [overrideFilter, setOverrideFilter] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/students'),
      api.get('/ranks'),
      api.get('/dojo/config')
    ]).then(([resStudents, resRanks, resConfig]) => {
      setStudents(resStudents.data);
      setRanks(resRanks.data);
      
      const config = resConfig.data;
      setDojoConfig(config);
      setFormData(prev => ({
        ...prev,
        associationName: config.defaultAssociation || prev.associationName,
        shihanName: config.defaultShihan || prev.shihanName,
        presidentName: config.president || prev.presidentName
      }));
    }).catch(() => alert('Erro ao carregar dados mestre.'));
  }, []);

  const filteredStudents = useMemo(() => {
    if (!selectedRankId) return [];
    
    const targetRank = ranks.find(r => r.id === selectedRankId);
    if (!targetRank) return [];

    const sortedRanks = [...ranks].sort((a, b) => a.sortOrder - b.sortOrder);
    const targetIndex = sortedRanks.findIndex(r => r.id === selectedRankId);
    const previousRank = targetIndex > 0 ? sortedRanks[targetIndex - 1] : null;

    return students
      .filter((s) => {
        const matchName = s.name.toLowerCase().includes(search.toLowerCase());
        const is2aVia = s.currentRankId === targetRank.id;
        const isPromotion = s.currentRankId === previousRank?.id;
        const isFirstRank = !s.currentRankId && targetIndex === 0;
        return matchName && (overrideFilter || is2aVia || isPromotion || isFirstRank);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, search, selectedRankId, ranks, overrideFilter]);

  const handleStudentSelect = async (studentId: string) => {
    if (selectedIds.has(studentId)) {
      const newSet = new Set(selectedIds);
      newSet.delete(studentId);
      setSelectedIds(newSet);
      return;
    }

    try {
      if (!overrideFilter) {
          const response = await api.get(`/eligibility/${studentId}`);
          const result = response.data;
  
          if (!result.isEligible) {
            let msg = `O aluno está Inapto para exame de faixa!\nMotivo: ${result.reason}`;
            if (result.hoursDeficit) msg += `\nDéficit de horas: ${result.hoursDeficit}h`;
            if (result.eligibleFromDate) msg += `\nCarência encerra em: ${new Date(result.eligibleFromDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`;
            alert(msg);
            return; 
          }
        }

      const newSet = new Set(selectedIds);
      newSet.add(studentId);
      setSelectedIds(newSet);
    } catch (err) {
      alert('Falha ao consultar motor de elegibilidade.');
    }
  };

  const handleGenerateBatch = async () => {
    if (!selectedRankId) return alert('Selecione a graduação alvo.');
    if (selectedIds.size === 0) return alert('Selecione pelo menos um aluno elegível.');

    setIsGenerating(true);
    try {
      const payload = {
        studentIds: Array.from(selectedIds),
        rankId: selectedRankId,
        associationName: formData.associationName,
        shihanName: formData.shihanName,
        presidentName: formData.presidentName,
        issueDate: formData.issueDate,
      };

      const response = await api.post('/certificates/batch', payload, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'certificados_lote.zip');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);

      alert('Certificados gerados com sucesso!');
      setSelectedIds(new Set());
    } catch (err) {
      alert('Erro ao gerar certificados. Verifique o console.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Live Preview Data Derivation
  const selectedRank = ranks.find(r => r.id === selectedRankId);
  let previewStudentName = 'Nome do Aluno';
  if (selectedIds.size === 1) {
    previewStudentName = students.find(s => s.id === Array.from(selectedIds)[0])?.name || 'Nome do Aluno';
  } else if (selectedIds.size > 1) {
    previewStudentName = `[ Lote: ${selectedIds.size} Alunos ]`;
  }

  const primaryColor = selectedRank?.color || '#1e293b'; // slate-800 as fallback
  const isWhite = ['#ffffff', '#fff', '#fafafa', '#f8f9fa', '#f1f5f9', '#f3f4f6'].includes(primaryColor.toLowerCase());
  
  const elementColor = isWhite ? '#111827' : primaryColor;
  const textColor = isWhite ? '#111827' : primaryColor;
  const bgGradients: Record<string, string> = {
            white: 'white',
      sunset: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 40%, #fdba74 100%)',
      golden: 'linear-gradient(135deg, #fef9c3 0%, #fef08a 40%, #fde047 100%)',
      silver: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 40%, #94a3b8 100%)',
      parchment: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 40%, #d9b382 100%)',
      ruby: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 40%, #f87171 100%)',
      emerald: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 40%, #4ade80 100%)',
      sapphire: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 40%, #38bdf8 100%)',
      platinum: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 40%, #64748b 100%)',
      sakura: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 40%, #f472b6 100%)',
      copper: 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 40%, #fb923c 100%)',
      amethyst: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 40%, #c084fc 100%)',
      ocean: 'linear-gradient(135deg, #ccfbf1 0%, #99f6e4 40%, #2dd4bf 100%)',
      sand: 'linear-gradient(135deg, #fef08a 0%, #fde047 40%, #eab308 100%)',
      bamboo: 'linear-gradient(135deg, #ecfccb 0%, #d9f99d 40%, #a3e635 100%)'
    };
    
    
    let bgStyleValue = 'white';
    if (selectedRank?.name.includes('Preta')) {
      if (dojoConfig?.diplomaBackground === 'custom_image' && dojoConfig?.diplomaBackgroundImageUrl) {
        bgStyleValue = `url('${dojoConfig.diplomaBackgroundImageUrl.startsWith('http') ? dojoConfig.diplomaBackgroundImageUrl : 'http://localhost:3000' + dojoConfig.diplomaBackgroundImageUrl}') center/cover no-repeat`;
      } else if (dojoConfig?.diplomaBackground) {
        bgStyleValue = bgGradients[dojoConfig.diplomaBackground] || 'white';
      }
    }
    const formattedDate = formData.issueDate 
    ? `${dojoConfig?.city ? dojoConfig.city + ', ' : ''}${new Date(formData.issueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })}` 
    : 'Cidade, DD de mês de AAAA';

    const sortedRanksForRender = [...ranks].sort((a, b) => a.sortOrder - b.sortOrder);
  const targetIndexForRender = sortedRanksForRender.findIndex(r => r.id === selectedRankId);
  const previousRankForRender = targetIndexForRender > 0 ? sortedRanksForRender[targetIndexForRender - 1] : null;
  
  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center shrink-0">
        <h2 className="text-2xl font-bold text-slate-100">Exame de Faixa & Emissão</h2>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 flex-1 min-h-0">
        
        {/* Painel Esquerdo: Configurações e Seleção (Formulário Único) */}
        <div className="xl:col-span-4 flex flex-col h-full overflow-y-auto pr-2 custom-scrollbar">
          
          <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 shadow-xl flex flex-col gap-5">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-800 pb-2">
              Dados da Emissão
            </h3>
            
            {/* Campo: Alunos (Custom Multi-select com Search e Chips) */}
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-400 mb-2">Aluno(s) Selecionado(s)</label>
              
              {/* Chips dos selecionados */}
              {selectedIds.size > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {Array.from(selectedIds).map(id => {
                    const s = students.find(x => x.id === id);
                    return s ? (
                      <div key={id} className="flex items-center gap-2 bg-red-900/30 border border-red-800/50 text-slate-200 px-3 py-1.5 rounded-full text-sm">
                        <span>{s.name}</span>
                        <button onClick={() => handleStudentSelect(id)} className="text-slate-400 hover:text-red-400 ml-1 focus:outline-none">✕</button>
                      </div>
                    ) : null;
                  })}
                </div>
              )}

              {/* Input de Busca */}
              <input 
                  type="text" 
                  disabled={!selectedRankId}
                  placeholder={!selectedRankId ? "Selecione uma faixa acima primeiro..." : selectedIds.size === 0 ? "Buscar aluno elegível..." : "Adicionar outro aluno..."}
                value={search} 
                onChange={e => setSearch(e.target.value)}
                onFocus={() => setIsDropdownOpen(true)}
                onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 px-4 py-3 text-sm rounded-lg focus:outline-none focus:border-red-500 shadow-inner" 
              />
              
              {/* Dropdown de Resultados da Busca */}
              {isDropdownOpen && (
                <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto bg-slate-800 border border-slate-700 rounded-lg shadow-2xl custom-scrollbar">
                  {filteredStudents.length > 0 ? filteredStudents.map((student) => {
                      const isPromotion = student.currentRankId !== selectedRankId;
                      const isBypass = overrideFilter && student.currentRankId !== selectedRankId && student.currentRankId !== previousRankForRender?.id && !(!student.currentRankId && targetIndexForRender === 0);
                      return (
                      <div 
                        key={student.id} 
                        onClick={() => {
                          if (!selectedIds.has(student.id)) handleStudentSelect(student.id);
                          setSearch('');
                          setIsDropdownOpen(false);
                        }} 
                        className="flex items-center justify-between px-4 py-3 cursor-pointer border-b border-slate-700/50 last:border-0 hover:bg-slate-700 transition-colors"
                      >
                        <div>
                          <div className="text-sm font-medium text-slate-200 flex items-center gap-2">
                            {student.name}
                            {isBypass ? (
                              <span className="bg-orange-900/50 text-orange-400 border border-orange-800 text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wider">SALTO DE FAIXA</span>
                            ) : isPromotion ? (
                              <span className="bg-green-900/50 text-green-400 border border-green-800 text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wider">PROMOVENDO</span>
                            ) : (
                              <span className="bg-slate-700 text-slate-300 border border-slate-600 text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wider">2ª VIA</span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 mt-1">Faixa Atual: {student.currentRank?.name || 'Sem Faixa'}</div>
                        </div>
                        {selectedIds.has(student.id) && <span className="text-red-400 text-xs font-bold">Adicionado</span>}
                      </div>
                    )}) : (
                      <div className="px-4 py-3 text-sm text-slate-400">Nenhum aluno elegível encontrado.</div>
                    )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Nova Graduação Alvo</label>
              <select value={selectedRankId} onChange={e => setSelectedRankId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white focus:border-red-500 outline-none shadow-inner">
                <option value="">-- Selecione a faixa --</option>
                {ranks.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>

            <div className="mt-2 space-y-4 pt-4 border-t border-slate-800/50">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Associação Responsável</label>
                <input type="text" value={formData.associationName} onChange={e => setFormData({...formData, associationName: e.target.value})} className="w-full bg-slate-900/50 border border-slate-800 rounded px-3 py-2 text-sm text-slate-300 focus:border-slate-600 outline-none" />
              </div>

              {/* Hint */}
              <div className="flex items-center justify-between mt-1 mb-4">
                <div className="text-[11px] text-slate-500 italic">
                  Não encontrou um aluno? Verifique os requisitos na <a href="/alunos" className="text-red-400 hover:underline">Gestão de Alunos</a>.
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={overrideFilter} onChange={e => setOverrideFilter(e.target.checked)} className="accent-red-500 rounded bg-slate-900 border-slate-700" />
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Modo Admin (Ignorar Trava)</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Shihan (Mestre)</label>
                  <input type="text" value={formData.shihanName} onChange={e => setFormData({...formData, shihanName: e.target.value})} className="w-full bg-slate-900/50 border border-slate-800 rounded px-3 py-2 text-sm text-slate-300 focus:border-slate-600 outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Presidente</label>
                  <input type="text" value={formData.presidentName} onChange={e => setFormData({...formData, presidentName: e.target.value})} className="w-full bg-slate-900/50 border border-slate-800 rounded px-3 py-2 text-sm text-slate-300 focus:border-slate-600 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">Data da Emissão</label>
                <input type="date" value={formData.issueDate} onChange={e => setFormData({...formData, issueDate: e.target.value})} className="w-full bg-slate-900/50 border border-slate-800 rounded px-3 py-2 text-sm text-slate-300 focus:border-slate-600 outline-none" />
              </div>
            </div>

            <button
              onClick={handleGenerateBatch}
              disabled={isGenerating || selectedIds.size === 0 || !selectedRankId}
              className="w-full mt-4 bg-red-600 hover:bg-red-700 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white px-4 py-4 rounded-xl font-bold transition shadow-lg"
            >
              {isGenerating ? '⏳ Gerando...' : `🖨️ Emitir Certificado${selectedIds.size > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>

        {/* Painel Direito: Live Preview */}
        <div className="xl:col-span-8 flex flex-col items-center justify-center bg-slate-900 rounded-xl border border-slate-800 p-4 sm:p-8 shadow-inner overflow-hidden relative min-h-[500px]" style={{ containerType: 'inline-size' }}>
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-xs font-semibold text-green-500 uppercase tracking-wider z-10">Live Preview</span>
          </div>

          {/* Container do Certificado */}
          <div 
            className="w-full text-slate-900 shadow-2xl relative select-none flex flex-row font-sans"
            style={{ 
                aspectRatio: '1.414 / 1',
                background: bgStyleValue,
                border: `clamp(8px, 2.5cqw, 30px) solid ${primaryColor}`,
                boxShadow: `0 25px 50px -12px ${primaryColor}40`
              }}
          >
            {/* Coluna Esquerda: Logos */}
            <div className={`w-[30%] flex flex-col items-center ${dojoConfig?.logoSecondaryUrl ? 'justify-between' : 'justify-center'} ${selectedRank?.name.includes('Preta') ? '' : 'border-r-2 border-slate-200'} p-[2cqw] pb-[4cqw] shrink-0 h-full relative`}>
              
              <div className="w-full flex flex-col items-center">
                {dojoConfig?.logoPrimaryUrl ? (
                  <img src={dojoConfig.logoPrimaryUrl.startsWith('http') ? dojoConfig.logoPrimaryUrl : `http://localhost:3000${dojoConfig.logoPrimaryUrl}`} alt="Logo Primária" className="w-[85%] object-contain shrink-0" />
                ) : (
                  <div className="w-[10cqw] h-[10cqw] rounded-full border border-dashed border-gray-400 flex items-center justify-center text-[1.5cqw] text-gray-400 shrink-0">Logo 1</div>
                )}

                <div className="text-center w-full mt-[1cqw]">
                  {dojoConfig?.showShihanText && (
                    <div className="font-bold text-black leading-tight whitespace-nowrap mt-[1cqw]" style={{ fontSize: '1.6cqw' }}>
                      Shihan: <span className="text-red-600">
                        {formData.shihanName ? `${formData.shihanName.split(' ')[0]} ${formData.shihanName.split(' ').length > 1 ? formData.shihanName.split(' ').pop() : ''}` : ''}
                      </span>
                    </div>
                  )}
                  {dojoConfig?.showKanjiText && (
                    <div className="flex justify-center gap-[6cqw] w-full mt-[3cqw] text-black font-bold" style={{ fontSize: '4.5cqw', lineHeight: 1.1 }}>
                      <div className="flex flex-col">
                        <span>{'\u62F3'}</span>
                        <span>{'\u5FD7'}</span>
                        <span>{'\u4F1A'}</span>
                      </div>
                      <div className="flex flex-col">
                        <span>{'\u7A7A'}</span>
                        <span>{'\u624B'}</span>
                        <span>{'\u9053'}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {dojoConfig?.logoSecondaryUrl && (
                <img src={dojoConfig.logoSecondaryUrl.startsWith('http') ? dojoConfig.logoSecondaryUrl : `http://localhost:3000${dojoConfig.logoSecondaryUrl}`} alt="Logo Secundária" className="max-w-[95%] max-h-[25%] object-contain mt-auto" />
              )}
            </div>

            {/* Coluna Direita: Textos */}
            <div className="w-[70%] flex flex-col p-[3cqw] shrink-0">
              
              {/* Cabeçalho */}
              <div className="text-center">
                <h2 className="font-bold uppercase text-gray-800 m-0 leading-tight" style={{ fontSize: '2cqw' }}>
                  {formData.associationName || 'Associação'}
                </h2>
                <h1 className="font-serif leading-none text-red-800 mt-[0.5cqw] mb-0 tracking-wide" style={{ fontFamily: '"Playfair Display", serif', fontSize: '5cqw' }}>
                  {selectedRank?.name?.includes('Preta') ? 'Diploma' : 'Certificado'}
                </h1>
                <p className="text-gray-600 mt-[0.5cqw] mb-0 leading-tight" style={{ fontSize: '2cqw' }}>
                  {selectedRank?.name?.includes('Preta') ? 'Outorga de Faixa Preta' : 'de Graduação'}
                </p>
              </div>

              {/* Corpo */}
              <div className="text-center px-[2cqw] mt-[3cqw]">
                <p className="text-gray-700 m-0" style={{ fontSize: '1.6cqw' }}>Conferimos a</p>
                <p className="font-bold text-gray-900 my-[1cqw] flex items-center justify-center flex-wrap leading-tight" style={{ fontSize: '3.5cqw', minHeight: '5cqw' }}>
                  {previewStudentName}
                </p>
                <p className="text-gray-700 m-0" style={{ fontSize: '1.6cqw' }}>em vista de sua aprovação na categoria de</p>
                <p className="font-bold my-[1cqw] transition-colors" style={{ color: textColor, fontSize: '2.8cqw' }}>
                  {selectedRank?.name || 'Faixa Alvo'}
                </p>
                <p className="text-gray-700 m-0" style={{ fontSize: '1.5cqw' }}>
                  de <strong style={{ fontSize: '1.5cqw' }}>KARATÊ-DÔ KENSHI-KAI</strong>, para que possa gozar de todos os direitos e prerrogativas concedidos a este certificado.
                </p>
                <p className="italic text-gray-600 mt-[2cqw] leading-relaxed mx-auto max-w-[90%]" style={{ fontSize: '1.3cqw' }}>
                  {selectedRank?.phrase || ''}
                </p>
                <p className="text-gray-800 mt-[2.5cqw] font-medium" style={{ fontSize: '1.6cqw' }}>
                  {formattedDate}
                </p>
              </div>

              <div className="flex-grow"></div>

              {/* Assinaturas */}
              <div className="w-full flex justify-between items-start text-center pt-[2cqw]">
                <div className="w-[30%]">
                  <div className="border-t-2 w-[80%] mx-auto mb-[1cqw]" style={{ borderColor: elementColor }}></div>
                  <p className="font-bold text-gray-800 m-0 px-1" style={{ fontSize: '1.2cqw' }}>{formData.presidentName || 'Presidente'}</p>
                  <p className="text-gray-600 m-0" style={{ fontSize: '1cqw' }}>Presidente da Associação</p>
                </div>
                
                <div className="w-[30%]">
                  <div className="border-t-2 w-[80%] mx-auto mb-[1cqw]" style={{ borderColor: elementColor }}></div>
                  <p className="font-bold text-gray-800 m-0 px-1" style={{ fontSize: '1.2cqw' }}>{previewStudentName === '[ Lote de Alunos ]' || previewStudentName.includes('Alunos ]') ? 'Nome do Aluno' : previewStudentName}</p>
                  <p className="text-gray-600 m-0" style={{ fontSize: '1cqw' }}>Aluno(a)</p>
                </div>

                <div className="w-[30%]">
                  <div className="border-t-2 w-[80%] mx-auto mb-[1cqw]" style={{ borderColor: elementColor }}></div>
                  <p className="font-bold text-gray-800 m-0 px-1" style={{ fontSize: '1.2cqw' }}>{formData.shihanName || 'Shihan'}</p>
                  <p className="text-gray-600 m-0" style={{ fontSize: '1cqw' }}>Diretor Técnico</p>
                </div>
              </div>

            </div>
            
            

          </div>
        </div>

      </div>
    </div>
  );
};
