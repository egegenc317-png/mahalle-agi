"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";

import { Button } from "@/components/ui/button";

type CameraCaptureButtonProps = {
  onCapture: (files: File[]) => void;
  multiple?: boolean;
  className?: string;
  label?: string;
};

export function CameraCaptureButton({
  onCapture,
  multiple = false,
  className,
  label = "Kameradan Çek"
}: CameraCaptureButtonProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraOpen(false);
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const openCamera = async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      inputRef.current?.click();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false
      });
      streamRef.current = stream;
      setCameraOpen(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => {});
        }
      });
    } catch {
      setError("Kamera acilamadı. Izin vermeyi deneyin.");
      inputRef.current?.click();
    }
  };

  const takePhoto = async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) return;

    const file = new File([blob], `kamera-${Date.now()}.jpg`, { type: "image/jpeg" });
    onCapture([file]);
    stopCamera();
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length > 0) onCapture(files);
          e.currentTarget.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={className || "border-amber-300 text-amber-700 hover:bg-amber-50"}
        onClick={() => void openCamera()}
      >
        <Camera className="mr-1.5 h-4 w-4" />
        {label}
      </Button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      {cameraOpen ? (
        <div className="fixed inset-0 z-[120] bg-black/85 p-3 sm:p-6">
          <div className="mx-auto flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-amber-300 bg-zinc-950">
            <div className="flex items-center justify-between border-b border-amber-200/20 px-3 py-2 text-white">
              <p className="text-sm font-medium">Canlı Kamera</p>
              <button
                type="button"
                onClick={stopCamera}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-white/10 hover:bg-white/20"
                aria-label="Kamerayi kapat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative flex-1 bg-black">
              <video ref={videoRef} playsInline muted autoPlay className="h-full w-full object-cover" />
            </div>

            <div className="flex items-center justify-center gap-2 border-t border-amber-200/20 px-3 py-3">
              <Button type="button" variant="outline" className="border-zinc-500 text-zinc-100 hover:bg-zinc-800" onClick={stopCamera}>
                Vazgeç
              </Button>
              <Button type="button" className="bg-orange-500 text-white hover:bg-orange-600" onClick={() => void takePhoto()}>
                <Camera className="mr-1.5 h-4 w-4" />
                Fotoğraf Çek
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}



