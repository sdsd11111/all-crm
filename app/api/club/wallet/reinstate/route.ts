import { NextResponse } from 'next/server'

// Endpoint deshabilitado para gimnasios. La restitución de cashback expirado es exclusiva del SuperAdmin.
export async function POST() {
  return NextResponse.json(
    { error: 'Acceso denegado. Solo el SuperAdmin puede restituir cashback expirado.' },
    { status: 403 }
  )
}
