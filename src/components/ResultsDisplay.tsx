'use client';

import { useState } from 'react';
import { ExtractedContent } from '@/lib/extractor';
import { generateDocx, getDomainFromUrl } from '@/lib/docxExport';

interface ResultsDisplayProps {
  data: ExtractedContent;
}

export default function ResultsDisplay({ data }: ResultsDisplayProps) {
  const [exporting, setExporting] = useState(false);

  const handleExportDocx = async () => {
    setExporting(true);
    try {
      const blob = await generateDocx(data);
      const domain = getDomainFromUrl(data.url);
      const filename = `${domain}-content-extraction.docx`;

      // Trigger download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export document. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Export Button */}
      <div className="flex justify-end">
        <button
          onClick={handleExportDocx}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-200 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
        >
          {exporting ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Exporting...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Export to Word
            </>
          )}
        </button>
      </div>

      {/* Meta Information */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Meta Information</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Meta Title
            </label>
            <p className="text-gray-800 bg-gray-50 p-3 rounded border">
              {data.metaTitle || <span className="text-gray-400 italic">Not found</span>}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Meta Description
            </label>
            <p className="text-gray-800 bg-gray-50 p-3 rounded border">
              {data.metaDescription || <span className="text-gray-400 italic">Not found</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Headings with Content */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Headings & Content ({data.headings.length} found)
        </h2>

        {data.headings.length === 0 ? (
          data.fallbackContent ? (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <p className="text-amber-800 text-sm">
                  <strong>Note:</strong> No semantic headings (H1-H4) found. Showing extracted content using fallback method: <code className="bg-amber-100 px-1 rounded">{data.fallbackContent.source}</code>
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded border">
                <pre className="text-gray-700 text-sm whitespace-pre-wrap font-sans">
                  {data.fallbackContent.text}
                </pre>
              </div>
            </div>
          ) : (
            <p className="text-gray-400 italic">No content found</p>
          )
        ) : (
          <div className="space-y-4">
            {data.headings.map((heading, index) => (
              <div
                key={index}
                className="border-l-4 pl-4"
                style={{
                  borderColor: getHeadingColor(heading.level),
                  marginLeft: `${(heading.level - 1) * 16}px`,
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="text-xs font-bold px-2 py-1 rounded"
                    style={{
                      backgroundColor: getHeadingColor(heading.level),
                      color: 'white',
                    }}
                  >
                    H{heading.level}
                  </span>
                  <span className="font-medium text-gray-800">{heading.text}</span>
                </div>

                {heading.content.length > 0 && (
                  <div className="ml-8 space-y-2">
                    {heading.content.map((paragraph, pIndex) => (
                      <div key={pIndex} className="text-gray-600 text-sm bg-gray-50 p-2 rounded">
                        {renderContent(paragraph)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Extraction Info */}
      <div className="text-center text-sm text-gray-400">
        Extracted from: <span className="font-mono">{data.url}</span>
        <br />
        At: {new Date(data.extractedAt).toLocaleString()}
      </div>
    </div>
  );
}

function renderContent(content: string): React.ReactNode {
  // Check if content contains list items (bullets or numbers)
  if (content.includes('\n') && (content.includes('•') || /^\d+\./m.test(content))) {
    return (
      <pre className="whitespace-pre-wrap font-sans text-gray-600">
        {content}
      </pre>
    );
  }

  // Truncate long paragraphs
  if (content.length > 500) {
    return content.substring(0, 500) + '...';
  }

  return content;
}

function getHeadingColor(level: number): string {
  const colors: Record<number, string> = {
    1: '#2563eb', // blue-600
    2: '#7c3aed', // violet-600
    3: '#059669', // emerald-600
    4: '#d97706', // amber-600
  };
  return colors[level] || '#6b7280';
}
