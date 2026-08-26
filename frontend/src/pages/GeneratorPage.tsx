import { useState, useEffect } from 'react';
import html2pdf from 'html2pdf.js';
import { ranksList, type RankKey } from '../types';
import { certificateApi, settingsApi, studentApi } from '../services/api';
import type { StudentRecord } from '../services/api';

import defaultLogo from '../assets/default-logo.png';

const rankDetails: Record<RankKey, { color: string; phrase: string }> = {
  "Faixa Branca (7º Kyu)": { color: "#374151", phrase: "A pureza do início. A mente está vazia, pronta para aprender, e um novo caminho se abre à sua frente." },
  "Faixa Amarela (6º Kyu)": { color: "#FFD700", phrase: "A terra que firma suas raízes. Sua base se fortalece e a luz do conhecimento começa a brilhar." },
  "Faixa Laranja (5º Kyu)": { color: "#FFA500", phrase: "A energia do sol nascente. Sua percepção do karatê se expande e a sua vontade se fortalece a cada dia." },
  "Faixa Azul (4º Kyu)": { color: "#0000FF", phrase: "A fluidez e a imensidão do céu e do mar. Sua técnica se torna mais fluida e o espírito mais sereno." },
  "Faixa Verde (3º Kyu)": { color: "#008000", phrase: "O florescer das plantas. A esperança e o crescimento são evidentes em sua técnica e espírito." },
  "Faixa Roxa (2º Kyu)": { color: "#800080", phrase: "A busca pela dignidade e o respeito. A persistência é o caminho do êxito e você superou mais uma etapa com determinação." },
  "Faixa Marrom (1º Kyu)": { color: "#A52A2A", phrase: "A solidez da árvore madura. Sua técnica está sólida e a mente madura, preparando-o para a responsabilidade da faixa preta." },
  "Faixa Preta (1º Dan)": { color: "#000000", phrase: "O fim é apenas o começo. A faixa preta não é a chegada, mas o início de uma jornada de aprimoramento contínuo." },
  "Faixa Preta (2º Dan)": { color: "#000000", phrase: "A profundidade da técnica. A experiência se consolida e a verdadeira essência da arte marcial começa a ser revelada." },
  "Faixa Preta (3º Dan)": { color: "#000000", phrase: "O domínio do espírito. A técnica flui naturalmente e o praticante se torna um guia para os mais novos." },
  "Faixa Preta (4º Dan)": { color: "#000000", phrase: "A excelência em movimento. O mestre aperfeiçoa não apenas a técnica, mas a filosofia e o caráter." },
  "Faixa Preta (5º Dan)": { color: "#000000", phrase: "A maestria plena. Uma vida dedicada à arte, onde o praticante e a arte se tornam um só." }
};

const ValidationModal = ({ message, onClose }: { message: string, onClose: () => void }) => (
  <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
    <div className="bg-white p-8 rounded-lg text-center shadow-2xl max-w-sm mx-4">
      <p className="mb-6 text-lg text-gray-700">{message}</p>
      <button
        onClick={onClose}
        className="bg-red-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
      >
        Fechar
      </button>
    </div>
  </div>
);

export const GeneratorPage = () => {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | ''>('');

  const [studentName, setStudentName] = useState("");
    const [rank, setRank] = useState<RankKey>("Faixa Branca (7º Kyu)");
  const [associationName, setAssociationName] = useState("Associação Ribeiro de Karatê-dô Kenshi-kai");
  const [shihanName, setShihanName] = useState("Marcos Antônio Alves Ribeiro");
  const [presidentName, setPresidentName] = useState("Daniel Alves Pinto");
  const [certificateDate, setCertificateDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [activeLogoUrl, setActiveLogoUrl] = useState<string>(defaultLogo);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  
  useEffect(() => {
    let isMounted = true;
    
    // Load logo
    settingsApi.getLogo()
      .then((res) => {
        if (isMounted && res) {
          if (res.fullUrl) setActiveLogoUrl(res.fullUrl);
          else if (res.logoUrl) setActiveLogoUrl(res.logoUrl);
        }
      })
      .catch((err) => {
        console.warn('Could not load dynamic logo setting, falling back to default:', err);
      });

    // Load students
    studentApi.list().then(data => {
      if (isMounted) setStudents(data);
    }).catch(err => console.error('Failed to load students:', err));

    return () => {
      isMounted = false;
    };
  }, []);

  const handleStudentSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value ? Number(e.target.value) : '';
    setSelectedStudentId(id);
    
    if (id !== '') {
      const student = students.find(s => s.id === id);
      if (student) {
        setStudentName(student.name);
        
        // Auto-select next rank
        const currentRankIndex = ranksList.indexOf(student.rank as RankKey);
        if (currentRankIndex >= 0 && currentRankIndex < ranksList.length - 1) {
          setRank(ranksList[currentRankIndex + 1]);
        } else if (currentRankIndex === ranksList.length - 1) {
          setRank(ranksList[currentRankIndex]); // Already at max rank
        }
      }
    } else {
      setStudentName('');
    }
  };


  const formatDate = (dateString: string) => {
    if (!dateString) return "Data não definida";
    const date = new Date(dateString + "T00:00:00");
    const day = date.getDate();
    const month = date.toLocaleString("pt-BR", { month: "long" });
    const year = date.getFullYear();
    return `Campo Grande - MS, ${day} de ${month} de ${year}`;
  };

  const [base64Logo, setBase64Logo] = useState<string>('');

  useEffect(() => {
    const loadBase64 = async () => {
      try {
        const url = new URL(activeLogoUrl || defaultLogo, window.location.href).href;
        const response = await fetch(url);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => setBase64Logo(reader.result as string);
        reader.readAsDataURL(blob);
      } catch (e) {
        console.error('Failed to pre-fetch logo as base64', e);
      }
    };
    loadBase64();
  }, [activeLogoUrl]);

  const buildCertificateHTML = () => {
    const details = rankDetails[rank] || { color: "#000000", phrase: "" };
    const title = rank.includes("Preta") ? "Diploma" : "Certificado";
    const subtitle = rank.includes("Preta") ? "Outorga de Faixa Preta" : "de Graduação";
    const finalStudentName = studentName || "Nome do Aluno";

    return `
      <div style="width: 29.7cm; height: 21cm; box-sizing: border-box; border: 30px solid ${details.color}; background-color: white; display: flex; flex-direction: row; font-family: 'Montserrat', sans-serif;">
          
          <div style="width: 30%; display: flex; align-items: center; justify-content: center; box-sizing: border-box; border-right: 2px solid #e5e7eb; padding: 1rem;">
              <img src="${base64Logo}" alt="Logo da Associação" style="max-width: 95%; height: auto; object-fit: contain;">
          </div>

          <div style="width: 70%; display: flex; flex-direction: column; padding: 2.5rem; box-sizing: border-box;">
              
              <!-- Bloco de conteúdo principal -->
              <div>
                  <div style="text-align: center;">
                      <h2 style="font-size: 1.5rem; line-height: 2rem; font-weight: 700; text-transform: uppercase; color: #1f2937;">${associationName}</h2>
                      <h1 style="font-family: 'Playfair Display', serif; font-size: 3.75rem; line-height: 1; color: #991b1b; margin-top: 0.5rem;">${title}</h1>
                      <p style="font-size: 1.5rem; line-height: 2rem; margin-top: 0.25rem; color: #4b5563;">${subtitle}</p>
                  </div>
                  <div style="text-align: center; padding: 0 1rem; margin-top: 2.5rem;">
                      <p style="font-size: 1.125rem; line-height: 1.75rem; color: #374151;">Conferimos a</p>
                      <p style="font-weight: 700; font-size: 2.25rem; line-height: 2.5rem; color: #111827; margin: 0.5rem 0; height: 5rem; display: flex; align-items: center; justify-content: center; flex-wrap: wrap;">${finalStudentName}</p>
                      <p style="font-size: 1.125rem; line-height: 1.75rem; color: #374151;">em vista de sua aprovação na categoria de</p>
                      <p style="font-weight: 700; font-size: 1.875rem; line-height: 2.25rem; margin: 0.5rem 0; color: ${details.color};">${rank}</p>
                      <p style="font-size: 1.125rem; line-height: 1.75rem; color: #374151;">de <strong>KARATÊ-DÔ KENSHI-KAI</strong>, para que possa gozar de todos os direitos e prerrogativas concedidos a este certificado.</p>
                      <p style="font-size: 1rem; line-height: 1.5rem; font-style: italic; color: #4b5563; margin-top: 1rem;">${details.phrase}</p>
                      <p style="font-size: 1.125rem; line-height: 1.75rem; color: #1f2937; margin-top: 1.5rem;">${formatDate(certificateDate)}</p>
                  </div>
              </div>

              <!-- Espaçador flexível que empurra as assinaturas para baixo -->
              <div style="flex-grow: 1;"></div>

              <!-- Bloco de assinaturas -->
              <div style="width: 100%; display: flex; justify-content: space-between; align-items: flex-start; text-align: center; padding-top: 1rem;">
                  <div style="width: 30%;">
                      <div style="border-top: 2px solid ${details.color}; width: 75%; margin: 0 auto;"></div>
                      <p style="margin-top: 0.5rem; font-weight: 700; font-size: 0.875rem; line-height: 1.25rem; color: #1f2937;">${presidentName}</p>
                      <p style="font-size: 0.75rem; line-height: 1rem; color: #4b5563;">Presidente da Associação</p>
                  </div>
                  <div style="width: 30%;">
                      <div style="border-top: 2px solid ${details.color}; width: 75%; margin: 0 auto;"></div>
                      <p style="margin-top: 0.5rem; font-weight: 700; font-size: 0.875rem; line-height: 1.25rem; color: #1f2937;">${finalStudentName}</p>
                      <p style="font-size: 0.75rem; line-height: 1rem; color: #4b5563;">Aluno(a)</p>
                  </div>
                  <div style="width: 30%;">
                      <div style="border-top: 2px solid ${details.color}; width: 75%; margin: 0 auto;"></div>
                      <p style="margin-top: 0.5rem; font-weight: 700; font-size: 0.875rem; line-height: 1.25rem; color: #1f2937;">${shihanName}</p>
                      <p style="font-size: 0.75rem; line-height: 1rem; color: #4b5563;">Diretor Técnico da Associação</p>
                  </div>
              </div>
          </div>
      </div>
    `;
  };

  const handleSavePdf = async () => {
    if (!studentName.trim()) {
      setModalMessage("Por favor, preencha o nome do aluno(a).");
      setIsModalOpen(true);
      return;
    }

    setIsGenerating(true);
    setStatusFeedback(null);

    const certificateHTML = buildCertificateHTML();
    const filename = `${studentName.replace(/ /g, "_")}-${rank.replace(/ /g, "_")}.pdf`;
    const opt = {
      margin: 0,
      filename,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: { scale: 3, useCORS: true, scrollY: 0 },
      jsPDF: { unit: "cm" as const, format: "a4" as const, orientation: "landscape" as const }
    };

    try {
      await certificateApi.create({
        studentName,
        rank,
        associationName,
        shihanName,
        presidentName,
        issueDate: certificateDate
      });

      await html2pdf().from(certificateHTML).set(opt).save();

      setStatusFeedback({
        type: 'success',
        message: 'Certificado emitido, registrado no banco de dados com sucesso!'
      });

          } catch (e: unknown) {
      console.error(e);
      setStatusFeedback({
        type: 'error',
        message: e instanceof Error ? e.message : 'Erro ao processar certificado.'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="animate-fade-in pb-10">
      {isModalOpen && (
        <ValidationModal
          message={modalMessage}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      
      <div className="max-w-4xl mx-auto">
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b border-gray-100">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                Emissão de Certificado
              </h1>
              <p className="text-gray-600 mt-1">
                Preencha os dados do exame de graduação para emitir o certificado oficial.
              </p>
            </div>
            <span className="mt-2 sm:mt-0 px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
              Sessão Autorizada
            </span>
          </div>

          {statusFeedback && (
            <div
              className={`mb-6 p-4 rounded-lg flex items-center ${
                statusFeedback.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              <span className="text-xl mr-2">
                {statusFeedback.type === 'success' ? '✅' : '❌'}
              </span>
              <p className="text-sm font-medium">{statusFeedback.message}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1 md:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label htmlFor="studentSelect" className="block text-sm font-bold text-slate-700 mb-1">
                Selecionar Aluno Cadastrado (Recomendado)
              </label>
              <select
                id="studentSelect"
                value={selectedStudentId}
                onChange={handleStudentSelect}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white shadow-sm"
              >
                <option value="">-- Ou selecione um aluno para preenchimento automático --</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} (Faixa atual: {student.rank})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="studentName" className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Aluno(a) (Impresso no Certificado) *
              </label>
              <input
                type="text"
                id="studentName"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Digite o nome completo do aluno"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-red-500 focus:border-red-500 text-sm bg-white"
              />
            </div>

            <div>
              <label htmlFor="rank" className="block text-sm font-medium text-gray-700 mb-1">
                Graduação / Faixa
              </label>
              <select
                id="rank"
                value={rank}
                onChange={(e) => setRank(e.target.value as RankKey)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 text-sm bg-white"
              >
                {ranksList.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="associationName" className="block text-sm font-medium text-gray-700 mb-1">
                Nome da Associação
              </label>
              <input
                type="text"
                id="associationName"
                value={associationName}
                onChange={(e) => setAssociationName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 text-sm"
              />
            </div>

            <div>
              <label htmlFor="shihanName" className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Shihan / Diretor Técnico
              </label>
              <input
                type="text"
                id="shihanName"
                value={shihanName}
                onChange={(e) => setShihanName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 text-sm"
              />
            </div>

            <div>
              <label htmlFor="presidentName" className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Presidente da Associação
              </label>
              <input
                type="text"
                id="presidentName"
                value={presidentName}
                onChange={(e) => setPresidentName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 text-sm"
              />
            </div>

            <div>
              <label htmlFor="certificateDate" className="block text-sm font-medium text-gray-700 mb-1">
                Data do Certificado
              </label>
              <input
                type="date"
                id="certificateDate"
                value={certificateDate}
                onChange={(e) => setCertificateDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 text-sm"
              />
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <button
              id="savePdfBtn"
              onClick={handleSavePdf}
              disabled={isGenerating}
              className="bg-green-700 text-white font-bold py-3 px-8 rounded-lg hover:bg-green-800 transition-all shadow-md text-lg w-full md:w-auto disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center space-x-2"
            >
              {isGenerating ? (
                <>
                  <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                  <span>Gerando PDF, E-mail & Registrando...</span>
                </>
              ) : (
                <>
                  <span>📜</span>
                  <span>Gerar Certificado</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeneratorPage;
