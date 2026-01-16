import { NextRequest, NextResponse } from 'next/server';
import { extractSEOContent } from '@/lib/extractor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    const extractedContent = await extractSEOContent(url);

    return NextResponse.json(extractedContent);
  } catch (error) {
    console.error('Extraction error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to extract content';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
