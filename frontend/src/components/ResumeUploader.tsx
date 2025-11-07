import React, { useState } from 'react';
import { UploadIcon, BrainCircuitIcon } from './Icons';
import { Spinner } from './Spinner';

interface ResumeUploaderProps {
  onUpload: (file: File) => void;
  onCheckATS: (file: File) => void;
  isLoading: boolean;
  error: string | null;
  resumeFile: File | null;
}

export const ResumeUploader: React.FC<ResumeUploaderProps> = ({ onUpload, onCheckATS, isLoading, error, resumeFile }) => {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = () => {
    if (file) {
      onUpload(file);
    }
  };

  const handleClear = () => {
    setFile(null);
  };

  return (
    <div
      className="flex flex-col items-center justify-center h-full p-8 text-center"
      onDragEnter={handleDrag}
    >
      <BrainCircuitIcon className="w-20 h-20 mb-6 text-cyan-400" />
      <h2 className="text-3xl font-bold mb-2 text-white">AI Interview Warmup</h2>
      <p className="text-lg text-gray-400 mb-8 max-w-2xl">
        Upload your resume to begin a personalized interview session. Our AI will generate relevant
        questions based on your experience.
      </p>

      <div className="w-full max-w-lg">
        <label
          htmlFor="dropzone-file"
          className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
            dragActive
              ? 'border-cyan-400 bg-gray-700'
              : 'border-gray-600 bg-gray-800 hover:bg-gray-700'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <UploadIcon className="w-10 h-10 mb-3 text-gray-400" />
            {file ? (
              <p className="font-semibold text-cyan-400">{file.name}</p>
            ) : (
              <>
                <p className="mb-2 text-sm text-gray-400">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">PDF, DOCX (MAX. 5MB)</p>
              </>
            )}
          </div>
          <input
            id="dropzone-file"
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept=".pdf,.docx"
          />
        </label>

        {/* ✅ BUTTONS SECTION FIXED */}
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <button
            onClick={handleSubmit}
            disabled={!file || isLoading}
            className="min-w-[200px] flex items-center justify-center px-6 py-3 bg-cyan-500 text-white font-bold rounded-full shadow-lg transition-all transform hover:scale-105 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:scale-100"
          >
            {isLoading ? (
              <>
                <Spinner />
                <span className="ml-2">Analyzing Resume...</span>
              </>
            ) : (
              'Generate Interview Questions'
            )}
          </button>

          <button
            onClick={() => onCheckATS(file!)}
            disabled={!file || isLoading || resumeFile !== null}
            className="min-w-[200px] flex items-center justify-center px-6 py-3 bg-cyan-500 text-white font-bold rounded-full shadow-lg transition-all transform hover:scale-105 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:scale-100"
          >
            Check ATS Score
          </button>
        </div>

        {error && <p className="mt-4 text-red-400">{error}</p>}
      </div>
    </div>
  );
};
