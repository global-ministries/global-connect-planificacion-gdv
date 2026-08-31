"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global application error:", error);
  }, [error]);

  return (
    <html lang="es">
      <body className="min-h-screen bg-[#0E0E12] text-[#FAFAF8] flex items-center justify-center p-4 font-sans antialiased">
        <div className="max-w-md w-full p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800 text-center space-y-4 shadow-2xl backdrop-blur-md">
          <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 mx-auto flex items-center justify-center text-xl font-bold border border-red-500/20">
            !
          </div>
          <h2 className="text-xl font-semibold text-white">Algo salió mal</h2>
          <p className="text-sm text-neutral-400">
            {error?.message || "Ocurrió un error inesperado en la aplicación."}
          </p>
          <div className="pt-2 flex gap-3">
            <button
              onClick={() => reset()}
              className="flex-1 py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-medium text-sm transition-colors cursor-pointer"
            >
              Reintentar
            </button>
            <button
              onClick={() => window.location.href = "/dashboard"}
              className="flex-1 py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium text-sm transition-colors cursor-pointer"
            >
              Ir al Inicio
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

