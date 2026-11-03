/**
 * PDF mínimo, escrito à mão: cada página é um JPEG embutido com DCTDecode.
 * Sem biblioteca, sem servidor, sem perda de resolução.
 */

export interface PaginaPdf {
  jpeg: Uint8Array;
  largura: number;
  altura: number;
}

const A4 = { largura: 595.28, altura: 841.89 };

function numero(valor: number): string {
  return valor.toFixed(2);
}

export function montarPdf(paginas: PaginaPdf[], titulo = "Documento digitalizado"): Blob {
  if (paginas.length === 0) throw new Error("nenhuma página");

  const partes: Uint8Array[] = [];
  let posicao = 0;
  const codificador = new TextEncoder();
  const deslocamentos: number[] = [];

  const escrever = (texto: string) => {
    const bytes = codificador.encode(texto);
    partes.push(bytes);
    posicao += bytes.length;
  };

  const escreverBinario = (bytes: Uint8Array) => {
    partes.push(bytes);
    posicao += bytes.length;
  };

  const abrirObjeto = (numeroObjeto: number) => {
    deslocamentos[numeroObjeto] = posicao;
    escrever(`${numeroObjeto} 0 obj\n`);
  };

  escrever("%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n");

  const totalPaginas = paginas.length;
  const idPaginas = 2;
  const idInfo = 3;
  const primeiro = 4;
  const objetoDaPagina = (indice: number) => primeiro + indice * 3;

  abrirObjeto(1);
  escrever(`<< /Type /Catalog /Pages ${idPaginas} 0 R >>\nendobj\n`);

  abrirObjeto(idPaginas);
  escrever(`<< /Type /Pages /Count ${totalPaginas} /Kids [`);
  for (let i = 0; i < totalPaginas; i += 1) escrever(`${objetoDaPagina(i)} 0 R `);
  escrever(`] >>\nendobj\n`);

  const tituloSeguro = titulo.replace(/[()\\]/g, " ").slice(0, 120);
  abrirObjeto(idInfo);
  escrever(`<< /Title (${tituloSeguro}) /Producer (folha) /Creator (folha) >>\nendobj\n`);

  paginas.forEach((pagina, indice) => {
    const idPagina = objetoDaPagina(indice);
    const idConteudo = idPagina + 1;
    const idImagem = idPagina + 2;

    const paisagem = pagina.largura > pagina.altura;
    const larguraPagina = paisagem ? A4.altura : A4.largura;
    const alturaPagina = paisagem ? A4.largura : A4.altura;

    const escala = Math.min(larguraPagina / pagina.largura, alturaPagina / pagina.altura);
    const larguraDesenho = pagina.largura * escala;
    const alturaDesenho = pagina.altura * escala;
    const x = (larguraPagina - larguraDesenho) / 2;
    const y = (alturaPagina - alturaDesenho) / 2;

    abrirObjeto(idPagina);
    escrever(
      `<< /Type /Page /Parent ${idPaginas} 0 R /MediaBox [0 0 ${numero(larguraPagina)} ${numero(alturaPagina)}] ` +
        `/Resources << /XObject << /Im0 ${idImagem} 0 R >> >> /Contents ${idConteudo} 0 R >>\nendobj\n`,
    );

    const conteudo = `q ${numero(larguraDesenho)} 0 0 ${numero(alturaDesenho)} ${numero(x)} ${numero(y)} cm /Im0 Do Q\n`;
    abrirObjeto(idConteudo);
    escrever(`<< /Length ${conteudo.length} >>\nstream\n${conteudo}endstream\nendobj\n`);

    abrirObjeto(idImagem);
    escrever(
      `<< /Type /XObject /Subtype /Image /Width ${pagina.largura} /Height ${pagina.altura} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${pagina.jpeg.length} >>\nstream\n`,
    );
    escreverBinario(pagina.jpeg);
    escrever("\nendstream\nendobj\n");
  });

  const inicioXref = posicao;
  const totalObjetos = primeiro + totalPaginas * 3;
  escrever(`xref\n0 ${totalObjetos}\n`);
  escrever("0000000000 65535 f \n");
  for (let objeto = 1; objeto < totalObjetos; objeto += 1) {
    const deslocamento = deslocamentos[objeto] ?? 0;
    escrever(`${String(deslocamento).padStart(10, "0")} 00000 n \n`);
  }
  escrever(`trailer\n<< /Size ${totalObjetos} /Root 1 0 R /Info ${idInfo} 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`);

  return new Blob(partes as BlobPart[], { type: "application/pdf" });
}

/** Converte o canvas em JPEG pronto para o PDF. */
export async function canvasParaJpeg(canvas: HTMLCanvasElement, qualidade = 0.86): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>((resolver) => canvas.toBlob(resolver, "image/jpeg", qualidade));
  if (!blob) throw new Error("falha ao codificar a imagem");
  return new Uint8Array(await blob.arrayBuffer());
}
