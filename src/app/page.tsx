"use client";

import dynamic from 'next/dynamic';

// Importação dinâmica para evitar erro de DOMMatrix no servidor
const NexuEditor = dynamic(() => import('./Editor'), { 
  ssr: false,
  loading: () => (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-50 text-blue-600 font-bold">
      Iniciando NexuPDF...
    </div>
  )
});

export default function Page() {
  return <NexuEditor />;
}




// "use client";

// import React, { useState } from 'react';
// import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
// import * as pdfjsLib from 'pdfjs-dist';
// import { Download, FileUp, Loader2, Bold, Save } from 'lucide-react';

// // Configuração do Worker (Obrigatório)
// pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// interface TextItem {
//   id: string;
//   text: string;
//   originalText: string;
//   x: number;
//   y: number;
//   width: number;
//   height: number;
//   pdfX: number;
//   pdfY: number;
//   fontSize: number;
//   fontName: string;
//   isBold: boolean;
//   pageIndex: number;
//   isEditing: boolean;
// }

// export default function Editor() {
//   const [pdfFile, setPdfFile] = useState<File | null>(null);
//   const [pageImages, setPageImages] = useState<string[]>([]); // Corrigido aqui
//   const [textItems, setTextItems] = useState<TextItem[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [activeItemId, setActiveItemId] = useState<string | null>(null);

//   const scale = 1.5; 

//   const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;
//     setPdfFile(file);
//     setLoading(true);
//     setPageImages([]);
//     setTextItems([]);
//     setActiveItemId(null);

//     try {
//       const arrayBuffer = await file.arrayBuffer();
//       const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
//       const newImages: string[] = [];
//       const newTextItems: TextItem[] = [];

//       for (let i = 1; i <= pdf.numPages; i++) {
//         const page = await pdf.getPage(i);
//         const viewport = page.getViewport({ scale });
        
//         // 1. Renderiza a imagem
//         const canvas = document.createElement('canvas');
//         const context = canvas.getContext('2d');
//         canvas.height = viewport.height;
//         canvas.width = viewport.width;
//         await page.render({ canvasContext: context!, viewport }).promise;
//         newImages.push(canvas.toDataURL());

//         // 2. Extrai o texto e consulta os estilos reais
//         const textContent = await page.getTextContent();
//         const styles = textContent.styles;
        
//         textContent.items.forEach((item: any) => {
//           const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
//           const fontHeight = Math.sqrt((item.transform[0] * item.transform[0]) + (item.transform[1] * item.transform[1]));
          
//           let realFontName = item.fontName;
//           if (styles && styles[item.fontName]) {
//             realFontName = styles[item.fontName].fontFamily || item.fontName;
//           }

//           const fontNameLower = realFontName.toLowerCase();
//           // Tenta detectar negrito automaticamente
//           const isBoldDetected = fontNameLower.includes('bold') || 
//                                  fontNameLower.includes('black') || 
//                                  fontNameLower.includes('heavy') || 
//                                  fontNameLower.includes('bd');

//           newTextItems.push({
//             id: Math.random().toString(36).substr(2, 9),
//             text: item.str,
//             originalText: item.str,
//             x: tx[4],
//             y: tx[5] - (item.height * scale),
//             width: item.width * scale,
//             height: item.height * scale,
//             pdfX: item.transform[4],
//             pdfY: item.transform[5],
//             fontSize: fontHeight,
//             fontName: realFontName,
//             isBold: isBoldDetected, 
//             pageIndex: i - 1,
//             isEditing: false
//           });
//         });
//       }

//       setPageImages(newImages); // Atualiza o estado correto
//       setTextItems(newTextItems);

//     } catch (err) {
//       console.error(err);
//       alert("Erro ao processar o PDF.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleTextClick = (id: string) => {
//     setActiveItemId(id);
//     setTextItems(prev => prev.map(item => ({
//       ...item,
//       isEditing: item.id === id
//     })));
//   };

//   const handleTextChange = (newText: string, id: string) => {
//     setTextItems(prev => prev.map(item => {
//       if (item.id === id) {
//         return { ...item, text: newText };
//       }
//       return item;
//     }));
//   };

//   // Botão para você forçar o negrito manualmente se o sistema errar
//   const toggleBold = () => {
//     if (!activeItemId) return;
//     setTextItems(prev => prev.map(item => 
//       item.id === activeItemId ? { ...item, isBold: !item.isBold } : item
//     ));
//   };

//   const handleBlur = (id: string) => {
//     setTimeout(() => {
//       setTextItems(prev => prev.map(item => {
//         if (item.id === id) {
//           return { ...item, isEditing: false };
//         }
//         return item;
//       }));
//     }, 200);
//   };

//   const savePdf = async () => {
//     if (!pdfFile) return;
//     setLoading(true);

//     try {
//       const existingPdfBytes = await pdfFile.arrayBuffer();
//       const pdfDoc = await PDFDocument.load(existingPdfBytes);
      
//       const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
//       const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
//       const times = await pdfDoc.embedFont(StandardFonts.TimesRoman);
//       const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
//       const courier = await pdfDoc.embedFont(StandardFonts.Courier);
//       const courierBold = await pdfDoc.embedFont(StandardFonts.CourierBold);

//       const docPages = pdfDoc.getPages();

//       textItems.forEach(item => {
//         if (item.text === item.originalText && !item.isBold) return;

//         const page = docPages[item.pageIndex];
        
//         let fontToUse = helvetica;
//         const family = item.fontName.toLowerCase();

//         // Lógica inteligente para escolher a fonte certa
//         if (family.includes('times') || family.includes('serif')) {
//             fontToUse = item.isBold ? timesBold : times;
//         } else if (family.includes('courier') || family.includes('mono')) {
//             fontToUse = item.isBold ? courierBold : courier;
//         } else {
//             fontToUse = item.isBold ? helveticaBold : helvetica;
//         }

//         // Desenha retângulo branco para apagar o fundo
//         page.drawRectangle({
//           x: item.pdfX,
//           y: item.pdfY - (item.fontSize * 0.2),
//           width: item.width / scale + 2,
//           height: item.fontSize * 1.2,
//           color: rgb(1, 1, 1),
//         });

//         // Escreve o novo texto com a fonte escolhida
//         page.drawText(item.text, {
//           x: item.pdfX,
//           y: item.pdfY,
//           size: item.fontSize,
//           font: fontToUse,
//           color: rgb(0, 0, 0),
//         });
//       });

//       const pdfBytes = await pdfDoc.save();
//       const blob = new Blob([pdfBytes], { type: 'application/pdf' });
//       const link = document.createElement('a');
//       link.href = URL.createObjectURL(blob);
//       link.download = "NexuPDF_Editado.pdf";
//       link.click();

//     } catch (err) {
//       console.error(err);
//       alert("Erro ao salvar o PDF.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const activeItem = textItems.find(i => i.id === activeItemId);

//   return (
//     <div className="flex flex-col h-screen bg-[#1a1a1a] text-white font-sans overflow-hidden">
//       <header className="flex items-center justify-between p-4 bg-[#111] border-b border-gray-800 z-10 shadow-md">
//         <h1 className="text-2xl font-black italic text-blue-500 tracking-tighter flex items-center gap-2">
//           NexuPDF <span className="text-xs not-italic bg-blue-600 text-white px-2 py-0.5 rounded-full">PRO</span>
//         </h1>
        
//         <div className="flex items-center gap-4">
          
//           {/* BOTÃO DE NEGRITO MANUAL */}
//           {activeItemId && (
//             <button
//               onMouseDown={(e) => e.preventDefault()}
//               onClick={toggleBold}
//               className={`flex items-center gap-2 px-4 py-2 rounded font-bold text-xs uppercase tracking-wider transition border
//                 ${activeItem?.isBold 
//                   ? 'bg-blue-600 text-white border-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.5)]' 
//                   : 'bg-transparent text-gray-400 border-gray-600 hover:border-gray-400'
//                 }`}
//               title="Clique para ativar/desativar negrito"
//             >
//               <Bold size={16} /> Negrito
//             </button>
//           )}

//           <label className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg cursor-pointer transition-all text-sm font-bold uppercase tracking-wider">
//             <FileUp size={18} className="text-blue-400"/>
//             Abrir PDF
//             <input type="file" className="hidden" accept=".pdf" onChange={handleUpload} />
//           </label>
//           <button 
//             onClick={savePdf}
//             disabled={!pdfFile || loading}
//             className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
//           >
//             {loading ? <Loader2 className="animate-spin" size={18}/> : <Download size={18} />}
//             Baixar PDF
//           </button>
//         </div>
//       </header>

//       <main className="flex-1 overflow-y-auto bg-[#222] p-8 flex flex-col items-center gap-8 relative scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
//         {pageImages.map((imgSrc, pIndex) => (
//           <div key={pIndex} className="relative shadow-2xl shadow-black/50 rounded-sm group">
//             <img src={imgSrc} alt={`Página ${pIndex + 1}`} className="max-w-none select-none pointer-events-none" style={{ width: '100%' }} />

//             <div className="absolute inset-0">
//               {textItems.filter(item => item.pageIndex === pIndex).map((item) => {
//                 const scaledFontSize = item.fontSize * scale;
//                 const fontFamily = item.fontName.toLowerCase().includes('times') ? 'Times New Roman, serif' : 'Arial, sans-serif';
//                 const isChanged = item.text !== item.originalText;
//                 const isSelected = item.id === activeItemId;

//                 if (item.isEditing) {
//                   return (
//                     <input
//                       key={item.id}
//                       type="text"
//                       value={item.text}
//                       onChange={(e) => handleTextChange(e.target.value, item.id)}
//                       onBlur={() => handleBlur(item.id)}
//                       onFocus={() => handleTextClick(item.id)}
//                       autoFocus
//                       className="absolute z-20 bg-white text-black border border-blue-500 outline-none p-0 m-0 shadow-sm"
//                       style={{
//                         left: `${item.x}px`,
//                         top: `${item.y}px`,
//                         width: `${item.width + 20}px`,
//                         height: `${item.height}px`,
//                         fontSize: `${scaledFontSize}px`,
//                         fontFamily: fontFamily,
//                         fontWeight: item.isBold ? 'bold' : 'normal',
//                         lineHeight: 1,
//                         transform: `translateY(${item.height * 0.15}px)`,
//                         paddingLeft: '2px'
//                       }}
//                     />
//                   );
//                 } else {
//                   return (
//                     <div
//                       key={item.id}
//                       onClick={(e) => {
//                         e.stopPropagation();
//                         handleTextClick(item.id);
//                       }}
//                       className={`absolute cursor-text rounded-sm select-none transition-all
//                         ${isChanged || isSelected
//                           ? 'bg-white text-black shadow-sm z-10 px-0.5' 
//                           : 'text-transparent hover:bg-blue-500/20 hover:ring-1 hover:ring-blue-400'
//                         }
//                       `}
//                       style={{
//                         left: `${item.x}px`,
//                         top: `${item.y}px`,
//                         width: `${item.width}px`,
//                         height: `${item.height}px`,
//                         fontSize: `${scaledFontSize}px`,
//                         fontFamily: fontFamily,
//                         fontWeight: item.isBold ? 'bold' : 'normal',
//                         lineHeight: 1,
//                         whiteSpace: 'pre',
//                         overflow: 'hidden'
//                       }}
//                     >
//                       {item.text}
//                     </div>
//                   );
//                 }
//               })}
//             </div>
            
//             <div className="absolute top-2 -left-10 text-gray-500 font-bold text-xs opacity-50 group-hover:opacity-100 transition-opacity">
//               #{pIndex + 1}
//             </div>
//           </div>
//         ))}
        
//         {!pdfFile && (
//           <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none opacity-40">
//             <div className="w-32 h-32 rounded-full border-4 border-dashed border-gray-700 flex items-center justify-center mb-6 animate-pulse">
//               <FileUp size={48} className="text-gray-600"/>
//             </div>
//             <h2 className="text-4xl font-black text-gray-700 tracking-tighter mb-2">NEXU PDF EDITOR</h2>
//             <p className="text-gray-600 font-bold tracking-[0.5em] uppercase text-sm">Abra um arquivo para começar</p>
//           </div>
//         )}
//       </main>
//     </div>
//   );
// }