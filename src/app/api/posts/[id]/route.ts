import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const body = await req.json() as {
    status?:          string;
    generatedComment?: string;
  };
  const { status, generatedComment } = body;

  if (status !== undefined && !['DONE', 'SKIPPED', 'PENDING'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {};
  if (status !== undefined) {
    data.status     = status;
    data.reviewedAt = status !== 'PENDING' ? new Date() : null;
  }
  if (generatedComment !== undefined) {
    data.generatedComment = generatedComment;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const post = await prisma.post.update({
    where:  { id: params.id },
    data,
    select: { id: true, status: true, generatedComment: true },
  });

  return NextResponse.json(post);
}
