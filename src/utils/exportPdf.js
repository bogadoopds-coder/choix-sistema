// ─── EXPORTADOR DE INFORMES PDF: abre ventana imprimible con membrete ───
function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
export function exportarPDF({ titulo, subtitulo = "", contenidoHTML }) {
  const win = window.open("", "_blank");
  if (!win) {
    alert("El navegador bloqueó la ventana. Permití ventanas emergentes para exportar el PDF.");
    return;
  }
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(titulo)}</title>
  <style>
    body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; color: #1a1a1a; margin: 32px; }
    .marca { font-weight: 800; font-size: 13px; letter-spacing: 1px; color: #b8860b; margin-bottom: 14px; }
    h1 { font-size: 20px; margin: 0 0 2px; }
    .sub { color: #666; font-size: 12px; margin-bottom: 18px; }
    h2 { font-size: 14px; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-top: 22px; }
    table { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }
    th, td { border: 1px solid #ccc; padding: 5px 8px; text-align: left; vertical-align: top; }
    th { background: #f2f2f2; }
    p, li { font-size: 12.5px; line-height: 1.5; }
    .alerta { background: #fff6e5; border: 1px solid #e0a800; padding: 8px 10px; border-radius: 4px; font-size: 12px; margin: 8px 0; }
    pre { white-space: pre-wrap; font-family: inherit; font-size: 12.5px; line-height: 1.55; margin: 0; }
    .pie { margin-top: 26px; color: #999; font-size: 10px; border-top: 1px solid #eee; padding-top: 8px; }
    @media print { body { margin: 12mm; } }
  </style></head><body>
  <div class="marca">PRAXIA · Sistema de Gestión</div>
  <h1>${esc(titulo)}</h1>
  <div class="sub">${esc(subtitulo)}</div>
  ${contenidoHTML}
  <div class="pie">Generado por Praxia · ${new Date().toLocaleDateString("es-AR")} · Documento de análisis preliminar — no reemplaza informes profesionales ni prefactibilidades municipales.</div>
  </body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}
export { esc };
