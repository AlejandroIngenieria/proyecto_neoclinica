'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileImage, X } from 'lucide-react';

interface ImageDropzoneProps {
  label: string;
  onImageDrop: (file: File | null) => void;
  initialImageUrl?: string | null;
  className?: string;
}

export function ImageDropzone({ label, onImageDrop, initialImageUrl, className = '' }: ImageDropzoneProps) {
  const [preview, setPreview] = useState<string | null>(initialImageUrl || null);

  React.useEffect(() => {
    if (initialImageUrl) {
      setPreview(initialImageUrl);
    }
  }, [initialImageUrl]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setPreview(URL.createObjectURL(file));
      onImageDrop(file);
    }
  }, [onImageDrop]);

  const removeImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    onImageDrop(null);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    maxFiles: 1,
  });

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>

      <div className="flex flex-col sm:flex-row items-stretch gap-4">
        {/* Left Side: Preview of Current or Selected Image */}
        {preview ? (
          <div className="relative shrink-0 flex items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F172A] p-2 shadow-sm w-32 h-32 sm:w-36 sm:h-36 overflow-hidden group">
            <img
              src={preview}
              alt="Vista previa"
              className="h-full w-full object-contain rounded-xl"
            />
            <button
              type="button"
              onClick={removeImage}
              title="Quitar imagen"
              className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/70 text-white backdrop-blur-md transition hover:bg-rose-600 hover:scale-105"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}

        {/* Right Side: Drag and Drop Upload Box */}
        <div
          {...getRootProps()}
          className={`flex-1 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center transition-all duration-200 min-h-[128px] ${
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
                  ? 'Suelta la nueva imagen aquí...'
                  : preview
                  ? 'Haz clic o arrastra para reemplazar la imagen'
                  : 'Arrastra una imagen o haz clic para subir'}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">PNG, JPG o WEBP (max. 5MB)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
