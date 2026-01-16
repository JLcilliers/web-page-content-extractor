# Web Page Content Extractor

A stateless web tool that extracts SEO content from any URL, including:
- Meta Title
- Meta Description
- H1-H4 headings with corresponding body text

## Tech Stack

- **Framework:** Next.js 14+ with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **HTML Parsing:** Cheerio
- **Deployment:** Vercel

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/JLcilliers/web-page-content-extractor.git
cd web-page-content-extractor
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Enter any URL in the input field
2. Click "Extract Content"
3. View the extracted SEO content including:
   - Meta title and description
   - All H1-H4 headings with their associated body text

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── extract/
│   │       └── route.ts    # API endpoint for content extraction
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main page with URL input
│   └── globals.css         # Global styles
├── components/
│   └── ResultsDisplay.tsx  # Results display component
└── lib/
    └── extractor.ts        # Cheerio-based extraction logic
```

## API Reference

### POST /api/extract

Extract SEO content from a URL.

**Request Body:**
```json
{
  "url": "https://example.com"
}
```

**Response:**
```json
{
  "url": "https://example.com",
  "metaTitle": "Example Domain",
  "metaDescription": "This domain is for use in illustrative examples...",
  "headings": [
    {
      "level": 1,
      "text": "Example Domain",
      "content": ["This domain is for use in illustrative examples..."]
    }
  ],
  "extractedAt": "2024-01-16T12:00:00.000Z"
}
```

## License

MIT
