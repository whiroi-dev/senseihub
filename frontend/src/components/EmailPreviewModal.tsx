import React from 'react';

interface EmailPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  studentEmail?: string;
  previewUrl?: string;
}

export const EmailPreviewModal: React.FC<EmailPreviewModalProps> = ({
  isOpen,
  onClose,
  studentName,
  studentEmail,
  previewUrl,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100 transform transition-all animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl shadow-inner">
            ✉️
          </div>
          
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            Certificado Enviado por E-mail!
          </h3>
          
          <p className="text-gray-600 text-sm mb-6 leading-relaxed">
            O certificado oficial de <strong className="text-gray-800">{studentName}</strong> foi gerado em PDF e transmitido através do serviço de envio simulado (Ethereal).
          </p>

          {studentEmail && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 mb-6 text-left text-xs text-gray-600 space-y-1">
              <div>
                <span className="font-semibold text-gray-700">Destinatário:</span> {studentEmail}
              </div>
              <div>
                <span className="font-semibold text-gray-700">Status:</span>{' '}
                <span className="text-green-600 font-bold">Disparado com Sucesso ✔</span>
              </div>
            </div>
          )}

          {previewUrl ? (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-left">
              <div className="flex items-center space-x-2 text-blue-900 font-semibold text-sm mb-1">
                <span>📬</span>
                <span>Visualizador de E-mail (Ethereal Sandbox)</span>
              </div>
              <p className="text-xs text-blue-700 mb-3">
                Você pode inspecionar o e-mail completo formatado com o anexo PDF em tempo real no link abaixo:
              </p>
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer group"
              >
                <span>Abrir Preview do E-mail</span>
                <span className="ml-1.5 transform group-hover:translate-x-0.5 transition-transform">↗</span>
              </a>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 text-xs text-amber-800">
              E-mail despachado no servidor local.
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Fechar Janela
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailPreviewModal;
