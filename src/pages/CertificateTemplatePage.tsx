import { useState, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Upload, Loader2, AlignLeft, AlignCenter, AlignRight, Minus, Plus } from 'lucide-react';
import type { Align } from '@/lib/certificateGenerator';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

const PREVIEW_PX = 500;

// ── Types ─────────────────────────────────────────────────────────────────────
interface Positions {
  // Front — nombre (auto-fit single line)
  name_x: number; name_y: number;
  name_w: number; name_h: number;
  name_font_size: number; name_align: Align;
  // Front — apellido (auto-fit single line, independent box)
  apellido_x: number; apellido_y: number;
  apellido_w: number; apellido_h: number;
  apellido_font_size: number; apellido_align: Align;
  // Back — DNI (moved from front)
  dni_x: number; dni_y: number; dni_w: number; dni_h: number;
  dni_font_size: number; dni_align: Align; dni_line_spacing: number;
  // Front — QR
  qr_x: number; qr_y: number; qr_size: number;
  // Back — CÓDIGO
  code_x: number; code_y: number; code_w: number; code_h: number;
  code_font_size: number; code_align: Align;
  // Back — ESTATUS
  status_x: number; status_y: number; status_w: number; status_h: number;
  status_font_size: number; status_align: Align;
  // Back — INSTRUCTOR
  instructor_x: number; instructor_y: number; instructor_w: number; instructor_h: number;
  instructor_font_size: number; instructor_align: Align;
  // Back — Inst. ID
  inst_id_x: number; inst_id_y: number; inst_id_w: number; inst_id_h: number;
  inst_id_font_size: number; inst_id_align: Align;
}

// Back-page fields start horizontally centered (x=148 for 300pt wide box on 595pt page)
// and stacked evenly in the center area of the page so the admin can drag them freely.
const BX = 148; // center x for 300pt box on 595pt page
const defaultPositions: Positions = {
  name_x: 97, name_y: 490, name_w: 400, name_h: 50,
  name_font_size: 28, name_align: 'center',
  apellido_x: 97, apellido_y: 440, apellido_w: 400, apellido_h: 50,
  apellido_font_size: 22, apellido_align: 'center',
  // DNI — back page, centered
  dni_x: BX, dni_y: 320, dni_w: 300, dni_h: 30,
  dni_font_size: 16, dni_align: 'center', dni_line_spacing: 1.2,
  qr_x: 460, qr_y: 40, qr_size: 90,
  // Back-page fields — all centered, stacked
  code_x: BX, code_y: 600, code_w: 300, code_h: 30, code_font_size: 16, code_align: 'center',
  status_x: BX, status_y: 520, status_w: 300, status_h: 30, status_font_size: 16, status_align: 'center',
  instructor_x: BX, instructor_y: 440, instructor_w: 300, instructor_h: 30, instructor_font_size: 16, instructor_align: 'center',
  inst_id_x: BX, inst_id_y: 360, inst_id_w: 300, inst_id_h: 30, inst_id_font_size: 16, inst_id_align: 'center',
};

// Front: nombre, apellido and qr
type FieldName    = 'name' | 'apellido' | 'qr';
// Back: DNI + 4 fields
type BackFieldName = 'dni' | 'code' | 'status' | 'instructor' | 'inst_id';
type DragAction   = 'move' | 'nw' | 'ne' | 'sw' | 'se';

interface DragState {
  field: FieldName;
  action: DragAction;
  startMouse: { x: number; y: number };
  snapshot: Positions;
}
interface BackDragState {
  field: BackFieldName;
  action: DragAction;
  startMouse: { x: number; y: number };
  snapshot: Positions;
}

// ── PDF helpers ───────────────────────────────────────────────────────────────
interface PageResult { image: string; width: number; height: number }

async function renderPDFPages(url: string): Promise<{ p1: PageResult; p2: PageResult | null }> {
  const pdf = await pdfjsLib.getDocument({ url }).promise;
  const renderPage = async (num: number): Promise<PageResult> => {
    const page = await pdf.getPage(num);
    const nat  = page.getViewport({ scale: 1 });
    const scale = PREVIEW_PX / nat.width;
    const vp   = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width  = Math.round(vp.width);
    canvas.height = Math.round(vp.height);
    await page.render({ canvasContext: canvas.getContext('2d')!, viewport: vp }).promise;
    return { image: canvas.toDataURL('image/jpeg', 0.92), width: Math.round(nat.width), height: Math.round(nat.height) };
  };
  const p1 = await renderPage(1);
  const p2 = pdf.numPages >= 2 ? await renderPage(2) : null;
  return { p1, p2 };
}

// ── Text simulation (for canvas preview) ─────────────────────────────────────
function measurePts(text: string, size: number, bold: boolean) {
  const c = document.createElement('canvas').getContext('2d')!;
  c.font = `${bold ? 'bold ' : ''}${size}px Helvetica,Arial,sans-serif`;
  return c.measureText(text).width;
}
// Auto-fit: shrink font size until text fits on one line
function fitFontSize(text: string, maxSize: number, maxW: number, bold: boolean): number {
  let size = maxSize;
  while (size > 6 && measurePts(text, size, bold) > maxW) size--;
  return size;
}

// ── Front-page canvas (Nombre + QR) ──────────────────────────────────────────
interface CanvasProps {
  pageW: number; pageH: number;
  pageImage: string | null; rendering: boolean;
  positions: Positions; demoName: string; demoApellido: string;
  selected: FieldName | null; onSelect: (f: FieldName) => void;
  onChange: (p: Positions) => void;
}

function PositionCanvas({ pageW, pageH, pageImage, rendering, positions, demoName, demoApellido, selected, onSelect, onChange }: CanvasProps) {
  const scale = PREVIEW_PX / pageW;
  const H     = Math.round(pageH * scale);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef      = useRef<DragState | null>(null);

  const pdfTopToScreen = (y: number) => (pageH - y) * scale;

  function getScreenBox(f: FieldName) {
    if (f === 'name') return {
      left: positions.name_x * scale,     top: pdfTopToScreen(positions.name_y),
      w: positions.name_w * scale,         h: positions.name_h * scale,
    };
    if (f === 'apellido') return {
      left: positions.apellido_x * scale, top: pdfTopToScreen(positions.apellido_y),
      w: positions.apellido_w * scale,     h: positions.apellido_h * scale,
    };
    // QR: qr_y = bottom-left corner
    return {
      left: positions.qr_x * scale,
      top: (pageH - positions.qr_y - positions.qr_size) * scale,
      w: positions.qr_size * scale, h: positions.qr_size * scale,
    };
  }

  function startDrag(field: FieldName, action: DragAction, e: React.PointerEvent) {
    e.preventDefault(); e.stopPropagation();
    const rect = containerRef.current!.getBoundingClientRect();
    dragRef.current = {
      field, action,
      startMouse: { x: e.clientX - rect.left, y: e.clientY - rect.top },
      snapshot: { ...positions },
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    onSelect(field);
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    const rect = containerRef.current!.getBoundingClientRect();
    const dx = (e.clientX - rect.left - d.startMouse.x) / scale;
    const dy = (e.clientY - rect.top  - d.startMouse.y) / scale;
    const snap = d.snapshot;
    const p = { ...snap };
    const MIN = 20;

    if (d.field === 'qr') {
      if (d.action === 'move') {
        p.qr_x = Math.max(0, snap.qr_x + dx);
        p.qr_y = Math.max(0, snap.qr_y - dy);
      } else if (d.action === 'se') {
        p.qr_size = Math.max(MIN, snap.qr_size + Math.max(dx, dy));
      }
    } else {
      // 'name' or 'apellido' — generic handling via prefix keys
      const xk  = `${d.field}_x`  as keyof Positions;
      const yk  = `${d.field}_y`  as keyof Positions;
      const wk  = `${d.field}_w`  as keyof Positions;
      const hk  = `${d.field}_h`  as keyof Positions;
      const sx = snap[xk] as number, sy = snap[yk] as number;
      const sw = snap[wk] as number, sh = snap[hk] as number;
      if (d.action === 'move') {
        (p as any)[xk] = Math.max(0, sx + dx);
        (p as any)[yk] = Math.max(0, sy - dy);
      } else if (d.action === 'se') {
        (p as any)[wk] = Math.max(MIN, sw + dx);
        (p as any)[hk] = Math.max(MIN, sh + dy);
      } else if (d.action === 'sw') {
        const nW = Math.max(MIN, sw - dx);
        (p as any)[xk] = sx + sw - nW; (p as any)[wk] = nW;
        (p as any)[hk] = Math.max(MIN, sh + dy);
      } else if (d.action === 'ne') {
        (p as any)[wk] = Math.max(MIN, sw + dx);
        const nH = Math.max(MIN, sh + dy);
        (p as any)[yk] = sy - (nH - sh); (p as any)[hk] = nH;
      } else if (d.action === 'nw') {
        const nW = Math.max(MIN, sw - dx);
        (p as any)[xk] = sx + sw - nW; (p as any)[wk] = nW;
        const nH = Math.max(MIN, sh + dy);
        (p as any)[yk] = sy - (nH - sh); (p as any)[hk] = nH;
      }
    }
    onChange(p);
  }

  function onPointerUp() { dragRef.current = null; }

  function renderNameBox() {
    const box     = getScreenBox('name');
    const isSel   = selected === 'name';
    const text    = demoName || 'Nombre destinatario';
    const fitted  = fitFontSize(text, positions.name_font_size, positions.name_w, true);
    const handles: DragAction[] = ['nw', 'ne', 'sw', 'se'];

    return (
      <div
        className={`absolute border-2 border-blue-500 ${isSel ? 'ring-2 ring-offset-0 ring-primary/50' : ''} bg-blue-500/10 cursor-grab overflow-hidden flex flex-col items-center justify-center`}
        style={{ left: box.left, top: box.top, width: box.w, height: box.h }}
        onPointerDown={(e) => startDrag('name', 'move', e)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <span className="absolute top-0.5 left-1 text-[9px] font-bold uppercase tracking-wide text-blue-700 opacity-70 select-none">
          Nombre
        </span>
        <div className="w-full px-1 mt-3 overflow-hidden select-none pointer-events-none">
          <div className="leading-none font-bold truncate text-blue-700"
            style={{ fontSize: fitted * scale, textAlign: positions.name_align }}>
            {text}
          </div>
        </div>
        {handles.map(handle => {
          const pos: Record<string, string | number> = {};
          if (handle.includes('n')) pos.top = -4; else pos.bottom = -4;
          if (handle.includes('w')) pos.left = -4; else pos.right = -4;
          return (
            <div key={handle}
              className="absolute w-3 h-3 rounded-sm border-2 bg-white border-blue-500"
              style={{ ...pos, cursor: `${handle}-resize`, zIndex: 10 }}
              onPointerDown={(e) => startDrag('name', handle, e)}
            />
          );
        })}
      </div>
    );
  }

  function renderApellidoBox() {
    const box    = getScreenBox('apellido');
    const isSel  = selected === 'apellido';
    const text   = demoApellido || 'Apellidos';
    const fitted = fitFontSize(text, positions.apellido_font_size, positions.apellido_w, true);
    const handles: DragAction[] = ['nw', 'ne', 'sw', 'se'];

    return (
      <div
        className={`absolute border-2 border-indigo-500 ${isSel ? 'ring-2 ring-offset-0 ring-primary/50' : ''} bg-indigo-500/10 cursor-grab overflow-hidden flex flex-col items-center justify-center`}
        style={{ left: box.left, top: box.top, width: box.w, height: box.h }}
        onPointerDown={(e) => startDrag('apellido', 'move', e)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <span className="absolute top-0.5 left-1 text-[9px] font-bold uppercase tracking-wide text-indigo-700 opacity-70 select-none">
          Apellido
        </span>
        <div className="w-full px-1 mt-3 overflow-hidden select-none pointer-events-none">
          <div className="leading-none font-bold truncate text-indigo-700"
            style={{ fontSize: fitted * scale, textAlign: positions.apellido_align }}>
            {text}
          </div>
        </div>
        {handles.map(handle => {
          const pos: Record<string, string | number> = {};
          if (handle.includes('n')) pos.top = -4; else pos.bottom = -4;
          if (handle.includes('w')) pos.left = -4; else pos.right = -4;
          return (
            <div key={handle}
              className="absolute w-3 h-3 rounded-sm border-2 bg-white border-indigo-500"
              style={{ ...pos, cursor: `${handle}-resize`, zIndex: 10 }}
              onPointerDown={(e) => startDrag('apellido', handle, e)}
            />
          );
        })}
      </div>
    );
  }

  function renderQrBox() {
    const box   = getScreenBox('qr');
    const isSel = selected === 'qr';
    return (
      <div
        className={`absolute border-2 border-purple-500 ${isSel ? 'ring-2 ring-offset-0 ring-primary/50' : ''} bg-purple-500/10 cursor-grab flex items-center justify-center`}
        style={{ left: box.left, top: box.top, width: box.w, height: box.h }}
        onPointerDown={(e) => startDrag('qr', 'move', e)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <span className="absolute top-0.5 left-1 text-[9px] font-bold uppercase tracking-wide text-purple-700 opacity-70 select-none">QR</span>
        <span className="text-purple-700 font-bold text-xs select-none pointer-events-none">QR</span>
        <div
          className="absolute w-3 h-3 rounded-sm border-2 bg-white border-purple-500"
          style={{ bottom: -4, right: -4, cursor: 'se-resize', zIndex: 10 }}
          onPointerDown={(e) => startDrag('qr', 'se', e)}
        />
      </div>
    );
  }

  return (
    <div ref={containerRef}
      className="relative border rounded-lg overflow-hidden shadow-sm mx-auto bg-white select-none"
      style={{ width: PREVIEW_PX, height: H }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {pageImage && (
        <img src={pageImage} alt="PDF p.1" draggable={false}
          className="absolute inset-0 w-full h-full object-fill pointer-events-none" />
      )}
      {rendering && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {!pageImage && !rendering && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-xs text-muted-foreground">Sube un PDF para ver la vista previa</p>
        </div>
      )}
      {renderNameBox()}
      {renderApellidoBox()}
      {renderQrBox()}
      <span className="absolute bottom-1 right-1.5 text-[9px] text-black/25 pointer-events-none">
        Hoja 1 · {pageW}×{pageH} pts
      </span>
    </div>
  );
}

// ── Front-page field controls (name / apellido / qr) ─────────────────────────
function FieldControls({ field, positions, onChange }: {
  field: FieldName; positions: Positions; onChange: (p: Positions) => void;
}) {
  if (field === 'qr') {
    return (
      <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-700">
        Arrastra el cuadro QR para moverlo · Arrastra la esquina SE para redimensionarlo.
      </div>
    );
  }

  const isApellido = field === 'apellido';
  const label      = isApellido ? 'Apellido' : 'Nombre';
  const sizeKey    = isApellido ? 'apellido_font_size' : 'name_font_size';
  const alignKey   = isApellido ? 'apellido_align'     : 'name_align';
  const sizeVal    = positions[sizeKey] as number;
  const colorCls   = isApellido
    ? { wrap: 'bg-indigo-50 border-indigo-200', title: 'text-indigo-800', hint: 'text-indigo-600' }
    : { wrap: 'bg-blue-50 border-blue-200',     title: 'text-blue-800',   hint: 'text-blue-600'   };

  const ALIGNS: { v: Align; Icon: typeof AlignLeft }[] = [
    { v: 'left', Icon: AlignLeft }, { v: 'center', Icon: AlignCenter }, { v: 'right', Icon: AlignRight },
  ];

  return (
    <div className={`p-3 border rounded-lg space-y-3 ${colorCls.wrap}`}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${colorCls.title}`}>{label} — propiedades de texto</p>
      <p className={`text-[10px] leading-snug ${colorCls.hint}`}>
        Siempre ocupa <strong>una sola línea</strong>. La fuente se reduce automáticamente para caber en el ancho. El tamaño es el <strong>máximo</strong>.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Tamaño máximo</Label>
          <div className="flex items-center gap-1">
            <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0"
              onClick={() => onChange({ ...positions, [sizeKey]: Math.max(6, sizeVal - 1) })}>
              <Minus className="h-3 w-3" />
            </Button>
            <Input type="number" value={sizeVal} className="text-center px-1 h-8"
              onChange={(e) => onChange({ ...positions, [sizeKey]: Number(e.target.value) })} />
            <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0"
              onClick={() => onChange({ ...positions, [sizeKey]: sizeVal + 1 })}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Alineación</Label>
          <div className="flex rounded-md border overflow-hidden h-8">
            {ALIGNS.map(({ v, Icon }) => (
              <button key={v} type="button" onClick={() => onChange({ ...positions, [alignKey]: v })}
                className={`flex-1 flex items-center justify-center transition-colors ${
                  positions[alignKey] === v ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'
                }`}>
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Back-page canvas (DNI · CÓDIGO · ESTATUS · INSTRUCTOR · Inst. ID) ─────────
const BACK_META: Record<BackFieldName, {
  label: string;
  border: string; bg: string; text: string;
  barColor: string;
  ctrl: string; ctrlBorder: string; ctrlLabel: string;
}> = {
  dni:        { label: 'DNI',        border: 'border-green-500',  bg: 'bg-green-500/10',  text: 'text-green-700',  barColor: '#22c55e', ctrl: 'bg-green-50',  ctrlBorder: 'border-green-200',  ctrlLabel: 'text-green-800'  },
  code:       { label: 'CÓDIGO',     border: 'border-red-500',    bg: 'bg-red-500/10',    text: 'text-red-700',    barColor: '#ef4444', ctrl: 'bg-red-50',    ctrlBorder: 'border-red-200',    ctrlLabel: 'text-red-800'    },
  status:     { label: 'ESTATUS',    border: 'border-orange-500', bg: 'bg-orange-500/10', text: 'text-orange-700', barColor: '#f97316', ctrl: 'bg-orange-50', ctrlBorder: 'border-orange-200', ctrlLabel: 'text-orange-800' },
  instructor: { label: 'INSTRUCTOR', border: 'border-teal-500',   bg: 'bg-teal-500/10',   text: 'text-teal-700',   barColor: '#14b8a6', ctrl: 'bg-teal-50',   ctrlBorder: 'border-teal-200',   ctrlLabel: 'text-teal-800'   },
  inst_id:    { label: 'Inst. ID',   border: 'border-amber-500',  bg: 'bg-amber-500/10',  text: 'text-amber-700',  barColor: '#f59e0b', ctrl: 'bg-amber-50',  ctrlBorder: 'border-amber-200',  ctrlLabel: 'text-amber-800'  },
};
const BACK_FIELDS: BackFieldName[] = ['dni', 'code', 'status', 'instructor', 'inst_id'];

interface BackCanvasProps {
  pageW: number; pageH: number;
  pageImage: string | null; rendering: boolean;
  positions: Positions;
  selected: BackFieldName | null; onSelect: (f: BackFieldName) => void;
  onChange: (p: Positions) => void;
}

function BackPageCanvas({ pageW, pageH, pageImage, rendering, positions, selected, onSelect, onChange }: BackCanvasProps) {
  const scale        = PREVIEW_PX / pageW;
  const H            = Math.round(pageH * scale);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef      = useRef<BackDragState | null>(null);

  const pdfTopToScreen = (y: number) => (pageH - y) * scale;

  function getBox(f: BackFieldName) {
    return {
      left: (positions as any)[`${f}_x`] * scale,
      top:  pdfTopToScreen((positions as any)[`${f}_y`]),
      w:    (positions as any)[`${f}_w`] * scale,
      h:    (positions as any)[`${f}_h`] * scale,
    };
  }

  function startDrag(field: BackFieldName, action: DragAction, e: React.PointerEvent) {
    e.preventDefault(); e.stopPropagation();
    const rect = containerRef.current!.getBoundingClientRect();
    dragRef.current = {
      field, action,
      startMouse: { x: e.clientX - rect.left, y: e.clientY - rect.top },
      snapshot: { ...positions },
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    onSelect(field);
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    const rect = containerRef.current!.getBoundingClientRect();
    const dx  = (e.clientX - rect.left - d.startMouse.x) / scale;
    const dy  = (e.clientY - rect.top  - d.startMouse.y) / scale;
    const p   = { ...d.snapshot } as any;
    const f   = d.field;
    const MIN = 20;
    const xk = `${f}_x`, yk = `${f}_y`, wk = `${f}_w`, hk = `${f}_h`;
    const sx = d.snapshot[xk as keyof Positions] as number;
    const sy = d.snapshot[yk as keyof Positions] as number;
    const sw = d.snapshot[wk as keyof Positions] as number;
    const sh = d.snapshot[hk as keyof Positions] as number;

    if (d.action === 'move') {
      p[xk] = Math.max(0, sx + dx); p[yk] = Math.max(0, sy - dy);
    } else if (d.action === 'se') {
      p[wk] = Math.max(MIN, sw + dx); p[hk] = Math.max(MIN, sh + dy);
    } else if (d.action === 'sw') {
      const nW = Math.max(MIN, sw - dx);
      p[xk] = sx + sw - nW; p[wk] = nW; p[hk] = Math.max(MIN, sh + dy);
    } else if (d.action === 'ne') {
      p[wk] = Math.max(MIN, sw + dx);
      const nH = Math.max(MIN, sh + dy);
      p[yk] = sy - (nH - sh); p[hk] = nH;
    } else if (d.action === 'nw') {
      const nW = Math.max(MIN, sw - dx);
      p[xk] = sx + sw - nW; p[wk] = nW;
      const nH = Math.max(MIN, sh + dy);
      p[yk] = sy - (nH - sh); p[hk] = nH;
    }
    onChange(p as Positions);
  }

  function onPointerUp() { dragRef.current = null; }

  function renderBox(field: BackFieldName) {
    const box   = getBox(field);
    const meta  = BACK_META[field];
    const isSel = selected === field;
    const align = (positions as any)[`${field}_align`] as Align;

    // Placeholder bar width & alignment
    const barW = align === 'center' ? '55%' : align === 'right' ? '45%' : '65%';
    const barML = align === 'center' ? 'auto' : align === 'right' ? 'auto' : '0';
    const barMR = align === 'center' ? 'auto' : '0';

    return (
      <div key={field}
        className={`absolute border-2 ${meta.border} ${isSel ? 'ring-2 ring-offset-0 ring-primary/50' : ''} ${meta.bg} cursor-grab overflow-hidden`}
        style={{ left: box.left, top: box.top, width: box.w, height: box.h }}
        onPointerDown={(e) => startDrag(field, 'move', e)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* Field name tag — omitted for DNI (label already in the template) */}
        {field !== 'dni' && (
          <span className={`absolute top-0.5 left-1 text-[9px] font-bold uppercase tracking-wide ${meta.text} opacity-80 select-none`}>
            {meta.label}
          </span>
        )}

        {/* Visual placeholder bar (no repeated text) */}
        <div className="absolute inset-0 flex items-center px-2" style={{ paddingTop: 10 }}>
          <div className="h-1 rounded-full opacity-35"
            style={{ backgroundColor: meta.barColor, width: barW, marginLeft: barML, marginRight: barMR }} />
        </div>

        {/* Resize handles */}
        {(['nw', 'ne', 'sw', 'se'] as DragAction[]).map(handle => {
          const pos: Record<string, string | number> = {};
          if (handle.includes('n')) pos.top = -4; else pos.bottom = -4;
          if (handle.includes('w')) pos.left = -4; else pos.right = -4;
          return (
            <div key={handle}
              className={`absolute w-3 h-3 rounded-sm border-2 bg-white ${meta.border}`}
              style={{ ...pos, cursor: `${handle}-resize`, zIndex: 10 }}
              onPointerDown={(e) => startDrag(field, handle, e)}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div ref={containerRef}
      className="relative border rounded-lg overflow-hidden shadow-sm mx-auto bg-white select-none"
      style={{ width: PREVIEW_PX, height: H }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {pageImage && (
        <img src={pageImage} alt="PDF p.2" draggable={false}
          className="absolute inset-0 w-full h-full object-fill pointer-events-none" />
      )}
      {rendering && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {!pageImage && !rendering && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-xs text-muted-foreground text-center px-8">
            Sube un PDF de 2 páginas para ver la vista previa de la hoja trasera
          </p>
        </div>
      )}
      {BACK_FIELDS.map(renderBox)}
      <span className="absolute bottom-1 right-1.5 text-[9px] text-black/25 pointer-events-none">
        Hoja 2 · {pageW}×{pageH} pts
      </span>
    </div>
  );
}

// ── Back-page field controls ──────────────────────────────────────────────────
function BackFieldControls({ field, positions, onChange }: {
  field: BackFieldName; positions: Positions; onChange: (p: Positions) => void;
}) {
  const meta    = BACK_META[field];
  const sizeKey  = `${field}_font_size` as keyof Positions;
  const alignKey = `${field}_align`     as keyof Positions;
  const sizeVal  = positions[sizeKey] as number;

  const ALIGNS: { v: Align; Icon: typeof AlignLeft }[] = [
    { v: 'left', Icon: AlignLeft }, { v: 'center', Icon: AlignCenter }, { v: 'right', Icon: AlignRight },
  ];

  return (
    <div className={`p-3 border rounded-lg space-y-3 ${meta.ctrl} ${meta.ctrlBorder}`}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${meta.ctrlLabel}`}>
        {meta.label} — propiedades de texto
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Tamaño</Label>
          <div className="flex items-center gap-1">
            <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0"
              onClick={() => onChange({ ...positions, [sizeKey]: Math.max(6, sizeVal - 1) })}>
              <Minus className="h-3 w-3" />
            </Button>
            <Input type="number" value={sizeVal} className="text-center px-1 h-8"
              onChange={(e) => onChange({ ...positions, [sizeKey]: Number(e.target.value) })} />
            <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0"
              onClick={() => onChange({ ...positions, [sizeKey]: sizeVal + 1 })}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Alineación</Label>
          <div className="flex rounded-md border overflow-hidden h-8">
            {ALIGNS.map(({ v, Icon }) => (
              <button key={v} type="button" onClick={() => onChange({ ...positions, [alignKey]: v })}
                className={`flex-1 flex items-center justify-center transition-colors ${
                  positions[alignKey] === v ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'
                }`}>
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
const CertificateTemplatePage = () => {
  const { id } = useParams();
  const isNew  = id === 'nuevo';
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [templateName, setTemplateName] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfStoredUrl, setPdfStoredUrl] = useState('');
  const [page1, setPage1] = useState<PageResult | null>(null);
  const [page2, setPage2] = useState<PageResult | null>(null);
  const [renderingPdf, setRenderingPdf] = useState(false);
  const [positions, setPositions] = useState<Positions>(defaultPositions);
  const [demoName, setDemoName] = useState('');
  const [demoApellido, setDemoApellido] = useState('');
  const [selected, setSelected] = useState<FieldName>('name');
  const [selectedBack, setSelectedBack] = useState<BackFieldName>('code');
  const [uploading, setUploading] = useState(false);

  const pageW  = page1?.width  ?? 595;
  const pageH  = page1?.height ?? 842;
  const back2W = page2?.width  ?? pageW;
  const back2H = page2?.height ?? pageH;

  async function loadPages(url: string) {
    setRenderingPdf(true); setPage1(null); setPage2(null);
    try {
      const { p1, p2 } = await renderPDFPages(url);
      setPage1(p1); setPage2(p2);
    } catch { toast.error('No se pudo renderizar la vista previa'); }
    finally { setRenderingPdf(false); }
  }

  useQuery({
    queryKey: ['certificate_template_edit', id],
    enabled: !isNew,
    queryFn: async () => {
      const { data, error } = await supabase.schema('chatbot_redcuore')
        .from('certificate_templates').select('*').eq('id', id).single();
      if (error) throw error;

      setTemplateName(data.name);
      setPdfStoredUrl(data.pdf_url);
      setPositions({
        name_x: data.name_x, name_y: data.name_y,
        name_w: data.name_w ?? 400, name_h: data.name_h ?? 50,
        name_font_size: data.name_font_size,
        name_align: (data.name_align ?? 'center') as Align,
        apellido_x: (data as any).apellido_x ?? 97, apellido_y: (data as any).apellido_y ?? 440,
        apellido_w: (data as any).apellido_w ?? 400, apellido_h: (data as any).apellido_h ?? 50,
        apellido_font_size: (data as any).apellido_font_size ?? 22,
        apellido_align: ((data as any).apellido_align ?? 'center') as Align,
        dni_x: data.dni_x, dni_y: data.dni_y,
        dni_w: data.dni_w ?? 300, dni_h: data.dni_h ?? 30,
        dni_font_size: data.dni_font_size,
        dni_align: (data.dni_align ?? 'center') as Align,
        dni_line_spacing: data.dni_line_spacing ?? 1.2,
        qr_x: data.qr_x, qr_y: data.qr_y, qr_size: data.qr_size,
        code_x: (data as any).code_x ?? BX, code_y: (data as any).code_y ?? 600,
        code_w: (data as any).code_w ?? 300, code_h: (data as any).code_h ?? 30,
        code_font_size: (data as any).code_font_size ?? 16,
        code_align: ((data as any).code_align ?? 'center') as Align,
        status_x: (data as any).status_x ?? BX, status_y: (data as any).status_y ?? 520,
        status_w: (data as any).status_w ?? 300, status_h: (data as any).status_h ?? 30,
        status_font_size: (data as any).status_font_size ?? 16,
        status_align: ((data as any).status_align ?? 'center') as Align,
        instructor_x: (data as any).instructor_x ?? BX, instructor_y: (data as any).instructor_y ?? 440,
        instructor_w: (data as any).instructor_w ?? 300, instructor_h: (data as any).instructor_h ?? 30,
        instructor_font_size: (data as any).instructor_font_size ?? 16,
        instructor_align: ((data as any).instructor_align ?? 'center') as Align,
        inst_id_x: (data as any).inst_id_x ?? BX, inst_id_y: (data as any).inst_id_y ?? 360,
        inst_id_w: (data as any).inst_id_w ?? 300, inst_id_h: (data as any).inst_id_h ?? 30,
        inst_id_font_size: (data as any).inst_id_font_size ?? 16,
        inst_id_align: ((data as any).inst_id_align ?? 'center') as Align,
      });

      await loadPages(data.pdf_url);
      return data;
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') { toast.error('Selecciona un PDF'); return; }
    setPdfFile(file);
    await loadPages(URL.createObjectURL(file));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!templateName.trim()) throw new Error('El nombre es requerido');
      let finalPdfUrl = pdfStoredUrl;

      if (pdfFile) {
        setUploading(true);
        const filePath = `${user!.id}/${crypto.randomUUID()}.pdf`;
        const { error: upErr } = await supabase.storage
          .from('certificate-templates').upload(filePath, pdfFile, { contentType: 'application/pdf' });
        setUploading(false);
        if (upErr) throw new Error('Error al subir el PDF: ' + upErr.message);
        finalPdfUrl = supabase.storage.from('certificate-templates').getPublicUrl(filePath).data.publicUrl;
      }
      if (!finalPdfUrl) throw new Error('Debes subir un PDF base');

      const { error } = await supabase.schema('chatbot_redcuore').rpc('upsert_certificate_template', {
        p_id: isNew ? null : id,
        p_user_id: user!.id,
        p_name: templateName.trim(),
        p_pdf_url: finalPdfUrl,
        p_name_x: positions.name_x, p_name_y: positions.name_y, p_name_y2: positions.name_y,
        p_name_w: positions.name_w, p_name_h: positions.name_h,
        p_name_font_size: positions.name_font_size,
        p_name_align: positions.name_align,
        p_name_line_spacing: 1.3,
        p_apellido_x: positions.apellido_x, p_apellido_y: positions.apellido_y,
        p_apellido_w: positions.apellido_w, p_apellido_h: positions.apellido_h,
        p_apellido_font_size: positions.apellido_font_size,
        p_apellido_align: positions.apellido_align,
        p_dni_x: positions.dni_x, p_dni_y: positions.dni_y,
        p_dni_w: positions.dni_w, p_dni_h: positions.dni_h,
        p_dni_font_size: positions.dni_font_size,
        p_dni_align: positions.dni_align,
        p_dni_line_spacing: positions.dni_line_spacing,
        p_qr_x: positions.qr_x, p_qr_y: positions.qr_y, p_qr_size: positions.qr_size,
        p_code_x: positions.code_x, p_code_y: positions.code_y,
        p_code_w: positions.code_w, p_code_h: positions.code_h,
        p_code_font_size: positions.code_font_size, p_code_align: positions.code_align,
        p_status_x: positions.status_x, p_status_y: positions.status_y,
        p_status_w: positions.status_w, p_status_h: positions.status_h,
        p_status_font_size: positions.status_font_size, p_status_align: positions.status_align,
        p_instructor_x: positions.instructor_x, p_instructor_y: positions.instructor_y,
        p_instructor_w: positions.instructor_w, p_instructor_h: positions.instructor_h,
        p_instructor_font_size: positions.instructor_font_size, p_instructor_align: positions.instructor_align,
        p_inst_id_x: positions.inst_id_x, p_inst_id_y: positions.inst_id_y,
        p_inst_id_w: positions.inst_id_w, p_inst_id_h: positions.inst_id_h,
        p_inst_id_font_size: positions.inst_id_font_size, p_inst_id_align: positions.inst_id_align,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificate_templates'] });
      toast.success(isNew ? 'Plantilla creada' : 'Plantilla actualizada');
      navigate('/admin/certificaciones');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <AdminLayout>
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin/certificaciones"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="text-2xl font-bold">{isNew ? 'Nueva Plantilla' : 'Editar Plantilla'}</h1>
        </div>

        {/* General info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Información general</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nombre de la plantilla</Label>
              <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Ej: Certificado de Participación" />
            </div>
            <div
              className="border-2 border-dashed rounded-lg p-5 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-7 w-7 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {pdfFile ? pdfFile.name : pdfStoredUrl ? 'Clic para reemplazar el PDF' : 'Clic para subir tu PDF base (2 páginas)'}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Guarda tu Word como PDF antes de subir · La 2ª página es la hoja trasera
              </p>
              {page1 && (
                <p className="text-xs text-primary mt-1 font-medium">
                  {page1.width}×{page1.height} pts · {page2 ? '2 páginas ✓' : '1 página (se necesitan 2)'}
                </p>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
          </CardContent>
        </Card>

        {/* Hoja 1 — Frente */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hoja 1 — Frente</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Solo contiene el <strong>Nombre</strong> y el <strong>QR</strong> · El nombre siempre cabe en una línea; la fuente se achica automáticamente si es necesario
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-muted/40 rounded-lg space-y-2">
              <Label className="text-xs font-medium">Datos de prueba</Label>
              <Input value={demoName} onChange={(e) => setDemoName(e.target.value)}
                placeholder="María Alejandra" className="h-8 text-sm" />
              <Input value={demoApellido} onChange={(e) => setDemoApellido(e.target.value)}
                placeholder="Rodríguez Torres" className="h-8 text-sm" />
            </div>

            <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
              {([
                ['name',     'Nombre',   'bg-blue-500'],
                ['apellido', 'Apellido', 'bg-indigo-500'],
                ['qr',       'QR',       'bg-purple-500'],
              ] as const).map(([f, label, dot]) => (
                <button key={f} type="button" onClick={() => setSelected(f as FieldName)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${selected === f ? 'bg-muted font-medium' : ''}`}>
                  <span className={`w-2.5 h-2.5 rounded-sm ${dot}`} />
                  {label}
                </button>
              ))}
            </div>

            <PositionCanvas
              pageW={pageW} pageH={pageH}
              pageImage={page1?.image ?? null} rendering={renderingPdf}
              positions={positions} demoName={demoName} demoApellido={demoApellido}
              selected={selected} onSelect={setSelected} onChange={setPositions}
            />
            <FieldControls field={selected} positions={positions} onChange={setPositions} />
          </CardContent>
        </Card>

        {/* Hoja 2 — Trasera */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hoja 2 — Trasera</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Todos los campos inician centrados · Arrastra cada cuadro a su posición definitiva
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 flex-wrap text-xs text-muted-foreground">
              {BACK_FIELDS.map(f => {
                const meta = BACK_META[f];
                const dotColor = f === 'dni' ? 'bg-green-500' : f === 'code' ? 'bg-red-500' :
                  f === 'status' ? 'bg-orange-500' : f === 'instructor' ? 'bg-teal-500' : 'bg-amber-500';
                return (
                  <button key={f} type="button" onClick={() => setSelectedBack(f)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${selectedBack === f ? 'bg-muted font-medium' : ''}`}>
                    <span className={`w-2.5 h-2.5 rounded-sm ${dotColor}`} />
                    {meta.label}
                  </button>
                );
              })}
            </div>

            <BackPageCanvas
              pageW={back2W} pageH={back2H}
              pageImage={page2?.image ?? null} rendering={renderingPdf}
              positions={positions}
              selected={selectedBack} onSelect={setSelectedBack} onChange={setPositions}
            />
            <BackFieldControls field={selectedBack} positions={positions} onChange={setPositions} />
          </CardContent>
        </Card>

        <Button onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || uploading} className="w-full" size="lg">
          {saveMutation.isPending || uploading ? 'Guardando...' : isNew ? 'Crear Plantilla' : 'Guardar Cambios'}
        </Button>
      </div>
    </AdminLayout>
  );
};

export default CertificateTemplatePage;
