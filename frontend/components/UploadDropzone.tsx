'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, AlertCircle } from 'lucide-react';

interface UploadDropzoneProps {
  onFileSelect: (file: File) => void;
  uploading: boolean;
}

export function UploadDropzone({ onFileSelect, uploading }: UploadDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndPass = (file: File) => {
    setErrorMessage(null);
    const validExts = ['.csv', '.pdf'];
    const hasValidExt = validExts.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      setErrorMessage('Unsupported file format. Please upload a .csv or .pdf statement.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('File size exceeds 10MB limit.');
      return;
    }

    onFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (uploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndPass(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndPass(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!uploading) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`subsight-card relative flex flex-col items-center justify-center p-10 text-center border-2 border-dashed transition-all cursor-pointer ${
          isDragOver
            ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20'
            : 'border-line hover:border-purple-300 dark:hover:border-purple-800'
        } ${uploading ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.pdf,text/csv,application/pdf"
          onChange={handleChange}
          className="hidden"
          disabled={uploading}
        />

        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-300">
          <UploadCloud className="h-8 w-8" />
        </div>

        <h4 className="mt-4 text-base font-semibold text-ink">
          Drop your bank statement here, or <span className="text-purple-600 underline decoration-purple-300">browse</span>
        </h4>
        <p className="mt-1 text-xs text-muted max-w-sm">
          Supports CSV (.csv) and PDF (.pdf) statements. Up to 10MB.
        </p>

        <div className="mt-4 flex items-center gap-3 text-[11px] font-medium text-muted">
          <span className="flex items-center gap-1">
            <FileText className="h-3.5 w-3.5 text-purple-600" /> Auto-header aliasing
          </span>
          <span>•</span>
          <span>Deduplication</span>
          <span>•</span>
          <span>Zero cloud data storage</span>
        </div>
      </div>

      {errorMessage && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
