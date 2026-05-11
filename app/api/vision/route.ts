import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
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

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
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
              text: 'Identify the food in this image and estimate its weight in grams. Consider the typical serving size visible. Return ONLY valid JSON with no markdown: {"detected_food":"string","estimated_weight_g":number,"confidence":"low|medium|high"}',
            },
          ],
        },
      ],
    })

    let text = (msg.content[0] as { text: string }).text.trim()

    // Strip accidental markdown fences
    if (text.startsWith('```')) {
      const lines = text.split('\n')
      text = lines.slice(1, lines.at(-1)?.trim() === '```' ? -1 : undefined).join('\n').trim()
    }

    const result = JSON.parse(text)
    return NextResponse.json(result)

  } catch (err: unknown) {
    const msg = err instanceof SyntaxError
      ? 'Could not parse AI vision response — please try again.'
      : err instanceof Error ? err.message : 'Vision analysis failed.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
