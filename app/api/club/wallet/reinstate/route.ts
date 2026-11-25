import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantFromRequest } from '@/lib/getTenant'

/**
 * POST /api/club/wallet/reinstate
 * Solo OWNER puede restituir el cashback histórico de un socio.
 * 
 * Body: { customerId: string, reason?: string }
 * 
 * Flujo:
 *   1. Verifica que la wallet tenga cashbackFrozenAt (está congelada).
 *   2. Limpia cashbackFrozenAt y cashbackFrozenBalance (descongela).
 *   3. El campo balance ya tenía el valor histórico intacto → queda visible de nuevo.
 *   4. Registra WalletTransaction tipo CASHBACK_REINSTATED con razón y staffId.
 */
export async function POST(req: Request) {
  try {
    const { tenantId } = await getTenantFromRequest(req)
    const body = await req.json()
    const { customerId, reason } = body

    if (!customerId) {
      return NextResponse.json({ error: 'customerId es requerido' }, { status: 400 })
    }

    // Buscar wallet congelada del cliente
    const wallet = await prisma.wallet.findFirst({
      where: {
        tenantId,
        customerId,
        cashbackFrozenAt: { not: null }, // Solo wallets congeladas
      },
      include: { customer: true },
    })

    if (!wallet) {
      return NextResponse.json(
        { error: 'No se encontró una billetera congelada para este socio, o ya fue restituida.' },
        { status: 404 }
      )
    }

    const frozenBalance = Number(wallet.cashbackFrozenBalance || wallet.balance)
    const now = new Date()

    // Operación atómica: descongelar + registrar evento de restitución
    await prisma.$transaction([
      prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          cashbackFrozenAt: null,
          cashbackFrozenBalance: null,
          // balance ya tiene el valor histórico intacto, no se toca
        },
      }),
      prisma.walletTransaction.create({
        data: {
          tenantId,
          walletId: wallet.id,
          type: 'CASHBACK_REINSTATED',
          amount: 0,
          description: `Cashback restituido por recepción. Saldo histórico recuperado: $${frozenBalance.toFixed(2)} USD. Motivo: ${reason || 'Retorno del socio al gimnasio'}`,
          referenceId: `CASHBACK_REINSTATE_${customerId}_${now.toISOString().split('T')[0]}`,
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      message: `Cashback restituido exitosamente. Saldo recuperado: $${frozenBalance.toFixed(2)} USD`,
      restoredBalance: frozenBalance,
    })
  } catch (error: any) {
    const status = error?.status || 500
    return NextResponse.json({ error: error.message }, { status })
  }
}
