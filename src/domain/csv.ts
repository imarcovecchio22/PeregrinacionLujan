// CSV mínimo (RFC 4180): comillas, comillas escapadas y saltos de línea dentro de comillas.
// Detecta "," o ";" (Excel en español exporta con ";"). Todo queda como texto.

export function detectarSeparador(texto: string): "," | ";" {
  const lineas = texto.split(/\r?\n/).slice(0, 20).join("\n");
  const fuera = lineas.replace(/"[^"]*"/g, "");
  return (fuera.match(/;/g)?.length ?? 0) > (fuera.match(/,/g)?.length ?? 0) ? ";" : ",";
}

export function parsearCsv(texto: string): string[][] {
  const t = texto.replace(/^﻿/, "");
  const sep = detectarSeparador(t);
  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = "";
  let comillas = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (comillas) {
      if (ch === '"' && t[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (ch === '"') comillas = false;
      else campo += ch;
    } else if (ch === '"') comillas = true;
    else if (ch === sep) {
      fila.push(campo);
      campo = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && t[i + 1] === "\n") i++;
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = "";
    } else campo += ch;
  }
  if (campo !== "" || fila.length > 0) {
    fila.push(campo);
    filas.push(fila);
  }
  return filas;
}
