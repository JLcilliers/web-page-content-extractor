'use client';

import { ExtractedContent } from '@/lib/extractor';

interface ResultsDisplayProps {
  data: ExtractedContent;
}

export default function ResultsDisplay({ data }: ResultsDisplayProps) {
  return (
    <div className="space-y-6">
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
          <p className="text-gray-400 italic">No headings found</p>
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
                      <p key={pIndex} className="text-gray-600 text-sm bg-gray-50 p-2 rounded">
                        {paragraph.length > 300 ? `${paragraph.substring(0, 300)}...` : paragraph}
                      </p>
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

function getHeadingColor(level: number): string {
  const colors: Record<number, string> = {
    1: '#2563eb', // blue-600
    2: '#7c3aed', // violet-600
    3: '#059669', // emerald-600
    4: '#d97706', // amber-600
  };
  return colors[level] || '#6b7280';
}
