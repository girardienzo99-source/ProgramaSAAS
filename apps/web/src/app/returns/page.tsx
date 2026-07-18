'use client';

import React from 'react';
import AppShell from '@/components/layout/AppShell';
import ReturnsConsole from '@/components/products/ReturnsConsole';

export default function ReturnsPage() {
  return (
    <AppShell
      eyebrow="Logística Inversa"
      title="Cambios y Devoluciones"
      description="Gestionar el cambio de prendas por talle/color y emitir notas de crédito por devoluciones."
      status="Control de Calidad Activo"
    >
      <ReturnsConsole />
    </AppShell>
  );
}
