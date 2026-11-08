/**
 * Interpreta el subconjunto de Markdown que usa el aviso de privacidad (títulos `#`,
 * listas `- ` y negritas `**…**`) en bloques que la vista pinta con plantillas, sin
 * insertar HTML (evita inyección de código). TypeScript puro.
 */

export interface SegmentoTexto {
  readonly texto: string;
  readonly negrita: boolean;
}

export type BloqueTexto =
  | { readonly tipo: 'titulo'; readonly nivel: number; readonly segmentos: readonly SegmentoTexto[] }
  | { readonly tipo: 'parrafo'; readonly segmentos: readonly SegmentoTexto[] }
  | { readonly tipo: 'lista'; readonly elementos: readonly (readonly SegmentoTexto[])[] };

const TITULO = /^(#{1,6})\s+(.*)$/u;
const ELEMENTO_LISTA = /^[-*]\s+(.*)$/u;

/** Separa un texto en segmentos normales y en negrita (`**…**`). */
export function segmentarNegritas(linea: string): SegmentoTexto[] {
  const partes = linea.split('**');
  // Un número par de partes significa un `**` sin cerrar: se deja como texto normal.
  if (partes.length % 2 === 0) return [{ texto: linea, negrita: false }];
  return partes
    .map((texto, indice) => ({ texto, negrita: indice % 2 === 1 }))
    .filter((segmento) => segmento.texto.length > 0);
}

export function interpretarTextoAviso(contenido: string): BloqueTexto[] {
  const bloques: BloqueTexto[] = [];
  let parrafo: string[] = [];
  let lista: SegmentoTexto[][] = [];

  const cerrarParrafo = (): void => {
    if (parrafo.length > 0) {
      bloques.push({ tipo: 'parrafo', segmentos: segmentarNegritas(parrafo.join(' ')) });
      parrafo = [];
    }
  };
  const cerrarLista = (): void => {
    if (lista.length > 0) {
      bloques.push({ tipo: 'lista', elementos: lista });
      lista = [];
    }
  };

  for (const lineaOriginal of contenido.split(/\r?\n/u)) {
    const linea = lineaOriginal.trim();
    if (linea.length === 0) {
      cerrarParrafo();
      cerrarLista();
      continue;
    }
    const titulo = TITULO.exec(linea);
    if (titulo) {
      cerrarParrafo();
      cerrarLista();
      bloques.push({
        tipo: 'titulo',
        nivel: titulo[1].length,
        segmentos: segmentarNegritas(titulo[2]),
      });
      continue;
    }
    const elemento = ELEMENTO_LISTA.exec(linea);
    if (elemento) {
      cerrarParrafo();
      lista.push(segmentarNegritas(elemento[1]));
      continue;
    }
    cerrarLista();
    parrafo.push(linea);
  }
  cerrarParrafo();
  cerrarLista();
  return bloques;
}
