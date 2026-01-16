import * as cheerio from 'cheerio';

type CheerioAPI = ReturnType<typeof cheerio.load>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CheerioElement = any;

export interface HeadingWithContent {
  level: number;
  text: string;
  content: string[];
}

export interface FallbackContent {
  source: string;
  text: string;
}

export interface ExtractedContent {
  url: string;
  metaTitle: string | null;
  metaDescription: string | null;
  headings: HeadingWithContent[];
  fallbackContent?: FallbackContent;
  extractedAt: string;
}

// ============================================================================
// CONFIGURATION: Selectors for noise removal and content identification
// ============================================================================

const NOISE_SELECTORS = [
  // Structural noise elements
  'nav', 'footer', 'header', 'aside', 'noscript', 'script', 'style', 'iframe', 'svg',
  '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]', '[role="complementary"]',

  // Common class-based noise
  '.nav', '.navbar', '.navigation', '.menu', '.sidebar', '.footer', '.header',
  '.advertisement', '.ad', '.ads', '.social-share', '.social-links', '.share-buttons',
  '.cookie', '.cookie-banner', '.cookie-consent', '.popup', '.modal', '.overlay',
  '.breadcrumb', '.breadcrumbs', '.pagination', '.pager',
  '.comments', '.comment-section', '.related-posts', '.recommended',

  // Class pattern matchers (handled separately)
  '[class*="cookie"]', '[class*="popup"]', '[class*="modal"]', '[class*="banner"]',
  '[class*="newsletter"]', '[class*="subscribe"]', '[class*="promo"]',

  // Wikipedia-specific noise
  '.mw-editsection', '.noprint', '.navbox', '.navbox-styles', '.infobox',
  '#toc', '.toc', '.reference', '.mw-jump-link', '.mw-references-wrap',
  '.interlanguage-link', '.mw-indicator', '.mw-parser-output > .hatnote',
  '[href*="action=edit"]', '.catlinks', '.printfooter', '#siteSub', '#contentSub',
  '.mw-heading-collapsible', '.sidebar', '#mw-navigation', '#mw-panel',
  '.vector-menu', '.mw-portlet', '#p-lang-btn', '.mw-interlanguage-selector',

  // Common ID-based noise
  '#nav', '#navigation', '#menu', '#sidebar', '#footer', '#header',
  '#comments', '#related', '#advertisement',
];

const CONTENT_CONTAINER_SELECTORS = [
  'main',
  'article',
  '[role="main"]',
  '#content',
  '#main-content',
  '#main',
  '.content',
  '.post',
  '.article',
  '.entry-content',
  '.post-content',
  '.article-content',
  '.page-content',
  '.main-content',
];

// ============================================================================
// MAIN EXTRACTION FUNCTION
// ============================================================================

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

  // Step 1: Extract meta information (before any DOM manipulation)
  const metaTitle = extractMetaTitle($);
  const metaDescription = extractMetaDescription($);

  // Step 2: Remove noise elements
  removeNoiseElements($);

  // Step 3: Find the main content container
  const $contentContainer = findContentContainer($);

  // Step 4: Extract headings with content
  const headings = extractHeadingsWithContent($, $contentContainer);

  // Step 5: If no headings found, use fallback extraction
  let fallbackContent: FallbackContent | undefined;
  if (headings.length === 0) {
    fallbackContent = extractFallbackContent($, $contentContainer);
  }

  return {
    url,
    metaTitle,
    metaDescription,
    headings,
    fallbackContent,
    extractedAt: new Date().toISOString(),
  };
}

// ============================================================================
// META EXTRACTION
// ============================================================================

function extractMetaTitle($: CheerioAPI): string | null {
  // Try multiple sources for title
  const title = $('title').text().trim() ||
                $('meta[property="og:title"]').attr('content')?.trim() ||
                $('meta[name="twitter:title"]').attr('content')?.trim() ||
                $('h1').first().text().trim() ||
                null;
  return title || null;
}

function extractMetaDescription($: CheerioAPI): string | null {
  // Try multiple sources for description
  const description = $('meta[name="description"]').attr('content')?.trim() ||
                      $('meta[property="og:description"]').attr('content')?.trim() ||
                      $('meta[name="twitter:description"]').attr('content')?.trim() ||
                      null;
  return description || null;
}

// ============================================================================
// NOISE REMOVAL
// ============================================================================

function removeNoiseElements($: CheerioAPI): void {
  // Remove all noise elements
  NOISE_SELECTORS.forEach(selector => {
    try {
      $(selector).remove();
    } catch {
      // Some selectors might be invalid, skip them
    }
  });

  // Remove elements with specific patterns in class names
  $('[class]').each((_: number, el: any) => {
    const className = $(el).attr('class') || '';
    const lowerClass = className.toLowerCase();

    // Remove elements with these patterns in class names
    const noisePatterns = [
      'footer', 'nav', 'menu', 'sidebar', 'widget', 'advertisement',
      'social', 'share', 'comment', 'related', 'recommended', 'promo',
      'newsletter', 'subscribe', 'cookie', 'gdpr', 'consent'
    ];

    for (const pattern of noisePatterns) {
      if (lowerClass.includes(pattern) && !lowerClass.includes('content')) {
        $(el).remove();
        break;
      }
    }
  });

  // Remove hidden elements
  $('[hidden]').remove();
  $('[style*="display: none"]').remove();
  $('[style*="display:none"]').remove();
  $('[aria-hidden="true"]').remove();
}

// ============================================================================
// CONTENT CONTAINER IDENTIFICATION
// ============================================================================

function findContentContainer($: CheerioAPI): CheerioElement {
  // Try to find a semantic content container
  for (const selector of CONTENT_CONTAINER_SELECTORS) {
    const $container = $(selector);
    if ($container.length > 0) {
      // Return the one with the most text content
      let bestContainer = $container.first();
      let maxTextLength = getTextLength(bestContainer);

      $container.each((_: number, el: any) => {
        const textLen = getTextLength($(el));
        if (textLen > maxTextLength) {
          maxTextLength = textLen;
          bestContainer = $(el);
        }
      });

      if (maxTextLength > 100) {
        return bestContainer as CheerioElement;
      }
    }
  }

  // Fallback: Find the element with highest text density
  return findHighestTextDensityElement($);
}

function getTextLength($el: CheerioElement): number {
  return $el.text().replace(/\s+/g, ' ').trim().length;
}

/**
 * Calculate text-to-tag ratio (Readability-style heuristic)
 * Higher ratio = more text content relative to markup = likely main content
 * Formula: textLength / numberOfTags
 */
function calculateTextToTagRatio($: CheerioAPI, $el: CheerioElement): number {
  const text = $el.text().replace(/\s+/g, ' ').trim();
  const textLength = text.length;

  // Count all tags within the element
  const tagCount = $el.find('*').length + 1; // +1 for the element itself

  if (tagCount === 0) return 0;
  return textLength / tagCount;
}

/**
 * Calculate link density (ratio of link text to total text)
 * Lower is better - high link density indicates navigation
 */
function calculateLinkDensity($: CheerioAPI, $el: CheerioElement): number {
  const totalText = $el.text().replace(/\s+/g, ' ').trim().length;
  if (totalText === 0) return 1;

  let linkTextLength = 0;
  $el.find('a').each((_: number, a: any) => {
    linkTextLength += $(a).text().replace(/\s+/g, ' ').trim().length;
  });

  return linkTextLength / totalText;
}

function findHighestTextDensityElement($: CheerioAPI): CheerioElement {
  let bestElement = $('body') as CheerioElement;
  let bestScore = 0;

  // Candidate scoring with multiple heuristics
  const candidates: { $el: CheerioElement; score: number }[] = [];

  // Check common container elements
  $('div, section, article, main').each((_: number, el: any) => {
    const $el = $(el) as CheerioElement;
    const text = $el.text().replace(/\s+/g, ' ').trim();
    const textLength = text.length;

    // Skip if too short
    if (textLength < 200) return;

    // Skip if this element has very high link density (likely navigation)
    const linkDensity = calculateLinkDensity($, $el);
    if (linkDensity > 0.5) return;

    // Calculate text-to-tag ratio (Readability heuristic)
    const textToTagRatio = calculateTextToTagRatio($, $el);

    // Calculate text density (text length vs HTML length)
    const htmlLength = ($el.html() || '').length;
    if (htmlLength === 0) return;
    const textDensity = textLength / htmlLength;

    // Combined score: balance text length, density, and text-to-tag ratio
    // Weight: 40% text length, 30% text density, 30% text-to-tag ratio
    const normalizedLength = Math.min(textLength / 5000, 1); // Cap at 5000 chars
    const normalizedDensity = textDensity; // Already 0-1
    const normalizedRatio = Math.min(textToTagRatio / 50, 1); // Cap ratio at 50

    let score = (normalizedLength * 0.4) + (normalizedDensity * 0.3) + (normalizedRatio * 0.3);

    // Boost for semantic elements
    const tagName = ($el.prop('tagName') || '').toLowerCase();
    if (tagName === 'article') score *= 1.5;
    if (tagName === 'main') score *= 1.4;

    // Boost for content-related class/id names
    const className = ($el.attr('class') || '').toLowerCase();
    const id = ($el.attr('id') || '').toLowerCase();
    if (/content|article|post|entry|body|main/.test(className + id)) {
      score *= 1.3;
    }

    // Penalty for deep nesting
    const depth = $el.parents().length;
    score = score / (1 + depth * 0.05);

    // Penalty for elements that look like sidebars/widgets
    if (/sidebar|widget|aside|related|popular|trending/.test(className + id)) {
      score *= 0.3;
    }

    candidates.push({ $el, score });
  });

  // Sort by score and return the best
  candidates.sort((a, b) => b.score - a.score);

  if (candidates.length > 0 && candidates[0].score > bestScore) {
    bestElement = candidates[0].$el;
  }

  return bestElement;
}

// ============================================================================
// HEADING EXTRACTION WITH DEEP CONTENT TRAVERSAL
// ============================================================================

function extractHeadingsWithContent($: CheerioAPI, $container: CheerioElement): HeadingWithContent[] {
  const headings: HeadingWithContent[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const headingElements: { element: any; level: number; text: string }[] = [];

  // Collect all headings within the container
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  $container.find('h1, h2, h3, h4').each((_: number, element: any) => {
    const $heading = $(element);
    const tagName = element.tagName.toLowerCase();
    const level = parseInt(tagName.charAt(1));
    const text = cleanText($heading.text());

    if (text && text.length > 0 && !isNoiseHeading(text)) {
      headingElements.push({ element, level, text });
    }
  });

  // For each heading, extract content until the next heading of same or higher level
  headingElements.forEach((headingInfo, index) => {
    const { element, level, text } = headingInfo;
    const $heading = $(element);

    // Find the next heading of same or higher level
    const nextHeadingIndex = headingElements.findIndex((h, i) =>
      i > index && h.level <= level
    );

    // Collect content between this heading and the next
    const content = collectContentAfterHeading($, $heading, level, headingElements, index);

    headings.push({
      level,
      text,
      content,
    });
  });

  return headings;
}

function isNoiseHeading(text: string): boolean {
  const noisePatterns = [
    /^edit$/i,
    /^\[edit\]$/i,
    /^contents?$/i,
    /^table of contents$/i,
    /^navigation$/i,
    /^menu$/i,
    /^search$/i,
    /^languages?$/i,
    /^\d+\s*languages?$/i,
  ];

  return noisePatterns.some(pattern => pattern.test(text.trim()));
}

function collectContentAfterHeading(
  $: CheerioAPI,
  $heading: CheerioElement,
  level: number,
  allHeadings: { element: any; level: number }[],
  currentIndex: number
): string[] {
  const content: string[] = [];
  const seenTexts = new Set<string>();

  // Wikipedia-specific: Check if heading is inside a wrapper div (.mw-heading)
  // Wikipedia structure: <div class="mw-heading"><h2>Title</h2></div><p>Content</p>
  // We need to traverse from the WRAPPER, not the heading itself
  let $traverseFrom = $heading;
  const $parent = $heading.parent();

  if ($parent.length > 0) {
    const parentClass = $parent.attr('class') || '';
    // Detect Wikipedia heading wrappers: mw-heading, mw-heading2, mw-heading3, etc.
    if (/mw-heading/.test(parentClass)) {
      $traverseFrom = $parent;
    }
    // Also handle other common wrapper patterns
    if (/heading-wrapper|section-heading|title-wrapper/.test(parentClass)) {
      $traverseFrom = $parent;
    }
  }

  // Get all siblings after the heading (or its wrapper)
  let $current = $traverseFrom.next();

  while ($current.length > 0) {
    const currentTag = ($current.prop('tagName') || '').toLowerCase();
    const currentClass = $current.attr('class') || '';

    // Stop if we hit another heading of same or higher level
    if (/^h[1-6]$/.test(currentTag)) {
      const headingLevel = parseInt(currentTag.charAt(1));
      if (headingLevel <= level) break;
    }

    // Stop if we hit a Wikipedia heading wrapper (contains heading of same or higher level)
    if (/mw-heading/.test(currentClass)) {
      const $nestedHeading = $current.find('h1, h2, h3, h4, h5, h6').first();
      if ($nestedHeading.length > 0) {
        const nestedTag = ($nestedHeading.prop('tagName') || '').toLowerCase();
        const nestedLevel = parseInt(nestedTag.charAt(1));
        if (nestedLevel <= level) break;
      }
    }

    // Skip elements that are just heading wrappers for lower-level headings
    if (/mw-heading/.test(currentClass)) {
      $current = $current.next();
      continue;
    }

    // Extract content based on element type
    const extractedContent = extractElementContent($, $current);

    for (const text of extractedContent) {
      const normalizedText = text.trim();
      if (normalizedText && !seenTexts.has(normalizedText)) {
        seenTexts.add(normalizedText);
        content.push(normalizedText);
      }
    }

    $current = $current.next();
  }

  return content;
}

function extractElementContent($: CheerioAPI, $element: CheerioElement): string[] {
  const content: string[] = [];
  const tagName = ($element.prop('tagName') || '').toLowerCase();

  // Handle lists specially
  if (tagName === 'ul' || tagName === 'ol') {
    const listContent = formatList($, $element, tagName === 'ol');
    if (listContent) {
      content.push(listContent);
    }
    return content;
  }

  // Handle paragraphs and text containers
  if (['p', 'div', 'section', 'article', 'blockquote', 'figcaption'].includes(tagName)) {
    // Check if this element contains nested lists
    const $lists = $element.find('ul, ol');

    if ($lists.length > 0) {
      // Extract text before lists, then lists, then text after
      const $clone = $element.clone();
      $clone.find('ul, ol').remove();
      const textContent = cleanText($clone.text());

      if (textContent) {
        content.push(textContent);
      }

      $lists.each((_: number, list: any) => {
        const isOrdered = ($(list).prop('tagName') || '').toLowerCase() === 'ol';
        const listContent = formatList($, $(list) as CheerioElement, isOrdered);
        if (listContent) {
          content.push(listContent);
        }
      });
    } else {
      // Check for nested paragraphs
      const $paragraphs = $element.find('p');
      if ($paragraphs.length > 0 && tagName !== 'p') {
        $paragraphs.each((_: number, p: any) => {
          const text = cleanText($(p).text());
          if (text) {
            content.push(text);
          }
        });
      } else {
        const text = cleanText($element.text());
        if (text) {
          content.push(text);
        }
      }
    }
  }

  // Handle definition lists
  if (tagName === 'dl') {
    $element.find('dt, dd').each((_: number, item: any) => {
      const itemTag = ($(item).prop('tagName') || '').toLowerCase();
      const text = cleanText($(item).text());
      if (text) {
        content.push(itemTag === 'dt' ? `**${text}**` : `  ${text}`);
      }
    });
  }

  // Handle tables - extract as text
  if (tagName === 'table') {
    const tableText = extractTableContent($, $element);
    if (tableText) {
      content.push(tableText);
    }
  }

  return content;
}

// ============================================================================
// LIST FORMATTING
// ============================================================================

function formatList($: CheerioAPI, $list: CheerioElement, isOrdered: boolean, depth: number = 0): string {
  const items: string[] = [];
  const indent = '  '.repeat(depth);

  $list.children('li').each((index: number, li: any) => {
    const $li = $(li);

    // Get direct text content (excluding nested lists)
    const $clone = $li.clone();
    $clone.find('ul, ol').remove();
    const text = cleanText($clone.text());

    if (text) {
      const bullet = isOrdered ? `${index + 1}.` : '•';
      items.push(`${indent}${bullet} ${text}`);
    }

    // Handle nested lists
    $li.children('ul, ol').each((_: number, nestedList: any) => {
      const isNestedOrdered = ($(nestedList).prop('tagName') || '').toLowerCase() === 'ol';
      const nestedContent = formatList($, $(nestedList) as CheerioElement, isNestedOrdered, depth + 1);
      if (nestedContent) {
        items.push(nestedContent);
      }
    });
  });

  return items.join('\n');
}

// ============================================================================
// TABLE EXTRACTION
// ============================================================================

function extractTableContent($: CheerioAPI, $table: CheerioElement): string {
  const rows: string[] = [];

  $table.find('tr').each((_: number, tr: any) => {
    const cells: string[] = [];
    $(tr).find('th, td').each((_: number, cell: any) => {
      const text = cleanText($(cell).text());
      if (text) {
        cells.push(text);
      }
    });
    if (cells.length > 0) {
      rows.push(cells.join(' | '));
    }
  });

  return rows.join('\n');
}

// ============================================================================
// FALLBACK CONTENT EXTRACTION (for non-semantic sites)
// ============================================================================

function extractFallbackContent($: CheerioAPI, $container: CheerioElement): FallbackContent | undefined {
  // Try to find meaningful content even without headings

  // Strategy 1: Look for article-like containers
  const articleSelectors = ['article', '.article', '.post', '.entry', '.story', '.item'];
  for (const selector of articleSelectors) {
    const $articles = $container.find(selector);
    if ($articles.length > 0) {
      const texts: string[] = [];
      $articles.each((_: number, article: any) => {
        const text = cleanText($(article).text());
        if (text && text.length > 50) {
          texts.push(text.substring(0, 500) + (text.length > 500 ? '...' : ''));
        }
      });
      if (texts.length > 0) {
        return {
          source: 'article-containers',
          text: texts.slice(0, 10).join('\n\n'),
        };
      }
    }
  }

  // Strategy 2: Extract all paragraphs
  const paragraphs: string[] = [];
  $container.find('p').each((_: number, p: any) => {
    const text = cleanText($(p).text());
    if (text && text.length > 30) {
      paragraphs.push(text);
    }
  });

  if (paragraphs.length > 0) {
    return {
      source: 'paragraphs',
      text: paragraphs.slice(0, 20).join('\n\n'),
    };
  }

  // Strategy 3: Extract from any text-heavy elements (for sites like HN)
  const textBlocks: { text: string; element: string }[] = [];
  $container.find('td, span, a').each((_: number, el: any) => {
    const $el = $(el);
    const text = cleanText($el.text());
    // Look for substantial text that isn't just navigation
    if (text && text.length > 20 && text.length < 500 && !isNavigationText(text)) {
      textBlocks.push({
        text,
        element: ($el.prop('tagName') || '').toLowerCase()
      });
    }
  });

  if (textBlocks.length > 0) {
    // Deduplicate and return
    const uniqueTexts = [...new Set(textBlocks.map(b => b.text))];
    return {
      source: 'text-blocks',
      text: uniqueTexts.slice(0, 30).join('\n'),
    };
  }

  return undefined;
}

function isNavigationText(text: string): boolean {
  const navPatterns = [
    /^(home|about|contact|login|sign up|sign in|register|search)$/i,
    /^(prev|next|previous|back|forward)$/i,
    /^\d+$/,
    /^(more|less|show|hide)$/i,
  ];
  return navPatterns.some(p => p.test(text.trim()));
}

// ============================================================================
// TEXT CLEANING UTILITIES
// ============================================================================

function cleanText(text: string): string {
  return text
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Remove common noise patterns
    .replace(/\[edit\]/gi, '')
    .replace(/\[citation needed\]/gi, '')
    .replace(/\[note \d+\]/gi, '')
    .replace(/\[\d+\]/g, '') // Reference numbers like [1], [2]
    // Clean up
    .trim();
}
