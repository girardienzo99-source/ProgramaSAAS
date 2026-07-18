'use client';

import React from 'react';
import AppShell from '@/components/layout/AppShell';
import LoyaltyConsole from '@/components/products/LoyaltyConsole';

export default function LoyaltyPage() {
  return (
    <AppShell
      eyebrow="Club de Socios"
      title="Club de Puntos & Fidelización"
      description="Gestionar acumulación de puntos, niveles VIP y canje de premios de e-commerce."
      status="Fidelización Activa"
    >
      <LoyaltyConsole />
    </AppShell>
  );
}
