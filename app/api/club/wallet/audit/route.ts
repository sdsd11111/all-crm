import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantFromRequest } from '@/lib/getTenant'

// GET /api/club/wallet/audit: Obtiene métricas de billetera y lista de socios con saldo para la sede activa
export async function GET(req: Request) {
  try {
    const { tenantId, branchId } = await getTenantFromRequest(req)

    // MÉTRICAS GLOBALES: el total circulante y canjeado es de TODO el gimnasio
    const allWallets = await prisma.wallet.findMany({
      where: { tenantId },
      include: { customer: true },
    })

    const allTransactions = await prisma.walletTransaction.findMany({
      where: { tenantId },
    })

    // Métricas: totalBalance solo cuenta saldos NO congelados (efectivos)
    const totalBalance = allWallets.reduce((acc, curr) => {
      return acc + (curr.cashbackFrozenAt ? 0 : Number(curr.balance))
    }, 0)
    const redeemed = allTransactions
      .filter((t) => t.type === 'REDEEMED')
      .reduce((acc, curr) => acc + Number(curr.amount), 0)

    // LISTA DE CLIENTES: solo los que han operado (pagado) en la sede activa
    // Si no hay sede activa, se muestran todos los socios
    let customerIds: string[] | null = null
    if (branchId) {
      const branchPayments = await prisma.payment.findMany({
        where: { tenantId, branchId },
        select: { customerId: true },
        distinct: ['customerId'],
      })
      customerIds = branchPayments.map((p) => p.customerId)
    }

    const filteredWallets = customerIds !== null
      ? allWallets.filter((w) => customerIds!.includes(w.customerId))
      : allWallets

    const now = new Date()
    const customers = filteredWallets.map((w) => {
      const expiry = w.customer.membershipExpiry ? new Date(w.customer.membershipExpiry) : null
      // Fecha límite de cashback: Vencimiento de membresía + 30 días de gracia
      const cashbackDeadline = expiry ? new Date(expiry.getTime() + 30 * 24 * 60 * 60 * 1000) : null

      // Saldo efectivo: si el cashback está congelado, la UI muestra $0 (el DB conserva el balance real)
      const isFrozen = !!w.cashbackFrozenAt
      const effectiveBalance = isFrozen ? 0 : Number(w.balance)

      let cashbackStatus: 'ACTIVE' | 'GRACE_PERIOD' | 'EXPIRED' | 'FROZEN' = 'ACTIVE'
      let daysRemaining = null

      if (isFrozen) {
        // Cashback congelado: expiró hace tiempo, el saldo está preservado pero no visible
        cashbackStatus = 'FROZEN'
        daysRemaining = 0
      } else if (cashbackDeadline) {
        const diffMs = cashbackDeadline.getTime() - now.getTime()
        daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
        if (daysRemaining <= 0) {
          cashbackStatus = 'EXPIRED'
        } else if (expiry && now > expiry) {
          cashbackStatus = 'GRACE_PERIOD' // En el mes de cuenta regresiva para volver
        } else {
          cashbackStatus = 'ACTIVE'
        }
      }

      return {
        id: w.customer.id,
        name: w.customer.name,
        phone: w.customer.phone,
        balance: effectiveBalance, // Saldo visible (0 si congelado)
        historicalBalance: Number(w.balance), // Saldo real en DB (siempre preservado)
        cashbackFrozenAt: w.cashbackFrozenAt, // Para que la UI pueda mostrar "Congelado el..."
        cashbackFrozenBalance: Number(w.cashbackFrozenBalance || 0),
        membershipExpiry: expiry,
        cashbackDeadline,
        cashbackStatus,
        daysRemaining,
      }
    })

    return NextResponse.json({
      totalBalance: Number(totalBalance.toFixed(2)),
      redeemed: Number(redeemed.toFixed(2)),
      customers,
    })
  } catch (error: any) {
    const status = error?.status || 500
    return NextResponse.json({ error: error.message }, { status })
  }
}
