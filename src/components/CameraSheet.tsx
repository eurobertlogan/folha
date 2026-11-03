import { Camera, RefreshCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BottomSheet } from "@/components/motion/bottom-sheet";
import { Alert, AlertContent, AlertDescription, AlertTitle } from "@/components/motion/alert";
import { Botao } from "@/components/ui/base";

interface CameraSheetProps {
  aberto: boolean;
  aoFechar: () => void;
  aoCapturar: (bitmap: ImageBitmap) => void;
}

export function CameraSheet({ aberto, aoFechar, aoCapturar }: CameraSheetProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pronta, setPronta] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    let ativo = true;
    setErro(null);
    setPronta(false);

    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 2560 }, height: { ideal: 1440 } },
          audio: false,
        });
        if (!ativo) {
          for (const faixa of stream.getTracks()) faixa.stop();
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.muted = true;
          video.playsInline = true;
          await video.play().catch(() => undefined);
          setPronta(true);
        }
      } catch (falha) {
        const nome = (falha as DOMException).name;
        setErro(
          nome === "NotAllowedError"
            ? "Permissão de câmera negada. Libere no cadeado da barra de endereço ou envie uma foto."
            : "Não foi possível abrir a câmera neste aparelho.",
        );
      }
    })();

    return () => {
      ativo = false;
      for (const faixa of streamRef.current?.getTracks() ?? []) faixa.stop();
      streamRef.current = null;
    };
  }, [aberto]);

  async function capturar() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const bitmap = await createImageBitmap(canvas);
    aoCapturar(bitmap);
    aoFechar();
  }

  return (
    <BottomSheet open={aberto} onOpenChange={(valor) => (valor ? undefined : aoFechar())} title="Tirar foto" description="Enquadre a folha inteira, com uma margem.">
      <div className="grid gap-3">
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[#16150f]">
          <video ref={videoRef} playsInline muted className="size-full object-cover" />
          <div className="pointer-events-none absolute inset-4 rounded-lg border border-dashed border-white/25" />
          {!pronta && !erro ? (
            <div className="absolute inset-0 grid place-items-center text-[12px] text-[#b6ae9f]">abrindo a câmera</div>
          ) : null}
          {erro ? (
            <div className="absolute inset-0 grid place-content-center justify-items-center gap-2 px-6 text-center">
              <Camera className="size-5 text-marca" />
              <span className="text-[12px] text-[#b6ae9f]">{erro}</span>
            </div>
          ) : null}
        </div>

        {erro ? (
          <Alert variant="warning" defaultOpen>
            <AlertContent>
              <AlertTitle>Sem câmera</AlertTitle>
              <AlertDescription>Você ainda pode escolher fotos da galeria ou do computador.</AlertDescription>
            </AlertContent>
          </Alert>
        ) : null}

        <div className="flex justify-end gap-2">
          <Botao onClick={aoFechar}>Cancelar</Botao>
          <Botao variante="principal" disabled={!pronta} onClick={() => void capturar()}>
            {pronta ? <Camera className="size-4" strokeWidth={1.8} /> : <RefreshCcw className="size-4 animate-spin" strokeWidth={1.8} />}
            Capturar
          </Botao>
        </div>
      </div>
    </BottomSheet>
  );
}
