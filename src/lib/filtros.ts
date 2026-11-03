/** Filtros de imagem aplicados depois do recorte. Tudo em canvas, sem dependência. */

export type Filtro = "original" | "realce" | "cinza" | "pb";

export const FILTROS: { valor: Filtro; rotulo: string; descricao: string }[] = [
  { valor: "realce", rotulo: "Realce", descricao: "Branco mais branco, texto mais escuro" },
  { valor: "pb", rotulo: "Preto e branco", descricao: "Ideal para texto impresso" },
  { valor: "cinza", rotulo: "Cinza", descricao: "Sem cor, mantendo o tom" },
  { valor: "original", rotulo: "Original", descricao: "Sem ajuste" },
];

function luminancia(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Estica cada canal entre os percentis 2% e 98%, corrigindo luz amarela ou fria. */
function esticar(dados: Uint8ClampedArray): void {
  const histogramas = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
  const total = dados.length / 4;

  for (let i = 0; i < dados.length; i += 4) {
    histogramas[0]![dados[i] ?? 0]! += 1;
    histogramas[1]![dados[i + 1] ?? 0]! += 1;
    histogramas[2]![dados[i + 2] ?? 0]! += 1;
  }

  const limites = histogramas.map((histograma) => {
    const corte = total * 0.02;
    let acumulado = 0;
    let baixo = 0;
    let alto = 255;
    for (let valor = 0; valor < 256; valor += 1) {
      acumulado += histograma[valor] ?? 0;
      if (acumulado >= corte) {
        baixo = valor;
        break;
      }
    }
    acumulado = 0;
    for (let valor = 255; valor >= 0; valor -= 1) {
      acumulado += histograma[valor] ?? 0;
      if (acumulado >= corte) {
        alto = valor;
        break;
      }
    }
    return { baixo, alto: Math.max(baixo + 12, alto) };
  });

  for (let i = 0; i < dados.length; i += 4) {
    for (let canal = 0; canal < 3; canal += 1) {
      const limite = limites[canal]!;
      const valor = dados[i + canal] ?? 0;
      dados[i + canal] = Math.max(0, Math.min(255, ((valor - limite.baixo) / (limite.alto - limite.baixo)) * 255));
    }
  }
}

/** Média local por imagem integral: separa papel de tinta mesmo com sombra. */
function binarizar(dados: Uint8ClampedArray, largura: number, altura: number): void {
  const integral = new Float64Array((largura + 1) * (altura + 1));
  const cinza = new Uint8ClampedArray(largura * altura);

  for (let y = 0; y < altura; y += 1) {
    for (let x = 0; x < largura; x += 1) {
      const i = (y * largura + x) * 4;
      const valor = luminancia(dados[i] ?? 0, dados[i + 1] ?? 0, dados[i + 2] ?? 0);
      cinza[y * largura + x] = valor;

      const acima = integral[y * (largura + 1) + (x + 1)] ?? 0;
      const esquerda = integral[(y + 1) * (largura + 1) + x] ?? 0;
      const diagonal = integral[y * (largura + 1) + x] ?? 0;
      integral[(y + 1) * (largura + 1) + (x + 1)] = valor + acima + esquerda - diagonal;
    }
  }

  const raio = Math.max(6, Math.round(Math.min(largura, altura) * 0.02));

  for (let y = 0; y < altura; y += 1) {
    for (let x = 0; x < largura; x += 1) {
      const x0 = Math.max(0, x - raio);
      const y0 = Math.max(0, y - raio);
      const x1 = Math.min(largura - 1, x + raio);
      const y1 = Math.min(altura - 1, y + raio);
      const soma =
        (integral[(y1 + 1) * (largura + 1) + (x1 + 1)] ?? 0) -
        (integral[y0 * (largura + 1) + (x1 + 1)] ?? 0) -
        (integral[(y1 + 1) * (largura + 1) + x0] ?? 0) +
        (integral[y0 * (largura + 1) + x0] ?? 0);
      const media = soma / ((x1 - x0 + 1) * (y1 - y0 + 1));
      const valor = cinza[y * largura + x] ?? 0;
      const tinta = valor < media * 0.92;
      const i = (y * largura + x) * 4;
      dados[i] = tinta ? 24 : 252;
      dados[i + 1] = tinta ? 24 : 252;
      dados[i + 2] = tinta ? 24 : 252;
    }
  }
}

export function aplicar(canvas: HTMLCanvasElement, filtro: Filtro): HTMLCanvasElement {
  if (filtro === "original") return canvas;

  const contexto = canvas.getContext("2d", { willReadFrequently: true });
  if (!contexto) return canvas;
  const imagem = contexto.getImageData(0, 0, canvas.width, canvas.height);
  const dados = imagem.data;

  if (filtro === "pb") {
    esticar(dados);
    binarizar(dados, canvas.width, canvas.height);
  } else if (filtro === "cinza") {
    esticar(dados);
    for (let i = 0; i < dados.length; i += 4) {
      const valor = luminancia(dados[i] ?? 0, dados[i + 1] ?? 0, dados[i + 2] ?? 0);
      dados[i] = valor;
      dados[i + 1] = valor;
      dados[i + 2] = valor;
    }
  } else {
    esticar(dados);
    for (let i = 0; i < dados.length; i += 4) {
      for (let canal = 0; canal < 3; canal += 1) {
        const normalizado = (dados[i + canal] ?? 0) / 255;
        dados[i + canal] = Math.min(255, Math.max(0, 255 * Math.pow(normalizado, 1.06)));
      }
    }
  }

  contexto.putImageData(imagem, 0, 0);
  return canvas;
}

export function girar(canvas: HTMLCanvasElement, graus: 90 | 180 | 270): HTMLCanvasElement {
  const novo = document.createElement("canvas");
  const contexto = novo.getContext("2d");
  if (!contexto) return canvas;

  if (graus === 90 || graus === 270) {
    novo.width = canvas.height;
    novo.height = canvas.width;
  } else {
    novo.width = canvas.width;
    novo.height = canvas.height;
  }

  contexto.translate(novo.width / 2, novo.height / 2);
  contexto.rotate((graus * Math.PI) / 180);
  contexto.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
  return novo;
}

export function redimensionar(fonte: ImageBitmap | HTMLCanvasElement, limite = 2400): HTMLCanvasElement {
  const largura = fonte.width;
  const altura = fonte.height;
  const escala = Math.min(1, limite / Math.max(largura, altura));

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(2, Math.round(largura * escala));
  canvas.height = Math.max(2, Math.round(altura * escala));
  const contexto = canvas.getContext("2d");
  contexto?.drawImage(fonte, 0, 0, canvas.width, canvas.height);
  return canvas;
}
