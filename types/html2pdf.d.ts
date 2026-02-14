declare module 'html2pdf.js' {
  interface Html2PdfOptions {
    margin?: number | number[];
    filename?: string;
    image?: { type: string; quality: number };
    html2canvas?: { scale: number; useCORS: boolean; logging: boolean; [key: string]: any };
    jsPDF?: { unit: string; format: string; orientation: string; [key: string]: any };
    pagebreak?: { mode: string[] };
    enableLinks?: boolean;
  }

  interface Html2PdfWorker {
    set(options: Html2PdfOptions): Html2PdfWorker;
    from(element: HTMLElement | string, type?: string): Html2PdfWorker;
    to(type: string): Html2PdfWorker;
    save(filename?: string): Promise<void>;
    output(type: string, options?: any): Promise<any>;
    outputPdf(type: 'blob'): Promise<Blob>;
    outputPdf(type: 'datauristring'): Promise<string>;
    outputPdf(type: 'arraybuffer'): Promise<ArrayBuffer>;
    then<T>(callback: (pdf: any) => T): Promise<T>;
    catch<T>(callback: (error: any) => T): Promise<T>;
  }

  function html2pdf(): Html2PdfWorker;
  function html2pdf(element: HTMLElement, options?: Html2PdfOptions): Html2PdfWorker;

  export = html2pdf;
}
