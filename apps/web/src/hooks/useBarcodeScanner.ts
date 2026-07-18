import { useEffect, useRef } from 'react';

interface BarcodeScannerOptions {
  onScan: (code: string) => void;
  timeDelay?: number; // Tiempo máximo entre pulsaciones (ms) para diferenciar de teclado manual
  minScanLength?: number; // Longitud mínima del código
}

export function useBarcodeScanner({
  onScan,
  timeDelay = 50,
  minScanLength = 3,
}: BarcodeScannerOptions) {
  const bufferRef = useRef<string[]>([]);
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar teclas modificadoras o especiales excepto Enter
      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') {
        return;
      }

      // Si el elemento activo es un input de texto ordinario, a veces se quiere omitir, 
      // pero muchas veces el scanner escribe directo ahí. Capturamos a nivel global.
      const now = Date.now();
      const lastKeyTime = lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Si pasa demasiado tiempo entre teclas, limpiar el buffer (fue escrito a mano)
      if (now - lastKeyTime > timeDelay && bufferRef.current.length > 0) {
        bufferRef.current = [];
      }

      if (e.key === 'Enter') {
        if (bufferRef.current.length >= minScanLength) {
          const code = bufferRef.current.join('');
          onScan(code);
          // Prevenir comportamiento default del Enter si venía del scanner
          e.preventDefault();
        }
        bufferRef.current = [];
      } else {
        // Asegurar que sea una tecla de carácter simple
        if (e.key.length === 1) {
          bufferRef.current.push(e.key);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onScan, timeDelay, minScanLength]);
}
