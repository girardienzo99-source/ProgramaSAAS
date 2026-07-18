'use client';

import React from 'react';
import AppShell from '@/components/layout/AppShell';
import FittingRoomConsole from '@/components/products/FittingRoomConsole';

export default function FittingRoomPage() {
  return (
    <AppShell
      eyebrow="Probador Virtual"
      title="Recomendador de Talles IA"
      description="Calcular el talle perfecto basado en anatometría corporal para optimizar devoluciones."
      status="IA Activa"
    >
      <FittingRoomConsole />
    </AppShell>
  );
}
