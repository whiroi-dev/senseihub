import React from 'react';
import LogoUploader from '../components/LogoUploader';

export const SettingsPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="pb-4 border-b border-gray-200">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <span>⚙️</span> Configurações do Sistema
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Personalize a identidade visual e parâmetros dos certificados emitidos.
        </p>
      </div>

      {/* Main Logo Uploader */}
      <LogoUploader />

      {/* Instructions & Guidelines */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
        <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
          <span>ℹ️</span> Diretrizes para o Logotipo Oficial
        </h3>
        <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
          <li>Recomenda-se utilizar imagem com fundo transparente (.png ou .svg) para melhor contraste.</li>
          <li>A proporção quadrada ou circular (1:1) adapta-se perfeitamente à barra lateral esquerda do certificado.</li>
          <li>Após o upload, todos os novos certificados emitidos e pré-visualizações na tela de Emissão refletirão a nova logo imediatamente.</li>
        </ul>
      </div>
    </div>
  );
};

export default SettingsPage;
