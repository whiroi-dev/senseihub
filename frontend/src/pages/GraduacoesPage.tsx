import { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';

interface Rank {
  id: string;
  name: string;
  color: string;
  phrase: string;
  minHours: number;
  minDays: number;
  sortOrder: number;
}

export const GraduacoesPage = () => {
  const [data, setData] = useState<Rank[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRank, setEditingRank] = useState<Rank | null>(null);
  const [formData, setFormData] = useState({ name: '', color: '', phrase: '', minHours: 0, minDays: 0, sortOrder: 0 });

  const fetchRanks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('/ranks');
      // Proteção explícita contra valores nulos/indefinidos no payload
      setData(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError('Falha ao carregar as graduações.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRanks();
  }, []);

  const filteredData = useMemo(() => {
    return data
      .filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [data, search]);

  const openModal = (rank?: Rank) => {
    if (rank) {
      setEditingRank(rank);
      setFormData({
        name: rank.name, color: rank.color, phrase: rank.phrase || '',
        minHours: rank.minHours, minDays: rank.minDays, sortOrder: rank.sortOrder
      });
    } else {
      setEditingRank(null);
      setFormData({ name: '', color: '#FFFFFF', phrase: '', minHours: 0, minDays: 0, sortOrder: 0 });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRank) {
        await api.put(`/ranks/${editingRank.id}`, formData);
      } else {
        await api.post('/ranks', formData);
      }
      setIsModalOpen(false);
      fetchRanks();
    } catch (err) {
      alert('Erro ao salvar registro. Verifique os dados e a conexão.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-100">Gestão de Graduações</h2>
        <button onClick={() => openModal()} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition">
          + Nova Graduação
        </button>
      </div>

      {error && <div className="p-4 bg-red-900/50 border border-red-500 text-red-200 rounded-lg">{error}</div>}

      <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 shadow-xl">
        <div className="mb-4">
          <input
            type="text"
            placeholder="Buscar graduação por nome..."
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
                  <th className="px-6 py-3">Cor</th>
                  <th className="px-6 py-3">Nome</th>
                  <th className="px-6 py-3">Min Horas</th>
                  <th className="px-6 py-3">Min Dias</th>
                  <th className="px-6 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((rank) => (
                  <tr key={rank.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                    <td className="px-6 py-4">
                      <div className="w-6 h-6 rounded-full border border-slate-500" style={{ backgroundColor: rank.color }}></div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-200">{rank.name}</td>
                    <td className="px-6 py-4">{rank.minHours}h</td>
                    <td className="px-6 py-4">{rank.minDays} dias</td>
                    <td className="px-6 py-4">
                      <button onClick={() => openModal(rank)} className="text-blue-400 hover:text-blue-300 mr-4">Editar</button>
                    </td>
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-slate-500">Nenhuma graduação encontrada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-900 p-8 rounded-xl border border-slate-700 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-slate-100 mb-6">{editingRank ? 'Editar Graduação' : 'Nova Graduação'}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Nome da Graduação</label>
                <input required type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Cor (Hex)</label>
                  <input required type="color" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} className="w-full h-10 bg-slate-950 border border-slate-700 rounded cursor-pointer" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Ordem</label>
                  <input required type="number" value={formData.sortOrder} onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Horas Mínimas</label>
                  <input required type="number" value={formData.minHours} onChange={(e) => setFormData({ ...formData, minHours: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Dias de Carência</label>
                  <input required type="number" value={formData.minDays} onChange={(e) => setFormData({ ...formData, minDays: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Frase Motivacional do Certificado</label>
                <textarea 
                  rows={3}
                  placeholder="Ex: A pureza do início. A mente está vazia..." 
                  value={formData.phrase} 
                  onChange={(e) => setFormData({ ...formData, phrase: e.target.value })} 
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white text-sm resize-none" 
                />
                <p className="text-xs text-slate-500 mt-1">Essa frase aparece em itálico no certificado</p>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-400 hover:text-slate-200">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
