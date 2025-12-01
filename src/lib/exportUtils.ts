import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ReportData {
  headers: string[];
  rows: any[][];
  title: string;
}

export const exportToExcel = (data: ReportData, filename: string) => {
  const worksheet = XLSX.utils.aoa_to_sheet([data.headers, ...data.rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório');
  
  // Auto-size columns
  const maxWidth = data.headers.map((_, i) => {
    const headerLen = data.headers[i].length;
    const maxDataLen = Math.max(...data.rows.map(row => String(row[i] || '').length));
    return Math.max(headerLen, maxDataLen, 10);
  });
  
  worksheet['!cols'] = maxWidth.map(w => ({ width: w }));
  
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export const exportToPDF = (data: ReportData, filename: string) => {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(16);
  doc.text(data.title, 14, 20);
  
  // Add generation date
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 28);
  
  // Add table
  autoTable(doc, {
    head: [data.headers],
    body: data.rows,
    startY: 35,
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [25, 118, 210], // Primary color
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
  });
  
  doc.save(`${filename}.pdf`);
};
