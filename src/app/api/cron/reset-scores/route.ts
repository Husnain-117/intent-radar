import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { confirm } = await req.json().catch(() => ({}));
  if (confirm !== true) {
    return NextResponse.json({ error: 'Pass { confirm: true } to proceed' }, { status: 400 });
  }

  const { count } = await prisma.post.updateMany({
    data: { intentScore: null, aiReason: null, matchedKeywords: [] },
  });

  return NextResponse.json({ ok: true, reset: count });
}
