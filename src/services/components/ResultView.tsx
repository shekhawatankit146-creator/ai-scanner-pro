import React from 'react';
import { Copy, Check, Table as TableIcon, FileText, Languages, Loader2, Download, FileDown, FileSpreadsheet, FileJson, ChevronLeft, ChevronRight, Trash2, X, ChevronUp, ChevronDown, Edit3, Save } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { TableData, translateContent } from '../services/gemini';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import domtoimage from 'dom-to-image-more';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType } from 'docx';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

// Helper to convert ArrayBuffer to Base64
const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

interface ResultViewProps {
  result: {
    type: "text" | "table";
    content: string | TableData;
  };
}

export const ResultView: React.FC<ResultViewProps> = ({ result: initialResult }) => {
  const [result, setResult] = React.useState(initialResult);
  const [copied, setCopied] = React.useState(false);
  const [isTranslating, setIsTranslating] = React.useState(false);
  const [isEditingText, setIsEditingText] = React.useState(false);
  const [isEditingTable, setIsEditingTable] = React.useState(false);
  const [currentLang, setCurrentLang] = React.useState<"Original" | "Hindi" | "English">("Original");
  const [columnCopiedIndex, setColumnCopiedIndex] = React.useState<number | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = React.useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);

  // Update local result if initialResult changes
  React.useEffect(() => {
    setResult(initialResult);
    setCurrentLang("Original");
    setIsEditingText(false);
    setIsEditingTable(false);
  }, [initialResult]);

  const moveColumn = (index: number, direction: 'left' | 'right') => {
    if (result.type !== "table") return;
    const data = result.content as TableData;
    if (!data || !data.headers || !data.rows) return;
    
    const newHeaders = [...data.headers];
    const newRows = data.rows.map(row => row ? [...row] : []);
    
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newHeaders.length) return;
    
    // Swap headers
    [newHeaders[index], newHeaders[targetIndex]] = [newHeaders[targetIndex], newHeaders[index]];
    
    // Swap row data
    newRows.forEach(row => {
      [row[index], row[targetIndex]] = [row[targetIndex], row[index]];
    });
    
    setResult({
      ...result,
      content: {
        headers: newHeaders,
        rows: newRows
      }
    });
  };

  const moveRow = (index: number, direction: 'up' | 'down') => {
    if (result.type !== "table") return;
    const data = result.content as TableData;
    if (!data || !data.rows) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= data.rows.length) return;

    const newRows = [...data.rows];
    [newRows[index], newRows[targetIndex]] = [newRows[targetIndex], newRows[index]];

    setResult({
      ...result,
      content: {
        ...data,
        rows: newRows
      }
    });
  };

  const deleteColumn = (index: number) => {
    if (result.type !== "table") return;
    const data = result.content as TableData;
    if (!data || !data.headers || !data.rows) return;

    if (data.headers.length <= 1) {
      alert("At least one column must remain.");
      return;
    }

    const newHeaders = data.headers.filter((_, i) => i !== index);
    const newRows = data.rows.map(row => row.filter((_, i) => i !== index));

    setResult({
      ...result,
      content: {
        headers: newHeaders,
        rows: newRows
      }
    });
  };

  const deleteRow = (index: number) => {
    if (result.type !== "table") return;
    const data = result.content as TableData;
    if (!data || !data.rows) return;

    const newRows = data.rows.filter((_, i) => i !== index);

    setResult({
      ...result,
      content: {
        ...data,
        rows: newRows
      }
    });
  };

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    if (result.type !== "table") return;
    const data = result.content as TableData;
    const newRows = [...data.rows];
    newRows[rowIndex] = [...newRows[rowIndex]];
    newRows[rowIndex][colIndex] = value;

    setResult({
      ...result,
      content: {
        ...data,
        rows: newRows
      }
    });
  };

  const updateHeader = (colIndex: number, value: string) => {
    if (result.type !== "table") return;
    const data = result.content as TableData;
    const newHeaders = [...data.headers];
    newHeaders[colIndex] = value;

    setResult({
      ...result,
      content: {
        ...data,
        headers: newHeaders
      }
    });
  };

  const updateTextContent = (value: string) => {
    setResult({
      ...result,
      content: value
    });
  };

  const handleCopy = () => {
    let textToCopy = "";
    if (result.type === "text") {
      textToCopy = result.content as string;
    } else {
      const data = result.content as TableData;
      textToCopy = [
        data.headers.join("\t"),
        ...data.rows.map(row => row.join("\t"))
      ].join("\n");
    }

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [downloadLink, setDownloadLink] = React.useState<{url: string, name: string} | null>(null);

  const downloadPDF = async () => {
    if (isGeneratingPDF) return;
    setIsGeneratingPDF(true);
    setDownloadLink(null);
    
    try {
      console.log("Initializing jsPDF...");
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });
      
      const contentStr = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
      const hasHindi = /[\u0900-\u097F]/.test(contentStr);

      if (hasHindi) {
        try {
          console.log("Attempting to load Hindi font...");
          const fontUrl = 'https://fonts.gstatic.com/s/notosansdevanagari/v16/NaPZcl9v4ZujqXRTfO7tOSh5m3J_X7m6.ttf';
          const response = await fetch(fontUrl);
          if (response.ok) {
            const fontBuffer = await response.arrayBuffer();
            const fontBase64 = arrayBufferToBase64(fontBuffer);
            doc.addFileToVFS('NotoSans.ttf', fontBase64);
            doc.addFont('NotoSans.ttf', 'NotoSans', 'normal');
            doc.setFont('NotoSans');
            console.log("Hindi font loaded.");
          }
        } catch (fontErr) {
          console.error('Font loading failed:', fontErr);
        }
      }

      const title = result.type === 'table' ? 'Scanned Table Data' : 'Scanned Text Data';
      doc.setFontSize(18);
      doc.text(title, 14, 22);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated on ${new Date().toLocaleString()}`, 14, 30);

      if (result.type === 'text') {
        doc.setFontSize(12);
        doc.setTextColor(0);
        const text = (result.content as string) || "";
        const splitText = doc.splitTextToSize(text, 180);
        doc.text(splitText, 14, 45);
      } else {
        const data = result.content as TableData;
        if (data && data.headers && data.rows) {
          console.log("Generating table with autoTable...");
          autoTable(doc, {
            startY: 40,
            head: [data.headers],
            body: data.rows,
            theme: 'grid',
            styles: { 
              font: hasHindi ? 'NotoSans' : 'helvetica',
              fontSize: 10,
              cellPadding: 3
            },
            headStyles: { 
              fillColor: [5, 150, 105],
              textColor: [255, 255, 255]
            }
          });
        }
      }
      
      console.log("Generating PDF blob...");
      const blob = doc.output('blob');
      const filename = `scan-result-${Date.now()}.pdf`;
      
      try {
        console.log("Attempting saveAs...");
        saveAs(blob, filename);
      } catch (saveErr) {
        console.error("saveAs failed, trying manual link...", saveErr);
      }
      
      const url = URL.createObjectURL(blob);
      setDownloadLink({ url, name: filename });
      console.log("PDF generation complete.");
    } catch (err) {
      console.error('PDF Generation Error:', err);
      alert(`Download Error: ${err instanceof Error ? err.message : 'Unknown error'}. Please try opening the app in a new tab using the icon at the top right.`);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const generateImagePDF = async () => {
    if (!contentRef.current) return;
    try {
      const dataUrl = await domtoimage.toPng(contentRef.current, {
        bgcolor: '#ffffff',
        quality: 1,
        width: contentRef.current.scrollWidth,
        height: contentRef.current.scrollHeight
      });
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`scan-result-img-${Date.now()}.pdf`);
    } catch (err) {
      console.error('Image PDF Fallback failed:', err);
    }
  };

  const downloadWord = async () => {
    let children: any[] = [
      new Paragraph({
        children: [
          new TextRun({
            text: result.type === 'table' ? 'Scanned Table Data' : 'Scanned Text Data',
            bold: true,
            size: 32,
          }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Generated on ${new Date().toLocaleString()}`,
            italics: true,
            size: 20,
            color: "666666"
          }),
        ],
      }),
      new Paragraph({ text: "" }), // Spacer
    ];

    if (result.type === 'text') {
      const lines = ((result.content as string) || "").split('\n');
      lines.forEach(line => {
        children.push(new Paragraph({
          children: [new TextRun(line)],
        }));
      });
    } else {
      const data = result.content as TableData;
      if (data && data.headers && data.rows) {
        const table = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: data.headers.map(header => new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: header || "", bold: true })] })],
                shading: { fill: "F3F4F6" }
              })),
            }),
            ...data.rows.map(row => new TableRow({
              children: (row || []).map(cell => new TableCell({
                children: [new Paragraph(cell || "")],
              })),
            })),
          ],
        });
        children.push(table);
      }
    }

    const doc = new Document({
      sections: [{ children }],
    });

    const blob = await Packer.toBlob(doc);
    const filename = `scan-result-${Date.now()}.docx`;
    saveAs(blob, filename);
    
    const url = URL.createObjectURL(blob);
    setDownloadLink({ url, name: filename });
  };

  const downloadExcel = () => {
    let ws;
    if (result.type === 'table') {
      const data = result.content as TableData;
      if (!data || !data.headers || !data.rows) return;
      const excelData = [data.headers, ...data.rows];
      ws = XLSX.utils.aoa_to_sheet(excelData);
    } else {
      const lines = ((result.content as string) || "").split('\n').map(line => [line]);
      ws = XLSX.utils.aoa_to_sheet([['Scanned Text'], ...lines]);
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Scan Results");
    
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const filename = `scan-result-${Date.now()}.xlsx`;
    saveAs(blob, filename);
    
    const url = URL.createObjectURL(blob);
    setDownloadLink({ url, name: filename });
  };

  const handleCopyColumn = (index: number) => {
    if (result.type !== "table") return;
    const data = result.content as TableData;
    if (!data || !data.headers || !data.rows) return;
    const columnData = [
      data.headers[index],
      ...data.rows.map(row => row ? row[index] : "")
    ].join("\n");

    navigator.clipboard.writeText(columnData);
    setColumnCopiedIndex(index);
    setTimeout(() => setColumnCopiedIndex(null), 2000);
  };

  const handleTranslate = async (target: "Hindi" | "English") => {
    if (currentLang === target) return;
    setIsTranslating(true);
    try {
      const translated = await translateContent(initialResult.content, target);
      setResult({ ...result, content: translated });
      setCurrentLang(target);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTranslating(false);
    }
  };

  const resetToOriginal = () => {
    setResult(initialResult);
    setCurrentLang("Original");
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="px-6 py-4 border-b border-zinc-100 flex flex-wrap items-center justify-between bg-zinc-50/50 gap-4">
        <div className="flex items-center gap-2">
          {result.type === "table" ? (
            <TableIcon className="w-4 h-4 text-emerald-600" />
          ) : (
            <FileText className="w-4 h-4 text-blue-600" />
          )}
          <span className="text-sm font-medium text-zinc-700 uppercase tracking-wider">
            {result.type === "table" ? "Table Extracted" : "Text Extracted"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Translation Controls */}
          <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-lg p-1">
            <button
              onClick={resetToOriginal}
              disabled={isTranslating}
              className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${
                currentLang === "Original" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-50"
              }`}
            >
              ORIGINAL
            </button>
            <button
              onClick={() => handleTranslate("Hindi")}
              disabled={isTranslating}
              className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${
                currentLang === "Hindi" ? "bg-emerald-600 text-white" : "text-zinc-500 hover:bg-zinc-50"
              }`}
            >
              HINDI
            </button>
            <button
              onClick={() => handleTranslate("English")}
              disabled={isTranslating}
              className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${
                currentLang === "English" ? "bg-blue-600 text-white" : "text-zinc-500 hover:bg-zinc-50"
              }`}
            >
              ENGLISH
            </button>
            {isTranslating && <Loader2 className="w-3 h-3 animate-spin text-zinc-400 ml-1" />}
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-zinc-200 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy All</span>
              </>
            )}
          </button>

          {result.type === "text" ? (
            <button
              onClick={() => setIsEditingText(!isEditingText)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                isEditingText 
                  ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-200" 
                  : "bg-white border-zinc-200 text-zinc-600 hover:border-emerald-500 hover:text-emerald-600"
              }`}
            >
              {isEditingText ? (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>SAVE TEXT</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>EDIT TEXT</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => setIsEditingTable(!isEditingTable)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                isEditingTable 
                  ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-200" 
                  : "bg-white border-zinc-200 text-zinc-600 hover:border-emerald-500 hover:text-emerald-600"
              }`}
            >
              {isEditingTable ? (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>SAVE TABLE</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>EDIT TABLE</span>
                </>
              )}
            </button>
          )}

          <div className="h-6 w-px bg-zinc-200 mx-1" />

          {/* Download Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={downloadPDF}
              disabled={isGeneratingPDF}
              title={isGeneratingPDF ? "Generating PDF..." : "Download PDF"}
              className={`p-2 rounded-lg bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-colors disabled:opacity-50`}
            >
              {isGeneratingPDF ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={downloadWord}
              title="Download Word"
              className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 transition-colors"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              onClick={downloadExcel}
              title="Download Excel"
              className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Manual Download Fallback */}
      {downloadLink && (
        <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-800 text-sm font-medium">
              <Download className="w-4 h-4" />
              <span>डाउनलोड तैयार है! (Download Ready!)</span>
            </div>
            <button 
              onClick={() => setDownloadLink(null)}
              className="text-amber-500 hover:text-amber-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a 
              href={downloadLink.url} 
              download={downloadLink.name}
              className="px-4 py-1.5 bg-amber-600 text-white rounded-md text-sm font-bold hover:bg-amber-700 transition-colors shadow-sm"
              onClick={() => setTimeout(() => setDownloadLink(null), 10000)}
            >
              यहाँ क्लिक करके सेव करें (Click here to Save)
            </a>
            <span className="text-xs text-amber-700">
              अगर क्लिक करने पर भी डाउनलोड नहीं होता, तो कृपया स्क्रीन के ऊपर दाईं ओर <b>"Open in New Tab"</b> आइकन का उपयोग करें।
            </span>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-6 relative" ref={contentRef}>
        {isTranslating && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Translating...</p>
            </div>
          </div>
        )}

        {result.type === "text" ? (
          <div className="h-full">
            {isEditingText ? (
              <textarea
                value={result.content as string}
                onChange={(e) => updateTextContent(e.target.value)}
                className="w-full h-full min-h-[400px] p-4 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-mono text-sm resize-none"
                placeholder="Edit your text here..."
              />
            ) : (
              <div className="prose prose-zinc max-w-none">
                <ReactMarkdown>{(result.content as string) || ""}</ReactMarkdown>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 border border-zinc-200 rounded-lg">
              <thead className="bg-zinc-50">
                <tr className="bg-zinc-100/50">
                  <th className="px-2 py-2 border-r border-zinc-200 w-16 bg-zinc-100/30">
                    <button
                      onClick={() => {
                        if (result.type !== "table") return;
                        const data = result.content as TableData;
                        const newRows = [...data.rows, new Array(data.headers.length).fill("")];
                        setResult({ ...result, content: { ...data, rows: newRows } });
                      }}
                      className="w-full flex items-center justify-center py-1.5 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                      title="Add Row"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </th>
                  {((result.content as TableData).headers || []).map((_, i) => (
                    <th key={`col-actions-${i}`} className="px-2 py-2 border-r border-zinc-200 last:border-r-0">
                      <div className="flex flex-col gap-1">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleCopyColumn(i)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md border transition-all shadow-sm ${
                              columnCopiedIndex === i 
                                ? "bg-emerald-600 border-emerald-600 text-white" 
                                : "bg-white border-zinc-200 text-zinc-600 hover:text-emerald-600 hover:border-emerald-200"
                            }`}
                          >
                            {columnCopiedIndex === i ? (
                              <Check className="w-3 h-3" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span className="text-[9px] font-bold uppercase tracking-tighter">Copy</span>
                          </button>
                          
                          <button
                            onClick={() => deleteColumn(i)}
                            className="p-1.5 rounded-md border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors shadow-sm"
                            title="Delete Column"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        
                        <div className="flex gap-1">
                          <button
                            onClick={() => moveColumn(i, 'left')}
                            disabled={i === 0}
                            className="flex-1 flex items-center justify-center py-1 rounded border border-zinc-200 bg-white text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Move Left"
                          >
                            <ChevronLeft className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => moveColumn(i, 'right')}
                            disabled={i === ((result.content as TableData).headers || []).length - 1}
                            className="flex-1 flex items-center justify-center py-1 rounded border border-zinc-200 bg-white text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Move Right"
                          >
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </th>
                  ))}
                  <th className="px-2 py-2 w-12">
                    <button
                      onClick={() => {
                        if (result.type !== "table") return;
                        const data = result.content as TableData;
                        const newHeaders = [...data.headers, `Col ${data.headers.length + 1}`];
                        const newRows = data.rows.map(row => [...row, ""]);
                        setResult({ ...result, content: { headers: newHeaders, rows: newRows } });
                      }}
                      className="w-full flex items-center justify-center py-4 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                      title="Add Column"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </th>
                </tr>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider border-r border-zinc-200 bg-zinc-50/50">#</th>
                  {((result.content as TableData).headers || []).map((header, i) => (
                    <th
                      key={i}
                      className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider border-r border-zinc-200 last:border-r-0"
                    >
                      {isEditingTable ? (
                        <input
                          type="text"
                          value={header}
                          onChange={(e) => updateHeader(i, e.target.value)}
                          className="w-full bg-emerald-50 border border-emerald-200 focus:ring-2 focus:ring-emerald-500 rounded px-2 py-1 font-semibold text-zinc-700 uppercase tracking-wider"
                        />
                      ) : (
                        header
                      )}
                    </th>
                  ))}
                  <th className="px-4 py-3 border-r border-zinc-200 last:border-r-0 bg-zinc-50/50"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-zinc-200">
                {((result.content as TableData).rows || []).map((row, i) => (
                  <tr key={i} className="hover:bg-zinc-50/50 transition-colors group">
                    <td className="px-1 py-3 border-r border-zinc-200 bg-zinc-50/30">
                      <div className="flex flex-col items-center gap-0.5 transition-opacity">
                        <button
                          onClick={() => moveRow(i, 'up')}
                          disabled={i === 0}
                          className="p-1 rounded hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600 disabled:opacity-10"
                          title="Move Up"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteRow(i)}
                          className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-500"
                          title="Delete Row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => moveRow(i, 'down')}
                          disabled={i === ((result.content as TableData).rows || []).length - 1}
                          className="p-1 rounded hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600 disabled:opacity-10"
                          title="Move Down"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    {(row || []).map((cell, j) => (
                      <td
                        key={j}
                        className="px-4 py-3 text-sm text-zinc-700 border-r border-zinc-200 last:border-r-0 whitespace-nowrap"
                      >
                        {isEditingTable ? (
                          <input
                            type="text"
                            value={cell}
                            onChange={(e) => updateCell(i, j, e.target.value)}
                            className="w-full bg-emerald-50 border border-emerald-100 focus:ring-2 focus:ring-emerald-500 rounded px-2 py-1"
                          />
                        ) : (
                          cell
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3 border-r border-zinc-200 last:border-r-0 bg-zinc-50/10"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
