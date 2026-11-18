import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWhatsAppMessage } from '@/lib/evolution'

export const dynamic = 'force-dynamic'

/**
 * Cron Job Inteligente y Multi-Tenant (SaaS)
 * Notifica a los socios 3 días antes de que finalice su mensualidad:
 * 1. Avisa la fecha exacta del fin de mensualidad.
 * 2. Muestra su saldo acumulado de cashback.
 * 3. Informa la fecha límite de vigencia de su cashback (fin de mensualidad + 30 días de gracia).
 * 4. Envía a través de la instancia de WhatsApp de cada gimnasio (Titanus, All CRM general u otros).
 * 5. Deduplica mediante referenceId único para evitar dobles envíos en el mismo ciclo.
 */
export async function GET(req: NextRequest) {
  return handleCron(req)
}

export async function POST(req: NextRequest) {
  return handleCron(req)
}

async function handleCron(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const key = searchParams.get('key') || req.headers.get('authorization')?.replace('Bearer ', '')

    const CRON_SECRET = process.env.CRON_SECRET || 'titanus_cron_secure_key_2026'

    if (key !== CRON_SECRET) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const now = new Date()

    // Buscamos clientes activos con fecha de vencimiento registrada
    const customers = await prisma.customer.findMany({
      where: {
        membershipExpiry: { not: null },
        tenant: { isActive: true },
      },
      include: {
        tenant: true,
        wallets: {
          include: {
            transactions: {
              where: { type: 'NOTIFICATION_SENT' },
            },
          },
        },
      },
    })

    const results = {
      evaluated: customers.length,
      sent3DaysBeforeExpiry: 0,
      skippedAlreadySent: 0,
      notInWindow: 0,
      errors: 0,
      details: [] as string[],
    }

    for (const customer of customers) {
      if (!customer.membershipExpiry || !customer.phone) continue

      const expiry = new Date(customer.membershipExpiry)
      const tenant = customer.tenant

      // Diferencia en días hacia el fin de mensualidad
      const diffExpiryMs = expiry.getTime() - now.getTime()
      const daysRemaining = Math.ceil(diffExpiryMs / (1000 * 60 * 60 * 24))

      // Evaluamos exactamente cuando faltan 3 días para vencer
      if (daysRemaining !== 3) {
        results.notInWindow++
        continue
      }

      // Fecha límite de cashback: Fin de mensualidad + 30 días de gracia
      const cashbackDeadline = new Date(expiry.getTime() + 30 * 24 * 60 * 60 * 1000)

      // Clave única de deduplicación para este ciclo de vencimiento
      const expDateKey = expiry.toISOString().split('T')[0]
      const referenceId = `MEMBERSHIP_EXPIRY_3DAYS_${customer.id}_${expDateKey}`

      // Obtener o crear wallet del cliente para este tenant
      let wallet = customer.wallets.find((w) => w.tenantId === customer.tenantId) || customer.wallets[0]
      if (!wallet) {
        wallet = await prisma.wallet.create({
          data: {
            tenantId: customer.tenantId,
            customerId: customer.id,
            balance: 0,
          },
          include: { transactions: true },
        })
      }

      const alreadySent = wallet.transactions?.some((tx: any) => tx.referenceId === referenceId)
      if (alreadySent) {
        results.skippedAlreadySent++
        continue
      }

      // Datos y formato para el mensaje
      const gymName = tenant?.name || 'Titanus Gym'
      const customerName = customer.name.split(' ')[0]
      const balanceNum = Number(wallet.balance) || 0
      const balanceStr = balanceNum.toFixed(2)

      const expDateStr = expiry.toLocaleDateString('es-EC', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
      const cbDeadlineStr = cashbackDeadline.toLocaleDateString('es-EC', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })

      // Link dinámico según tenant
      const domainUrl = tenant.slug === 'titanus-gym'
        ? 'https://app.titanusfitness.com'
        : (process.env.NEXT_PUBLIC_APP_URL || 'https://app.titanusfitness.com')

      // Mensaje de fidelización inteligente
      let message = `⏳ ¡Hola *${customerName}*! Desde *${gymName}* te recordamos que tu mensualidad finaliza en *3 días* (el *${expDateStr}*).\n\n`

      if (balanceNum > 0) {
        message += `💰 *Tienes $${balanceStr} USD en tu Billetera Digital* de cashback acumulado.\n`
        message += `🗓️ *Vigencia de tu Cashback:* Tienes hasta el *${cbDeadlineStr}* (30 días de gracia posteriores al fin de tu cuota) para aprovechar tu saldo al renovar o en la barra.\n\n`
        message += `¡Renueva a tiempo en recepción para seguir con tus entrenamientos y no dejar vencer tus recompensas! 💪🔥`
      } else {
        message += `🎁 Recuerda que al renovar tu membresía recibes *Cashback directo* a tu Billetera Digital, el cual se mantiene activo hasta *30 días después* de que finalice tu cuota.\n\n`
        message += `¡Acércate a recepción antes del *${expDateStr}* para continuar entrenando sin pausas! 🏋️‍♂️✨`
      }

      // Multi-tenant: Despacha por la instancia de WhatsApp de este gimnasio
      const evoInstance = tenant.evolutionInstanceName || tenant.whatsappPhone || 'gym_bot'
      const sendRes = await sendWhatsAppMessage(customer.phone, message, evoInstance)

      if (sendRes.success) {
        // Registrar deduplicación en la base de datos
        await prisma.walletTransaction.create({
          data: {
            tenantId: customer.tenantId,
            walletId: wallet.id,
            type: 'NOTIFICATION_SENT',
            amount: 0,
            description: `Aviso 3 días antes de fin de mensualidad (Vence: ${expDateStr})`,
            referenceId,
          },
        })

        results.sent3DaysBeforeExpiry++
        results.details.push(`Enviado a ${customer.name} (${customer.phone}) - Tenant: ${gymName}`)
      } else {
        results.errors++
        results.details.push(`Error enviando a ${customer.name}: ${sendRes.error}`)
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      summary: results,
    })
  } catch (error: any) {
    console.error('Error en cron de recordatorio de membresías:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
