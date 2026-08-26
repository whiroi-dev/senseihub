import { useState, useEffect } from 'react';
import { api } from '../services/api';

interface Student {
  id: string;
  name: string;
  currentRank?: { name: string; color: string };
}

export const FrequenciaPage = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/students');
      setStudents(response.data.sort((a: Student, b: Student) => a.name.localeCompare(b.name)));
    } catch (err) {
      alert('Erro ao carregar lista de alunos.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleStudent = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === students.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(students.map((s) => s.id)));
    }
  };

  const handleSaveAttendance = async () => {
    if (selectedIds.size === 0) {
      alert('Selecione pelo menos um aluno.');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/attendances/batch', {
        date,
        studentIds: Array.from(selectedIds),
        hoursCredited: 1.0,
      });
      alert('Frequência salva com sucesso!');
      setSelectedIds(new Set()); // Limpa a seleção para a próxima chamada
    } catch (err) {
      alert('Erro ao salvar a chamada. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-100">Chamada de Tatame (Lote)</h2>
        <div className="flex items-center gap-4">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 px-4 py-2 rounded-lg focus:outline-none focus:border-red-500"
          />
          <button
            onClick={handleSaveAttendance}
            disabled={isSubmitting || selectedIds.size === 0}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition"
          >
            {isSubmitting ? 'Salvando...' : `Salvar Frequência (${selectedIds.size})`}
          </button>
        </div>
      </div>

      <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 shadow-xl">
        {isLoading ? (
          <div className="text-center py-10 text-slate-400">Carregando lista de alunos...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-900 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-3 w-16">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === students.length && students.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-red-600 bg-slate-950 border-slate-700 rounded cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-3">Aluno</th>
                  <th className="px-6 py-3">Faixa Atual</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr
                    key={student.id}
                    onClick={() => toggleStudent(student.id)}
                    className={`border-b border-slate-800 cursor-pointer transition-colors ${
                      selectedIds.has(student.id) ? 'bg-red-900/20' : 'hover:bg-slate-800/50'
                    }`}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(student.id)}
                        readOnly
                        className="w-4 h-4 text-red-600 bg-slate-950 border-slate-700 rounded pointer-events-none"
                      />
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-200">{student.name}</td>
                    <td className="px-6 py-4">
                      {student.currentRank ? (
                        <span className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full border border-slate-500" style={{ backgroundColor: student.currentRank.color }}></div>
                          {student.currentRank.name}
                        </span>
                      ) : (
                        <span className="text-slate-500">Iniciante</span>
                      )}
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center py-6 text-slate-500">Nenhum aluno cadastrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
