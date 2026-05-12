import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '../_rateLimit'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM = `You are a precise nutritional analysis assistant specialising in ketogenic diets.
Analyse food items and return accurate data in strict JSON format.
Always correct misspellings. Base values on USDA / standard nutritional databases.
Return ONLY valid JSON — no markdown fences, no extra text.`

function buildPrompt(input: string) {
  return `Analyse this food input and return nutritional data as JSON.

Food input: "${input}"

Instructions:
1. Detect whether the input contains MULTIPLE foods (separated by commas, "and", "+", "&", or line breaks).
   Examples of multi-food inputs: "2 eggs, 300g pork, 100g cauliflower" or "avocado and salmon 150g".
   Examples of single-food inputs: "avocado 200g", "2 scrambled eggs".

2. For SINGLE food:
   - Correct the food name (e.g. "avacado" → "Avocado").
   - Parse the quantity. Default to 100 g if none is given.
     Handle: "400g", "2 cups", "half a plate", "1 mango", "3 slices", "a handful".
   - Set corrected_name to the food name. Set quantity_display to the parsed quantity.

3. For MULTIPLE foods:
   - Parse each item separately (name + quantity, defaulting to 100g each if unspecified).
   - Calculate macros for each item individually, then SUM all macros into per_quantity.
   - Set corrected_name to "Combined: Item1, Item2, Item3" (corrected names).
   - Set quantity_display to a description like "2 eggs + 300g pork + 100g cauliflower".
   - Set parsed_quantity_g to the total grams of all items combined.
   - per_100g: calculate as per_quantity macros divided by (parsed_quantity_g / 100).
   - keto_score: weighted average of individual food scores, weighted by each item's calorie contribution.

4. Calculate macros for BOTH per-100 g AND the entered quantity.
5. Score keto compliance 1–10:
   10 = perfect keto (butter, bacon, avocado)
   7–9 = good keto (meat, eggs, cheese, salmon)
   4–6 = borderline (legumes, some dairy)
   1–3 = not keto (rice, bread, pasta, sugar, most fruits)
6. Write a 1-2 sentence recommendation for a keto dieter.
7. If keto_score ≤ 6, populate keto_alternatives with 3–4 genuinely keto-friendly foods
   that serve a similar culinary purpose. Each must include name, reason, and keto_score.
   If keto_score > 6, return an empty array for keto_alternatives.

Return this exact JSON (raw, no fences):
{
  "corrected_name": "string",
  "parsed_quantity_g": 100,
  "quantity_display": "string — e.g. '400g' or '2 eggs + 300g pork + 100g cauliflower'",
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

    // Validate required numeric fields are finite and non-negative
    const macroFields = ['calories', 'carbs_g', 'protein_g', 'fat_g', 'fiber_g', 'net_carbs_g']
    for (const section of ['per_100g', 'per_quantity'] as const) {
      for (const field of macroFields) {
        const v = result[section]?.[field]
        if (typeof v !== 'number' || !isFinite(v) || v < 0) {
          result[section][field] = 0
        }
      }
    }
    if (typeof result.keto_score !== 'number' || result.keto_score < 1 || result.keto_score > 10) {
      result.keto_score = Math.max(1, Math.min(10, Math.round(result.keto_score ?? 5)))
    }
    if (typeof result.parsed_quantity_g !== 'number' || result.parsed_quantity_g <= 0) {
      result.parsed_quantity_g = 100
    }

    return NextResponse.json(result)

  } catch (err: unknown) {
    const msg = err instanceof SyntaxError
      ? 'Failed to parse AI response — please try again.'
      : err instanceof Error ? err.message : 'Unexpected error.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
