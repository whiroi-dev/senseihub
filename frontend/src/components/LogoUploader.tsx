import React, { useState, useRef, useEffect } from 'react';
import { settingsApi, ApiError } from '../services/api';
import defaultLogo from '../assets/default-logo.png';

interface LogoUploaderProps {
  onLogoUpdated?: (newLogoUrl: string) => void;
}

export const LogoUploader: React.FC<LogoUploaderProps> = ({ onLogoUpdated }) => {
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;
    settingsApi.getLogo()
      .then((res) => {
        if (isMounted && res) {
          if (res.fullUrl) setCurrentLogoUrl(res.fullUrl);
          else if (res.logoUrl) setCurrentLogoUrl(res.logoUrl);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Failed to load active logo:', err);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);



  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFeedback({
        type: 'error',
        message: 'Por favor, selecione um arquivo de imagem válido (.png, .jpg, .svg, .webp).',
      });
      return;
    }

    setSelectedFile(file);
    setFeedback(null);

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setFeedback({
        type: 'error',
        message: 'Por favor, selecione um arquivo de imagem para enviar.',
      });
      return;
    }

    setIsUploading(true);
    setFeedback(null);

    try {
      const res = await settingsApi.uploadLogo(selectedFile);
      const newUrl = res.fullUrl || res.logoUrl;
      setCurrentLogoUrl(newUrl);
      setPreviewUrl('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      setFeedback({
        type: 'success',
        message: 'Logotipo atualizado com sucesso! O certificado utilizará a nova logo automaticamente.',
      });

      if (onLogoUpdated) {
        onLogoUpdated(newUrl);
      }
    } catch (err) {
      console.error('Error uploading logo:', err);
      const msg = err instanceof ApiError ? err.message : 'Falha ao enviar o logotipo.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setIsUploading(false);
    }
  };

  const displayLogo = previewUrl || currentLogoUrl || defaultLogo;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
      <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-gray-100">
        <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center text-xl font-bold">
          🥋
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Logotipo Oficial da Associação</h2>
          <p className="text-xs sm:text-sm text-gray-500">
            Envie o brasão ou logotipo oficial para impressão em todos os certificados gerados.
          </p>
        </div>
      </div>

      {feedback && (
        <div
          className={`mb-6 p-4 rounded-xl flex items-center text-sm ${
            feedback.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <span className="text-lg mr-2.5">
            {feedback.type === 'success' ? '✅' : '❌'}
          </span>
          <span className="font-medium">{feedback.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Preview Area */}
        <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
            {previewUrl ? 'Pré-visualização do Novo Logotipo' : 'Logotipo Atual Ativo'}
          </span>
          <div className="w-48 h-48 bg-white rounded-xl shadow-sm border border-gray-200 flex items-center justify-center p-4 overflow-hidden">
            {isLoading ? (
              <span className="animate-spin h-8 w-8 border-3 border-red-600 border-t-transparent rounded-full"></span>
            ) : (
              <img
                src={displayLogo}
                alt="Logo da Associação"
                className="max-h-full max-w-full object-contain"
              />
            )}
          </div>
          {previewUrl && (
            <span className="mt-3 text-xs text-amber-600 font-medium">
              ⚠️ Arquivo selecionado aguardando confirmação de upload.
            </span>
          )}
        </div>

        {/* Upload Form */}
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Selecionar Nova Imagem
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 cursor-pointer border border-gray-200 rounded-lg p-2 bg-white"
            />
            <p className="mt-1.5 text-xs text-gray-400">
              Formatos recomendados: PNG transparente, SVG, JPG. Tamanho máximo: 10MB.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="w-full py-3 px-5 bg-red-700 hover:bg-red-800 text-white font-semibold rounded-xl transition-colors shadow-sm disabled:bg-gray-300 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center space-x-2"
            >
              {isUploading ? (
                <>
                  <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                  <span>Enviando Logotipo...</span>
                </>
              ) : (
                <>
                  <span>📤</span>
                  <span>Salvar Novo Logotipo</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogoUploader;
