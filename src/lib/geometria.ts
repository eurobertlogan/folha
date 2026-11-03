/** Geometria da perspectiva: dado um quadrilátero na foto, endireita a folha. */

export interface Ponto {
  x: number;
  y: number;
}

export type Quadrilatero = [Ponto, Ponto, Ponto, Ponto];

/** Resolve um sistema linear 8x8 por eliminação de Gauss. */
function resolver(matriz: number[][], termos: number[]): number[] {
  const n = termos.length;
  const a = matriz.map((linha, indice) => [...linha, termos[indice] ?? 0]);

  for (let coluna = 0; coluna < n; coluna += 1) {
    let pivo = coluna;
    for (let linha = coluna + 1; linha < n; linha += 1) {
      if (Math.abs(a[linha]?.[coluna] ?? 0) > Math.abs(a[pivo]?.[coluna] ?? 0)) pivo = linha;
    }
    const troca = a[coluna];
    a[coluna] = a[pivo] as number[];
    a[pivo] = troca as number[];

    const diagonal = a[coluna]?.[coluna] ?? 0;
    if (Math.abs(diagonal) < 1e-12) continue;

    for (let linha = 0; linha < n; linha += 1) {
      if (linha === coluna) continue;
      const fator = (a[linha]?.[coluna] ?? 0) / diagonal;
      if (!fator) continue;
      for (let k = coluna; k <= n; k += 1) {
        a[linha]![k] = (a[linha]?.[k] ?? 0) - fator * (a[coluna]?.[k] ?? 0);
      }
    }
  }

  return Array.from({ length: n }, (_, linha) => {
    const diagonal = a[linha]?.[linha] ?? 0;
    return Math.abs(diagonal) < 1e-12 ? 0 : (a[linha]?.[n] ?? 0) / diagonal;
  });
}

/**
 * Homografia que leva o retângulo de destino (0,0)-(largura,altura) para o
 * quadrilátero da foto. É a inversa que precisamos para amostrar a origem.
 */
export function homografia(destino: { largura: number; altura: number }, origem: Quadrilatero): number[] {
  const alvos: Ponto[] = [
    { x: 0, y: 0 },
    { x: destino.largura, y: 0 },
    { x: destino.largura, y: destino.altura },
    { x: 0, y: destino.altura },
  ];

  const matriz: number[][] = [];
  const termos: number[] = [];

  for (let i = 0; i < 4; i += 1) {
    const d = alvos[i] as Ponto;
    const o = origem[i] as Ponto;
    matriz.push([d.x, d.y, 1, 0, 0, 0, -o.x * d.x, -o.x * d.y]);
    termos.push(o.x);
    matriz.push([0, 0, 0, d.x, d.y, 1, -o.y * d.x, -o.y * d.y]);
    termos.push(o.y);
  }

  return resolver(matriz, termos);
}

function amostrar(dados: Uint8ClampedArray, largura: number, altura: number, x: number, y: number, saida: Uint8ClampedArray, indice: number): void {
  const px = Math.min(largura - 1, Math.max(0, x));
  const py = Math.min(altura - 1, Math.max(0, y));
  const x0 = Math.floor(px);
  const y0 = Math.floor(py);
  const x1 = Math.min(largura - 1, x0 + 1);
  const y1 = Math.min(altura - 1, y0 + 1);
  const fx = px - x0;
  const fy = py - y0;

  for (let canal = 0; canal < 4; canal += 1) {
    const a = dados[(y0 * largura + x0) * 4 + canal] ?? 0;
    const b = dados[(y0 * largura + x1) * 4 + canal] ?? 0;
    const c = dados[(y1 * largura + x0) * 4 + canal] ?? 0;
    const d = dados[(y1 * largura + x1) * 4 + canal] ?? 0;
    const topo = a + (b - a) * fx;
    const base = c + (d - c) * fx;
    saida[indice + canal] = topo + (base - topo) * fy;
  }
}

/** Dimensões naturais do retângulo que sai da folha, respeitando o limite. */
export function tamanhoDoRecorte(quad: Quadrilatero, limite = 2200): { largura: number; altura: number } {
  const [a, b, c, d] = quad;
  const distancia = (p: Ponto, q: Ponto) => Math.hypot(p.x - q.x, p.y - q.y);
  const largura = Math.max(distancia(a, b), distancia(d, c));
  const altura = Math.max(distancia(a, d), distancia(b, c));
  const escala = Math.min(1, limite / Math.max(largura, altura));
  return {
    largura: Math.max(2, Math.round(largura * escala)),
    altura: Math.max(2, Math.round(altura * escala)),
  };
}

/** Endireita o quadrilátero em um canvas novo. */
export function recortar(fonte: ImageBitmap | HTMLCanvasElement, quad: Quadrilatero, limite = 2200): HTMLCanvasElement {
  const larguraFonte = fonte.width;
  const alturaFonte = fonte.height;

  const base = document.createElement("canvas");
  base.width = larguraFonte;
  base.height = alturaFonte;
  const contextoBase = base.getContext("2d", { willReadFrequently: true });
  if (!contextoBase) throw new Error("canvas indisponível");
  contextoBase.drawImage(fonte, 0, 0);
  const origem = contextoBase.getImageData(0, 0, larguraFonte, alturaFonte);

  const { largura, altura } = tamanhoDoRecorte(quad, limite);

  // Entra meio por cento para dentro: a amostra da borda não pega a mesa.
  const centro = quad.reduce((soma, ponto) => ({ x: soma.x + ponto.x / 4, y: soma.y + ponto.y / 4 }), { x: 0, y: 0 });
  const margem = quad.map((ponto) => ({
    x: ponto.x + (centro.x - ponto.x) * 0.006,
    y: ponto.y + (centro.y - ponto.y) * 0.006,
  })) as Quadrilatero;

  const h = homografia({ largura, altura }, margem);

  const destino = new ImageData(largura, altura);
  const dados = origem.data;
  const saida = destino.data;

  for (let y = 0; y < altura; y += 1) {
    for (let x = 0; x < largura; x += 1) {
      const denominador = (h[6] ?? 0) * x + (h[7] ?? 0) * y + 1;
      const sx = ((h[0] ?? 0) * x + (h[1] ?? 0) * y + (h[2] ?? 0)) / denominador;
      const sy = ((h[3] ?? 0) * x + (h[4] ?? 0) * y + (h[5] ?? 0)) / denominador;
      amostrar(dados, larguraFonte, alturaFonte, sx, sy, saida, (y * largura + x) * 4);
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  canvas.getContext("2d")?.putImageData(destino, 0, 0);
  return canvas;
}

/** Canto inicial: a folha inteira com uma margem. */
export function quadrilateroInicial(largura: number, altura: number): Quadrilatero {
  const mx = largura * 0.06;
  const my = altura * 0.06;
  return [
    { x: mx, y: my },
    { x: largura - mx, y: my },
    { x: largura - mx, y: altura - my },
    { x: mx, y: altura - my },
  ];
}
