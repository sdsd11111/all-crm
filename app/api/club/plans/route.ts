import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantFromRequest } from '@/lib/getTenant'

// GET /api/club/plans: Lista los planes de membresía, filtrable por branchId si se requiere
export async function GET(req: Request) {
  try {
    const { tenantId, branchId: cookieBranchId } = await getTenantFromRequest(req)
    const { searchParams } = new URL(req.url)
    const queryBranchId = searchParams.get('branchId')
    
    // Si se pasa branchId='all', devuelve todos sin filtro de branch
    const targetBranchId = queryBranchId === 'all' 
      ? undefined 
      : (queryBranchId || cookieBranchId || undefined)

    const plans = await prisma.membershipPlan.findMany({
      where: { tenantId },
      orderBy: { price: 'asc' },
      include: {
        branch: { select: { id: true, name: true, code: true } },
      },
    })

    // Si hay targetBranchId, filtramos los que apliquen a esa sede (o sean globales o contengan el id en lista)
    const filteredPlans = targetBranchId
      ? plans.filter((p) => {
          if (!p.branchId) return true // Global / todas las sedes
          const ids = p.branchId.split(',').map((s) => s.trim())
          return ids.includes(targetBranchId)
        })
      : plans

    return NextResponse.json({ success: true, plans: filteredPlans })
  } catch (error: any) {
    const status = error?.status || 500
    return NextResponse.json({ error: error.message }, { status })
  }
}

// POST /api/club/plans: Crea un nuevo plan de membresía asociado a una o varias sedes
export async function POST(req: Request) {
  try {
    const { tenantId, branchId: cookieBranchId } = await getTenantFromRequest(req)
    const { name, price, durationDays, cashbackAmount, branchId, branchIds, targetBranchId } = await req.json()

    if (!name || price === undefined) {
      return NextResponse.json({ error: 'Nombre y precio son obligatorios' }, { status: 400 })
    }

    // Permitir branchIds como array ej ["id1", "id2"] o string separado por coma
    let finalBranchId: string | null = null
    if (Array.isArray(branchIds)) {
      finalBranchId = branchIds.filter(Boolean).join(',') || null
    } else if (targetBranchId !== undefined) {
      finalBranchId = targetBranchId || null
    } else if (branchId !== undefined) {
      finalBranchId = branchId || null
    } else if (cookieBranchId) {
      finalBranchId = cookieBranchId
    }

    const plan = await prisma.membershipPlan.create({
      data: {
        tenantId,
        branchId: finalBranchId,
        name: name.trim(),
        price: Number(price),
        durationDays: durationDays ? parseInt(durationDays) : 30,
        cashbackAmount: cashbackAmount !== undefined ? Number(cashbackAmount) : 0,
        isActive: true,
      },
      include: {
        branch: { select: { id: true, name: true, code: true } },
      },
    })

    return NextResponse.json({ success: true, plan })
  } catch (error: any) {
    const status = error?.status || 500
    return NextResponse.json({ error: error.message }, { status })
  }
}

// PUT /api/club/plans: Edita un plan existente
export async function PUT(req: Request) {
  try {
    const { tenantId } = await getTenantFromRequest(req)
    const { id, name, price, durationDays, cashbackAmount, isActive, branchId, branchIds } = await req.json()

    if (!id) {
      return NextResponse.json({ error: 'ID es obligatorio' }, { status: 400 })
    }

    // Verificar pertenencia al tenant
    const existing = await prisma.membershipPlan.findFirst({
      where: { id, tenantId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })
    }

    let finalBranchId: string | null | undefined = undefined
    if (Array.isArray(branchIds)) {
      finalBranchId = branchIds.filter(Boolean).join(',') || null
    } else if (branchId !== undefined) {
      finalBranchId = branchId || null
    }

    const updated = await prisma.membershipPlan.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        price: price !== undefined ? Number(price) : undefined,
        durationDays: durationDays !== undefined ? parseInt(durationDays) : undefined,
        cashbackAmount: cashbackAmount !== undefined ? Number(cashbackAmount) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        ...(finalBranchId !== undefined ? { branchId: finalBranchId } : {}),
      },
      include: {
        branch: { select: { id: true, name: true, code: true } },
      },
    })

    return NextResponse.json({ success: true, plan: updated })
  } catch (error: any) {
    const status = error?.status || 500
    return NextResponse.json({ error: error.message }, { status })
  }
}

// DELETE /api/club/plans?id=... : Elimina un plan
export async function DELETE(req: Request) {
  try {
    const { tenantId } = await getTenantFromRequest(req)
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID no especificado' }, { status: 400 })
    }

    const existing = await prisma.membershipPlan.findFirst({
      where: { id, tenantId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })
    }

    await prisma.membershipPlan.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Plan eliminado' })
  } catch (error: any) {
    const status = error?.status || 500
    return NextResponse.json({ error: error.message }, { status })
  }
}

