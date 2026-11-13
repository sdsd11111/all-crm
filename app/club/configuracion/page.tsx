'use client'

import React, { useState, useEffect } from 'react'
import {
  Settings,
  Sliders,
  Smartphone,
  CheckCircle,
  XCircle,
  Save,
  Plus,
  Trash2,
  Users,
  Edit2,
  Upload,
  Check,
  X,
  CreditCard,
  Sparkles,
} from 'lucide-react'
import axios from 'axios'
import { useTheme } from '@/components/ThemeProvider'

export default function ClubConfig() {
  const theme = useTheme()
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'plans' | 'staff' | 'channels'>('whatsapp')

  // Sliders y Enlaces
  const [membershipCashback, setMembershipCashback] = useState(10)
  const [retailCashback, setRetailCashback] = useState(5)
  const [reviewUrl, setReviewUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  // Estado de conexión WhatsApp
  const [wsStatus, setWsStatus] = useState<'connected' | 'disconnected' | 'loading'>('loading')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [loadingQr, setLoadingQr] = useState(false)
  const [disconnectingWs, setDisconnectingWs] = useState(false)

  // Gestión de Personal del Club (Staff)
  const [coaches, setCoaches] = useState<any[]>([])
  const [newCoachName, setNewCoachName] = useState('')
  const [newCoachRole, setNewCoachRole] = useState('ENTRENADOR')
  const [addingCoach, setAddingCoach] = useState(false)
  const [newCoachAvatarUrl, setNewCoachAvatarUrl] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [editingCoachId, setEditingCoachId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editRole, setEditRole] = useState('ENTRENADOR')
  const [editAvatarUrl, setEditAvatarUrl] = useState('')
  const [updatingCoach, setUpdatingCoach] = useState(false)

  // Gestión de Planes de Membresía
  const [plans, setPlans] = useState<any[]>([])
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [newPlanName, setNewPlanName] = useState('')
  const [newPlanPrice, setNewPlanPrice] = useState('')
  const [newPlanCashback, setNewPlanCashback] = useState('2.00')
  const [newPlanMonths, setNewPlanMonths] = useState('1')
  const [addingPlan, setAddingPlan] = useState(false)
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [editPlanName, setEditPlanName] = useState('')
  const [editPlanPrice, setEditPlanPrice] = useState('')
  const [editPlanCashback, setEditPlanCashback] = useState('0')
  const [editPlanMonths, setEditPlanMonths] = useState('1')
  const [updatingPlan, setUpdatingPlan] = useState(false)


  const checkWhatsAppStatus = async () => {
    try {
      const res = await axios.get('/api/whatsapp/status')
      setWsStatus(res.data.connected || res.data.status === 'open' ? 'connected' : 'disconnected')
    } catch (e) {
      setWsStatus('disconnected')
    }
  }

  const getQrCode = async () => {
    setLoadingQr(true)
    try {
      const timestamp = new Date().getTime()
      setQrCode(`/api/whatsapp/qr?t=${timestamp}`)
      setWsStatus('disconnected')
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingQr(false)
    }
  }

  const handleDisconnectWhatsApp = async () => {
    if (!confirm('¿Estás seguro de desconectar la línea de WhatsApp? El bot dejará de responder mensajes hasta que vuelvas a vincularlo escaneando el código QR.')) {
      return
    }
    setDisconnectingWs(true)
    try {
      await axios.post('/api/whatsapp/logout')
      setWsStatus('disconnected')
      setQrCode(null)
      const timestamp = new Date().getTime()
      setQrCode(`/api/whatsapp/qr?t=${timestamp}`)
    } catch (e: any) {
      console.error('Error desconectando WhatsApp:', e)
      alert('Error al desconectar: ' + (e.response?.data?.error || e.message))
    } finally {
      setDisconnectingWs(false)
    }
  }

  const loadCoaches = async () => {
    try {
      const res = await axios.get('/api/club/coaches')
      setCoaches(res.data.coaches || [])
    } catch (e) {
      console.error('Error cargando coaches:', e)
    }
  }

  const loadPlans = async () => {
    try {
      setLoadingPlans(true)
      const res = await axios.get('/api/club/plans')
      setPlans(res.data.plans || [])
    } catch (e) {
      console.error('Error cargando planes:', e)
    } finally {
      setLoadingPlans(false)
    }
  }

  const handleAddPlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPlanName.trim() || !newPlanPrice) return
    try {
      setAddingPlan(true)
      const months = Math.max(1, parseInt(newPlanMonths) || 1)
      await axios.post('/api/club/plans', {
        name: newPlanName.trim(),
        price: parseFloat(newPlanPrice),
        cashbackAmount: parseFloat(newPlanCashback) || 0,
        durationDays: months * 30,
      })
      setNewPlanName('')
      setNewPlanPrice('')
      setNewPlanCashback('2.00')
      setNewPlanMonths('1')
      loadPlans()
    } catch (e: any) {
      alert('Error agregando plan: ' + (e.response?.data?.error || e.message))
    } finally {
      setAddingPlan(false)
    }
  }

  const handleDeletePlan = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este plan de membresía?')) return
    try {
      await axios.delete(`/api/club/plans?id=${id}`)
      loadPlans()
    } catch (e: any) {
      alert('Error eliminando plan: ' + (e.response?.data?.error || e.message))
    }
  }

  const startEditPlan = (plan: any) => {
    setEditingPlanId(plan.id)
    setEditPlanName(plan.name)
    setEditPlanPrice(String(plan.price))
    setEditPlanCashback(String(plan.cashbackAmount ?? 0))
    const calcMonths = Math.max(1, Math.round((plan.durationDays || 30) / 30))
    setEditPlanMonths(String(calcMonths))
  }

  const cancelEditPlan = () => {
    setEditingPlanId(null)
    setEditPlanName('')
    setEditPlanPrice('')
    setEditPlanCashback('0')
    setEditPlanMonths('1')
  }

  const handleUpdatePlan = async (id: string) => {
    if (!editPlanName.trim() || !editPlanPrice) {
      alert('Nombre y precio son obligatorios')
      return
    }
    try {
      setUpdatingPlan(true)
      const months = Math.max(1, parseInt(editPlanMonths) || 1)
      await axios.put('/api/club/plans', {
        id,
        name: editPlanName.trim(),
        price: parseFloat(editPlanPrice),
        cashbackAmount: parseFloat(editPlanCashback) || 0,
        durationDays: months * 30,
      })
      cancelEditPlan()
      loadPlans()
    } catch (e: any) {
      alert('Error actualizando plan: ' + (e.response?.data?.error || e.message))
    } finally {
      setUpdatingPlan(false)
    }
  }

  const handleAddCoach = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCoachName.trim()) return
    try {
      setAddingCoach(true)
      await axios.post('/api/club/coaches', {
        name: newCoachName,
        role: newCoachRole,
        avatarUrl: newCoachAvatarUrl || null
      })
      setNewCoachName('')
      setNewCoachRole('ENTRENADOR')
      setNewCoachAvatarUrl('')
      loadCoaches()
    } catch (e: any) {
      alert('Error agregando colaborador: ' + (e.response?.data?.error || e.message))
    } finally {
      setAddingCoach(false)
    }
  }

  const handleDeleteCoach = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar a este colaborador del equipo?')) return
    try {
      await axios.delete(`/api/club/coaches?id=${id}`)
      loadCoaches()
    } catch (e: any) {
      alert('Error eliminando colaborador: ' + (e.response?.data?.error || e.message))
    }
  }

  const startEditCoach = (coach: any) => {
    setEditingCoachId(coach.id)
    setEditName(coach.name)
    setEditRole(coach.role || 'ENTRENADOR')
    setEditAvatarUrl(coach.avatarUrl || '')
  }

  const cancelEditCoach = () => {
    setEditingCoachId(null)
    setEditName('')
    setEditRole('ENTRENADOR')
    setEditAvatarUrl('')
  }

  const handleUpdateCoach = async (id: string) => {
    if (!editName.trim()) {
      alert('El nombre es obligatorio')
      return
    }
    try {
      setUpdatingCoach(true)
      await axios.put('/api/club/coaches', {
        id,
        name: editName.trim(),
        role: editRole,
        avatarUrl: editAvatarUrl.trim() || null,
      })
      cancelEditCoach()
      loadCoaches()
    } catch (e: any) {
      alert('Error actualizando colaborador: ' + (e.response?.data?.error || e.message))
    } finally {
      setUpdatingCoach(false)
    }
  }

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>, target: 'NEW' | 'EDIT') => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    try {
      setUploadingAvatar(true)
      const res = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      if (res.data?.url) {
        if (target === 'NEW') {
          setNewCoachAvatarUrl(res.data.url)
        } else {
          setEditAvatarUrl(res.data.url)
        }
      }
    } catch (err: any) {
      alert('Error al subir imagen: ' + (err.response?.data?.error || err.message))
    } finally {
      setUploadingAvatar(false)
    }
  }

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await axios.get('/api/club/config')
        if (res.data) {
          setMembershipCashback(Number(res.data.referralCommPct) || 10)
          setRetailCashback(Number(res.data.storeReferralCommPct) || 5)
          setReviewUrl(res.data.googleReviewUrl || '')
        }
      } catch (e) {
        console.error('Error cargando configuración:', e)
      }
    }
    loadConfig()
    loadCoaches()
    loadPlans()
    checkWhatsAppStatus()

    const interval = setInterval(checkWhatsAppStatus, 10000)
    return () => clearInterval(interval)
  }, [])

  const handleSave = async () => {
    try {
      setSaving(true)
      setMessage('')
      await axios.post('/api/club/config', {
        referralCommPct: membershipCashback,
        storeReferralCommPct: retailCashback,
        googleReviewUrl: reviewUrl,
      })
      setMessage('✅ Configuración guardada con éxito.')
      setTimeout(() => setMessage(''), 4000)
    } catch (e: any) {
      alert('Error guardando configuración: ' + (e.response?.data?.error || e.message))
    } finally {
      setSaving(false)
    }
  }

  // Lista de 4 Módulos / Bento Tabs
  const bentoNavItems = [
    {
      id: 'whatsapp' as const,
      num: '01',
      title: 'Canal Oficial WhatsApp',
      subtitle: wsStatus === 'connected' ? 'En línea • Activo' : 'Desconectado • Requiere QR',
      icon: Smartphone,
      badge: wsStatus === 'connected' ? 'ACTIVO' : 'OFFLINE',
      badgeColor: wsStatus === 'connected' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : 'text-red-400 bg-red-500/10 border-red-500/30',
    },
    {
      id: 'plans' as const,
      num: '02',
      title: 'Planes de Membresía',
      subtitle: `${plans.length} planes registrados`,
      icon: CreditCard,
      badge: `${plans.length} ACTIVOS`,
      badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    },
    {
      id: 'staff' as const,
      num: '03',
      title: 'Personal & Entrenadores',
      subtitle: `${coaches.length} en sede ${theme.branchName || 'Activa'}`,
      icon: Users,
      badge: theme.branchName || 'SEDE',
      badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    },
    {
      id: 'channels' as const,
      num: '04',
      title: 'Reseñas & Google',
      subtitle: 'Enlace de Google Reviews 5 Estrellas',
      icon: Sliders,
      badge: 'RESEÑAS',
      badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    },
  ]


  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header Superior */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[var(--color-primary,#00F5D4)]/10 border border-[var(--color-primary,#00F5D4)]/30 text-[11px] font-black uppercase tracking-widest text-[var(--color-primary,#00F5D4)] mb-2">
            <Settings className="w-3.5 h-3.5" />
            PANEL DE CONTROL GENERAL
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
            CONFIGURACIÓN DEL CLUB & QR
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Gestión táctica modular: WhatsApp Evolution API, planes de membresía, personal y material imprimible.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-md hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 shrink-0"
          style={{ backgroundColor: 'var(--color-primary, #00F5D4)' }}
        >
          <Save className="w-4 h-4 text-black" />
          {saving ? 'Guardando...' : 'Guardar Todo'}
        </button>
      </div>

      {message && (
        <div
          className="p-4 rounded border text-sm font-bold animate-in fade-in flex items-center gap-2"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-primary, #00F5D4) 10%, transparent)',
            borderColor: 'color-mix(in srgb, var(--color-primary, #00F5D4) 30%, transparent)',
            color: 'var(--color-primary, #00F5D4)',
          }}
        >
          <CheckCircle className="w-4 h-4" />
          {message}
        </div>
      )}

      {/* Bento Layout Interactivo: Izquierda Tabs (320px) | Derecha Panel Dinámico */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Columna Izquierda: Pestañas de Navegación Estilo Bento */}
        <div className="lg:col-span-4 flex flex-col gap-2.5">
          <div className="px-2 py-1 flex items-center justify-between text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
            <span>Módulos de Configuración</span>
            <span className="text-[10px] text-zinc-500 font-mono">04 SECCIONES</span>
          </div>

          {bentoNavItems.map((item) => {
            const isActive = activeTab === item.id
            const Icon = item.icon
            return (
              <button
                key={item.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(item.id)}
                className={`w-full text-left p-3.5 sm:p-4 rounded border transition-all duration-200 relative group flex items-center gap-3.5 ${
                  isActive
                    ? 'bg-zinc-900 border-[var(--color-primary,#00F5D4)] shadow-[0_0_20px_rgba(0,245,212,0.12)] translate-x-1'
                    : 'bg-zinc-950/80 hover:bg-zinc-900/60 border-white/10 hover:border-white/20'
                }`}
              >
                {/* Indicador de Línea Activa a la izquierda */}
                {isActive && (
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-l"
                    style={{ backgroundColor: 'var(--color-primary, #00F5D4)' }}
                  />
                )}

                {/* Número Grande Bento */}
                <div
                  className={`font-mono text-xl sm:text-2xl font-black shrink-0 transition-colors ${
                    isActive ? 'text-[var(--color-primary,#00F5D4)]' : 'text-zinc-600 group-hover:text-zinc-400'
                  }`}
                >
                  {item.num}
                </div>

                {/* Info del Tab */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className={`text-xs sm:text-sm font-bold truncate ${isActive ? 'text-white' : 'text-zinc-300'}`}>
                      {item.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 truncate">
                    {item.subtitle}
                  </p>
                </div>

                {/* Badge de Estado */}
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border shrink-0 ${item.badgeColor}`}>
                  {item.badge}
                </span>
              </button>
            )
          })}

          {/* Tarjeta de Resumen Rápido / Tips */}
          <div className="mt-4 p-4 rounded bg-zinc-950 border border-white/5 space-y-2">
            <span className="text-[11px] font-black text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[var(--color-primary,#00F5D4)]" />
              Sede Activa en Sistema
            </span>
            <p className="text-xs text-zinc-300 font-semibold">
              {theme.branchName || 'Sede Principal'}
            </p>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Los cambios en personal y consultas impactan directamente sobre la sede seleccionada en la barra superior.
            </p>
          </div>
        </div>

        {/* Columna Derecha: Panel de Detalle Dinámico Bento */}
        <div className="lg:col-span-8">
          
          {/* TAB 01: CANAL OFICIAL DE WHATSAPP */}
          {activeTab === 'whatsapp' && (
            <div className="rounded border border-white/10 bg-[var(--bg-card,#05101C)] p-6 sm:p-7 space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-[var(--color-primary,#00F5D4)]/10 border border-[var(--color-primary,#00F5D4)]/30 flex items-center justify-center text-[var(--color-primary,#00F5D4)]">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
                      Canal Oficial de WhatsApp (Evolution API)
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Conexión directa del bot para bienvenida, fidelización y captura de datos.
                    </p>
                  </div>
                </div>

                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-black uppercase tracking-wider border shrink-0 ${
                    wsStatus === 'connected'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-red-500/10 text-red-400 border-red-500/30'
                  }`}
                >
                  {wsStatus === 'connected' ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" /> En Línea
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5" /> Desconectado
                    </>
                  )}
                </div>
              </div>

              {/* Contenido según estado de conexión */}
              {wsStatus !== 'connected' ? (
                <div className="space-y-4">
                  <div className="p-4 rounded bg-zinc-900/60 border border-white/5 space-y-1">
                    <span className="text-xs font-bold text-amber-400">Instancia en espera de vinculación</span>
                    <p className="text-xs text-zinc-400">
                      Haz clic en el botón para solicitar el código QR y luego escanéalo con la cámara de WhatsApp desde tu teléfono.
                    </p>
                  </div>

                  {!qrCode ? (
                    <button
                      onClick={getQrCode}
                      disabled={loadingQr}
                      className="w-full text-black p-4 rounded flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest transition-all shadow-lg hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                      style={{ backgroundColor: 'var(--color-primary, #00F5D4)' }}
                    >
                      <Smartphone className="w-4 h-4 text-black" />
                      {loadingQr ? 'Generando Código QR...' : 'Conectar Línea WhatsApp'}
                    </button>
                  ) : (
                    <div className="bg-zinc-900 border border-white/10 p-6 rounded space-y-4 text-center animate-in zoom-in-95 duration-200">
                      <div>
                        <h4 className="font-bold text-white text-base">Escanea este código con WhatsApp</h4>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Abre WhatsApp en tu teléfono &gt; Dispositivos vinculados &gt; Vincular un dispositivo.
                        </p>
                      </div>

                      <div className="flex justify-center p-3 bg-white rounded max-w-[260px] mx-auto border-2 border-[var(--color-primary,#00F5D4)]">
                        <img
                          src={qrCode}
                          alt="Código QR de WhatsApp"
                          className="w-56 h-56 object-contain"
                        />
                      </div>

                      <div className="flex justify-center gap-4 pt-2">
                        <button
                          onClick={getQrCode}
                          disabled={loadingQr}
                          className="text-xs text-zinc-300 hover:text-white underline font-semibold"
                        >
                          {loadingQr ? 'Refrescando...' : 'Regenerar QR'}
                        </button>
                        <button
                          onClick={() => setQrCode(null)}
                          className="text-xs text-red-400 hover:text-red-300 underline font-semibold"
                        >
                          Cerrar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4" />
                      Línea conectada correctamente y escuchando webhooks
                    </span>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      El sistema está respondiendo solicitudes de QR (MEM, EVAL, RET), registro de nombres completos de socios nuevos y entrega de beneficios en tiempo real.
                    </p>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleDisconnectWhatsApp}
                      disabled={disconnectingWs}
                      className="px-4 py-2.5 rounded border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      {disconnectingWs ? 'Desconectando...' : 'Desconectar WhatsApp'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 02: PLANES DE MEMBRESÍA */}
          {activeTab === 'plans' && (
            <div className="rounded border border-white/10 bg-[var(--bg-card,#05101C)] p-6 sm:p-7 space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-[var(--color-primary,#00F5D4)]/10 border border-[var(--color-primary,#00F5D4)]/30 flex items-center justify-center text-[var(--color-primary,#00F5D4)]">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
                      Planes de Membresía & Tarifas
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Define los precios de venta, meses de vigencia y cashback asignado al socio.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded border border-white/10">
                  {plans.length} Planes
                </span>
              </div>

              {/* Formulario para agregar nuevo plan */}
              <form onSubmit={handleAddPlan} className="space-y-4 bg-zinc-900/60 p-4 rounded border border-white/10">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Crear Nuevo Plan de Membresía</span>
                  <span className="text-[11px] text-zinc-400">Ingresa duración en meses o días</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                      Nombre del Plan
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Mensualidad VIP, Trimestre..."
                      value={newPlanName}
                      onChange={(e) => setNewPlanName(e.target.value)}
                      className="w-full px-3 py-2 bg-black border border-white/10 rounded text-xs text-white focus:outline-none placeholder-zinc-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                      Precio ($ USD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs text-zinc-400 font-bold">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        placeholder="0.00"
                        value={newPlanPrice}
                        onChange={(e) => setNewPlanPrice(e.target.value)}
                        className="w-full pl-7 pr-3 py-2 bg-black border border-white/10 rounded text-xs text-white focus:outline-none placeholder-zinc-500 font-bold"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                      Cashback Retorno ($)
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-xs text-emerald-400 font-bold">+$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="2.00"
                        value={newPlanCashback}
                        onChange={(e) => setNewPlanCashback(e.target.value)}
                        className="w-full pl-8 pr-2 py-2 bg-black border border-white/10 rounded text-xs text-white focus:outline-none placeholder-zinc-500 font-bold"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1">
                      Duración (Meses)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        required
                        placeholder="1"
                        value={newPlanMonths}
                        onChange={(e) => setNewPlanMonths(e.target.value)}
                        className="w-full pl-3 pr-2 py-2 bg-black border border-white/10 rounded text-xs text-white focus:outline-none font-bold text-center"
                      />
                      <button
                        type="submit"
                        disabled={addingPlan}
                        className="px-4 py-2 text-black font-black text-xs rounded transition-all flex items-center justify-center gap-1 shrink-0 shadow hover:scale-105 disabled:opacity-50"
                        style={{ backgroundColor: 'var(--color-primary, #00F5D4)' }}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{addingPlan ? '...' : 'Añadir'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </form>

              {/* Lista de planes de membresía */}
              <div className="divide-y divide-white/10 max-h-96 overflow-y-auto space-y-1">
                {plans.length === 0 ? (
                  <div className="text-center py-8 text-xs text-zinc-500">
                    No hay planes registrados aún. Crea uno con el formulario superior.
                  </div>
                ) : (
                  plans.map((p) => {
                    const isEditing = editingPlanId === p.id
                    const cashbackAmt = p.cashbackAmount !== undefined && p.cashbackAmount !== null
                      ? Number(p.cashbackAmount).toFixed(2)
                      : '0.00'
                    const planMonths = Math.max(1, Math.round((p.durationDays || 30) / 30))

                    return (
                      <div key={p.id} className="py-2.5">
                        {isEditing ? (
                          <div className="p-3.5 bg-zinc-900 rounded border border-white/10 space-y-3 animate-in fade-in">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white uppercase tracking-wider">Editar Plan</span>
                              <button
                                type="button"
                                onClick={cancelEditPlan}
                                className="text-zinc-500 hover:text-white text-xs p-1"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end">
                              <div>
                                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Nombre</label>
                                <input
                                  type="text"
                                  value={editPlanName}
                                  onChange={(e) => setEditPlanName(e.target.value)}
                                  className="w-full px-3 py-1.5 bg-black border border-white/10 rounded text-xs text-white focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Precio USD</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editPlanPrice}
                                  onChange={(e) => setEditPlanPrice(e.target.value)}
                                  className="w-full px-3 py-1.5 bg-black border border-white/10 rounded text-xs text-white focus:outline-none font-bold"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Cashback $</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editPlanCashback}
                                  onChange={(e) => setEditPlanCashback(e.target.value)}
                                  className="w-full px-3 py-1.5 bg-black border border-white/10 rounded text-xs text-white focus:outline-none font-bold text-emerald-400"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Meses</label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={editPlanMonths}
                                    onChange={(e) => setEditPlanMonths(e.target.value)}
                                    className="w-full px-3 py-1.5 bg-black border border-white/10 rounded text-xs text-white focus:outline-none font-bold"
                                  />
                                  <button
                                    onClick={() => handleUpdatePlan(p.id)}
                                    disabled={updatingPlan}
                                    className="px-3 py-1.5 bg-green-500 hover:bg-green-400 text-black font-bold text-xs rounded transition-colors flex items-center gap-1 shrink-0"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between p-2.5 rounded hover:bg-white/5 transition-all">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-9 h-9 rounded flex items-center justify-center font-bold text-xs border"
                                style={{
                                  color: 'var(--color-primary, #00F5D4)',
                                  backgroundColor: 'color-mix(in srgb, var(--color-primary, #00F5D4) 10%, transparent)',
                                  borderColor: 'color-mix(in srgb, var(--color-primary, #00F5D4) 20%, transparent)',
                                }}
                              >
                                ${Number(p.price).toFixed(0)}
                              </div>
                              <div>
                                <span className="text-sm font-bold text-white block">{p.name}</span>
                                <div className="flex items-center gap-2 text-xs text-zinc-400">
                                  <span>${Number(p.price).toFixed(2)} USD</span>
                                  <span>&bull;</span>
                                  <span className="font-semibold text-zinc-300">
                                    {planMonths === 1 ? '1 Mes' : `${planMonths} Meses`} ({p.durationDays} días)
                                  </span>
                                  <span>&bull;</span>
                                  <span style={{ color: 'var(--color-primary, #00F5D4)' }} className="font-bold">
                                    +${cashbackAmt} cashback
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => startEditPlan(p)}
                                title="Editar plan"
                                className="p-1.5 rounded bg-zinc-900 text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeletePlan(p.id)}
                                title="Eliminar plan"
                                className="p-1.5 rounded bg-zinc-900 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 03: PERSONAL & ENTRENADORES */}
          {activeTab === 'staff' && (
            <div className="rounded border border-white/10 bg-[var(--bg-card,#05101C)] p-6 sm:p-7 space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-[var(--color-primary,#00F5D4)]/10 border border-[var(--color-primary,#00F5D4)]/30 flex items-center justify-center text-[var(--color-primary,#00F5D4)]">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
                      Equipo y Personal del Club
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Sede activa: <strong className="text-white">{theme.branchName || 'Sede Principal'}</strong>
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded border border-white/10">
                  {coaches.length} en sede
                </span>
              </div>

              {/* Formulario nuevo colaborador */}
              <form onSubmit={handleAddCoach} className="space-y-3 bg-zinc-900/60 p-4 rounded border border-white/10">
                <span className="text-xs font-bold text-white uppercase tracking-wider block">Registrar Colaborador</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Nombre completo del colaborador..."
                    value={newCoachName}
                    onChange={(e) => setNewCoachName(e.target.value)}
                    className="sm:col-span-2 px-3 py-2 bg-black border border-white/10 rounded text-xs text-white focus:outline-none"
                  />
                  <select
                    value={newCoachRole}
                    onChange={(e) => setNewCoachRole(e.target.value)}
                    className="px-3 py-2 bg-black border border-white/10 rounded text-xs text-white focus:outline-none"
                  >
                    <option value="RECEPCION">Recepción</option>
                    <option value="ENTRENADOR">Entrenador / Coach</option>
                    <option value="LIMPIEZA">Limpieza / Mtto</option>
                    <option value="GERENCIA">Gerencia / Admin</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="URL de foto o sube una imagen..."
                    value={newCoachAvatarUrl}
                    onChange={(e) => setNewCoachAvatarUrl(e.target.value)}
                    className="flex-1 px-3 py-2 bg-black border border-white/10 rounded text-xs text-white focus:outline-none placeholder-zinc-500"
                  />
                  <label className="cursor-pointer px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 flex items-center gap-1.5 transition-colors shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingAvatar ? 'Subiendo...' : 'Subir Foto'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleUploadImage(e, 'NEW')}
                      className="hidden"
                      disabled={uploadingAvatar}
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={addingCoach || uploadingAvatar}
                    className="px-4 py-2 text-black font-black text-xs rounded transition-all flex items-center gap-1.5 shrink-0 shadow hover:scale-105 disabled:opacity-50"
                    style={{ backgroundColor: 'var(--color-primary, #00F5D4)' }}
                  >
                    <Plus className="w-3.5 h-3.5 text-black" />
                    Agregar
                  </button>
                </div>
              </form>

              {/* Lista de colaboradores */}
              <div className="divide-y divide-white/10 max-h-96 overflow-y-auto space-y-1">
                {coaches.length === 0 ? (
                  <div className="text-center py-8 text-xs text-zinc-500">
                    No hay colaboradores asignados a esta sede todavía.
                  </div>
                ) : (
                  coaches.map((c) => {
                    const isEditing = editingCoachId === c.id
                    const roleLabels: Record<string, string> = {
                      RECEPCION: 'Recepción',
                      ENTRENADOR: 'Entrenador',
                      TRAINER: 'Entrenador',
                      LIMPIEZA: 'Limpieza',
                      GERENCIA: 'Gerencia',
                      MANAGER: 'Gerencia',
                    }
                    const roleBadge = roleLabels[c.role] || c.role || 'Personal'

                    return (
                      <div key={c.id} className="py-2.5">
                        {isEditing ? (
                          <div className="p-3.5 bg-zinc-900 rounded border border-white/10 space-y-2.5 animate-in fade-in">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white uppercase tracking-wider">Editar Colaborador</span>
                              <button
                                type="button"
                                onClick={cancelEditCoach}
                                className="text-zinc-500 hover:text-white text-xs p-1"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="Nombre del colaborador"
                                className="sm:col-span-2 px-3 py-1.5 bg-black border border-white/10 rounded text-xs text-white focus:outline-none"
                              />
                              <select
                                value={editRole}
                                onChange={(e) => setEditRole(e.target.value)}
                                className="px-2 py-1.5 bg-black border border-white/10 rounded text-xs text-white focus:outline-none"
                              >
                                <option value="RECEPCION">Recepción</option>
                                <option value="ENTRENADOR">Entrenador</option>
                                <option value="LIMPIEZA">Limpieza</option>
                                <option value="GERENCIA">Gerencia</option>
                              </select>
                            </div>

                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editAvatarUrl}
                                onChange={(e) => setEditAvatarUrl(e.target.value)}
                                placeholder="URL de foto o avatar..."
                                className="flex-1 px-3 py-1.5 bg-black border border-white/10 rounded text-xs text-white focus:outline-none"
                              />
                              <label className="cursor-pointer px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] font-bold text-zinc-300 flex items-center gap-1.5 shrink-0">
                                <Upload className="w-3 h-3" />
                                <span>{uploadingAvatar ? '...' : 'Subir'}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleUploadImage(e, 'EDIT')}
                                  className="hidden"
                                  disabled={uploadingAvatar}
                                />
                              </label>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={cancelEditCoach}
                                className="px-3 py-1 text-xs text-zinc-400 hover:text-white"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateCoach(c.id)}
                                disabled={updatingCoach}
                                className="px-3 py-1 text-black font-bold text-xs rounded flex items-center gap-1"
                                style={{ backgroundColor: 'var(--color-primary, #00F5D4)' }}
                              >
                                <Check className="w-3.5 h-3.5 text-black" />
                                {updatingCoach ? 'Guardando...' : 'Guardar'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-3 p-2 rounded hover:bg-white/5 transition-all">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded overflow-hidden bg-zinc-900 border border-white/10 shrink-0 flex items-center justify-center">
                                {c.avatarUrl ? (
                                  <img src={c.avatarUrl} alt={c.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-sm font-black text-zinc-400">{c.name.charAt(0)}</span>
                                )}
                              </div>
                              <div>
                                <span className="text-sm font-bold text-white block">{c.name}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-300 font-semibold inline-block mt-0.5 uppercase tracking-wider">
                                  {roleBadge}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => startEditCoach(c)}
                                title="Editar colaborador y foto"
                                className="p-1.5 rounded bg-zinc-900 text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteCoach(c.id)}
                                title="Eliminar colaborador"
                                className="p-1.5 rounded bg-zinc-900 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 04: CANALES DE OPINIÓN & CONTACTO */}
          {activeTab === 'channels' && (
            <div className="rounded border border-white/10 bg-[var(--bg-card,#05101C)] p-6 sm:p-7 space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-[var(--color-primary,#00F5D4)]/10 border border-[var(--color-primary,#00F5D4)]/30 flex items-center justify-center text-[var(--color-primary,#00F5D4)]">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
                      Canales Oficiales & Enlaces de Fidelización
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Direccionamiento de socios para opiniones en Google y contacto oficial.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-zinc-200 uppercase tracking-wider">
                    Enlace Directo de Google Reviews (5 Estrellas)
                  </label>
                  <input
                    type="text"
                    value={reviewUrl}
                    onChange={(e) => setReviewUrl(e.target.value)}
                    placeholder="https://g.page/r/titanus-gym/review"
                    className="w-full px-4 py-2.5 bg-black border border-white/10 rounded text-xs text-white focus:outline-none"
                  />
                  <span className="text-[11px] text-zinc-500 block">
                    Enlace enviado automáticamente cuando el socio otorga 5 estrellas en las encuestas de satisfacción.
                  </span>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-5 py-2.5 rounded text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow hover:scale-[1.02] disabled:opacity-50"
                    style={{ backgroundColor: 'var(--color-primary, #00F5D4)' }}
                  >
                    <Save className="w-4 h-4 text-black" />
                    {saving ? 'Guardando...' : 'Guardar Ajustes'}
                  </button>
                </div>
              </div>
            </div>
          )}


        </div>
      </div>
    </div>
  )
}
