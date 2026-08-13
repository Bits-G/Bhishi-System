import jsPDF from "jspdf";

const FONT_NAME = "NotoDevanagari";
let fontRegistered = false;

/**
 * Creates a jsPDF document with a Devanagari-capable font (Noto Sans Devanagari)
 * embedded and set as the active font. Use this instead of `new jsPDF()` anywhere
 * a PDF might contain Marathi/Hindi (or any Devanagari-script) text — member names,
 * districts, topics, descriptions, etc. Without this, jsPDF's default font
 * (Helvetica) silently renders Devanagari characters as garbled symbols.
 *
 * The font is dynamically imported so its ~860KB base64 payload is only downloaded
 * by the browser when a PDF is actually generated, not on every page load.
 */
export async function createPdfDoc(): Promise<jsPDF> {
  const doc = new jsPDF();
  const { notoDevanagariBase64 } = await import("./notoDevanagariFont");

  // addFont/addFileToVFS only need to run once per font — but since each call to
  // createPdfDoc() makes a fresh jsPDF instance, each instance needs the font
  // re-registered on itself (jsPDF's font table is per-instance, not global).
  doc.addFileToVFS("NotoSansDevanagari.ttf", notoDevanagariBase64);
  doc.addFont("NotoSansDevanagari.ttf", FONT_NAME, "normal");
  doc.setFont(FONT_NAME);
  fontRegistered = true;

  return doc;
}

export const PDF_FONT_NAME = FONT_NAME;
