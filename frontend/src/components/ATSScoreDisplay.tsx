import React from 'react';
import { BrainCircuitIcon } from './Icons';
import { ATSScoreResult } from '../types';

interface ATSScoreDisplayProps {
  result: ATSScoreResult;
  onBack: () => void;
}

export const ATSScoreDisplay: React.FC<ATSScoreDisplayProps> = ({ result, onBack }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen p-8 text-center bg-gray-900">
      <BrainCircuitIcon className="w-20 h-20 mb-6 text-cyan-400 mx-auto" />
      <h2 className="text-3xl font-bold mb-2 text-white">ATS Score Analysis</h2>
      <p className="text-lg text-gray-400 mb-8 max-w-2xl">
        Here's how your resume performs against the job description.
      </p>

      <div className="w-full max-w-2xl bg-gray-800 rounded-lg p-6 mb-10 shadow-lg">
        <div className="flex items-center justify-center mb-4">
          <div
            className={`w-32 h-32 rounded-full ${getScoreBg(
              result.score
            )} flex items-center justify-center text-4xl font-bold text-white`}
          >
            {result.score}%
          </div>
        </div>

        <h3 className={`text-2xl font-bold mb-4 ${getScoreColor(result.score)}`}>
          ATS Compatibility Score: {result.score}%
        </h3>

        {result.breakdown && (
          <div className="mb-6 overflow-x-auto">
            <h4 className="text-lg font-bold text-white mb-3">Score Breakdown:</h4>
            <table className="w-full bg-gray-700 rounded-lg overflow-hidden">
              <thead className="bg-gray-600">
                <tr>
                  <th className="px-4 py-2 text-left text-white font-bold">Category</th>
                  <th className="px-4 py-2 text-left text-white font-bold">Score</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-600">
                  <td className="px-4 py-3 text-gray-300">Keyword Matching</td>
                  <td
                    className={`px-4 py-3 font-bold ${getScoreColor(
                      result.breakdown.keywordMatching
                    )}`}
                  >
                    {result.breakdown.keywordMatching}%
                  </td>
                </tr>
                <tr className="border-t border-gray-600">
                  <td className="px-4 py-3 text-gray-300">Skills Alignment</td>
                  <td
                    className={`px-4 py-3 font-bold ${getScoreColor(
                      result.breakdown.skillsAlignment
                    )}`}
                  >
                    {result.breakdown.skillsAlignment}%
                  </td>
                </tr>
                <tr className="border-t border-gray-600">
                  <td className="px-4 py-3 text-gray-300">Formatting</td>
                  <td
                    className={`px-4 py-3 font-bold ${getScoreColor(
                      result.breakdown.formatting
                    )}`}
                  >
                    {result.breakdown.formatting}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <p className="text-gray-300 mb-6">{result.analysis}</p>

        <div className="text-left">
          <h4 className="text-xl font-bold text-white mb-4">Improvement Tips:</h4>
          <ul className="space-y-2">
            {result.tips.map((tip, index) => (
              <li key={index} className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <span className="text-gray-300">{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <button
        onClick={onBack}
        className="px-8 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-full shadow-lg transition-transform transform hover:scale-105 mb-8"
      >
        Back to Resume
      </button>
    </div>
  );
};
