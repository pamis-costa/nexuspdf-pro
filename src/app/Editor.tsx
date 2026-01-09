"use client";

import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  Download, FileUp, Loader2, Bold, 
  Trash2, Undo2, Highlighter, XCircle, Type,
  PlusSquare, Move, Minus, Plus
} from 'lucide-react';

// --- CONFIGURAÇÃO DO WORKER DO PDF.JS ---
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// --- TIPOS E CONFIGURAÇÕES ---
const FONT_OPTIONS = [
  { label: 'Arial', value: 'Arial', css: 'Arial, sans-serif', pdfFont: 'Helvetica' },
  { label: 'Helvetica', value: 'Helvetica', css: 'Helvetica, sans-serif', pdfFont: 'Helvetica' },
  { label: 'Verdana', value: 'Verdana', css: 'Verdana, sans-serif', pdfFont: 'Helvetica' },
  { label: 'Trebuchet MS', value: 'Trebuchet MS', css: '"Trebuchet MS", sans-serif', pdfFont: 'Helvetica' },
  { label: 'Gill Sans', value: 'Gill Sans', css: '"Gill Sans", sans-serif', pdfFont: 'Helvetica' },
  { label: 'Times New Roman', value: 'Times New Roman', css: '"Times New Roman", serif', pdfFont: 'Times' },
  { label: 'Georgia', value: 'Georgia', css: 'Georgia, serif', pdfFont: 'Times' },
  { label: 'Garamond', value: 'Garamond', css: 'Garamond, serif', pdfFont: 'Times' },
  { label: 'Courier New', value: 'Courier New', css: '"Courier New", monospace', pdfFont: 'Courier' },
  { label: 'Lucida Console', value: 'Lucida Console', css: '"Lucida Console", monospace', pdfFont: 'Courier' },
  { label: 'Monaco', value: 'Monaco', css: 'Monaco, monospace', pdfFont: 'Courier' },
  { label: 'Comic Sans MS', value: 'Comic Sans MS', css: '"Comic Sans MS", cursive', pdfFont: 'Helvetica' },
];

interface TextItem {
  id: string;
  text: string;
  originalText: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pdfX: number; // Usado para texto original
  pdfY: number; // Usado para texto original
  fontSize: number;
  originalFontName: string;
  fontFamily: string;
  isBold: boolean;
  isDeleted: boolean;
  highlightColor: string | null;
  pageIndex: number;
  isEditing: boolean;
  isAdded: boolean; // NOVO: Identifica se é uma caixa de texto adicionada
}

export default function Editor() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pageImages, setPageImages] = useState<string[]>([]);
  const [textItems, setTextItems] = useState<TextItem[]>([]);
  const [history, setHistory] = useState<TextItem[][]>([]);
  const [loading, setLoading] = useState(false);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  
  // Estado para Drag and Drop
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const scale = 1.5; 

  const addToHistory = () => {
    setHistory(prev => [...prev, JSON.parse(JSON.stringify(textItems))]);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previousState = history[history.length - 1];
    setTextItems(previousState);
    setHistory(prev => prev.slice(0, -1));
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfFile(file);
    setLoading(true);
    setPageImages([]);
    setTextItems([]);
    setHistory([]);
    setActiveItemId(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      const newImages: string[] = [];
      const newTextItems: TextItem[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context!, viewport }).promise;
        newImages.push(canvas.toDataURL());

        const textContent = await page.getTextContent();
        const styles = textContent.styles;
        
        textContent.items.forEach((item: any) => {
          const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
          const fontHeight = Math.sqrt((item.transform[0] * item.transform[0]) + (item.transform[1] * item.transform[1]));
          
          let realFontName = item.fontName;
          if (styles && styles[item.fontName]) {
            realFontName = styles[item.fontName].fontFamily || item.fontName;
          }

          const fontNameLower = realFontName.toLowerCase();
          let detectedFont = 'Arial';
          
          if (fontNameLower.includes('times') || fontNameLower.includes('roman')) detectedFont = 'Times New Roman';
          else if (fontNameLower.includes('georgia')) detectedFont = 'Georgia';
          else if (fontNameLower.includes('garamond')) detectedFont = 'Garamond';
          else if (fontNameLower.includes('courier')) detectedFont = 'Courier New';
          else if (fontNameLower.includes('lucida')) detectedFont = 'Lucida Console';
          else if (fontNameLower.includes('verdana')) detectedFont = 'Verdana';
          else if (fontNameLower.includes('trebuchet')) detectedFont = 'Trebuchet MS';
          else if (fontNameLower.includes('gill')) detectedFont = 'Gill Sans';
          else if (fontNameLower.includes('comic')) detectedFont = 'Comic Sans MS';
          else if (fontNameLower.includes('helvetica')) detectedFont = 'Helvetica';

          const isBoldDetected = fontNameLower.includes('bold') || fontNameLower.includes('black') || fontNameLower.includes('heavy');

          const correctedY = tx[5] - (fontHeight * viewport.scale * 0.87); 
          const safeWidth = item.width * (tx[0] / item.transform[0]); 

          newTextItems.push({
            id: Math.random().toString(36).substr(2, 9),
            text: item.str,
            originalText: item.str,
            x: tx[4],
            y: correctedY,
            width: safeWidth,
            height: fontHeight * viewport.scale,
            pdfX: item.transform[4],
            pdfY: item.transform[5],
            fontSize: fontHeight,
            originalFontName: realFontName,
            fontFamily: detectedFont,
            isBold: isBoldDetected, 
            isDeleted: false,
            highlightColor: null,
            pageIndex: i - 1,
            isEditing: false,
            isAdded: false // Item original
          });
        });
      }

      setPageImages(newImages);
      setTextItems(newTextItems);

    } catch (err) {
      console.error(err);
      alert("Erro ao processar o PDF.");
    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA DE CAIXA DE TEXTO ADICIONADA ---
  const addNewText = () => {
    if (pageImages.length === 0) return;
    
    addToHistory();
    const newItem: TextItem = {
      id: Math.random().toString(36).substr(2, 9),
      text: "Novo Texto",
      originalText: "",
      x: 50, // Posição inicial X
      y: 50, // Posição inicial Y
      width: 150,
      height: 20 * scale,
      pdfX: 0, // Será calculado ao salvar
      pdfY: 0, // Será calculado ao salvar
      fontSize: 16, // Tamanho padrão
      originalFontName: "",
      fontFamily: "Arial",
      isBold: false,
      isDeleted: false,
      highlightColor: null,
      pageIndex: 0, // Adiciona na primeira página por padrão (ou poderia ser a atual)
      isEditing: true,
      isAdded: true // MARCA COMO ADICIONADO
    };
    
    setTextItems(prev => [...prev, newItem]);
    setActiveItemId(newItem.id);
  };

  // --- LÓGICA DE DRAG AND DROP ---
  const handleMouseDown = (e: React.MouseEvent, item: TextItem) => {
    if (!item.isAdded) return; // Só move se for item adicionado
    if (item.isEditing) return; // Não move se estiver editando texto

    e.preventDefault();
    setActiveItemId(item.id);
    setDraggingItemId(item.id);
    setDragOffset({
      x: e.clientX - item.x,
      y: e.clientY - item.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingItemId) return;
    
    const item = textItems.find(i => i.id === draggingItemId);
    if (!item) return;

    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;

    setTextItems(prev => prev.map(i => 
      i.id === draggingItemId ? { ...i, x: newX, y: newY } : i
    ));
  };

  const handleMouseUp = () => {
    if (draggingItemId) {
        addToHistory(); // Salva no histórico após mover
        setDraggingItemId(null);
    }
  };

  const handleTextClick = (id: string) => {
    setActiveItemId(id);
    // Se não estiver arrastando, ativa edição
    setTextItems(prev => prev.map(item => ({
      ...item,
      isEditing: item.id === id
    })));
  };

  const handleTextChange = (newText: string, id: string) => {
    setTextItems(prev => prev.map(item => {
      if (item.id === id) return { ...item, text: newText };
      return item;
    }));
  };

  const handleFocus = () => addToHistory();

  const handleBlur = (id: string) => {
    setTimeout(() => {
      setTextItems(prev => prev.map(item => {
        if (item.id === id) return { ...item, isEditing: false };
        return item;
      }));
    }, 200);
  };

  const toggleBold = () => {
    if (!activeItemId) return;
    addToHistory();
    setTextItems(prev => prev.map(item => 
      item.id === activeItemId ? { ...item, isBold: !item.isBold } : item
    ));
  };

  const changeFontFamily = (newFont: string) => {
    if (!activeItemId) return;
    addToHistory();
    setTextItems(prev => prev.map(item => 
        item.id === activeItemId ? { ...item, fontFamily: newFont } : item
    ));
  };

  const changeFontSize = (delta: number) => {
    if (!activeItemId) return;
    addToHistory();
    setTextItems(prev => prev.map(item => {
        if (item.id === activeItemId) {
            const newSize = Math.max(8, item.fontSize + delta); // Mínimo 8px
            return { ...item, fontSize: newSize, height: newSize * scale };
        }
        return item;
    }));
  };

  const deleteItem = () => {
    if (!activeItemId) return;
    addToHistory();
    // Se for item adicionado, remove do array. Se for original, marca como deletado.
    const item = textItems.find(i => i.id === activeItemId);
    if (item?.isAdded) {
        setTextItems(prev => prev.filter(i => i.id !== activeItemId));
        setActiveItemId(null);
    } else {
        setTextItems(prev => prev.map(i => 
          i.id === activeItemId ? { ...i, isDeleted: true, isEditing: false } : i
        ));
    }
  };

  const restoreItem = () => {
    if (!activeItemId) return;
    addToHistory();
    setTextItems(prev => prev.map(item => 
      item.id === activeItemId ? { ...item, isDeleted: false, isEditing: false } : item
    ));
    setActiveItemId(null);
  };

  const highlightItem = (color: string) => {
    if (!activeItemId) return;
    addToHistory();
    setTextItems(prev => prev.map(item => 
      item.id === activeItemId ? { 
        ...item, 
        highlightColor: item.highlightColor === color ? null : color
      } : item
    ));
  };

  const savePdf = async () => {
    if (!pdfFile) return;
    setLoading(true);

    try {
      const existingPdfBytes = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(existingPdfBytes, { ignoreEncryption: true });
      
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const times = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
      const courier = await pdfDoc.embedFont(StandardFonts.Courier);
      const courierBold = await pdfDoc.embedFont(StandardFonts.CourierBold);

      const docPages = pdfDoc.getPages();

      textItems.forEach(item => {
        const hasTextChange = item.text !== item.originalText;
        const hasStyleChange = item.isBold;
        const hasHighlight = item.highlightColor !== null;
        const isDeleted = item.isDeleted;
        const isAdded = item.isAdded;
        
        if (!hasTextChange && !hasStyleChange && !hasHighlight && !isDeleted && !isAdded) return;

        const page = docPages[item.pageIndex];
        const { height } = page.getSize(); // Altura da página PDF

        // 1. Apagar o texto original (apenas para itens originais modificados)
        if (!isAdded && (hasTextChange || hasStyleChange || hasHighlight || isDeleted)) {
           page.drawRectangle({
            x: item.pdfX,
            y: item.pdfY - (item.fontSize * 0.2),
            width: item.width / scale + 4,
            height: item.fontSize * 1.2,
            color: rgb(1, 1, 1),
          });
        }

        if (isDeleted) return;

        // 2. Selecionar fonte
        let fontToUse = helvetica;
        const selectedOption = FONT_OPTIONS.find(f => f.value === item.fontFamily);
        const pdfFontType = selectedOption ? selectedOption.pdfFont : 'Helvetica';

        if (pdfFontType === 'Times') {
            fontToUse = item.isBold ? timesBold : times;
        } else if (pdfFontType === 'Courier') {
            fontToUse = item.isBold ? courierBold : courier;
        } else {
            fontToUse = item.isBold ? helveticaBold : helvetica;
        }

        // 3. Coordenadas (Cálculo diferente para itens novos)
        let finalX = item.pdfX;
        let finalY = item.pdfY;

        if (isAdded) {
            // Converter DOM coords (Top-Left) para PDF coords (Bottom-Left)
            // A coordenada Y do DOM precisa ser invertida em relação à altura da página
            // Nota: O scale afeta a visualização, então dividimos por ele
            finalX = item.x / scale;
            // Ajuste fino da posição Y
            finalY = height - (item.y / scale) - (item.fontSize * 0.8); 
        }

        // 4. Desenhar Highlight
        if (item.highlightColor) {
            const r = parseInt(item.highlightColor.slice(1, 3), 16) / 255;
            const g = parseInt(item.highlightColor.slice(3, 5), 16) / 255;
            const b = parseInt(item.highlightColor.slice(5, 7), 16) / 255;

            page.drawRectangle({
                x: finalX,
                y: finalY - (item.fontSize * 0.2),
                width: (item.width / scale) + 10, // Um pouco mais largo para itens novos
                height: item.fontSize * 1.2,
                color: rgb(r, g, b),
                opacity: 0.4,
            });
        }

        // 5. Escrever texto
        page.drawText(item.text, {
          x: finalX,
          y: finalY,
          size: item.fontSize,
          font: fontToUse,
          color: rgb(0, 0, 0),
        });
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `NexusPDF_${pdfFile.name}`;
      link.click();

    } catch (err) {
      console.error(err);
      alert("Erro ao salvar o PDF.");
    } finally {
      setLoading(false);
    }
  };

  const activeItem = textItems.find(i => i.id === activeItemId);

  return (
    <div 
      className="flex flex-col h-screen bg-[#1a1a1a] text-white font-sans overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* HEADER PRINCIPAL */}
      <header className="flex items-center justify-between p-4 bg-[#111] border-b border-gray-800 z-10 shadow-md">
        <h1 className="text-2xl font-black italic text-blue-500 tracking-tighter flex items-center gap-2 select-none">
          NexusPDF <span className="text-xs not-italic bg-blue-600 text-white px-2 py-0.5 rounded-full">PRO</span>
        </h1>
        
        <div className="flex items-center gap-4">
          
          {/* BARRA DE FERRAMENTAS */}
          <div className="flex bg-gray-800 rounded-lg p-1 gap-1 border border-gray-700 items-center shadow-lg">
            
            <button 
                onClick={addNewText}
                disabled={!pdfFile}
                className="flex items-center gap-2 px-3 py-2 rounded hover:bg-blue-900/50 text-blue-400 transition disabled:opacity-30 disabled:cursor-not-allowed font-bold text-sm uppercase tracking-wide"
                title="Adicionar Caixa de Texto"
            >
                <PlusSquare size={18} />
                <span className="hidden md:inline">Adicionar Texto</span>
            </button>

            <div className="w-px h-6 bg-gray-700 mx-1"></div>

            <button 
              onClick={handleUndo}
              disabled={history.length === 0}
              className="p-2 rounded hover:bg-gray-700 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Desfazer (Ctrl+Z)"
            >
               <Undo2 size={18} />
            </button>

            <div className="w-px h-6 bg-gray-700 mx-1"></div>

            {activeItem ? (
              activeItem?.isDeleted ? (
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={restoreItem}
                  className="p-2 rounded hover:bg-green-900/50 text-green-400 transition flex items-center gap-2 px-3"
                  title="Restaurar"
                >
                  <Undo2 size={18} /> <span>Restaurar Texto</span>
                </button>
              ) : (
                <>
                  <div className="relative px-1 group">
                    <select 
                        className="appearance-none bg-gray-900 text-white border border-gray-600 rounded px-3 py-1 text-xs font-bold uppercase tracking-wider cursor-pointer hover:border-blue-500 focus:outline-none focus:border-blue-500 transition-colors"
                        value={activeItem.fontFamily}
                        onChange={(e) => changeFontFamily(e.target.value)}
                        style={{ minWidth: '130px', textAlign: 'center' }}
                    >
                        {FONT_OPTIONS.map((font) => (
                            <option key={font.value} value={font.value} className="bg-gray-900 text-white">
                                {font.label}
                            </option>
                        ))}
                    </select>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400">
                        <Type size={12} />
                    </div>
                  </div>

                  {/* CONTROLE DE TAMANHO DA FONTE */}
                  <div className="flex items-center gap-0.5 bg-gray-900 rounded border border-gray-600 mx-1">
                      <button onClick={() => changeFontSize(-2)} className="p-1 hover:text-blue-400"><Minus size={12}/></button>
                      <span className="text-xs font-bold w-6 text-center select-none">{Math.round(activeItem.fontSize)}</span>
                      <button onClick={() => changeFontSize(2)} className="p-1 hover:text-blue-400"><Plus size={12}/></button>
                  </div>

                  <div className="w-px h-6 bg-gray-700 mx-1"></div>

                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={toggleBold}
                    className={`p-2 rounded hover:bg-gray-700 transition ${activeItem?.isBold ? 'text-blue-400 bg-gray-900 shadow-inner' : 'text-gray-300'}`}
                    title="Negrito"
                  >
                    <Bold size={18} />
                  </button>

                  <div className="flex items-center gap-1 px-2 border-l border-r border-gray-700 mx-1">
                      <Highlighter size={16} className="text-gray-500 mr-1" />
                      {[
                        { color: '#FFFF00', label: 'Amarelo' },
                        { color: '#00FF00', label: 'Verde' },
                        { color: '#FF00FF', label: 'Rosa' },
                        { color: '#00FFFF', label: 'Azul' }
                      ].map((c) => (
                        <button
                          key={c.color}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => highlightItem(c.color)}
                          className={`w-4 h-4 rounded-full border transition hover:scale-125 ${activeItem?.highlightColor === c.color ? 'border-white ring-1 ring-white' : 'border-transparent'}`}
                          style={{ backgroundColor: c.color }}
                          title={`Marca-texto ${c.label}`}
                        />
                      ))}
                      {activeItem?.highlightColor && (
                          <button onClick={() => highlightItem(activeItem.highlightColor!)} className="ml-1 text-gray-500 hover:text-red-400">
                              <XCircle size={14} />
                          </button>
                      )}
                  </div>

                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={deleteItem}
                    className="p-2 rounded hover:bg-red-900/50 text-red-400 transition ml-1"
                    title={activeItem.isAdded ? "Excluir Caixa" : "Excluir Texto"}
                  >
                    <Trash2 size={18} />
                  </button>
                </>
              )
            ) : (
                <span className="text-xs text-gray-500 flex items-center px-4 font-mono h-8 uppercase tracking-widest opacity-50">Selecione um texto</span>
            )}
          </div>

          <label className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg cursor-pointer transition-all text-sm font-bold uppercase tracking-wider border border-gray-700 hover:border-gray-500">
            <FileUp size={18} className="text-blue-400"/>
            <span className="hidden md:inline">Abrir PDF</span>
            <input type="file" className="hidden" accept=".pdf" onChange={handleUpload} />
          </label>
          <button 
            onClick={savePdf}
            disabled={!pdfFile || loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
          >
            {loading ? <Loader2 className="animate-spin" size={18}/> : <Download size={18} />}
            <span className="hidden md:inline">Baixar</span>
          </button>
        </div>
      </header>

      {/* ÁREA DE VISUALIZAÇÃO */}
      <main className="flex-1 overflow-y-auto bg-[#222] p-8 flex flex-col items-center gap-8 relative scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
        
        {loading && (
          <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm">
             <Loader2 size={64} className="text-blue-500 animate-spin mb-4" />
             <p className="text-blue-400 font-mono animate-pulse">PROCESSANDO PDF...</p>
          </div>
        )}

        {pageImages.map((imgSrc, pIndex) => (
          <div key={pIndex} className="relative shadow-2xl shadow-black/50 rounded-sm group transition-transform duration-300">
            <img src={imgSrc} alt={`Página ${pIndex + 1}`} className="max-w-none select-none pointer-events-none" style={{ width: '100%' }} />

            <div className="absolute inset-0">
              {textItems.filter(item => item.pageIndex === pIndex).map((item) => {
                const scaledFontSize = item.fontSize * scale;
                const fontOption = FONT_OPTIONS.find(f => f.value === item.fontFamily);
                const cssFontFamily = fontOption ? fontOption.css : 'Arial, sans-serif';
                
                const isChanged = item.text !== item.originalText;
                const isSelected = item.id === activeItemId;
                // Itens adicionados são sempre visíveis
                const showText = item.isAdded || isChanged || item.isDeleted || isSelected;

                const highlightStyle = item.highlightColor ? {
                    backgroundColor: item.highlightColor,
                    mixBlendMode: 'multiply' as any,
                    opacity: 0.6
                } : {};

                const deletedStyle = item.isDeleted ? {
                  textDecoration: 'line-through',
                  color: 'red',
                  textDecorationColor: 'red',
                  backgroundColor: 'rgba(255, 0, 0, 0.1)',
                  opacity: 1
                } : {};

                // Estilo para caixa adicionada (Drag)
                const addedStyle = item.isAdded ? {
                    cursor: item.isEditing ? 'text' : 'move',
                    border: isSelected ? '1px dashed #3b82f6' : '1px dashed transparent',
                    backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                } : {
                    cursor: 'text'
                };

                if (item.isEditing && !item.isDeleted) {
                  return (
                    <textarea
                      key={item.id}
                      value={item.text}
                      onChange={(e) => handleTextChange(e.target.value, item.id)}
                      onBlur={() => handleBlur(item.id)}
                      onFocus={handleFocus}
                      autoFocus
                      className="absolute z-20 bg-white text-black border-2 border-blue-500 outline-none p-0 m-0 shadow-xl rounded-sm resize-none overflow-hidden"
                      style={{
                        left: `${item.x}px`,
                        top: `${item.y}px`,
                        // Para itens adicionados, a largura se adapta ou é fixa, aqui deixamos flexível
                        width: item.isAdded ? 'auto' : `${item.width + 30}px`,
                        minWidth: item.isAdded ? '100px' : 'unset',
                        height: `${item.height * 1.5}px`, // Um pouco mais alto para digitação
                        fontSize: `${scaledFontSize}px`,
                        fontFamily: cssFontFamily,
                        fontWeight: item.isBold ? 'bold' : 'normal',
                        lineHeight: 1,
                        paddingLeft: '4px',
                        whiteSpace: 'pre'
                      }}
                    />
                  );
                } else {
                  return (
                    <div
                      key={item.id}
                      onMouseDown={(e) => handleMouseDown(e, item)}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTextClick(item.id);
                      }}
                      className={`absolute rounded-sm select-none transition-all duration-150
                        ${isSelected && !item.isAdded ? 'ring-2 ring-blue-500 z-10' : ''}
                        ${!item.isAdded && !isSelected ? 'hover:ring-1 hover:ring-blue-400' : ''}
                        ${showText ? 'text-black px-0.5 shadow-sm' : 'text-transparent'}
                        ${item.isDeleted ? 'opacity-70' : ''}
                      `}
                      style={{
                        left: `${item.x}px`,
                        top: `${item.y}px`,
                        width: item.isAdded ? 'auto' : `${item.width}px`,
                        height: item.isAdded ? 'auto' : `${item.height}px`,
                        fontSize: `${scaledFontSize}px`,
                        fontFamily: cssFontFamily,
                        fontWeight: item.isBold ? 'bold' : 'normal',
                        lineHeight: 1,
                        whiteSpace: 'pre',
                        // Para itens adicionados, removemos overflow hidden para ver tudo
                        overflow: item.isAdded ? 'visible' : 'hidden',
                        ...(item.highlightColor && !isChanged ? highlightStyle : {}),
                        ...(item.highlightColor && isChanged ? { borderBottom: `4px solid ${item.highlightColor}` } : {}),
                        ...deletedStyle,
                        ...addedStyle,
                        backgroundColor: showText ? (item.isAdded ? 'transparent' : 'white') : 'transparent'
                      }}
                    >
                      {item.isAdded && isSelected && (
                          <div className="absolute -top-4 -right-4 bg-blue-500 rounded-full p-1 shadow-lg pointer-events-none">
                              <Move size={10} className="text-white"/>
                          </div>
                      )}
                      {item.text}
                      {item.highlightColor && !isChanged && !item.isDeleted && (
                        <div className="absolute inset-0 pointer-events-none opacity-50" style={{ backgroundColor: item.highlightColor }}></div>
                      )}
                      {item.isDeleted && (
                        <>
                          <div className="absolute inset-0 pointer-events-none bg-red-500/10"></div>
                          <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-red-500 pointer-events-none" style={{ transform: 'translateY(-50%)' }}></div>
                        </>
                      )}
                    </div>
                  );
                }
              })}
            </div>
            
            <div className="absolute top-2 -left-10 text-gray-500 font-bold text-xs opacity-50 group-hover:opacity-100 transition-opacity">
              PAG {pIndex + 1}
            </div>
          </div>
        ))}
        
        {!pdfFile && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none opacity-40">
            <div className="w-32 h-32 rounded-full border-4 border-dashed border-gray-700 flex items-center justify-center mb-6 animate-pulse">
              <FileUp size={48} className="text-gray-600"/>
            </div>
            <h2 className="text-4xl font-black text-gray-700 tracking-tighter mb-2">NEXUS PDF PRO</h2>
            <p className="text-gray-600 font-bold tracking-[0.5em] uppercase text-sm">Abra um arquivo para editar</p>
          </div>
        )}
      </main>
    </div>
  );
}