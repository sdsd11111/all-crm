import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSuperAdminFromRequest } from '@/lib/auth'

/**
 * GET /api/superadmin/wallets/reinstate?tenantId=...
 * EXCLUSIVO SUPERADMIN: Lista las billeteras con cashback archivado/expirado de un tenant.
 */
export async function GET(req: Request) {
  try {
    await getSuperAdminFromRequest(req)
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId requerido' }, { status: 400 })
    }

    const wallets = await prisma.wallet.findMany({
      where: {
        tenantId,
        cashbackFrozenBalance: { gt: 0 },
      },
      include: {
        customer: { select: { id: true, name: true, phone: true, membershipExpiry: true } },
      },
      orderBy: { cashbackFrozenAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      wallets: wallets.map((w) => ({
        walletId: w.id,
        customerId: w.customer.id,
        customerName: w.customer.name,
        customerPhone: w.customer.phone,
        activeBalance: Number(w.balance),
        archivedBalance: Number(w.cashbackFrozenBalance || 0),
        frozenAt: w.cashbackFrozenAt,
      })),
    })
  } catch (error: any) {
    const status = error?.status || 500
    return NextResponse.json({ error: error.message }, { status })
  }
}

/**
 * POST /api/superadmin/wallets/reinstate
 * EXCLUSIVO SUPERADMIN: Restituye cashback archivado/expirado de un socio hacia su balance activo.
 *
 * Body: { customerId: string, tenantId: string, amount?: number, reason?: string }
 */
export async function POST(req: Request) {
  try {
    await getSuperAdminFromRequest(req)

    const body = await req.json()
    const { customerId, tenantId, amount, reason } = body

    if (!customerId || !tenantId) {
      return NextResponse.json({ error: 'customerId y tenantId son requeridos' }, { status: 400 })
    }

    const wallet = await prisma.wallet.findFirst({
      where: { tenantId, customerId },
      include: { customer: true },
    })

    if (!wallet || Number(wallet.cashbackFrozenBalance || 0) <= 0) {
      return NextResponse.json(
        { error: 'Este socio no tiene saldo de cashback archivado disponible para restituir.' },
        { status: 404 }
      )
    }

    const archivedAvailable = Number(wallet.cashbackFrozenBalance || 0)
    const amountToRestore = amount !== undefined && amount !== null && Number(amount) > 0
      ? Math.min(Number(amount), archivedAvailable)
      : archivedAvailable

    const newActiveBalance = parseFloat((Number(wallet.balance) + amountToRestore).toFixed(2))
    const remainingArchived = parseFloat((archivedAvailable - amountToRestore).toFixed(2))
    const now = new Date()

    await prisma.$transaction([
      prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: newActiveBalance,
          cashbackFrozenBalance: remainingArchived > 0 ? remainingArchived : null,
          cashbackFrozenAt: remainingArchived > 0 ? wallet.cashbackFrozenAt : null,
        },
      }),
      prisma.walletTransaction.create({
        data: {
          tenantId,
          walletId: wallet.id,
          type: 'CASHBACK_REINSTATED',
          amount: amountToRestore,
          description: `Restitución aprobada por SuperAdmin (+$${amountToRestore.toFixed(2)} USD). Motivo: ${reason || 'Retorno del socio'}`,
          referenceId: `SUPERADMIN_REINSTATE_${customerId}_${now.getTime()}`,
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      message: `Cashback restituido: +$${amountToRestore.toFixed(2)} USD. Nuevo saldo activo: $${newActiveBalance.toFixed(2)} USD.`,
      restoredAmount: amountToRestore,
      newActiveBalance,
      remainingArchived,
    })
  } catch (error: any) {
    const status = error?.status || 500
    return NextResponse.json({ error: error.message }, { status })
  }
}
