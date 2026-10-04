import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const platform  = searchParams.get('platform') ?? undefined;
  const status    = searchParams.get('status') ?? 'PENDING';
  const minScore  = parseInt(searchParams.get('minScore') ?? '0', 10);
  const sort      = searchParams.get('sort') === 'recent' ? 'recent' : 'score';
  const page      = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit     = Math.min(50, parseInt(searchParams.get('limit') ?? '20', 10));
  const skip      = (page - 1) * limit;

  const where = {
    ...(platform  ? { platform: platform as any }  : {}),
    ...(status    ? { status:   status   as any }  : {}),
    ...(minScore > 0 ? { intentScore: { gte: minScore } } : {}),
  };

  const orderBy =
    sort === 'recent'
      ? [{ fetchedAt: 'desc' as const }]
      : [{ intentScore: 'desc' as const }, { fetchedAt: 'desc' as const }];

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id:               true,
        platform:         true,
        postText:         true,
        sourceUrl:        true,
        keywordMatched:   true,
        intentScore:      true,
        matchedKeywords:  true,
        aiReason:         true,
        status:           true,
        fetchedAt:        true,
        generatedComment: true,
      },
    }),
    prisma.post.count({ where }),
  ]);

  return NextResponse.json({
    posts,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
