'use client';

import React, { useState } from 'react';
import { 
  Users, UserPlus, Search, ShieldCheck, Mail, Phone, MapPin, 
  CreditCard, DollarSign, ArrowUpRight, ArrowDownRight, Trash2, Edit, Plus, Info 
} from 'lucide-react';
import { Client, Provider } from '@programa-sass/shared-types';

// Mock de clientes iniciales con cuentas corrientes
const INITIAL_CLIENTS = [
  { id: 'c1', company_id: 'c-test', name: 'Juan Pérez', tax_id: '20-35678901-4', tax_condition: 'Responsable Inscripto', email: 'juan.perez@email.com', phone: '11-4567-8901', address: 'Corrientes 500, CABA', balance: -8500.00 }, // saldo negativo = debe dinero
  { id: 'c2', company_id: 'c-test', name: 'María Rodríguez', tax_id: '27-40123456-2', tax_condition: 'Consumidor Final', email: 'maria.rod@email.com', phone: '11-9876-5432', address: 'Medrano 1200, CABA', balance: 0.00 },
  { id: 'c3', company_id: 'c-test', name: 'Distribuidora S.A.', tax_id: '30-55443322-9', tax_condition: 'Monotributo', email: 'ventas@distribuidora.com', phone: '11-5555-0199', address: 'Av. Libertador 3000, CABA', balance: 12500.00 } // saldo positivo = pago a cuenta/saldo a favor
];

// Mock de proveedores
const INITIAL_PROVIDERS = [
  { id: 'pr1', company_id: 'c-test', name: 'Fábrica Textil Argentina', tax_id: '30-70123456-9', address: 'Alvear 450, San Martín', phone: '11-4321-0987', contact_name: 'Alberto Gómez', balance: -45000.00 }, // debemos dinero al proveedor
  { id: 'pr2', company_id: 'c-test', name: 'Mayorista Alimentos S.R.L.', tax_id: '30-66554433-2', address: 'Av. Warnes 1500, CABA', phone: '11-6666-0122', contact_name: 'Claudia López', balance: 0.00 }
];

export default function ContactsConsole() {
  const [activeTab, setActiveTab] = useState<'clients' | 'providers'>('clients');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Listas de datos
  const [clients, setClients] = useState(INITIAL_CLIENTS);
  const [providers, setProviders] = useState(INITIAL_PROVIDERS);

  // Modales
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  
  // Contexto de pago/cobro de Cuenta Corriente
  const [selectedContact, setSelectedContact] = useState<{ id: string; name: string; balance: number; type: 'client' | 'provider' } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Formulario nuevo contacto
  const [newName, setNewName] = useState('');
  const [newTaxId, setNewTaxId] = useState('');
  const [newTaxCondition, setNewTaxCondition] = useState('Consumidor Final');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newContactName, setNewContactName] = useState(''); // Solo para proveedores

  const handleCreateContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;

    if (activeTab === 'clients') {
      const newClient = {
        id: `c-${Date.now()}`,
        company_id: 'c-test',
        name: newName,
        tax_id: newTaxId || 'N/A',
        tax_condition: newTaxCondition,
        email: newEmail || 'N/A',
        phone: newPhone || 'N/A',
        address: newAddress || 'N/A',
        balance: 0.00
      };
      setClients([newClient, ...clients]);
    } else {
      const newProvider = {
        id: `pr-${Date.now()}`,
        company_id: 'c-test',
        name: newName,
        tax_id: newTaxId || 'N/A',
        address: newAddress || 'N/A',
        phone: newPhone || 'N/A',
        contact_name: newContactName || 'N/A',
        balance: 0.00
      };
      setProviders([newProvider, ...providers]);
    }

    // Reset Form
    setIsAddModalOpen(false);
    setNewName('');
    setNewTaxId('');
    setNewEmail('');
    setNewPhone('');
    setNewAddress('');
    setNewContactName('');
  };

  // Registrar pago / cobro en Cuenta Corriente
  const handleOpenPayment = (contact: any, type: 'client' | 'provider') => {
    setSelectedContact({
      id: contact.id,
      name: contact.name,
      balance: contact.balance,
      type
    });
    setPaymentAmount('');
    setPaymentNotes('');
    setIsPaymentModalOpen(true);
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact) return;
    const amount = Number(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;

    if (selectedContact.type === 'client') {
      // Registrar cobranza a cliente: achica su deuda (suma saldo a su favor)
      setClients(clients.map(c => {
        if (c.id === selectedContact.id) {
          return { ...c, balance: c.balance + amount };
        }
        return c;
      }));
      alert(`Cobranza de $${amount} registrada para el cliente ${selectedContact.name}.`);
    } else {
      // Registrar pago a proveedor: achica nuestra deuda (suma saldo a favor / reduce saldo deudor)
      setProviders(providers.map(p => {
        if (p.id === selectedContact.id) {
          return { ...p, balance: p.balance + amount };
        }
        return p;
      }));
      alert(`Pago de $${amount} registrado para el proveedor ${selectedContact.name}.`);
    }

    setIsPaymentModalOpen(false);
  };

  const handleDeleteContact = (id: string, type: 'client' | 'provider') => {
    if (confirm(`¿Estás seguro de eliminar este ${type === 'client' ? 'cliente' : 'proveedor'}?`)) {
      if (type === 'client') {
        setClients(clients.filter(c => c.id !== id));
      } else {
        setProviders(providers.filter(p => p.id !== id));
      }
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.tax_id.includes(searchTerm) ||
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredProviders = providers.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.tax_id.includes(searchTerm) ||
    (p.contact_name && p.contact_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 text-slate-100 flex flex-col gap-6">
      
      {/* Header Sección */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2 bg-gradient-to-tr from-cyan-500 to-indigo-600 rounded-xl shadow-lg">
              <Users className="h-6 w-6 text-white" />
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Agenda de Contactos & Cuentas
            </h1>
          </div>
          <p className="mt-2 text-slate-400 text-sm">
            Administración unificada de Clientes y Proveedores. Control y arqueo de saldos de Cuentas Corrientes.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-white font-bold text-sm shadow-md transition-all duration-200"
        >
          <UserPlus className="h-4.5 w-4.5" />
          {activeTab === 'clients' ? 'Nuevo Cliente' : 'Nuevo Proveedor'}
        </button>
      </div>

      {/* Tabs Clientes / Proveedores */}
      <div className="flex bg-slate-900/80 rounded-xl p-1 border border-slate-800 w-fit">
        <button
          onClick={() => { setActiveTab('clients'); setSearchTerm(''); }}
          className={`px-5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${activeTab === 'clients' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
        >
          Clientes ({clients.length})
        </button>
        <button
          onClick={() => { setActiveTab('providers'); setSearchTerm(''); }}
          className={`px-5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${activeTab === 'providers' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
        >
          Proveedores ({providers.length})
        </button>
      </div>

      {/* Barra de Filtros */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
        <input
          type="text"
          placeholder={activeTab === 'clients' ? "Buscar cliente por nombre, CUIT/DNI, email..." : "Buscar proveedor por nombre, CUIT, contacto..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-2.5 pl-11 pr-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-sm"
        />
      </div>

      {/* Grilla / Listados */}
      {activeTab === 'clients' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map(c => {
            const hasDebt = c.balance < 0;
            return (
              <div key={c.id} className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all group">
                <div>
                  <div className="flex items-start justify-between">
                    <span className="text-[10px] bg-slate-950 text-slate-400 border border-slate-850 px-2 py-0.5 rounded font-mono">
                      {c.tax_condition}
                    </span>
                    <button 
                      onClick={() => handleDeleteContact(c.id, 'client')}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-950"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <h3 className="text-base font-bold text-white mt-3">{c.name}</h3>
                  <p className="text-xs text-slate-500 font-mono mt-1">CUIT/DNI: {c.tax_id}</p>

                  <div className="mt-4 space-y-2 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-slate-600" />
                      <span>{c.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-slate-600" />
                      <span>{c.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-slate-600" />
                      <span className="line-clamp-1">{c.address}</span>
                    </div>
                  </div>
                </div>

                {/* Cuenta Corriente */}
                <div className="mt-6 pt-4 border-t border-slate-850 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Cuenta Corriente</span>
                    <span className={`text-base font-extrabold ${hasDebt ? 'text-red-400' : c.balance > 0 ? 'text-emerald-450' : 'text-slate-400'}`}>
                      {hasDebt ? `Debe $${Math.abs(c.balance).toFixed(2)}` : c.balance > 0 ? `A favor $${c.balance.toFixed(2)}` : 'Saldado ($0.00)'}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => handleOpenPayment(c, 'client')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-slate-300 hover:text-white border border-slate-750"
                  >
                    <DollarSign className="h-3.5 w-3.5" />
                    Cobrar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProviders.map(p => {
            const weOwe = p.balance < 0;
            return (
              <div key={p.id} className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all group">
                <div>
                  <div className="flex items-start justify-between">
                    <span className="text-[10px] bg-slate-950 text-slate-450 px-2 py-0.5 rounded font-bold">
                      Proveedor
                    </span>
                    <button 
                      onClick={() => handleDeleteContact(p.id, 'provider')}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-950"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <h3 className="text-base font-bold text-white mt-3">{p.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 font-medium">Contacto: {p.contact_name}</p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">CUIT: {p.tax_id}</p>

                  <div className="mt-4 space-y-2 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-slate-600" />
                      <span>{p.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-slate-600" />
                      <span className="line-clamp-1">{p.address}</span>
                    </div>
                  </div>
                </div>

                {/* Cuenta Corriente Proveedor */}
                <div className="mt-6 pt-4 border-t border-slate-850 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Cuenta Corriente</span>
                    <span className={`text-base font-extrabold ${weOwe ? 'text-red-400' : p.balance > 0 ? 'text-emerald-450' : 'text-slate-400'}`}>
                      {weOwe ? `Debemos $${Math.abs(p.balance).toFixed(2)}` : p.balance > 0 ? `A favor $${p.balance.toFixed(2)}` : 'Saldado ($0.00)'}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => handleOpenPayment(p, 'provider')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-slate-350 hover:text-white border border-slate-750"
                  >
                    <DollarSign className="h-3.5 w-3.5" />
                    Pagar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Nuevo Contacto */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-black text-white mb-4">
              Agregar {activeTab === 'clients' ? 'Cliente' : 'Proveedor'}
            </h3>

            <form onSubmit={handleCreateContact} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nombre / Razón Social</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-200 text-xs focus:outline-none"
                  placeholder="Ej: Distribuidora SRL o Juan López"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">CUIT / CUIL / DNI</label>
                  <input
                    type="text"
                    value={newTaxId}
                    onChange={(e) => setNewTaxId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-200 text-xs focus:outline-none font-mono"
                    placeholder="20-XXXXXXXX-X"
                  />
                </div>
                {activeTab === 'clients' ? (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Condición IVA</label>
                    <select
                      value={newTaxCondition}
                      onChange={(e) => setNewTaxCondition(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-300 text-xs focus:outline-none"
                    >
                      <option value="Consumidor Final">Consumidor Final</option>
                      <option value="Responsable Inscripto">Responsable Inscripto</option>
                      <option value="Monotributo">Monotributo</option>
                      <option value="Exento">Exento</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nombre de Contacto</label>
                    <input
                      type="text"
                      value={newContactName}
                      onChange={(e) => setNewContactName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-200 text-xs focus:outline-none"
                      placeholder="Ej: Pedro Ramos"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Teléfono</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-200 text-xs focus:outline-none"
                    placeholder="11-XXXX-XXXX"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-200 text-xs focus:outline-none"
                    placeholder="ejemplo@correo.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Dirección Física</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-200 text-xs focus:outline-none"
                  placeholder="Calle Nro, Localidad"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-xs font-bold"
                >
                  Crear Ficha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cobro / Pago de Cuenta Corriente */}
      {isPaymentModalOpen && selectedContact && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-black text-white mb-1">
              {selectedContact.type === 'client' ? 'Cobranza en Cuenta Corriente' : 'Pago a Cuenta'}
            </h3>
            <p className="text-slate-400 text-xs mb-4">
              Contacto: <strong className="text-cyan-400">{selectedContact.name}</strong>
            </p>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 mb-4 text-xs">
              <span className="text-slate-500 uppercase tracking-wider block text-[9px] font-bold">Saldo Actual</span>
              <span className={`text-base font-extrabold ${selectedContact.balance < 0 ? 'text-red-400' : 'text-slate-350'}`}>
                {selectedContact.balance < 0 ? `Deuda de $${Math.abs(selectedContact.balance).toFixed(2)}` : `$${selectedContact.balance.toFixed(2)}`}
              </span>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Monto a {selectedContact.type === 'client' ? 'Cobrar' : 'Pagar'} ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-200 text-sm focus:outline-none"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Detalle / Notas</label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 text-xs focus:outline-none"
                  placeholder="Ej: Pago efectivo de saldo pendiente"
                  rows={2}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="w-full py-2.5 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold rounded-xl text-xs"
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
