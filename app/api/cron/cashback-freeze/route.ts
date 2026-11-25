import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWhatsAppMessage } from '@/lib/evolution'

export const dynamic = 'force-dynamic'

/**
 * Cron: Congelación de Cashback Expirado (Multi-Tenant)
 * 
 * Se ejecuta diariamente. Detecta wallets con saldo positivo cuyo cashback ha
 * expirado (membershipExpiry + 30 días de gracia < ahora) y que aún no han sido
 * congeladas (cashbackFrozenAt IS NULL).
 *
 * Lo que hace:
 *   1. Registra la fecha y el saldo al momento de congelar (cashbackFrozenAt, cashbackFrozenBalance).
 *   2. El campo `balance` NUNCA se borra. Sigue en la DB para recuperación futura.
 *   3. Toda la lógica de UI lee `effectiveBalance = cashbackFrozenAt ? 0 : balance`.
 *   4. Envía WhatsApp de notificación al socio (una sola vez).
 *   5. Registra una WalletTransaction tipo CASHBACK_FROZEN para auditoría completa.
 *
 * Restitución:
 *   Si el socio vuelve, el admin usa POST /api/club/wallet/reinstate para
 *   limpiar cashbackFrozenAt y restaurar el saldo histórico.
 */
export async function GET(req: NextRequest) {
  return handleFreeze(req)
}

export async function POST(req: NextRequest) {
  return handleFreeze(req)
}

async function handleFreeze(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const key = searchParams.get('key') || req.headers.get('authorization')?.replace('Bearer ', '')
    const CRON_SECRET = process.env.CRON_SECRET || 'titanus_cron_secure_key_2026'

    if (key !== CRON_SECRET) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const now = new Date()

    // Buscar wallets candidatas:
    // - Con saldo positivo (hay algo que congelar)
    // - Sin congelación previa (cashbackFrozenAt IS NULL)
    // - Cuyo cliente tenga membershipExpiry registrada
    const candidates = await prisma.wallet.findMany({
      where: {
        balance: { gt: 0 },
        cashbackFrozenAt: null,
        customer: {
          membershipExpiry: { not: null },
        },
      },
      include: {
        customer: true,
        tenant: true,
      },
    })

    const results = {
      evaluated: candidates.length,
      frozen: 0,
      skipped: 0,
      errors: 0,
      details: [] as string[],
    }

    for (const wallet of candidates) {
      const customer = wallet.customer
      const tenant = wallet.tenant

      if (!customer.membershipExpiry) {
        results.skipped++
        continue
      }

      const expiry = new Date(customer.membershipExpiry)
      // Fecha límite: vencimiento de membresía + 30 días de gracia
      const cashbackDeadline = new Date(expiry.getTime() + 30 * 24 * 60 * 60 * 1000)

      // Solo congelar si ya pasó el deadline
      if (now <= cashbackDeadline) {
        results.skipped++
        continue
      }

      const frozenBalance = Number(wallet.balance)
      const frozenAt = now

      try {
        // Operación atómica: congelar wallet + registrar transacción de auditoría
        await prisma.$transaction([
          prisma.wallet.update({
            where: { id: wallet.id },
            data: {
              cashbackFrozenAt: frozenAt,
              cashbackFrozenBalance: frozenBalance,
              // balance NO se modifica. Queda como respaldo histórico.
            },
          }),
          prisma.walletTransaction.create({
            data: {
              tenantId: wallet.tenantId,
              walletId: wallet.id,
              type: 'CASHBACK_FROZEN',
              amount: 0, // No es un movimiento de dinero, es un evento de estado
              description: `Cashback congelado automáticamente. Saldo histórico preservado: $${frozenBalance.toFixed(2)} USD. Deadline: ${cashbackDeadline.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}.`,
              referenceId: `CASHBACK_FREEZE_${customer.id}_${expiry.toISOString().split('T')[0]}`,
            },
          }),
        ])

        // Notificar al socio que su cashback expiró pero queda como crédito si vuelve
        const customerName = customer.name.split(' ')[0]
        const gymName = tenant.name || 'Tu Gimnasio'
        const evoInstance = tenant.evolutionInstanceName || tenant.whatsappPhone || 'gym_bot'

        const message =
          `⏸️ ¡Hola *${customerName}*! Desde *${gymName}* queremos informarte que tu saldo de cashback de *$${frozenBalance.toFixed(2)} USD* ha expirado tras 30 días sin renovar tu membresía.\n\n` +
          `📌 *¿Qué significa esto?*\nTu historial y saldo quedan guardados en nuestro sistema. Si vuelves a entrenar con nosotros, habla con recepción para que evaluemos la *restitución de tu saldo* como bienvenida. 🏋️‍♂️💪\n\n` +
          `¡Te esperamos de vuelta cuando quieras!`

        await sendWhatsAppMessage(customer.phone, message, evoInstance)
        // Pequeño delay anti-ban entre mensajes
        await new Promise((r) => setTimeout(r, 1500))

        results.frozen++
        results.details.push(
          `Congelado: ${customer.name} (${customer.phone}) | Saldo: $${frozenBalance.toFixed(2)} | Tenant: ${tenant.name}`
        )
      } catch (err: any) {
        results.errors++
        results.details.push(`Error en ${customer.name}: ${err.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      summary: results,
    })
  } catch (error: any) {
    console.error('Error en cron de congelación de cashback:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
