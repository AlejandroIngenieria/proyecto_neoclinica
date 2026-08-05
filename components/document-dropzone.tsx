'use client';

import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileText, ExternalLink, X } from 'lucide-react';

interface DocumentDropzoneProps {
  label: string;
  onDocumentDrop: (file: File | null) => void;
  initialDocumentUrl?: string | null;
  className?: string;
}

export function DocumentDropzone({
  label,
  onDocumentDrop,
  initialDocumentUrl,
  className = '',
}: DocumentDropzoneProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialDocumentUrl || null);
  const [isPdf, setIsPdf] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string | null>(null);

  useEffect(() => {
    if (initialDocumentUrl) {
      setPreviewUrl(initialDocumentUrl);
      const isPdfUrl = initialDocumentUrl.toLowerCase().includes('.pdf');
      setIsPdf(isPdfUrl);
      setFileName(isPdfUrl ? 'Documento_Identificación.pdf' : 'Documento_Identificación');
    }
  }, [initialDocumentUrl]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles && acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        const fileIsPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        setIsPdf(fileIsPdf);
        setFileName(file.name);
        setPreviewUrl(URL.createObjectURL(file));
        onDocumentDrop(file);
      }
    },
    [onDocumentDrop],
  );

  const removeDocument = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewUrl(null);
    setFileName(null);
    setIsPdf(false);
    onDocumentDrop(null);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
  });

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>

      <div className="flex flex-col sm:flex-row items-stretch gap-4">
        {/* Left Side: Preview of Current or Selected Document */}
        {previewUrl ? (
          <div className="relative shrink-0 flex items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F172A] p-2 shadow-sm w-36 h-36 overflow-hidden group">
            {isPdf ? (
              <div className="flex flex-col items-center justify-center gap-1.5 p-2 text-center w-full h-full">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400">
                  <FileText className="h-6 w-6" />
                </div>
                <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 line-clamp-1 w-full px-1">
                  {fileName || 'Documento.pdf'}
                </p>
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <span>Ver PDF</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ) : (
              <img
                src={previewUrl}
                alt="Documento de Identificación"
                className="h-full w-full object-contain rounded-xl"
              />
            )}
            <button
              type="button"
              onClick={removeDocument}
              title="Quitar documento"
              className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/70 text-white backdrop-blur-md transition hover:bg-rose-600 hover:scale-105"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}

        {/* Right Side: Drag and Drop Upload Box */}
        <div
          {...getRootProps()}
          className={`flex-1 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center transition-all duration-200 min-h-[144px] ${
            isDragActive
              ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/30'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] hover:border-blue-300 hover:bg-slate-50 dark:hover:bg-slate-800/80'
          }`}
        >
          <input {...getInputProps()} />

          <div className="flex flex-col items-center gap-2 p-1">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full ${
                isDragActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}
            >
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
                {isDragActive
                  ? 'Suelta el documento aquí...'
                  : previewUrl
                  ? 'Haz clic o arrastra para reemplazar el documento'
                  : 'Arrastra un documento o haz clic para subir'}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">PDF, PNG, JPG o WEBP (max. 10MB)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
