import React, { useRef, useState } from 'react';
import { Upload, FileText, Image as ImageIcon, X, Check } from 'lucide-react';
import * as mammoth from 'mammoth';

interface FileUploaderProps {
  onFileLoaded: (content: string, fileName: string, imagePart?: { mimeType: string; data: string }) => void;
  onClearFile?: () => void;
  attachedFileName?: string;
  allowedTypesDescription?: string;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onFileLoaded,
  onClearFile,
  attachedFileName,
  allowedTypesDescription = 'Upload TXT, MD, CSV, JSON, DOCX, PDF or PNG/JPG (up to 10MB)',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    setIsProcessing(true);
    const fileName = file.name;
    const isImage = file.type.startsWith('image/');
    const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                   fileName.endsWith('.docx');

    if (isImage) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          const base64Data = result.split(',')[1];
          onFileLoaded('', fileName, {
            mimeType: file.type,
            data: base64Data,
          });
        }
        setIsProcessing(false);
      };
      reader.onerror = () => {
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
    } else if (isDocx) {
      // Handle .docx files with mammoth
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const result = await mammoth.extractRawText({ arrayBuffer });
          onFileLoaded(result.value, fileName);
        } catch (err) {
          console.error('Error extracting text from docx:', err);
          onFileLoaded(`[Error: Could not extract text from ${fileName}]`, fileName);
        }
        setIsProcessing(false);
      };
      reader.onerror = () => {
        setIsProcessing(false);
      };
      reader.readAsArrayBuffer(file);
    } else {
      // Text file (TXT, MD, CSV, JSON, etc.)
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        onFileLoaded(text || '', fileName);
        setIsProcessing(false);
      };
      reader.onerror = () => {
        setIsProcessing(false);
      };
      reader.readAsText(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  if (attachedFileName) {
    return (
      <div className="flex items-center justify-between px-3 py-2 bg-indigo-50/60 border border-indigo-200 rounded-lg text-xs text-indigo-900">
        <div className="flex items-center space-x-2 truncate">
          <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="font-medium truncate">{attachedFileName}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-semibold">Loaded</span>
        </div>
        {onClearFile && (
          <button
            type="button"
            onClick={onClearFile}
            className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-slate-100 transition cursor-pointer"
            title="Remove attached file"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`border border-dashed rounded-lg p-3 text-center transition cursor-pointer ${
        isDragging
          ? 'border-indigo-500 bg-indigo-50/60'
          : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/20'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.csv,.json,.doc,.docx,image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <div className="flex items-center justify-center space-x-2 text-xs text-slate-600">
        <Upload className="w-4 h-4 text-indigo-500" />
        <span className="font-medium text-slate-700">
          {isProcessing ? 'Processing document...' : 'Drop document here or click to browse'}
        </span>
      </div>
      <p className="text-[11px] text-slate-400 mt-1">{allowedTypesDescription}</p>
    </div>
  );
};
