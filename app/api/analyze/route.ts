import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM = `You are a precise nutritional analysis assistant specialising in ketogenic diets.
Analyse food items and return accurate data in strict JSON format.
Always correct misspellings. Base values on USDA / standard nutritional databases.
Return ONLY valid JSON — no markdown fences, no extra text.`

function buildPrompt(input: string) {
  return `Analyse this food input and return nutritional data as JSON.

Food input: "${input}"

Instructions:
1. Correct the food name (e.g. "avacado" → "Avocado").
2. Parse the quantity. Default to 100 g if none is given.
   Handle: "400g", "2 cups", "half a plate", "1 mango", "3 slices", "a handful".
3. Calculate macros for BOTH per-100 g AND the entered quantity.
4. Score keto compliance 1–10:
   10 = perfect keto (butter, bacon, avocado)
   7–9 = good keto (meat, eggs, cheese, salmon)
   4–6 = borderline (legumes, some dairy)
   1–3 = not keto (rice, bread, pasta, sugar, most fruits)
5. Write a 1-2 sentence recommendation for a keto dieter.
6. If keto_score ≤ 6, populate keto_alternatives with 3–4 genuinely keto-friendly foods
   that serve a similar culinary purpose. Each must include name, reason, and keto_score.
   If keto_score > 6, return an empty array for keto_alternatives.

Return this exact JSON (raw, no fences):
{
  "corrected_name": "string",
  "parsed_quantity_g": 100,
  "quantity_display": "string — e.g. '400g' or '1 cup (240g)' or '100g (default)'",
  "per_100g": {
    "calories": 0, "carbs_g": 0, "protein_g": 0,
    "fat_g": 0, "fiber_g": 0, "net_carbs_g": 0
  },
  "per_quantity": {
    "calories": 0, "carbs_g": 0, "protein_g": 0,
    "fat_g": 0, "fiber_g": 0, "net_carbs_g": 0
  },
  "macro_percentages_per_100g":      { "carbs_pct": 0, "protein_pct": 0, "fat_pct": 0 },
  "macro_percentages_per_quantity":  { "carbs_pct": 0, "protein_pct": 0, "fat_pct": 0 },
  "keto_score": 7,
  "recommendation": "string",
  "keto_alternatives": [
    { "name": "string", "reason": "string", "keto_score": 9 }
  ]
}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const food_input: string = (body?.food_input ?? '').trim()

    if (!food_input)
      return NextResponse.json({ error: 'Please enter a food item.' }, { status: 400 })
    if (food_input.length > 500)
      return NextResponse.json({ error: 'Input too long (max 500 chars).' }, { status: 400 })

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: SYSTEM,
      messages: [{ role: 'user', content: buildPrompt(food_input) }],
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
      ? 'Failed to parse AI response — please try again.'
      : err instanceof Error ? err.message : 'Unexpected error.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
