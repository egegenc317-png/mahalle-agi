"use client";

import { useEffect } from "react";

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return <div className="fixed bottom-4 right-4 rounded-md bg-black px-3 py-2 text-sm text-white">{message}</div>;
}
