import { RotateCw, ScanLine, Undo2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/motion/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/motion/tabs";
import { Tooltip } from "@/components/motion/tooltip";
import { Botao } from "@/components/ui/base";
import { renderizar, type Foto } from "@/lib/estado";
import { FILTROS, type Filtro } from "@/lib/filtros";
import { quadrilateroInicial, type Ponto } from "@/lib/geometria";
import { cn } from "@/lib/utils";

interface EditorProps {
  foto: Foto;
  aoAtualizar: (id: string, mudancas: Partial<Foto>) => void;
}

export function Editor({ foto, aoAtualizar }: EditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [arrastando, setArrastando] = useState<number | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [processando, setProcessando] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = foto.bitmap.width;
    canvas.height = foto.bitmap.height;
    const contexto = canvas.getContext("2d");
    contexto?.drawImage(foto.bitmap, 0, 0);
  }, [foto.bitmap]);

  useEffect(() => {
    setProcessando(true);
    const timer = setTimeout(() => {
      try {
        const canvas = renderizar(foto, 1000);
        setPrevia(canvas.toDataURL("image/jpeg", 0.82));
      } finally {
        setProcessando(false);
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [foto]);

  useEffect(() => {
    if (arrastando === null) return;

    const converter = (evento: PointerEvent): Ponto | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const matriz = svg.getScreenCTM();
      if (!matriz) return null;
      const ponto = new DOMPoint(evento.clientX, evento.clientY).matrixTransform(matriz.inverse());
      return {
        x: Math.max(0, Math.min(foto.largura, ponto.x)),
        y: Math.max(0, Math.min(foto.altura, ponto.y)),
      };
    };

    const mover = (evento: PointerEvent) => {
      const ponto = converter(evento);
      if (!ponto) return;
      const quad = foto.quad.map((atual, indice) => (indice === arrastando ? ponto : atual)) as Foto["quad"];
      aoAtualizar(foto.id, { quad });
    };

    const soltar = () => setArrastando(null);

    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
    window.addEventListener("pointercancel", soltar);
    return () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      window.removeEventListener("pointercancel", soltar);
    };
  }, [arrastando, foto, aoAtualizar]);

  const raio = useMemo(() => Math.max(7, Math.round(Math.max(foto.largura, foto.altura) * 0.009)), [foto.largura, foto.altura]);
  const pontos = foto.quad.map((ponto) => `${ponto.x},${ponto.y}`).join(" ");

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <Card className="bg-card">
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="text-[13.5px] font-semibold">Ajustar a folha</CardTitle>
          <span className="hidden text-[11.5px] text-muted-foreground sm:inline">arraste os cantos até a borda do papel</span>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="relative overflow-hidden rounded-xl bg-[#16150f]">
            <canvas ref={canvasRef} className="block h-auto w-full" />
            <svg
              ref={svgRef}
              viewBox={`0 0 ${foto.largura} ${foto.altura}`}
              preserveAspectRatio="none"
              className="absolute inset-0 size-full touch-none"
              aria-label="Cantos da folha"
            >
              <polygon points={pontos} fill="rgba(15,107,87,.12)" stroke="#f5f1e6" strokeWidth={Math.max(2, foto.largura * 0.0022)} strokeDasharray={`${raio} ${raio * 0.7}`} />
              {foto.quad.map((ponto, indice) => (
                <g key={indice}>
                  <circle
                    cx={ponto.x}
                    cy={ponto.y}
                    r={raio * 1.9}
                    fill="transparent"
                    className="cursor-grab"
                    onPointerDown={(evento) => {
                      evento.preventDefault();
                      setArrastando(indice);
                    }}
                  />
                  <circle
                    cx={ponto.x}
                    cy={ponto.y}
                    r={raio}
                    fill="#0f6b57"
                    stroke="#ffffff"
                    strokeWidth={raio * 0.35}
                    className={cn("pointer-events-none", arrastando === indice && "fill-[#0b4d3e]")}
                  />
                </g>
              ))}
            </svg>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Tooltip content="Gira a folha 90 graus no sentido horário." side="top">
                <span>
                  <Botao onClick={() => aoAtualizar(foto.id, { giro: ((foto.giro + 90) % 360) as Foto["giro"] })}>
                    <RotateCw className="size-4" strokeWidth={1.8} />
                    Girar
                  </Botao>
                </span>
              </Tooltip>
              <Tooltip content="Volta os quatro cantos para as bordas da foto." side="top">
                <span>
                  <Botao onClick={() => aoAtualizar(foto.id, { quad: quadrilateroInicial(foto.largura, foto.altura) })}>
                    <Undo2 className="size-4" strokeWidth={1.8} />
                    Recomeçar
                  </Botao>
                </span>
              </Tooltip>
            </div>
            <span className="num text-[11px] text-muted-foreground">
              {foto.largura} × {foto.altura} px
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <Card className="bg-card">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-[13.5px] font-semibold">Resultado</CardTitle>
            <span className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
              <ScanLine className="size-3.5" />
              <span className="hidden sm:inline">{processando ? "processando" : "prévia"}</span>
            </span>
          </CardHeader>
          <CardContent>
            <div className="grid min-h-[220px] place-items-center overflow-hidden rounded-xl bg-secondary/60">
              {previa ? (
                <img src={previa} alt="Prévia da folha endireitada" className="max-h-[440px] w-full object-contain" />
              ) : (
                <span className="text-[12px] text-muted-foreground">ajustando</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-[13.5px] font-semibold">Filtro</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={foto.filtro} onValueChange={(valor) => aoAtualizar(foto.id, { filtro: valor as Filtro })}>
              <TabsList className="w-full">
                {FILTROS.map((item) => (
                  <TabsTrigger key={item.valor} value={item.valor}>
                    {item.rotulo}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value={foto.filtro}>
                <p className="pt-3 text-[12px] text-muted-foreground">
                  {FILTROS.find((item) => item.valor === foto.filtro)?.descricao}
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
