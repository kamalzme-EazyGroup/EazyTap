import { useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cropToDataUrl } from "@/lib/image";

export type CropRequest = {
  src: string;
  aspect: number;
  round?: boolean;
  maxSize: number;
  png?: boolean;
  onDone: (dataUrl: string) => void;
};

export function CropDialog({ request, onClose }: { request: CropRequest | null; onClose: () => void }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  async function apply() {
    if (!request || !area) return;
    setBusy(true);
    try {
      request.onDone(await cropToDataUrl(request.src, area, request.maxSize, request.png ? "image/png" : "image/jpeg"));
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!request} onOpenChange={(o) => { if (!o) onClose(); setZoom(1); setCrop({ x: 0, y: 0 }); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adjust image</DialogTitle>
        </DialogHeader>
        {request && (
          <div className="relative h-80 overflow-hidden rounded-xl bg-secondary">
            <Cropper
              image={request.src}
              crop={crop}
              zoom={zoom}
              minZoom={1}
              maxZoom={4}
              aspect={request.aspect}
              cropShape={request.round ? "round" : "rect"}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, px) => setArea(px)}
            />
          </div>
        )}
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Zoom</p>
          <Slider min={1} max={4} step={0.01} value={[zoom]} onValueChange={([v]) => setZoom(v ?? 1)} />
          <p className="text-xs text-muted-foreground">Drag the image to position it inside the frame.</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={apply} disabled={busy || !area}>{busy ? "Applying…" : "Apply"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
