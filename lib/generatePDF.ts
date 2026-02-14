'use client';

import html2pdf from 'html2pdf.js';

export interface PDFOptions {
  filename?: string;
  margin?: number | number[];
  image?: { type: string; quality: number };
  html2canvas?: { scale: number; useCORS: boolean; logging: boolean };
  jsPDF?: { unit: string; format: string; orientation: string };
  pagebreak?: { mode: string[] };
}

const defaultOptions: PDFOptions = {
  margin: 0, // We handle margins in the template
  filename: 'proposal.pdf',
  image: { type: 'jpeg', quality: 0.98 },
  html2canvas: { 
    scale: 2, 
    useCORS: true, 
    logging: false,
  },
  jsPDF: { 
    unit: 'mm', 
    format: 'a4', 
    orientation: 'portrait' 
  },
  pagebreak: { 
    mode: ['avoid-all', 'css', 'legacy'] 
  },
};

export async function generatePDF(
  element: HTMLElement,
  options: Partial<PDFOptions> = {}
): Promise<Blob> {
  const mergedOptions = { ...defaultOptions, ...options };
  
  // Clone the element to avoid modifying the original
  const clone = element.cloneNode(true) as HTMLElement;
  
  // Make it visible for rendering
  clone.style.position = 'absolute';
  clone.style.left = '-9999px';
  clone.style.top = '0';
  document.body.appendChild(clone);
  
  try {
    const worker = html2pdf()
      .set(mergedOptions)
      .from(clone);
    
    const blob = await worker.outputPdf('blob');
    return blob;
  } finally {
    document.body.removeChild(clone);
  }
}

export async function downloadPDF(
  element: HTMLElement,
  filename: string = 'proposal.pdf',
  options: Partial<PDFOptions> = {}
): Promise<void> {
  const mergedOptions = { ...defaultOptions, ...options, filename };
  
  // Clone the element
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.position = 'absolute';
  clone.style.left = '-9999px';
  clone.style.top = '0';
  document.body.appendChild(clone);
  
  try {
    await html2pdf()
      .set(mergedOptions)
      .from(clone)
      .save();
  } finally {
    document.body.removeChild(clone);
  }
}

export async function previewPDF(
  element: HTMLElement,
  options: Partial<PDFOptions> = {}
): Promise<string> {
  const blob = await generatePDF(element, options);
  return URL.createObjectURL(blob);
}
