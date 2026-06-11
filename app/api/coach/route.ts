import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '../_rateLimit'
import { parseModelJson } from '../_ai'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM = `You are an expert ketogenic-diet coach with a background in metabolic physiology.
You read a single user's profile and their tracked diet data and give a personalised,
scientifically grounded read on where their body likely is in the keto transition,
plus concrete next steps.

Principles:
- Address the user by their first name. Be warm, motivating, and concrete — like a great coach.
- Ground every claim in THEIR data: their macros, body stats (BMR, glycogen capacity), streak, glycogen depletion and fat-adaptation estimates.
- Be scientifically honest. These are ESTIMATES derived from diet and physiology, NOT a measured ketone reading. When relevant, note that a blood or breath ketone meter is the only way to confirm. Never overclaim precision.
- Lower your confidence when body data is missing or logging is sparse; raise it with body data and consistent logging.
- Keep it practical and safe. No extreme or medically risky advice. Encourage adequate electrolytes, hydration, and not under-eating.
- Be concise. No markdown, no preamble. Return ONLY valid JSON.`

interface CoachState {
  daysSinceStart?: number
  level?: number
  phase?: string
  glyPct?: number
  adaptation?: number
  streak?: number
  maxStreak?: number
  genuineStart?: boolean
  fluActive?: boolean
  fluCleared?: boolean
  avgQuality?: number | null
  personalized?: boolean
}

function buildPrompt(body: Record<string, unknown>) {
  const profile  = (body.profile  ?? {}) as Record<string, unknown>
  const metabolic= (body.metabolic?? {}) as Record<string, unknown>
  const state    = (body.state    ?? {}) as CoachState
  const today    = (body.today    ?? {}) as Record<string, unknown>
  const recent   = Array.isArray(body.recentDays) ? body.recentDays.slice(0, 7) : []

  return `Here is the user's data. Produce their coaching JSON.

PROFILE
- Name: ${profile.name ?? 'there'}
- Age bracket: ${profile.ageBracket ?? 'unknown'}
- Height: ${profile.heightCm ? profile.heightCm + ' cm' : 'unknown'}
- Weight: ${profile.weightKg ? profile.weightKg + ' kg' : 'unknown'}
- Sex (for BMR): ${profile.sex ?? 'unspecified'}

METABOLIC ESTIMATES
- BMR: ${metabolic.bmr ?? 'n/a'} kcal/day
- TDEE: ${metabolic.tdee ?? 'n/a'} kcal/day
- Estimated total glycogen capacity: ${metabolic.glycogenCapacityG ?? 'n/a'} g
- Body data available for personalisation: ${state.personalized ? 'YES' : 'NO — using population averages'}

CURRENT METABOLIC STATE (model estimates)
- Day ${state.daysSinceStart ?? '?'} of the journey
- Ketosis meter: ${state.level ?? '?'} / 100 (${state.phase ?? '?'})
- Glycogen fullness: ${state.glyPct ?? '?'}% (lower = deeper ketosis)
- Fat-adaptation: ${state.adaptation ?? '?'} / 100
- Current compliant streak: ${state.streak ?? 0} day(s); best ${state.maxStreak ?? 0}
- Fresh transition: ${state.genuineStart ? 'yes' : 'no (already keto-experienced)'}
- Keto-flu window: ${state.fluActive ? 'ACTIVE' : state.fluCleared ? 'cleared' : 'not active'}
- Recent diet quality (0–1): ${state.avgQuality == null ? 'n/a' : Number(state.avgQuality).toFixed(2)}

TODAY SO FAR
- Net carbs: ${today.netCarbs ?? '?'} g
- Fat: ${today.fatPct ?? '?'}% of kcal | Protein: ${today.proteinPct ?? '?'}% of kcal
- Calories: ${today.calories ?? '?'} kcal across ${today.mealCount ?? 0} meal(s)
- Status: ${today.status ?? 'no meals yet'}

RECENT DAYS (most recent first): ${JSON.stringify(recent)}

Return this exact JSON (raw, no fences):
{
  "focus": "one short imperative headline for today (max ~8 words)",
  "state_estimate": "plain-language estimate of their ketosis state, e.g. 'Light–moderate nutritional ketosis (~1.0–1.8 mmol/L, estimated)'. Always mark it estimated.",
  "confidence": "low | moderate | high",
  "assessment": "2-3 sentences addressed to them by name, grounded in their specific data",
  "reasoning": "1-2 sentences citing the physiology/macros/body behind the estimate",
  "guidance": ["2 to 4 specific, science-based actions for today or tomorrow"]
}`
}

function clampStr(v: unknown, max: number, fallback = ''): string {
  if (typeof v !== 'string') return fallback
  return v.length > max ? v.slice(0, max) : v
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
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }

    // Retry once on a malformed response before bothering the user.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let raw: any = null
    let parseErr: unknown = null
    for (let attempt = 0; attempt < 2 && raw == null; attempt++) {
      const msg = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 800,
        system: SYSTEM,
        messages: [{ role: 'user', content: buildPrompt(body) }],
      })
      try { raw = parseModelJson(msg) } catch (e) { parseErr = e }
    }
    if (raw == null) throw parseErr instanceof SyntaxError ? parseErr : new SyntaxError('Malformed AI response')

    // Normalise + bound everything.
    const confidence = ['low', 'moderate', 'high'].includes(raw.confidence) ? raw.confidence : 'moderate'
    const guidance = Array.isArray(raw.guidance)
      ? raw.guidance.filter((g: unknown) => typeof g === 'string').slice(0, 4).map((g: string) => clampStr(g, 240))
      : []

    const result = {
      focus:          clampStr(raw.focus, 80, 'Stay the course'),
      state_estimate: clampStr(raw.state_estimate, 200, 'Estimating your ketosis state…'),
      confidence,
      assessment:     clampStr(raw.assessment, 600, ''),
      reasoning:      clampStr(raw.reasoning, 400, ''),
      guidance:       guidance.length ? guidance : ['Keep net carbs low and electrolytes up today.'],
    }

    return NextResponse.json(result)

  } catch (err: unknown) {
    const message = err instanceof SyntaxError
      ? 'Failed to parse coaching response — please try again.'
      : err instanceof Error ? err.message : 'Unexpected error.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
