import { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';

interface Rank {
  id: string;
  name: string;
  color: string;
}

interface Certificate {
  id: string;
  issueDate: string;
  rank: Rank;
}

interface Student {
  id: string;
  name: string;
  hasFinancialDebts: boolean;
  currentRankId?: string;
  currentRank?: Rank;
  joinedAt: string;
  birthDate?: string;
  phone?: string;
  emergencyContact?: string;
  medicalNotes?: string;
  certificates?: Certificate[];
}

export const AlunosPage = () => {
  const [data, setData] = useState<Student[]>([]);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    name: '', hasFinancialDebts: false, currentRankId: '',
    birthDate: '', phone: '', emergencyContact: '', medicalNotes: ''
  });

  // Historic Modal State
  const [isHistoricModalOpen, setIsHistoricModalOpen] = useState(false);
  const [historicData, setHistoricData] = useState({ rankId: '', issueDate: '' });

  // Slide-over State
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  const fetchStudentsAndRanks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [studentsRes, ranksRes] = await Promise.all([
        api.get('/students'),
        api.get('/ranks')
      ]);
      setData(studentsRes.data);
      setRanks(ranksRes.data);
    } catch (err) {
      setError('Falha ao carregar os dados.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentsAndRanks();
  }, []);

  const filteredData = useMemo(() => {
    return data
      .filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data, search]);

  const openDrawer = async (studentId: string) => {
    setIsDrawerOpen(true);
    setIsLoadingDetails(true);
    try {
      const { data } = await api.get(`/students/${studentId}`);
      setSelectedStudent(data);
    } catch (err) {
      alert('Erro ao buscar detalhes do aluno');
      setIsDrawerOpen(false);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => setSelectedStudent(null), 300); // animation delay
  };

  const openModal = (student?: Student) => {
    if (student) {
      setEditingStudent(student);
      setFormData({ 
        name: student.name, 
        hasFinancialDebts: student.hasFinancialDebts, 
        currentRankId: student.currentRankId || '',
        birthDate: student.birthDate ? new Date(student.birthDate).toISOString().split('T')[0] : '',
        phone: student.phone || '',
        emergencyContact: student.emergencyContact || '',
        medicalNotes: student.medicalNotes || ''
      });
    } else {
      setEditingStudent(null);
      setFormData({ 
        name: '', hasFinancialDebts: false, currentRankId: '',
        birthDate: '', phone: '', emergencyContact: '', medicalNotes: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { 
        ...formData, 
        currentRankId: formData.currentRankId || null,
        birthDate: formData.birthDate || null
      };
      if (editingStudent) {
        await api.put(`/students/${editingStudent.id}`, payload);
      } else {
        await api.post('/students', payload);
      }
      setIsModalOpen(false);
      fetchStudentsAndRanks();
      if (selectedStudent && editingStudent && selectedStudent.id === editingStudent.id) {
        openDrawer(selectedStudent.id); // Reload drawer data
      }
    } catch (err) {
      alert('Erro ao salvar registro do aluno.');
    }
  };

  const handleDownloadCertificate = async (certificateId: string) => {
    setIsDownloading(certificateId);
    try {
      const response = await api.get(`/certificates/${certificateId}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `certificado_${certificateId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      alert('Erro ao baixar certificado.');
    } finally {
      setIsDownloading(null);
    }
  };

  const handleSaveHistoric = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    try {
      await api.post(`/students/${selectedStudent.id}/certificates/historic`, historicData);
      setIsHistoricModalOpen(false);
      setHistoricData({ rankId: '', issueDate: '' });
      openDrawer(selectedStudent.id); // Refresh timeline
    } catch (err) {
      alert('Erro ao salvar histórico retroativo.');
    }
  };

  return (
    <div className="space-y-6 relative h-full">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-100">Gestão de Alunos</h2>
        <button onClick={() => openModal()} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition shadow-lg">
          + Novo Aluno
        </button>
      </div>

      {error && <div className="p-4 bg-red-900/50 border border-red-500 text-red-200 rounded-lg">{error}</div>}

      <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 shadow-xl">
        <div className="mb-4">
          <input
            type="text"
            placeholder="Buscar aluno por nome..."
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 px-4 py-2 rounded-lg focus:outline-none focus:border-red-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="text-center py-10 text-slate-400">Carregando dados...</div>
          ) : (
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-900 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-3">Nome</th>
                  <th className="px-6 py-3">Faixa Atual</th>
                  <th className="px-6 py-3">Status Financeiro</th>
                  <th className="px-6 py-3">Ingresso</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((student) => (
                  <tr key={student.id} onClick={() => openDrawer(student.id)} className="border-b border-slate-800 hover:bg-slate-800/80 cursor-pointer transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-200">{student.name}</td>
                    <td className="px-6 py-4">
                      {student.currentRank ? (
                        <span className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full border border-slate-500" style={{ backgroundColor: student.currentRank.color }}></div>
                          {student.currentRank.name}
                        </span>
                      ) : (
                        <span className="text-slate-500">Sem Graduação</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {student.hasFinancialDebts ? (
                        <span className="px-2 py-1 bg-red-900/50 text-red-400 rounded text-xs border border-red-800">Bloqueado</span>
                      ) : (
                        <span className="px-2 py-1 bg-green-900/50 text-green-400 rounded text-xs border border-green-800">Regular</span>
                      )}
                    </td>
                    <td className="px-6 py-4">{new Date(student.joinedAt).toLocaleDateString('pt-BR')}</td>
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-slate-500">Nenhum aluno encontrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Slide-over (Drawer) Ficha 360 */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="fixed inset-0 bg-black/60 transition-opacity" onClick={closeDrawer}></div>
          <div className="relative w-full max-w-md h-full bg-slate-900 shadow-2xl border-l border-slate-700 flex flex-col transform transition-transform animate-slideIn">
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-start bg-slate-950">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">{selectedStudent?.name || 'Carregando...'}</h2>
                {selectedStudent?.currentRank ? (
                  <span className="flex items-center gap-2 text-sm text-slate-300">
                    <div className="w-3 h-3 rounded-full border border-slate-500" style={{ backgroundColor: selectedStudent.currentRank.color }}></div>
                    {selectedStudent.currentRank.name}
                  </span>
                ) : (
                  <span className="text-sm text-slate-500">Iniciante (Sem Graduação)</span>
                )}
              </div>
              <button onClick={closeDrawer} className="text-slate-400 hover:text-white p-2">✕</button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {isLoadingDetails ? (
                <div className="text-center text-slate-400 py-10">Buscando prontuário...</div>
              ) : selectedStudent ? (
                <>
                  <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                    <button onClick={() => openModal(selectedStudent)} className="text-blue-400 hover:text-blue-300 font-medium text-sm border border-blue-400/30 px-3 py-1 rounded">
                      Editar Cadastro
                    </button>
                    {selectedStudent.hasFinancialDebts ? (
                      <span className="px-2 py-1 bg-red-900/50 text-red-400 rounded text-xs border border-red-800">Bloqueio Financeiro</span>
                    ) : (
                      <span className="px-2 py-1 bg-green-900/50 text-green-400 rounded text-xs border border-green-800">Financeiro Regular</span>
                    )}
                  </div>

                  {/* Dados Pessoais */}
                  <section>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Dados Pessoais</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Nascimento:</span>
                        <span className="text-slate-200">{selectedStudent.birthDate ? new Date(selectedStudent.birthDate).toLocaleDateString('pt-BR') : 'Não informado'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Telefone:</span>
                        <span className="text-slate-200">{selectedStudent.phone || 'Não informado'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Ingresso:</span>
                        <span className="text-slate-200">{new Date(selectedStudent.joinedAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  </section>

                  {/* Prontuário Médico */}
                  <section className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className="text-red-500">❤️</span> Prontuário de Saúde
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="block text-slate-400 text-xs mb-1">Contato de Emergência:</span>
                        <span className="text-slate-200">{selectedStudent.emergencyContact || 'Não informado'}</span>
                      </div>
                      <div>
                        <span className="block text-slate-400 text-xs mb-1">Observações Médicas:</span>
                        <p className="text-slate-300 italic bg-slate-900 p-2 rounded border border-slate-700/50">
                          {selectedStudent.medicalNotes || 'Nenhuma restrição registrada.'}
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Linha do Tempo (Certificados) */}
                  <section>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Linha do Tempo de Exames</h3>
                    <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-700 before:to-transparent">
                      {selectedStudent.certificates && selectedStudent.certificates.length > 0 ? (
                        selectedStudent.certificates.map(cert => (
                          <div key={cert.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                            {/* Marker */}
                            <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-slate-900 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow" style={{ backgroundColor: cert.rank.color }}></div>
                            {/* Card */}
                            <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-3 rounded border border-slate-700 bg-slate-950 shadow flex justify-between items-center group-hover:border-slate-500 transition-colors">
                              <div>
                                <div className="font-bold text-slate-200 text-sm mb-1">{cert.rank.name}</div>
                                <div className="text-slate-500 text-xs">{new Date(cert.issueDate).toLocaleDateString('pt-BR')}</div>
                              </div>
                              <button 
                                onClick={() => handleDownloadCertificate(cert.id)}
                                disabled={isDownloading === cert.id}
                                className="text-slate-400 hover:text-red-400 p-2 rounded transition-colors"
                                title="Baixar 2ª Via do Certificado"
                              >
                                {isDownloading === cert.id ? '⏳' : '⬇️'}
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-slate-500 text-sm py-4">Nenhum exame registrado ainda.</div>
                      )}
                    </div>
                    
                    <button 
                      onClick={() => setIsHistoricModalOpen(true)}
                      className="w-full mt-6 py-2 border border-dashed border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500 rounded text-sm font-medium transition"
                    >
                      + Lançar Histórico Antigo
                    </button>
                  </section>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Modal Histórico */}
      {isHistoricModalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-700 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100 mb-4">Lançar Histórico</h3>
            <p className="text-xs text-slate-400 mb-4">Isto adicionará um certificado à linha do tempo do aluno <strong>sem alterar</strong> a faixa atual dele.</p>
            <form onSubmit={handleSaveHistoric} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Qual Faixa?</label>
                <select required value={historicData.rankId} onChange={e => setHistoricData({...historicData, rankId: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white">
                  <option value="">-- Selecione --</option>
                  {ranks.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Data do Exame Antigo</label>
                <input required type="date" value={historicData.issueDate} onChange={e => setHistoricData({...historicData, issueDate: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white" />
              </div>
              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setIsHistoricModalOpen(false)} className="px-3 py-1.5 text-slate-400 hover:text-slate-200 text-sm">Cancelar</button>
                <button type="submit" className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm font-medium">Salvar Histórico</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Criar/Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-900 p-8 rounded-xl border border-slate-700 w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-xl font-bold text-slate-100 mb-6">{editingStudent ? 'Editar Aluno' : 'Novo Aluno'}</h3>
            <form onSubmit={handleSave} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm text-slate-400 mb-1">Nome Completo</label>
                  <input required type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white" />
                </div>
                
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Faixa Inicial (Opcional)</label>
                  <select 
                    value={formData.currentRankId} 
                    onChange={(e) => setFormData({ ...formData, currentRankId: e.target.value })} 
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white"
                  >
                    <option value="">-- Selecione uma graduação --</option>
                    {ranks.map(rank => (
                      <option key={rank.id} value={rank.id}>{rank.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-1">Data de Nascimento</label>
                  <input type="date" value={formData.birthDate} onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white" />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-1">Telefone (Celular)</label>
                  <input type="text" placeholder="(11) 99999-9999" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white" />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-1">Contato de Emergência</label>
                  <input type="text" placeholder="Nome - Parentesco - Telefone" value={formData.emergencyContact} onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm text-slate-400 mb-1">Observações Médicas</label>
                  <textarea rows={3} placeholder="Alergias, asma, cirurgias recentes, medicamentos..." value={formData.medicalNotes} onChange={(e) => setFormData({ ...formData, medicalNotes: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white"></textarea>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
                <input type="checkbox" id="financial" checked={formData.hasFinancialDebts} onChange={(e) => setFormData({ ...formData, hasFinancialDebts: e.target.checked })} className="w-5 h-5 text-red-600 bg-slate-950 border-slate-700 rounded" />
                <label htmlFor="financial" className="text-sm font-medium text-red-400">Bloqueio Financeiro (Impede testes de exame)</label>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-400 hover:text-slate-200">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium">Salvar Ficha</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
