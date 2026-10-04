import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

const groq = new OpenAI({
  apiKey:  env.OPENAI_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

function buildPrompt(
  platform:       string,
  postText:       string,
  matchedKeywords: string[],
  intentScore:    number | null,
): string {
  const keywords = matchedKeywords.length > 0 ? matchedKeywords.join(', ') : 'none detected';
  const score    = intentScore != null ? `${intentScore}/10` : 'unscored';

  return `You are a friendly, knowledgeable California real estate professional engaging with potential home buyers and movers on social media.

Your task: Write a helpful, genuine comment for the following social media post.

POST DETAILS:
- Platform: ${platform}
- Post Content: ${postText}
- Intent Keywords Detected: ${keywords}
- Intent Score: ${score} (higher = stronger buying intent)

COMMENT REQUIREMENTS:
1. Sound like a real human, not a bot or salesperson
2. Directly address what the person is asking or saying in their post
3. Provide 1-2 genuinely useful pieces of information or advice
4. If appropriate, gently mention that you specialize in California real estate and can help
5. End with a soft call to action (e.g., "Feel free to DM me if you have questions!")
6. Keep it between 60–120 words — long enough to be helpful, short enough to read
7. Do NOT use emojis excessively — maximum 1-2 if they feel natural
8. Do NOT start with "Great post!" or "Wow!" — these sound fake
9. Match the tone of the platform:
   - Facebook/Reddit: conversational and warm
   - LinkedIn: slightly more professional but still human
   - Quora: informative and detailed, like an expert answer
   - Twitter: concise and punchy

IMPORTANT: Return ONLY the comment text. No explanation, no intro, no "Here is the comment:". Just the comment itself.`;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const post = await prisma.post.findUnique({
    where:  { id: params.id },
    select: {
      id:              true,
      platform:        true,
      postText:        true,
      matchedKeywords: true,
      intentScore:     true,
    },
  });

  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  const keywords = Array.isArray(post.matchedKeywords)
    ? (post.matchedKeywords as string[])
    : [];

  const prompt = buildPrompt(
    post.platform,
    post.postText ?? '',
    keywords,
    post.intentScore,
  );

  let comment: string;
  try {
    const response = await groq.chat.completions.create({
      model:       'llama-3.3-70b-versatile',
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    });
    comment = (response.choices[0]?.message?.content ?? '').trim();
    if (!comment) throw new Error('Empty response from model');
  } catch (err) {
    console.error('[generate-comment] Groq error:', (err as Error).message);
    return NextResponse.json(
      { error: 'Failed to generate comment. Please try again.' },
      { status: 500 },
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await prisma.post.update({ where: { id: post.id }, data: { generatedComment: comment } as any });

  return NextResponse.json({ comment, generatedAt: new Date().toISOString() });
}
