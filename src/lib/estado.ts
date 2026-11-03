import { useCallback, useMemo, useState } from "react";
import { aplicar, girar, redimensionar, type Filtro } from "@/lib/filtros";
import { quadrilateroInicial, recortar, type Quadrilatero } from "@/lib/geometria";

export interface Foto {
  id: string;
  bitmap: ImageBitmap | HTMLCanvasElement;
  nome: string;
  quad: Quadrilatero;
  filtro: Filtro;
  giro: 0 | 90 | 180 | 270;
  largura: number;
  altura: number;
}

export function useFolha() {
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [selecionada, setSelecionada] = useState<string | null>(null);

  const adicionarBitmap = useCallback((bitmap: ImageBitmap | HTMLCanvasElement, nome: string) => {
    const foto: Foto = {
      id: crypto.randomUUID(),
      bitmap,
      nome,
      quad: quadrilateroInicial(bitmap.width, bitmap.height),
      filtro: "realce",
      giro: 0,
      largura: bitmap.width,
      altura: bitmap.height,
    };
    setFotos((lista) => [...lista, foto]);
    setSelecionada(foto.id);
  }, []);

  const adicionarArquivos = useCallback(
    async (arquivos: File[]) => {
      for (const arquivo of arquivos) {
        if (!arquivo.type.startsWith("image/")) continue;
        const bitmap = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
        adicionarBitmap(redimensionarBitmap(bitmap), arquivo.name.replace(/\.[^.]+$/, ""));
      }
    },
    [adicionarBitmap],
  );

  const remover = useCallback((id: string) => {
    setFotos((lista) => lista.filter((foto) => foto.id !== id));
    setSelecionada((atual) => {
      if (atual !== id) return atual;
      return null;
    });
  }, []);

  const mover = useCallback((id: string, direcao: -1 | 1) => {
    setFotos((lista) => {
      const indice = lista.findIndex((foto) => foto.id === id);
      const destino = indice + direcao;
      if (indice < 0 || destino < 0 || destino >= lista.length) return lista;
      const copia = [...lista];
      const [item] = copia.splice(indice, 1);
      if (!item) return lista;
      copia.splice(destino, 0, item);
      return copia;
    });
  }, []);

  const limpar = useCallback(() => {
    setFotos([]);
    setSelecionada(null);
  }, []);

  const atualizar = useCallback((id: string, mudancas: Partial<Foto>) => {
    setFotos((lista) => lista.map((foto) => (foto.id === id ? { ...foto, ...mudancas } : foto)));
  }, []);

  const atual = useMemo(() => fotos.find((foto) => foto.id === selecionada) ?? fotos[0] ?? null, [fotos, selecionada]);

  return { fotos, atual, selecionada: atual?.id ?? null, selecionar: setSelecionada, adicionarArquivos, adicionarBitmap, remover, mover, atualizar, limpar };
}

function redimensionarBitmap(bitmap: ImageBitmap, limite = 2600): ImageBitmap | HTMLCanvasElement {
  if (Math.max(bitmap.width, bitmap.height) <= limite) return bitmap;
  return redimensionar(bitmap, limite);
}

/** Recorta, gira e aplica o filtro. Usado tanto na prévia quanto na exportação. */
export function renderizar(foto: Foto, limite: number): HTMLCanvasElement {
  let canvas = recortar(foto.bitmap, foto.quad, limite);
  if (foto.giro) canvas = girar(canvas, foto.giro);
  return aplicar(canvas, foto.filtro);
}
