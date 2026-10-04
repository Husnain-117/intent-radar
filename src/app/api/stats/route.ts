import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  // ── Batch 1: core counts + platform totals (5 concurrent, within pool limit) ──
  const [
    totalPosts,
    scoredPosts,
    highIntentPosts,
    pendingPosts,
    totalByPlatform,
    statusGroups,
  ] = await Promise.all([
    prisma.post.count(),
    prisma.post.count({ where: { intentScore: { not: null } } }),
    prisma.post.count({ where: { intentScore: { gte: 6 } } }),
    prisma.post.count({ where: { status: 'PENDING' } }),
    prisma.post.groupBy({
      by: ['platform'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    }),
    prisma.post.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
  ]);

  // ── Batch 2: detailed breakdowns (5 concurrent) ───────────────────────────
  const [
    platformBreakdown,
    scoredRows,
    recentHighIntent,
    lastFetchLog,
    totalCycles,
  ] = await Promise.all([
    prisma.post.groupBy({
      by: ['platform'],
      _count: { id: true },
      _avg:   { intentScore: true },
      where:  { intentScore: { not: null } },
      orderBy: { _count: { id: 'desc' } },
    }),
    prisma.post.findMany({
      where:  { intentScore: { not: null } },
      select: { intentScore: true },
    }),
    prisma.post.findMany({
      where:   { intentScore: { gte: 6 }, status: 'PENDING' },
      orderBy: { intentScore: 'desc' },
      take:    5,
      select:  { id: true, platform: true, postText: true, intentScore: true, keywordMatched: true, sourceUrl: true },
    }),
    prisma.fetchLog.findFirst({ orderBy: { createdAt: 'desc' } }),
    prisma.fetchLog.count(),
  ]);

  // Error log count (single query, sequential) ──────────────────────────────
  const recentErrors = await prisma.fetchLog.count({ where: { errorMessage: { not: null } } });

  // avgScore computed in JS from already-fetched scoredRows (no extra DB call)
  const avgScore = scoredRows.length > 0
    ? scoredRows.reduce((s, r) => s + (r.intentScore as number), 0) / scoredRows.length
    : 0;

  const statusCounts = { PENDING: 0, DONE: 0, SKIPPED: 0 };
  for (const g of statusGroups) {
    if (g.status in statusCounts) statusCounts[g.status as keyof typeof statusCounts] = g._count.id;
  }

  return NextResponse.json({
    totalPosts,
    scoredPosts,
    highIntentPosts,
    pendingPosts,
    statusCounts,
    avgScore: Math.round(avgScore * 10) / 10,
    platformBreakdown: platformBreakdown.map((p) => ({
      platform: p.platform,
      count:    p._count.id,
      avgScore: Math.round((p._avg.intentScore ?? 0) * 10) / 10,
    })),
    totalByPlatform: totalByPlatform.map((p) => ({
      platform: p.platform,
      count:    p._count.id,
    })),
    scoreDistribution: (() => {
      const buckets: Record<number, number> = {};
      for (const row of scoredRows) {
        const bucket = Math.round(row.intentScore as number);
        buckets[bucket] = (buckets[bucket] ?? 0) + 1;
      }
      return Array.from({ length: 10 }, (_, i) => ({
        score: i + 1,
        count: buckets[i + 1] ?? 0,
      }));
    })(),
    recentHighIntent,
    pipeline: {
      lastCycleAt:   lastFetchLog?.createdAt ?? null,
      totalCycles,
      recentErrors,
    },
  });
}
