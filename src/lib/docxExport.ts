import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Packer,
} from 'docx';
import { ExtractedContent } from './extractor';

/**
 * Generate a Word document from extracted content
 * Format:
 *
 * Page Content Optimization
 * [blank line]
 * URL: [the extracted URL]
 * [blank line]
 * ---
 * Meta Information
 * ---
 * Meta Title: [title]
 * Meta Description: [description]
 * [blank line]
 * ---
 * Page Content
 * ---
 * [H1] Heading Text
 * Body content paragraph...
 * • Bullet point if lists exist
 */
export async function generateDocx(data: ExtractedContent): Promise<Blob> {
  const children: Paragraph[] = [];

  // Title
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Page Content Optimization',
          bold: true,
          size: 32, // 16pt
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );

  // Blank line
  children.push(new Paragraph({ text: '' }));

  // URL
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'URL: ', bold: true }),
        new TextRun({ text: data.url }),
      ],
      spacing: { after: 200 },
    })
  );

  // Blank line
  children.push(new Paragraph({ text: '' }));

  // --- Meta Information ---
  children.push(createSectionDivider('Meta Information'));

  // Meta Title
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Meta Title: ', bold: true }),
        new TextRun({ text: data.metaTitle || 'Not found', italics: !data.metaTitle }),
      ],
      spacing: { after: 120 },
    })
  );

  // Meta Description
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Meta Description: ', bold: true }),
        new TextRun({ text: data.metaDescription || 'Not found', italics: !data.metaDescription }),
      ],
      spacing: { after: 200 },
    })
  );

  // Blank line
  children.push(new Paragraph({ text: '' }));

  // --- Page Content ---
  children.push(createSectionDivider('Page Content'));

  // Headings with content
  if (data.headings.length > 0) {
    for (const heading of data.headings) {
      // Heading with level indicator
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `[H${heading.level}] `,
              bold: true,
              color: getHeadingColor(heading.level),
            }),
            new TextRun({
              text: heading.text,
              bold: true,
              size: getHeadingSize(heading.level),
            }),
          ],
          heading: getHeadingLevel(heading.level),
          spacing: { before: 240, after: 120 },
        })
      );

      // Content paragraphs
      for (const content of heading.content) {
        // Check if content contains bullet points
        if (content.includes('\n') && content.includes('•')) {
          // Split into lines and render each bullet
          const lines = content.split('\n');
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine) {
              children.push(
                new Paragraph({
                  children: [new TextRun({ text: trimmedLine })],
                  indent: { left: 720 }, // 0.5 inch indent
                  spacing: { after: 60 },
                })
              );
            }
          }
        } else {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: content })],
              spacing: { after: 120 },
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
          }),
        ],
        spacing: { after: 200 },
      })
    );

    const lines = data.fallbackContent.text.split('\n');
    for (const line of lines) {
      if (line.trim()) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: line.trim() })],
            spacing: { after: 120 },
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
          }),
        ],
      })
    );
  }

  // Footer with extraction timestamp
  children.push(new Paragraph({ text: '' }));
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Extracted at: ${new Date(data.extractedAt).toLocaleString()}`,
          size: 20, // 10pt
          color: '888888',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 400 },
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

function createSectionDivider(title: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: title,
        bold: true,
        size: 28, // 14pt
      }),
    ],
    border: {
      top: { style: BorderStyle.SINGLE, size: 6, color: '333333' },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: '333333' },
    },
    spacing: { before: 200, after: 200 },
  });
}

function getHeadingLevel(level: number): (typeof HeadingLevel)[keyof typeof HeadingLevel] {
  switch (level) {
    case 1:
      return HeadingLevel.HEADING_1;
    case 2:
      return HeadingLevel.HEADING_2;
    case 3:
      return HeadingLevel.HEADING_3;
    case 4:
      return HeadingLevel.HEADING_4;
    default:
      return HeadingLevel.HEADING_4;
  }
}

function getHeadingSize(level: number): number {
  // Sizes in half-points
  switch (level) {
    case 1:
      return 32; // 16pt
    case 2:
      return 28; // 14pt
    case 3:
      return 26; // 13pt
    case 4:
      return 24; // 12pt
    default:
      return 24;
  }
}

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
