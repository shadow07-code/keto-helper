import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '../_rateLimit'
import { parseModelJson } from '../_ai'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const { allowed, retryAfterSecs } = checkRateLimit(ip)
  if (!allowed) {
    return NextResponse.json(
      { error: `Too many requests — please wait ${retryAfterSecs}s before trying again.` },
      { status: 429, headers: { 'Retry-After': String(retryAfterSecs) } }
    )
  }

  try {
    const body = await req.json()
    const { image_data, media_type } = body

    if (!image_data || !media_type) {
      return NextResponse.json({ error: 'Missing image_data or media_type.' }, { status: 400 })
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(media_type)) {
      return NextResponse.json({ error: 'Unsupported image type.' }, { status: 400 })
    }

    // Retry once on a malformed response before bothering the user.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any = null
    let parseErr: unknown = null
    for (let attempt = 0; attempt < 2 && result == null; attempt++) {
      const msg = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type, data: image_data },
              },
              {
                type: 'text',
                text: 'Identify all foods visible in this image and estimate weights. If multiple distinct foods are present, list each with its estimated weight (e.g. "2 eggs, 300g pork, 100g cauliflower"). If a single food, just name it. Return ONLY valid JSON with no markdown: {"detected_food":"string — single food name OR comma-separated list like \'2 eggs, 300g pork, 100g cauliflower\'","estimated_weight_g":number — total weight of all items combined,"confidence":"low|medium|high"}',
              },
            ],
          },
        ],
      })
      try { result = parseModelJson(msg) } catch (e) { parseErr = e }
    }
    if (result == null) throw parseErr instanceof SyntaxError ? parseErr : new SyntaxError('Malformed AI response')

    return NextResponse.json(result)

  } catch (err: unknown) {
    const msg = err instanceof SyntaxError
      ? 'Could not parse AI vision response — please try again.'
      : err instanceof Error ? err.message : 'Vision analysis failed.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
