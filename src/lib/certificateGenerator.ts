import { PDFDocument, PDFFont, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';

export type Align = 'left' | 'center' | 'right';

export interface TemplatePositions {
  // Front — nombre (auto-fit single line)
  name_x: number; name_y: number;
  name_w: number; name_h: number;
  name_font_size: number; name_align: Align;
  // Front — apellido (auto-fit single line, independent box)
  apellido_x: number; apellido_y: number;
  apellido_w: number; apellido_h: number;
  apellido_font_size: number; apellido_align: Align;
  // Front — DNI
  dni_x: number; dni_y: number; dni_w: number; dni_h: number;
  dni_font_size: number; dni_align: Align; dni_line_spacing: number;
  // Front — QR (x/y = bottom-left corner, pdf-lib convention)
  qr_x: number; qr_y: number; qr_size: number;
  // Back page — positioned fields
  code_x: number; code_y: number; code_w: number; code_font_size: number; code_align: Align;
  status_x: number; status_y: number; status_w: number; status_font_size: number; status_align: Align;
  instructor_x: number; instructor_y: number; instructor_w: number; instructor_font_size: number; instructor_align: Align;
  inst_id_x: number; inst_id_y: number; inst_id_w: number; inst_id_font_size: number; inst_id_align: Align;
}

export interface BackPageData {
  code: string;
  status: string;
  instructor: string;
  inst_id: string;
}

// Word-wrap text to fit within boxW using pdf-lib font metrics
function wrapText(text: string, font: PDFFont, size: number, boxW: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) > boxW && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// Draw text inside a bounding box (yTop = top of box, measured from page bottom)
function drawTextInBox(
  page: ReturnType<PDFDocument['getPages']>[number],
  text: string, font: PDFFont,
  fontSize: number, x: number, yTop: number, boxW: number,
  align: Align, lineSpacing: number
) {
  const lines = wrapText(text, font, fontSize, boxW);
  const lineHeight = fontSize * lineSpacing;

  lines.forEach((line, i) => {
    const baseline = yTop - fontSize - i * lineHeight;
    const lineW = font.widthOfTextAtSize(line, fontSize);
    let drawX = x;
    if (align === 'center') drawX = x + (boxW - lineW) / 2;
    else if (align === 'right') drawX = x + boxW - lineW;
    page.drawText(line, { x: drawX, y: baseline, size: fontSize, font, color: rgb(0, 0, 0) });
  });
}

export async function generateCertificatePDF(
  pdfUrl: string,
  pos: TemplatePositions,
  recipientNombre: string,
  recipientApellido: string,
  dni: string,
  certificateId: string,
  back?: BackPageData
): Promise<Uint8Array> {
  const response = await fetch(pdfUrl);
  if (!response.ok) throw new Error('No se pudo cargar la plantilla PDF');
  const pdfBytes = await response.arrayBuffer();

  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const frontPage = pages[0];
  const backPage = pages.length > 1 ? pages[1] : null;

  const boldFont    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // ── QR ──────────────────────────────────────────────────────────────────────
  const verifyUrl  = `${window.location.origin}/verify/${certificateId}`;
  const qrDataUrl  = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 256 });
  const qrBase64   = qrDataUrl.replace('data:image/png;base64,', '');
  const qrBytes    = Uint8Array.from(atob(qrBase64), (c) => c.charCodeAt(0));
  const qrImage    = await pdfDoc.embedPng(qrBytes);

  // Helper: auto-fit a single line inside boxW, returns { size, drawX }
  function autoFit(text: string, font: PDFFont, maxSize: number, boxX: number, boxW: number, align: Align) {
    let size = maxSize;
    while (size > 6 && font.widthOfTextAtSize(text, size) > boxW) size--;
    const tw = font.widthOfTextAtSize(text, size);
    let drawX = boxX;
    if (align === 'center') drawX = boxX + (boxW - tw) / 2;
    else if (align === 'right') drawX = boxX + boxW - tw;
    return { size, drawX };
  }

  // ── Front page: nombre ───────────────────────────────────────────────────────
  if (recipientNombre) {
    const { size: ns, drawX: nx } = autoFit(recipientNombre, boldFont, pos.name_font_size, pos.name_x, pos.name_w, pos.name_align);
    frontPage.drawText(recipientNombre, { x: nx, y: pos.name_y, size: ns, font: boldFont, color: rgb(0, 0, 0) });
  }

  // ── Front page: apellido ─────────────────────────────────────────────────────
  if (recipientApellido) {
    const { size: as_, drawX: ax } = autoFit(recipientApellido, boldFont, pos.apellido_font_size, pos.apellido_x, pos.apellido_w, pos.apellido_align);
    frontPage.drawText(recipientApellido, { x: ax, y: pos.apellido_y, size: as_, font: boldFont, color: rgb(0, 0, 0) });
  }

  // ── Front page: QR (bottom-left corner) ─────────────────────────────────────
  frontPage.drawImage(qrImage, { x: pos.qr_x, y: pos.qr_y, width: pos.qr_size, height: pos.qr_size });

  // ── Back page: DNI · CÓDIGO · ESTATUS · INSTRUCTOR · Inst. ID ───────────────
  if (backPage) {
    // DNI always goes on the back page (no prefix — label already in the template)
    drawTextInBox(backPage, dni, regularFont,
      pos.dni_font_size, pos.dni_x, pos.dni_y, pos.dni_w,
      pos.dni_align, pos.dni_line_spacing);

    if (back) {
      const LS = 1.2;
      drawTextInBox(backPage, back.code,       regularFont, pos.code_font_size,       pos.code_x,       pos.code_y,       pos.code_w,       pos.code_align,       LS);
      drawTextInBox(backPage, back.status,     regularFont, pos.status_font_size,     pos.status_x,     pos.status_y,     pos.status_w,     pos.status_align,     LS);
      drawTextInBox(backPage, back.instructor, regularFont, pos.instructor_font_size, pos.instructor_x, pos.instructor_y, pos.instructor_w, pos.instructor_align, LS);
      drawTextInBox(backPage, back.inst_id,    regularFont, pos.inst_id_font_size,    pos.inst_id_x,    pos.inst_id_y,    pos.inst_id_w,    pos.inst_id_align,    LS);
    }
  }

  return pdfDoc.save();
}

export function downloadPDF(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}
