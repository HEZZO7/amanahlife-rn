import { createClient } from "npm:@supabase/supabase-js@2";

// Discovered during the critical-audit-2026-07 branch's Savings Challenges
// work: the web app's useDailySavingsTip hook has always called this exact
// function name (app_11941c8fec_savings_tips), but the function was never
// created - every call silently failed (caught, no error shown), so the
// "Daily Savings Tip" card just showed "Loading tip..." forever on both
// platforms. This creates it for real, following the same pattern as
// app_11941c8fec_ai_life_coach.
const ALLOWED_ORIGINS = new Set([
  "https://app.amanahlife.com",
  "https://amanahlife.com",
]);

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin");
  const allowOrigin = !origin ? "*" : (ALLOWED_ORIGINS.has(origin) ? origin : "https://app.amanahlife.com");
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function json(body: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

interface ChallengeInfo {
  id?: string;
  title?: string;
  targetAmount?: number;
  savedAmount?: number;
  daysRemaining?: number;
  progress?: number;
}

Deno.serve(async (req: Request) => {
  const requestId = crypto.randomUUID();
  const corsHeaders = corsHeadersFor(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, corsHeaders);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "Unauthorized" }, 401, corsHeaders);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return json({ error: "Invalid token" }, 401, corsHeaders);
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return json({ error: "Missing request body" }, 400, corsHeaders);
  }

  const { challenges, language } = body as { challenges?: ChallengeInfo[]; language?: string };
  if (!Array.isArray(challenges) || challenges.length === 0) {
    return json({ error: "No active challenges" }, 400, corsHeaders);
  }
  const isAr = language === "ar";

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) {
    return json({ error: "Savings tips not configured" }, 500, corsHeaders);
  }

  const challengesSummary = challenges.slice(0, 5).map((c) =>
    `- ${c.title || "Untitled"}: ${c.savedAmount ?? 0}/${c.targetAmount ?? 0} saved, ${c.daysRemaining ?? "?"} days left (${c.progress ?? 0}% complete)`
  ).join("\n");

  const prompt = isAr
    ? `أنت مساعد ادخار في تطبيق أمانة، رفيق حياة إسلامي. بناءً على تحديات الادخار النشطة للمستخدم أدناه، قدّم نصيحة ادخار عملية واحدة وموجزة (2-3 جمل)، مخصصة لتقدمه الفعلي - شجّعه إن كان متقدماً، أو اقترح خطوة صغيرة ملموسة إن كان متأخراً. اربطها بالادخار الحلال أو الصدقة عند الإمكان.\n\nالتحديات النشطة:\n${challengesSummary}`
    : `You are a savings assistant inside AmanahLife, an Islamic life-companion app. Based on the user's active savings challenges below, give one practical, concise savings tip (2-3 sentences), tailored to their actual progress - encourage them if they're ahead, or suggest one concrete small step if they're behind. Tie it to halal saving or charity where relevant.\n\nActive challenges:\n${challengesSummary}`;

  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error(JSON.stringify({ requestId, userId: user.id, action: "anthropic_error", status: anthropicRes.status, error: errText }));
      return json({ error: "Savings tips temporarily unavailable" }, 502, corsHeaders);
    }

    const data = await anthropicRes.json();
    const tip = data.content?.[0]?.text?.trim();
    if (!tip) {
      return json({ error: "Empty response" }, 502, corsHeaders);
    }

    console.log(JSON.stringify({ requestId, userId: user.id, action: "tip_generated" }));
    return json({ tip }, 200, corsHeaders);
  } catch (error) {
    console.error(JSON.stringify({ requestId, userId: user.id, error: error instanceof Error ? error.message : String(error) }));
    return json({ error: "Internal server error" }, 500, corsHeaders);
  }
});
