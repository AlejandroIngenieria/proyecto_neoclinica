'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileImage, X } from 'lucide-react';

interface ImageDropzoneProps {
  label: string;
  onImageDrop: (file: File | null) => void;
  className?: string;
}

export function ImageDropzone({ label, onImageDrop, className = '' }: ImageDropzoneProps) {
  const [preview, setPreview] = useState<string | null>(null);

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
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <div
        {...getRootProps()}
        className={`relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-200 ${
          isDragActive
            ? 'border-blue-400 bg-blue-50'
            : preview
            ? 'border-slate-200 bg-slate-50 hover:bg-slate-100'
            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
        }`}
      >
        <input {...getInputProps()} />

        {preview ? (
          <div className="flex flex-col items-center gap-3">
            <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
              <img src={preview} alt="Preview" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={removeImage}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-black/70"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <p className="text-xs font-medium text-slate-600">Cambiar imagen</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full ${isDragActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
              <UploadCloud className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">
                {isDragActive ? 'Suelta la imagen aquí...' : 'Arrastra una imagen o haz clic'}
              </p>
              <p className="mt-1 text-xs text-slate-500">PNG, JPG o WEBP (max. 5MB)</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
