'use client';

interface PdfViewerProps {
  pdfUrl: string;
  theme: 'light' | 'dark' | 'sepia';
}

export default function PdfViewer({ pdfUrl, theme }: PdfViewerProps) {
  const themeFilterMap = {
    light: '',
    dark: 'invert(0.9) hue-rotate(180deg)',
    sepia: 'sepia(0.4) contrast(0.95)',
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-gray-100 dark:bg-gray-900">
      <iframe
        src={`${pdfUrl}#toolbar=0&navpanes=0`}
        className="absolute inset-0 w-full h-full border-0 block"
        style={{ filter: themeFilterMap[theme] }}
        title="PDF Viewer"
      />
    </div>
  );
}