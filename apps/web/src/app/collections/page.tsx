'use client';

import React from 'react';
import AppShell from '@/components/layout/AppShell';
import CollectionsConsole from '@/components/products/CollectionsConsole';

export default function CollectionsPage() {
  return (
    <AppShell
      eyebrow="Diseño de Campaña"
      title="Diseño de Colecciones & Temporadas"
      description="Crear colecciones, programar márgenes de ganancia, fijar rebajas y activar códigos promocionales."
      status="Planificación Activa"
    >
      <CollectionsConsole />
    </AppShell>
  );
}
