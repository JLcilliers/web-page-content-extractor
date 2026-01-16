import * as cheerio from 'cheerio';

export interface HeadingWithContent {
  level: number;
  text: string;
  content: string[];
}

export interface ExtractedContent {
  url: string;
  metaTitle: string | null;
  metaDescription: string | null;
  headings: HeadingWithContent[];
  extractedAt: string;
}

export async function extractSEOContent(url: string): Promise<ExtractedContent> {
  // Fetch the HTML content
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Extract meta title
  const metaTitle = $('title').text().trim() ||
                    $('meta[property="og:title"]').attr('content')?.trim() ||
                    null;

  // Extract meta description
  const metaDescription = $('meta[name="description"]').attr('content')?.trim() ||
                          $('meta[property="og:description"]').attr('content')?.trim() ||
                          null;

  // Extract headings H1-H4 with their following content
  const headings: HeadingWithContent[] = [];

  $('h1, h2, h3, h4').each((_, element) => {
    const $heading = $(element);
    const tagName = element.tagName.toLowerCase();
    const level = parseInt(tagName.charAt(1));
    const text = $heading.text().trim();

    if (!text) return; // Skip empty headings

    // Collect content following this heading until the next heading of same or higher level
    const content: string[] = [];
    let $current = $heading.next();

    while ($current.length > 0) {
      const currentTag = $current.prop('tagName')?.toLowerCase() || '';

      // Stop if we hit another heading of same or higher level
      if (/^h[1-4]$/.test(currentTag)) {
        const currentLevel = parseInt(currentTag.charAt(1));
        if (currentLevel <= level) break;
      }

      // Extract text from paragraphs, lists, and other content elements
      if (['p', 'ul', 'ol', 'div', 'span', 'article', 'section'].includes(currentTag)) {
        const textContent = $current.text().trim();
        if (textContent) {
          content.push(textContent);
        }
      }

      $current = $current.next();
    }

    headings.push({
      level,
      text,
      content,
    });
  });

  return {
    url,
    metaTitle,
    metaDescription,
    headings,
    extractedAt: new Date().toISOString(),
  };
}
