import { NextResponse } from "next/server";

export async function POST(req: Request) {
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json(
            { error: "Invalid JSON body" },
            { status: 400 }
        );
    }

    const { level, days, goal, injuries, currentGrade, targetGrade } =
        (body ?? {}) as {
            level?: string;
            days?: number | string;
            goal?: string;
            injuries?: string | null;
            currentGrade?: string;
            targetGrade?: string;
        };

    if (!level || !days || !goal) {
        return NextResponse.json(
            { error: "Missing required fields: level, days, and goal are required." },
            { status: 400 }
        );
    }

    const FONT_GRADES = [
        "4",
        "4+",
        "5",
        "5+",
        "6A",
        "6A+",
        "6B",
        "6B+",
        "6C",
        "6C+",
        "7A",
        "7A+",
    ];

    const currentIdx = currentGrade ? FONT_GRADES.indexOf(currentGrade) : -1;
    const targetIdx = targetGrade ? FONT_GRADES.indexOf(targetGrade) : -1;

    const gradeDiff =
        currentIdx >= 0 && targetIdx >= 0 ? targetIdx - currentIdx : null;

    const intensityGuidance =
        gradeDiff !== null && gradeDiff >= 4
            ? `High progression demand: the user is aiming for a major grade jump. The plan must include at least one true limit/projecting session with attempts around ${currentGrade} to ${targetGrade}, but scaled safely to the user's level. Do not keep most main work below the current grade.`
            : gradeDiff !== null && gradeDiff >= 2
            ? `Moderate progression demand: include at least one session with work slightly above the user's current grade and one session focused on weaknesses.`
            : `Low progression demand: focus on consolidation, movement quality, consistency, and controlled progression.`;

    let progressionGuidance = "";
    if (currentIdx >= 0 && targetIdx >= 0) {
        const diff = targetIdx - currentIdx;
        if (diff <= 0) {
            progressionGuidance = `The target grade (${targetGrade}) is at or below the current grade (${currentGrade}). Focus on consolidating and refining performance at the current grade: cleaner technique, better movement quality, more reliable sends, and reducing weaknesses. Do not push for a higher grade.`;
        } else if (diff >= 4) {
            progressionGuidance = `The target grade (${targetGrade}) is much higher than the current grade (${currentGrade}) — about ${diff} steps on the Fontainebleau scale.

            Do NOT create a plan that makes this progression look achievable in one week.

            The plan must be written as the first week of a longer training block. In the General tips section, clearly explain that progressing from ${currentGrade} to ${targetGrade} will likely take multiple training cycles over several months.

            For this week:
            - Prioritize structured progression, not random hard climbing.
            - Include harder projecting only in controlled doses.
            - Add more specific work for the user's goal (${goal}).
            - For Intermediate or Advanced users, make the plan more challenging but still safe.
            - Use progressive overload language: build capacity, improve movement quality, increase intensity gradually.
            - Avoid making the plan too easy or generic.`;
        } else {
            progressionGuidance = `The target grade (${targetGrade}) is a moderate step up from the current grade (${currentGrade}) — ${diff} step(s) on the Fontainebleau scale. Build the plan to bridge that gap with appropriate strength, technique, and projecting work suited to the user's level.`;
        }
    }

    if (!process.env.OPENAI_API_KEY) {
        console.error("OPENAI_API_KEY is not configured.");
        return NextResponse.json(
            { error: "Server is not configured to generate plans." },
            { status: 500 }
        );
    }

    const prompt = `
You are a professional, safety-conscious indoor climbing coach.
Create a realistic and safe weekly indoor climbing training plan.

User profile:
- Level: ${level}
- Days per week: ${days}
- Goal: ${goal}
- Current Fontainebleau bouldering grade: ${currentGrade || "not specified"}
- Target Fontainebleau bouldering grade: ${targetGrade || "not specified"}
- Injuries / limitations: ${injuries || "none"}

Grade progression guidance:
${progressionGuidance || "No specific grade progression guidance — base the plan on the user's level and goal."}

The plan should help the user progress from their current grade toward their target grade while respecting all safety rules below.

Difficulty calibration rules:
- If the target grade is 1-2 Fontainebleau steps above the current grade, make the week moderately challenging.
- If the target grade is 3+ steps above the current grade, make the plan clearly more structured and demanding, while still safe.
- Do not overuse easy climbing unless it is part of warm-up, recovery, technique drills, or volume training.
- For harder goals, include focused projecting, weakness training, movement drills, and strength/endurance work appropriate to the user's level.
- The plan should feel like real training, not just casual climbing.
- Each session must have a clear purpose (e.g. projecting, technique, volume, strength).
- Avoid repeating the same type of session across all days.
- Include at least one session focused on harder attempts near the user's limit (projecting).
- Include at least one session focused on technique or movement quality.
- Include variation between sessions.

Intensity guidance:
${intensityGuidance}

Training quality rules:
- Main work should match the user's current and target grades.
- Do not prescribe most main climbing below the user's current grade, except for warm-up, recovery, or technique drills.
- If the user targets a much higher grade, include controlled exposure to harder climbing near or above their current limit.
- For a 6A to 7A target, include structured projecting around 6B to 6C, not only 5C or 6A climbing.
- For a 6B to 7A+ target, include structured projecting around 6C to 7A, with full rest and focus on single hard moves.
- Use easier grades for volume and technique only, not as the main progression stimulus.
- Every Main section must clearly explain why that work helps the user progress.
- For projecting sessions, require full rest (2-3 minutes) between attempts.
- Emphasize working on single hard moves or crux sequences, not just full attempts.
- Ensure at least one session pushes the user close to their physical limit in a controlled way.
- Technique sessions should still include problems near the user's current grade, not only very easy climbing.

Hard safety rules (must always follow):
- Do NOT recommend campus board training for Beginner or Intermediate users.
- Do NOT recommend fingerboard / hangboard training for Beginner users.
- For Intermediate users, fingerboard training is only allowed using large, comfortable holds (e.g. big jugs or a deep edge ~20mm+) at low intensity, short hangs, and well within easy effort. Never max hangs.
- Avoid extreme volume, reckless "to failure" sets, and repeated max-effort exercises. Controlled hard attempts are allowed for Intermediate and Advanced users when paired with full rest and good technique.
- Avoid dynamic, high-injury-risk moves (e.g. dynos, deep lock-offs at max load) for Beginner and Intermediate users.
- If the user reports injuries, adapt the plan to avoid aggravating them and prefer low-load alternatives.
- Every session must be realistic: total duration between 45 and 75 minutes including warm-up.
- Include rest and recovery guidance: schedule rest days between hard sessions, mention sleep, hydration, and mobility.
- Keep the plan suitable for an indoor climbing gym (bouldering or rope walls).

Formatting rules (strict):
- Use plain text only. Do NOT use Markdown headings, do NOT use #, ##, or ### anywhere.
- Do NOT use bold, italics, or asterisks for emphasis.
- Use simple line breaks and short bullet lines starting with "- ".
- Keep wording concise and practical.

Use exactly this output structure (and nothing else before or after, except the final disclaimer):

Weekly Plan

Day 1 - Focus:
Warm-up:
- ...
Main:
- ...
Extra:
- ...
Recovery:
- ...

Day 2 - Focus:
Warm-up:
- ...
Main:
- ...
Extra:
- ...
Recovery:
- ...

(Repeat for each training day, matching the requested number of days per week.)

General tips:
- ...
- ...

Disclaimer:
This plan is generated by AI for general guidance only. It is not a substitute for professional coaching or medical advice. Warm up properly, listen to your body, and consult a qualified coach or physician before starting a new training program, especially if you have injuries.
`;

    let response: Response;
    try {
        response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "You are a climbing coach." },
                    { role: "user", content: prompt },
                ],
            }),
        });
    } catch (err) {
        console.error("Network error calling OpenAI:", err);
        return NextResponse.json(
            { error: "Could not reach the plan generator. Please try again." },
            { status: 502 }
        );
    }

    if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        console.error("OpenAI error:", response.status, errorText);

        return NextResponse.json(
            { error: "Failed to generate plan" },
            { status: 500 }
        );
    }

    let data: { choices?: Array<{ message?: { content?: string } }> };
    try {
        data = await response.json();
    } catch (err) {
        console.error("Failed to parse OpenAI response:", err);
        return NextResponse.json(
            { error: "Received an invalid response from the plan generator." },
            { status: 502 }
        );
    }

    const plan = data.choices?.[0]?.message?.content?.trim();

    if (!plan) {
        return NextResponse.json(
            { error: "The plan generator returned an empty response. Please try again." },
            { status: 502 }
        );
    }

    return NextResponse.json({ plan });
}
