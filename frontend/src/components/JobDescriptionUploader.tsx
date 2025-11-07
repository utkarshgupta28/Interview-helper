import React, { useState } from 'react';
import { BrainCircuitIcon } from './Icons';
import { Spinner } from './Spinner';

interface JobDescriptionUploaderProps {
  onUpload: (text: string) => void;
  onBack: () => void;
  isLoading: boolean;
  error: string | null;
}

export const JobDescriptionUploader: React.FC<JobDescriptionUploaderProps> = ({
  onUpload,
  onBack,
  isLoading,
  error,
}) => {
  const [jobDescription, setJobDescription] = useState('');

  const handleSubmit = () => {
    if (jobDescription.trim()) {
      onUpload(jobDescription.trim());
      // Clear the textarea and hide the upload section after submission
      setJobDescription('');
    } else {
      alert('Please enter or paste a job description before proceeding.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <BrainCircuitIcon className="w-20 h-20 mb-6 text-cyan-400" />
      <h2 className="text-3xl font-bold mb-2 text-white">Check ATS Score</h2>
      <p className="text-lg text-gray-400 mb-8 max-w-2xl">
        Paste the job description below to analyze how well your resume matches the role.
        Your previously uploaded resume will be used for comparison.
      </p>

      <div className="w-full max-w-2xl">
        {!isLoading && (
          <>
            <textarea
              className="w-full h-60 p-4 bg-gray-800 text-white border-2 border-gray-600 rounded-lg resize-none focus:outline-none focus:border-cyan-400 placeholder-gray-500"
              placeholder="Paste the job description here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />

      
            <div className="mt-6 flex flex-row space-x-4">
              <button
                onClick={onBack}
                className="flex-1 flex items-center justify-center px-6 py-3 bg-gray-600 text-white font-bold rounded-full shadow-lg transition-all transform hover:scale-105"
              >
                Back
              </button>

              <button
                onClick={handleSubmit}
                className="flex-1 flex items-center justify-center px-6 py-3 bg-cyan-500 text-white font-bold rounded-full shadow-lg transition-all transform hover:scale-105"
              >
                Check ATS Score
              </button>
            </div>
          </>
        )}

        {/* ✅ Show spinner while loading */}
        {isLoading && (
          <div className="flex justify-center mt-6">
            <Spinner />
            <span className="ml-2 text-cyan-400 font-semibold">Analyzing...</span>
          </div>
        )}

        {error && <p className="mt-4 text-red-400">{error}</p>}
      </div>
    </div>
  );
};
