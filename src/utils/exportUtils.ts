/**
 * Converts an array of objects to CSV formatted text.
 */
export function convertToCSV(data: Record<string, unknown>[]): string {
  if (!data || data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows: string[] = [];

  // Header row
  csvRows.push(headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','));

  // Data rows
  for (const row of data) {
    const values = headers.map((header) => {
      const val = row[header];
      if (val === null || val === undefined) {
        return '""';
      }
      if (typeof val === 'object') {
        return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
      }
      const stringVal = String(val);
      return `"${stringVal.replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\r\n');
}

/**
 * Triggers a browser download of a CSV or JSON file.
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/csv;charset=utf-8;'): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
