import {
  Document,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  Packer,
  LevelFormat,
  convertInchesToTwip,
} from 'docx';
import { ExtractedContent } from './extractor';

// Poppins font name - must be installed on user's system or embedded
const FONT_FAMILY = 'Poppins';

// Font sizes in half-points (multiply pt by 2)
const FONT_SIZES = {
  TITLE: 48,      // 24pt - Document title
  H1: 40,         // 20pt
  H2: 36,         // 18pt
  H3: 32,         // 16pt
  H4: 28,         // 14pt
  BODY: 24,       // 12pt
  SMALL: 20,      // 10pt - footer
};

/**
 * Generate a Word document from extracted content with Poppins font
 *
 * Document Structure:
 * - Page Content Optimization (24pt bold, centered)
 * - URL: [the extracted URL]
 * - --- Meta Information ---
 * - Meta Title: [title]
 * - Meta Description: [description]
 * - --- Page Content ---
 * - [H1] Heading Text (20pt bold)
 * - Body content (12pt)
 * - Bullet points using proper numbering
 */
export async function generateDocx(data: ExtractedContent): Promise<Blob> {
  const children: Paragraph[] = [];

  // Document Title - 24pt bold, centered
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Page Content Optimization',
          bold: true,
          size: FONT_SIZES.TITLE,
          font: FONT_FAMILY,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    })
  );

  // Blank line
  children.push(createEmptyParagraph());

  // URL
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'URL: ',
          bold: true,
          size: FONT_SIZES.BODY,
          font: FONT_FAMILY,
        }),
        new TextRun({
          text: data.url,
          size: FONT_SIZES.BODY,
          font: FONT_FAMILY,
        }),
      ],
      spacing: { after: 300 },
    })
  );

  // Blank line
  children.push(createEmptyParagraph());

  // --- Meta Information --- (horizontal rule divider)
  children.push(createSectionDivider('Meta Information'));

  // Meta Title
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Meta Title: ',
          bold: true,
          size: FONT_SIZES.BODY,
          font: FONT_FAMILY,
        }),
        new TextRun({
          text: data.metaTitle || 'Not found',
          italics: !data.metaTitle,
          size: FONT_SIZES.BODY,
          font: FONT_FAMILY,
        }),
      ],
      spacing: { after: 200 },
    })
  );

  // Meta Description
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Meta Description: ',
          bold: true,
          size: FONT_SIZES.BODY,
          font: FONT_FAMILY,
        }),
        new TextRun({
          text: data.metaDescription || 'Not found',
          italics: !data.metaDescription,
          size: FONT_SIZES.BODY,
          font: FONT_FAMILY,
        }),
      ],
      spacing: { after: 300 },
    })
  );

  // Blank line
  children.push(createEmptyParagraph());

  // --- Page Content --- (horizontal rule divider)
  children.push(createSectionDivider('Page Content'));

  // Headings with content
  if (data.headings.length > 0) {
    for (const heading of data.headings) {
      // Heading with level indicator
      const headingSize = getHeadingSize(heading.level);

      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `[H${heading.level}] `,
              bold: true,
              size: headingSize,
              font: FONT_FAMILY,
              color: getHeadingColor(heading.level),
            }),
            new TextRun({
              text: heading.text,
              bold: true,
              size: headingSize,
              font: FONT_FAMILY,
            }),
          ],
          spacing: { before: 300, after: 150 },
        })
      );

      // Content paragraphs
      for (const content of heading.content) {
        // Check if content contains bullet points (from our extractor's list formatting)
        if (content.includes('\n') && content.includes('•')) {
          // Split into lines and render each as a proper bullet
          const lines = content.split('\n');
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine) {
              // Remove the bullet character if present, we'll use proper bullet formatting
              const cleanedLine = trimmedLine.replace(/^[•]\s*/, '');
              children.push(createBulletParagraph(cleanedLine));
            }
          }
        } else {
          // Regular paragraph
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: content,
                  size: FONT_SIZES.BODY,
                  font: FONT_FAMILY,
                }),
              ],
              spacing: { after: 150 },
            })
          );
        }
      }
    }
  } else if (data.fallbackContent) {
    // Fallback content
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Note: No semantic headings found. Content extracted using fallback method: ${data.fallbackContent.source}`,
            italics: true,
            size: FONT_SIZES.BODY,
            font: FONT_FAMILY,
          }),
        ],
        spacing: { after: 300 },
      })
    );

    const lines = data.fallbackContent.text.split('\n');
    for (const line of lines) {
      if (line.trim()) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line.trim(),
                size: FONT_SIZES.BODY,
                font: FONT_FAMILY,
              }),
            ],
            spacing: { after: 150 },
          })
        );
      }
    }
  } else {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'No content found',
            italics: true,
            size: FONT_SIZES.BODY,
            font: FONT_FAMILY,
          }),
        ],
      })
    );
  }

  // Footer with extraction timestamp
  children.push(createEmptyParagraph());
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Extracted at: ${new Date(data.extractedAt).toLocaleString()}`,
          size: FONT_SIZES.SMALL,
          font: FONT_FAMILY,
          color: '888888',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 400 },
    })
  );

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: FONT_FAMILY,
            size: FONT_SIZES.BODY,
          },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: 'bullet-list',
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '\u2022', // bullet character
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: {
                    left: convertInchesToTwip(0.5),
                    hanging: convertInchesToTwip(0.25)
                  },
                },
                run: {
                  font: FONT_FAMILY,
                  size: FONT_SIZES.BODY,
                },
              },
            },
            {
              level: 1,
              format: LevelFormat.BULLET,
              text: '\u25E6', // white bullet
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: {
                    left: convertInchesToTwip(1),
                    hanging: convertInchesToTwip(0.25)
                  },
                },
                run: {
                  font: FONT_FAMILY,
                  size: FONT_SIZES.BODY,
                },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * Create an empty paragraph for spacing
 */
function createEmptyParagraph(): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: '', font: FONT_FAMILY })],
    spacing: { after: 100 },
  });
}

/**
 * Create a section divider with horizontal rules and centered title
 */
function createSectionDivider(title: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: title,
        bold: true,
        size: FONT_SIZES.H4, // 14pt for section titles
        font: FONT_FAMILY,
      }),
    ],
    border: {
      top: { style: BorderStyle.SINGLE, size: 12, color: '333333' },
      bottom: { style: BorderStyle.SINGLE, size: 12, color: '333333' },
    },
    spacing: { before: 300, after: 300 },
  });
}

/**
 * Create a bullet point paragraph using proper numbering
 */
function createBulletParagraph(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        size: FONT_SIZES.BODY,
        font: FONT_FAMILY,
      }),
    ],
    numbering: {
      reference: 'bullet-list',
      level: 0,
    },
    spacing: { after: 100 },
  });
}

/**
 * Get heading size based on level (in half-points)
 */
function getHeadingSize(level: number): number {
  switch (level) {
    case 1:
      return FONT_SIZES.H1; // 20pt
    case 2:
      return FONT_SIZES.H2; // 18pt
    case 3:
      return FONT_SIZES.H3; // 16pt
    case 4:
      return FONT_SIZES.H4; // 14pt
    default:
      return FONT_SIZES.H4;
  }
}

/**
 * Get heading color based on level
 */
function getHeadingColor(level: number): string {
  switch (level) {
    case 1:
      return '2563eb'; // blue-600
    case 2:
      return '7c3aed'; // violet-600
    case 3:
      return '059669'; // emerald-600
    case 4:
      return 'd97706'; // amber-600
    default:
      return '6b7280';
  }
}

/**
 * Extract domain from URL for filename
 */
export function getDomainFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return 'extracted';
  }
}
