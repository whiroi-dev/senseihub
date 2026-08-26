import { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';

interface Rank { id: string; name: string; color: string; phrase?: string; }
interface Student { id: string; name: string; currentRank?: Rank; }
interface DojoConfig {
  defaultAssociation?: string;
  defaultShihan?: string;
  president?: string;
  logoPrimaryUrl?: string;
  logoSecondaryUrl?: string;
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
    return students
      .filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, search]);

  const handleStudentSelect = async (studentId: string) => {
    if (selectedIds.has(studentId)) {
      const newSet = new Set(selectedIds);
      newSet.delete(studentId);
      setSelectedIds(newSet);
      return;
    }

    try {
      const response = await api.get(`/eligibility/${studentId}`);
      const result = response.data;

      if (!result.isEligible) {
        let msg = `O aluno está Inapto para exame de faixa!\nMotivo: ${result.reason}`;
        if (result.hoursDeficit) msg += `\nDéficit de horas: ${result.hoursDeficit}h`;
        if (result.eligibleFromDate) msg += `\nCarência encerra em: ${new Date(result.eligibleFromDate).toLocaleDateString('pt-BR')}`;
        alert(msg);
        return; 
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
  const formattedDate = formData.issueDate 
    ? new Date(formData.issueDate).toLocaleDateString('pt-BR') 
    : 'DD/MM/AAAA';

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
                placeholder={selectedIds.size === 0 ? "Buscar e selecionar aluno..." : "Adicionar outro aluno..."}
                value={search} 
                onChange={e => setSearch(e.target.value)}
                onFocus={() => setIsDropdownOpen(true)}
                onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 px-4 py-3 text-sm rounded-lg focus:outline-none focus:border-red-500 shadow-inner" 
              />
              
              {/* Dropdown de Resultados da Busca */}
              {isDropdownOpen && (
                <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto bg-slate-800 border border-slate-700 rounded-lg shadow-2xl custom-scrollbar">
                  {filteredStudents.length > 0 ? filteredStudents.map((student) => (
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
                        <div className="text-sm font-medium text-slate-200">{student.name}</div>
                        <div className="text-xs text-slate-400">Faixa Atual: {student.currentRank?.name || 'Iniciante'}</div>
                      </div>
                      {selectedIds.has(student.id) && <span className="text-red-400 text-xs font-bold">Adicionado</span>}
                    </div>
                  )) : (
                    <div className="px-4 py-3 text-sm text-slate-400">Nenhum aluno encontrado.</div>
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
            className="w-full bg-white text-slate-900 shadow-2xl relative select-none flex flex-row font-sans"
            style={{ 
              aspectRatio: '1.414 / 1',
              border: `clamp(8px, 2.5cqw, 30px) solid ${primaryColor}`,
              boxShadow: `0 25px 50px -12px ${primaryColor}40`
            }}
          >
            {/* Coluna Esquerda: Logos */}
            <div className="w-[30%] flex flex-col items-center justify-around border-r-2 border-slate-200 p-[2cqw] shrink-0">
              {dojoConfig?.logoPrimaryUrl ? (
                <img src={dojoConfig.logoPrimaryUrl.startsWith('http') ? dojoConfig.logoPrimaryUrl : `http://localhost:3000${dojoConfig.logoPrimaryUrl}`} alt="Logo Primária" className="max-w-[95%] max-h-[40%] object-contain" />
              ) : (
                <div className="w-[10cqw] h-[10cqw] rounded-full border border-dashed border-gray-400 flex items-center justify-center text-[1.5cqw] text-gray-400">Logo 1</div>
              )}
              
              {dojoConfig?.logoSecondaryUrl && (
                <img src={dojoConfig.logoSecondaryUrl.startsWith('http') ? dojoConfig.logoSecondaryUrl : `http://localhost:3000${dojoConfig.logoSecondaryUrl}`} alt="Logo Secundária" className="max-w-[95%] max-h-[40%] object-contain mt-[2cqw]" />
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
                <p className="font-bold my-[1cqw] transition-colors" style={{ color: primaryColor, fontSize: '2.8cqw' }}>
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
                  <div className="border-t-2 w-[80%] mx-auto mb-[1cqw]" style={{ borderColor: primaryColor }}></div>
                  <p className="font-bold text-gray-800 m-0 truncate px-1" style={{ fontSize: '1.2cqw' }}>{formData.presidentName || 'Presidente'}</p>
                  <p className="text-gray-600 m-0" style={{ fontSize: '1cqw' }}>Presidente da Associação</p>
                </div>
                
                <div className="w-[30%]">
                  <div className="border-t-2 w-[80%] mx-auto mb-[1cqw]" style={{ borderColor: primaryColor }}></div>
                  <p className="font-bold text-gray-800 m-0 truncate px-1" style={{ fontSize: '1.2cqw' }}>{previewStudentName === '[ Lote de Alunos ]' || previewStudentName.includes('Alunos ]') ? 'Nome do Aluno' : previewStudentName}</p>
                  <p className="text-gray-600 m-0" style={{ fontSize: '1cqw' }}>Aluno(a)</p>
                </div>

                <div className="w-[30%]">
                  <div className="border-t-2 w-[80%] mx-auto mb-[1cqw]" style={{ borderColor: primaryColor }}></div>
                  <p className="font-bold text-gray-800 m-0 truncate px-1" style={{ fontSize: '1.2cqw' }}>{formData.shihanName || 'Shihan'}</p>
                  <p className="text-gray-600 m-0" style={{ fontSize: '1cqw' }}>Diretor Técnico</p>
                </div>
              </div>

            </div>
            
            <div className="absolute bottom-[1cqw] left-[2cqw] text-gray-400 font-mono" style={{ fontSize: '1cqw' }}>
              Validação: 00000000-0000-0000-0000-000000000000
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
