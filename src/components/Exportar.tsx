import { Check, Download, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { Alert, AlertContent, AlertDescription } from "@/components/motion/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/motion/card";
import { Input } from "@/components/motion/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/motion/select";
import { Botao } from "@/components/ui/base";
import { renderizar, type Foto } from "@/lib/estado";
import { canvasParaJpeg, montarPdf } from "@/lib/pdf";

const QUALIDADES = [
  { valor: "92", rotulo: "Alta · 92%" },
  { valor: "84", rotulo: "Equilibrada · 84%" },
  { valor: "72", rotulo: "Arquivo pequeno · 72%" },
];

function emMb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(bytes > 1024 * 1024 ? 1 : 2)} MB`;
}

export function Exportar({ fotos }: { fotos: Foto[] }) {
  const [nome, setNome] = useState("documento");
  const [qualidade, setQualidade] = useState("84");
  const [ocupado, setOcupado] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [arquivo, setArquivo] = useState<{ url: string; tamanho: number } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function gerar() {
    if (fotos.length === 0 || ocupado) return;
    setOcupado(true);
    setErro(null);
    setProgresso(0);
    setArquivo(null);

    try {
      const paginas = [];
      for (let i = 0; i < fotos.length; i += 1) {
        const foto = fotos[i];
        if (!foto) continue;
        const canvas = renderizar(foto, 2400);
        const jpeg = await canvasParaJpeg(canvas, Number(qualidade) / 100);
        paginas.push({ jpeg, largura: canvas.width, altura: canvas.height });
        setProgresso(Math.round(((i + 1) / fotos.length) * 90));
        await new Promise((resolver) => requestAnimationFrame(resolver));
      }

      const blob = montarPdf(paginas, nome.trim() || "documento");
      const url = URL.createObjectURL(blob);
      setArquivo({ url, tamanho: blob.size });
      setProgresso(100);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível montar o PDF.");
    } finally {
      setOcupado(false);
    }
  }

  const nomeSeguro = (nome.trim() || "documento").replace(/[^\p{L}\p{N}\-_\s]/gu, "").replace(/\s+/g, "-").toLowerCase();

  return (
    <Card className="bg-card">
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-[13.5px] font-semibold">Exportar</CardTitle>
        <span className="num text-[11.5px] text-muted-foreground">
          {fotos.length} {fotos.length === 1 ? "página" : "páginas"} · A4
        </span>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
          <Input label="Nome do arquivo" value={nome} onChange={setNome} placeholder="documento" />
          <div className="grid gap-1.5">
            <span className="text-[12px] font-medium text-muted-foreground">Qualidade</span>
            <Select value={qualidade} onValueChange={setQualidade}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUALIDADES.map((item) => (
                  <SelectItem key={item.valor} value={item.valor}>
                    {item.rotulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11.5px] text-muted-foreground">
            {ocupado ? `montando página ${Math.ceil((progresso / 100) * fotos.length)} de ${fotos.length}` : "o arquivo é gerado aqui, sem envio"}
          </span>
          <div className="flex items-center gap-2">
            {arquivo ? (
              <a
                href={arquivo.url}
                download={`${nomeSeguro || "documento"}.pdf`}
                className="inline-flex h-9.5 items-center justify-center gap-2 rounded-[10px] border border-border bg-card px-3.5 text-[13px] font-medium hover:bg-secondary"
              >
                <Download className="size-4" strokeWidth={1.8} />
                Baixar {emMb(arquivo.tamanho)}
              </a>
            ) : null}
            <Botao variante="principal" tamanho="grande" disabled={fotos.length === 0 || ocupado} onClick={() => void gerar()}>
              {ocupado ? <Loader2 className="size-4 animate-spin" /> : arquivo ? <Check className="size-4" /> : <FileText className="size-4" />}
              {arquivo ? "Gerar de novo" : "Gerar PDF"}
            </Botao>
          </div>
        </div>

        {ocupado ? (
          <span className="h-1 overflow-hidden rounded-full bg-secondary">
            <span className="block h-full rounded-full bg-marca transition-[width] duration-200" style={{ width: `${progresso}%` }} />
          </span>
        ) : null}

        {erro ? (
          <Alert variant="destructive" defaultOpen>
            <AlertContent>
              <AlertDescription>{erro}</AlertDescription>
            </AlertContent>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}
