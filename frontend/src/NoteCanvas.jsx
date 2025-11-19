import React, { useRef, useState, useEffect } from "react";
import { Stage, Layer, Line, Text, Image, Circle } from "react-konva";
import {
  getDocument,
  GlobalWorkerOptions,
} from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorker from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import axios from "axios";

// Explicitly reference the worker that Vite bundles for pdf.js
GlobalWorkerOptions.workerSrc = pdfWorker;

const MAX_WIDTH = 1000;
const DEFAULT_API_BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:3000").replace(/\/$/, "");
const createEmptyPage = (id = Date.now()) => ({ id, slides: [], lines: [], textBoxes: [] });
const computeNextIdFromPages = (pages = []) => {
  const ids = [];
  pages.forEach((page) => {
    ids.push(Number(page.id));
    page.slides?.forEach((slide) => ids.push(Number(slide.id)));
    page.lines?.forEach((line) => ids.push(Number(line.id)));
    page.textBoxes?.forEach((box) => ids.push(Number(box.id)));
  });
  const numericIds = ids.filter((val) => Number.isFinite(val));
  return numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;
};

export default function NoteCanvas({ userId, apiBaseUrl = DEFAULT_API_BASE }) {
  const API_BASE = (apiBaseUrl ?? DEFAULT_API_BASE).replace(/\/$/, "");
  const stageRefs = useRef([]);
  const [pages, setPages] = useState([createEmptyPage(0)]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [tool, setTool] = useState("move");
  const [drawingColor, setDrawingColor] = useState("#000000");
  const [drawingSize, setDrawingSize] = useState(4);
  const [nextId, setNextId] = useState(1);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [textFontSize, setTextFontSize] = useState(18);
  const [textColor, setTextColor] = useState("#000000");
  const [addingText, setAddingText] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [loadingState, setLoadingState] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!userId) {
      setPages([createEmptyPage(0)]);
      setCurrentPageIndex(0);
      setNextId(1);
      return;
    }
    let ignore = false;
    const fetchState = async () => {
      setLoadingState(true);
      setLoadError("");
      try {
        const response = await axios.get(`${API_BASE}/api/note-canvas/${userId}`);
        if (ignore) return;
        const payload = response.data?.data;
        if (payload?.pages?.length) {
          setPages(payload.pages);
          setCurrentPageIndex(Math.min(payload.currentPageIndex ?? 0, payload.pages.length - 1));
          setNextId(payload.nextId ?? computeNextIdFromPages(payload.pages));
        } else {
          setPages([createEmptyPage(0)]);
          setCurrentPageIndex(0);
          setNextId(1);
        }
      } catch (error) {
        if (!ignore) {
          console.error("Failed to load note canvas state", error);
          setLoadError("Unable to load your saved notes.");
          setPages([createEmptyPage(0)]);
          setCurrentPageIndex(0);
          setNextId(1);
        }
      } finally {
        if (!ignore) {
          setLoadingState(false);
        }
      }
    };
    fetchState();
    return () => {
      ignore = true;
    };
  }, [userId, API_BASE]);

  const hexToRGBA = (hex, alpha) => {
    let r = 0, g = 0, b = 0;
    if (hex.length === 7) {
      r = parseInt(hex.slice(1, 3), 16);
      g = parseInt(hex.slice(3, 5), 16);
      b = parseInt(hex.slice(5, 7), 16);
    }
    return `rgba(${r},${g},${b},${alpha})`;
  };

  const autoResizeTextarea = (textarea) => {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
  };

  // Drawing handlers
  const handleMouseDown = (pageIndex) => {
    if (tool === "move") return;
    setIsDrawing(true);
    const stage = stageRefs.current[pageIndex];
    const pos = stage.getPointerPosition();
    if (!pos) return;
    const x = pos.x / zoom;
    const y = pos.y / zoom;

    if (tool === "draw" || tool === "highlighter") {
      let strokeColor = drawingColor;
      let strokeWidth = drawingSize;
      if (tool === "highlighter") {
        strokeColor = hexToRGBA(drawingColor, 0.3);
        strokeWidth = drawingSize * 3;
      }
      const newLine = { id: nextId, points: [{ x, y }], stroke: strokeColor, strokeWidth, tool };
      setNextId(prev => prev + 1);
      setPages(prev => prev.map((p, i) => i === pageIndex ? { ...p, lines: [...p.lines, newLine] } : p));
    }
  };

  const handleMouseMove = (pageIndex) => {
    const stage = stageRefs.current[pageIndex];
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;
    const x = pos.x / zoom;
    const y = pos.y / zoom;
    setCursorPos({ x, y });

    if (!isDrawing) return;

    if (tool === "eraser") {
      const eraseRadius = drawingSize;
      setPages(prev =>
        prev.map((p, i) => i === pageIndex
          ? { ...p, lines: p.lines.map(line => ({ ...line, points: line.points.filter(pt => Math.hypot(pt.x - x, pt.y - y) > eraseRadius) })).filter(line => line.points.length > 0) }
          : p
        )
      );
    } else if (tool === "draw" || tool === "highlighter") {
      setPages(prev =>
        prev.map((p, i) => {
          if (i !== pageIndex) return p;
          const lastLine = p.lines[p.lines.length - 1];
          if (lastLine) lastLine.points.push({ x, y });
          return { ...p, lines: [...p.lines] };
        })
      );
    }
  };

  const handleMouseUp = () => { if (isDrawing) setIsDrawing(false); };

  // Text box handlers
  const handleStageClick = (pageIndex, e) => {
    if (!addingText) return;
    const stage = stageRefs.current[pageIndex];
    const pos = stage.getPointerPosition();
    if (!pos) return;
    const x = pos.x / zoom;
    const y = pos.y / zoom;

    const textarea = document.createElement("textarea");
    textarea.value = "";
    textarea.style.position = "absolute";
    textarea.style.top = `${window.scrollY + e.evt.clientY}px`;
    textarea.style.left = `${window.scrollX + e.evt.clientX}px`;
    textarea.style.fontSize = `${textFontSize}px`;
    textarea.style.padding = "4px";
    textarea.style.border = "1px solid #000";
    textarea.style.background = "white";
    textarea.style.color = textColor;
    textarea.style.zIndex = "1000";
    textarea.style.outline = "none";
    textarea.style.resize = "none";

    document.body.appendChild(textarea);
    textarea.focus();
    autoResizeTextarea(textarea);
    textarea.addEventListener("input", () => autoResizeTextarea(textarea));
    textarea.addEventListener("keydown", (event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); textarea.blur(); } });
    textarea.addEventListener("blur", () => {
      const text = textarea.value.trim();
      if (text) {
        const id = nextId;
        setNextId(prev => prev + 1);
        const newText = { id, x, y, text, fontSize: textFontSize, fill: textColor };
        setPages(prev => prev.map((p, i) => i === pageIndex ? { ...p, textBoxes: [...p.textBoxes, newText] } : p));
      }
      textarea.remove();
      setAddingText(false);
    });
  };

  const updateTextBox = (pageIndex, id, newProps) => {
    setPages(prev => prev.map((p, i) => i === pageIndex ? { ...p, textBoxes: p.textBoxes.map(tb => tb.id === id ? { ...tb, ...newProps } : tb) } : p));
  };

  const deleteSelected = () => {
    if (selectedId === null) return;
    setPages(prev => prev.map((p, i) => i === currentPageIndex ? { ...p, lines: p.lines.filter(l => l.id !== selectedId), textBoxes: p.textBoxes.filter(t => t.id !== selectedId) } : p));
    setSelectedId(null);
  };

  const addPage = () => {
    const newPage = { id: nextId, slides: [], lines: [], textBoxes: [] };
    setPages((prev) => {
      const updated = [...prev, newPage];
      setCurrentPageIndex(updated.length - 1);
      return updated;
    });
    setNextId((prev) => prev + 1);
  };

  const deletePage = () => {
    if (pages.length <= 1) return;
    setPages(prev => {
      const newPages = prev.filter((_, i) => i !== currentPageIndex);
      setCurrentPageIndex(Math.min(currentPageIndex, newPages.length - 1));
      return newPages;
    });
  };

  // PDF/Image upload
  const handleSlideUpload = async (e) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);

    for (const file of files) {
      if (file.type === "application/pdf") {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await getDocument({ data: arrayBuffer }).promise;
        let yOffset = 0;
        const slides = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1 });
          const scale = Math.min(1, MAX_WIDTH / viewport.width);
          const scaledViewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          canvas.width = scaledViewport.width;
          canvas.height = scaledViewport.height;
          const context = canvas.getContext("2d");
          await page.render({ canvasContext: context, viewport: scaledViewport }).promise;
          const dataURL = canvas.toDataURL();

          slides.push({ id: nextId + i, src: dataURL, width: scaledViewport.width, height: scaledViewport.height, yOffset });
          yOffset += scaledViewport.height + 20;
        }

        setPages((prev) => {
          const newPages = [...prev, { id: nextId, slides, lines: [], textBoxes: [] }];
          setCurrentPageIndex(newPages.length - 1);
          return newPages;
        });
        setNextId((prev) => prev + pdf.numPages + 1);
      } else if (file.type.startsWith("image/")) {
        const dataURL = URL.createObjectURL(file);
        setPages((prev) => {
          const newPages = [...prev, { id: nextId, slides: [{ id: nextId, src: dataURL, width: MAX_WIDTH, height: 1000, yOffset: 0 }], lines: [], textBoxes: [] }];
          setCurrentPageIndex(newPages.length - 1);
          return newPages;
        });
        setNextId((prev) => prev + 1);
      }
    }

    e.target.value = '';
  };

  const zoomIn = () => setZoom(prev => Math.min(prev + 0.2, 3));
  const zoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.2));

  const handleSaveWorkspace = async () => {
    if (!userId) return;
    setIsSaving(true);
    setSaveMessage("");
    try {
      await axios.post(`${API_BASE}/api/note-canvas`, {
        userId,
        data: {
          pages,
          nextId,
          currentPageIndex,
        },
      });
      setSaveMessage("Saved");
    } catch (error) {
      console.error("Failed to save note canvas state", error);
      setSaveMessage("Save failed");
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(""), 4000);
    }
  };

  const savePageAsPDF = async () => {
    const stage = stageRefs.current[currentPageIndex];
    if (!stage) return;
    const canvas = await html2canvas(stage.container());
    const dataURL = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [canvas.width, canvas.height] });
    pdf.addImage(dataURL, "PNG", 0, 0, canvas.width, canvas.height);
    pdf.save(`page_${currentPageIndex + 1}.pdf`);
  };

  const containerStyle = { width: "100vw", height: "100vh", overflowY: "auto", backgroundColor: "#f8f8f8" };

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      {/* Pages toolbar */}
      <div style={{ position: "sticky", top: 0, zIndex: 25, backgroundColor: "#ddd", padding: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={addPage}>Add Page</button>
        <button onClick={deletePage}>Delete Page</button>
        <button onClick={savePageAsPDF}>Save Page as PDF</button>
        <button onClick={handleSaveWorkspace} disabled={isSaving || loadingState}>
          {isSaving ? "Saving..." : "Save Workspace"}
        </button>
        {pages.map((p, idx) => (
          <button key={p.id} onClick={() => setCurrentPageIndex(idx)} style={{ fontWeight: idx === currentPageIndex ? "bold" : "normal" }}>
            {idx + 1}
          </button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 12, color: loadError ? "#b91c1c" : "#1f2937" }}>
          {loadingState ? "Loading..." : loadError || saveMessage}
        </span>
      </div>

      {/* Main toolbar */}
      <div style={{ position: "sticky", top: 50, zIndex: 20, backgroundColor: "#eee", padding: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={() => setTool("draw")}>Draw</button>
        <button onClick={() => setTool("highlighter")}>Highlight</button>
        <input type="color" value={drawingColor} onChange={e => setDrawingColor(e.target.value)} />
        <input type="number" min={1} max={50} value={drawingSize} onChange={e => setDrawingSize(Number(e.target.value))} />
        <button onClick={() => setTool("eraser")}>Eraser</button>
        <button onClick={() => setTool("move")}>Move</button>
        <button onClick={() => setAddingText(true)}>Add Text</button>
        <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} />
        <input type="number" min={8} max={100} value={textFontSize} onChange={e => setTextFontSize(Number(e.target.value))} />
        <button onClick={deleteSelected}>Delete Selected</button>
        <input type="file" multiple onChange={handleSlideUpload} />
        <button onClick={zoomIn}>🔍 +</button>
        <button onClick={zoomOut}>🔍 -</button>
      </div>

      {/* Pages */}
      <div style={containerStyle}>
        {pages.map((page, idx) => {
          const stageHeight = page.slides.length
            ? Math.max(...page.slides.map((s) => s.height + s.yOffset + 20), window.innerHeight)
            : window.innerHeight;
          return (
            <div key={page.id} style={{ marginBottom: 50, display: idx === currentPageIndex ? "block" : "none" }}>
            <Stage
              width={window.innerWidth}
              height={stageHeight}
              onMouseDown={() => handleMouseDown(idx)}
              onMouseMove={() => handleMouseMove(idx)}
              onMouseUp={handleMouseUp}
              onClick={(e) => handleStageClick(idx, e)}
              ref={el => { stageRefs.current[idx] = el; }}
              scaleX={zoom}
              scaleY={zoom}
            >
              <Layer>{page.slides.map(slide => <SlideComponent key={slide.id} slide={slide} tool={tool} />)}</Layer>
              <Layer>{page.lines.map(line => <Line key={line.id} points={line.points.flatMap(p => [p.x, p.y])} stroke={line.stroke} strokeWidth={line.strokeWidth} tension={0.5} lineCap="round" />)}</Layer>
              <Layer>{page.textBoxes.map(tb => <EditableText key={tb.id} textData={tb} isSelected={selectedId === tb.id} onSelect={() => setSelectedId(tb.id)} onChange={text => updateTextBox(idx, tb.id, { text })} />)}</Layer>
              {(tool === "draw" || tool === "highlighter" || tool === "eraser") &&
                <Layer><Circle x={cursorPos.x} y={cursorPos.y} radius={drawingSize / 2} stroke={tool === "eraser" ? "#000" : drawingColor} strokeWidth={1} /></Layer>}
            </Stage>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Slide component: loads PDF page/image
function SlideComponent({ slide, tool }) {
  const [img, setImg] = useState(null);

  useEffect(() => {
    const image = new window.Image();
    image.src = slide.src;
    image.onload = () => setImg(image);
  }, [slide.src]);

  if (!img) return null;
  return <Image image={img} x={0} y={slide.yOffset} width={slide.width} height={slide.height} draggable={tool === "move"} />;
}

// Editable text component
function EditableText({ textData, isSelected, onSelect, onChange }) {
  const textRef = useRef(null);
  const autoResizeTextarea = (textarea) => { textarea.style.height = "auto"; textarea.style.height = textarea.scrollHeight + "px"; };

  const handleDblClick = () => {
    const textarea = document.createElement("textarea");
    textarea.value = textData.text;
    textarea.style.position = "absolute";
    textarea.style.top = `${textData.y}px`;
    textarea.style.left = `${textData.x}px`;
    textarea.style.fontSize = `${textData.fontSize}px`;
    textarea.style.padding = "4px";
    textarea.style.border = "1px solid #000";
    textarea.style.background = "white";
    textarea.style.color = textData.fill;
    textarea.style.zIndex = "1000";
    textarea.style.outline = "none";
    textarea.style.resize = "none";

    document.body.appendChild(textarea);
    textarea.focus();
    autoResizeTextarea(textarea);
    textarea.addEventListener("input", () => autoResizeTextarea(textarea));
    textarea.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); textarea.blur(); } });
    textarea.addEventListener("blur", () => { onChange(textarea.value); textarea.remove(); });
  };

  return <Text ref={textRef} x={textData.x} y={textData.y} text={textData.text} fontSize={textData.fontSize} fill={isSelected ? 'blue' : textData.fill} onClick={onSelect} onDblClick={handleDblClick} draggable />;
}
