"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

// OpenAI API call for equipment recommendations (제작유형 제거됨)
export const getRecommendations = action({
  args: {
    teamSize: v.string(),
    mainCategory: v.string(),
    availableEquipment: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        category: v.string(),
        totalQuantity: v.number(),
        imageUrl: v.optional(v.string()),
      })
    ),
  },
  handler: async (_ctx, args) => {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
      console.error("OpenAI API key not configured");
      // Return fallback recommendations based on rules
      return getFallbackRecommendations(args);
    }

    const systemPrompt = `당신은 영화 제작 장비 전문가입니다.
학생들의 촬영 프로젝트에 적합한 장비를 추천해주세요.

사용자 정보:
- 팀 규모: ${args.teamSize}
- 선택한 카테고리: ${args.mainCategory}

★★★ 팀 규모별 장비 추천 기준 ★★★
${args.teamSize === "1-2명" ? `
[1-2명 소규모팀]
- 가볍고 휴대성 좋은 장비 우선
- 원맨 오퍼레이션 가능한 장비
- ARRI Alexa, RED 같은 대형 시네마 카메라는 절대 추천 금지 (운용 인원 부족)
- Sony, Canon, Blackmagic Pocket 등 컴팩트 카메라 추천
- 삼각대는 가벼운 것, 조명은 소형 LED 추천
` : args.teamSize === "3-5명" ? `
[3-5명 중소규모팀]
- 적절한 크기와 성능의 균형
- 2-3명이 운용 가능한 장비
- 중급 시네마 카메라 가능 (Blackmagic, Sony FX 시리즈 등)
- 기본적인 조명 세트와 오디오 장비 추천
` : args.teamSize === "6-10명" ? `
[6-10명 중규모팀]
- 전문 시네마 장비 운용 가능
- ARRI, RED 등 고급 카메라 추천 가능
- 본격적인 조명 세트업 가능
- 별도 사운드팀 운용 가능
` : `
[10명+ 대규모팀]
- 모든 전문 장비 운용 가능
- 대형 프로덕션 장비 추천
- 복수의 카메라 세트업 가능
- 전문 조명, 그립, 사운드 장비 추천
`}

★★★ 중요: 아래 목록에서만 추천하세요 ★★★
사용 가능한 ${args.mainCategory} 장비 목록 (총 ${args.availableEquipment.length}개):
${JSON.stringify(args.availableEquipment.slice(0, 50), null, 2)}

다음 JSON 형식으로 추천을 제공해주세요:
{
  "recommendations": [
    {
      "equipmentId": "장비ID (반드시 위 목록의 id 중 하나)",
      "name": "장비명",
      "category": "${args.mainCategory}",
      "quantity": 수량(숫자),
      "reason": "왜 이 팀 규모에 적합한지 구체적인 이유 (한국어, 1-2문장)",
      "priority": "recommended 또는 none"
    }
  ],
  "warnings": []
}

규칙:
1. ★ 가장 중요: 오직 위 목록에 있는 장비만 추천할 것
2. ★ 팀 규모에 맞는 장비만 추천 (1-2명에게 ARRI/RED 추천 금지!)
3. ★ 카메라, 렌즈는 항상 수량 1개만 추천 (멀티캠 촬영 아님)
4. 조명, 오디오, 악세서리는 팀 규모에 따라 수량 조절 가능
5. reason에 "왜 이 팀 규모에 이 장비가 적합한지" 구체적으로 작성
6. priority는 가장 추천하는 장비 1개만 "recommended", 나머지는 "none"
7. 최대 4개의 장비 추천
8. 한국어로 설명`;

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: "위 정보를 바탕으로 장비를 추천해주세요. JSON 형식으로만 응답해주세요.",
            },
          ],
          temperature: 0.7,
          max_tokens: 2000,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        console.error(`OpenAI API error: ${response.status}`);
        return getFallbackRecommendations(args);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        return getFallbackRecommendations(args);
      }

      const result = JSON.parse(content);

      // Validate and fix equipment IDs
      const validEquipmentIds = new Set(args.availableEquipment.map((e) => e.id));

      const validatedRecommendations = (result.recommendations || [])
        .filter((rec: { equipmentId: string }) =>
          validEquipmentIds.has(rec.equipmentId)
        )
        .map((rec: {
          equipmentId: string;
          name?: string;
          category?: string;
          quantity?: number;
          reason?: string;
          priority?: string;
        }) => {
          const equipment = args.availableEquipment.find(
            (e) => e.id === rec.equipmentId
          );
          return {
            equipmentId: rec.equipmentId,
            name: equipment?.name || rec.name,
            category: equipment?.category || rec.category || "",
            quantity: rec.quantity || 1,
            reason: rec.reason || "추천 장비입니다",
            priority: rec.priority || "recommended",
            imageUrl: equipment?.imageUrl,
          };
        });

      return {
        recommendations: validatedRecommendations,
        warnings: result.warnings || [],
      };
    } catch (error) {
      console.error("Error calling OpenAI:", error);
      return getFallbackRecommendations(args);
    }
  },
});

// Fallback recommendations when API is unavailable
function getFallbackRecommendations(args: {
  teamSize: string;
  mainCategory: string;
  availableEquipment: Array<{
    id: string;
    name: string;
    category: string;
    totalQuantity: number;
    imageUrl?: string;
  }>;
}) {
  const { mainCategory, teamSize, availableEquipment } = args;

  // Filter out heavy pro equipment for small teams
  let filteredEquipment = availableEquipment;

  if (teamSize === "1-2명") {
    // Exclude ARRI, RED, and other heavy cinema cameras for 1-2 person teams
    const excludePatterns = ["ARRI", "Alexa", "RED", "VENICE", "Varicam"];
    filteredEquipment = availableEquipment.filter(eq =>
      !excludePatterns.some(pattern =>
        eq.name.toUpperCase().includes(pattern.toUpperCase())
      )
    );
    // If all equipment was filtered out, use original list
    if (filteredEquipment.length === 0) {
      filteredEquipment = availableEquipment;
    }
  }

  // Determine quantity multiplier based on team size
  // 카메라, 렌즈는 항상 1개만
  const isMainEquipment = mainCategory === "CAMERA" || mainCategory === "LENS";
  const multiplier = isMainEquipment ? 1 : (
    teamSize === "1-2명"
      ? 1
      : teamSize === "3-5명"
        ? 1
        : teamSize === "6-10명"
          ? 2
          : 2
  );

  // Get reason based on team size
  const getReasonForTeamSize = (teamSize: string) => {
    if (teamSize === "1-2명") {
      return `소규모 팀에서 한 명이 운용하기 적합합니다.`;
    } else if (teamSize === "3-5명") {
      return `중소규모 팀에서 효율적으로 사용할 수 있습니다.`;
    } else if (teamSize === "6-10명") {
      return `전문 인력이 있는 팀에서 최상의 결과를 낼 수 있습니다.`;
    } else {
      return `대규모 프로덕션에 적합한 전문 장비입니다.`;
    }
  };

  // Select top equipment items (max 4)
  const recommendations = filteredEquipment.slice(0, 4).map((eq, idx) => ({
    equipmentId: eq.id,
    name: eq.name,
    category: mainCategory,
    quantity: Math.min(multiplier, eq.totalQuantity),
    reason: getReasonForTeamSize(teamSize),
    priority: idx === 0 ? "recommended" : "none",
    imageUrl: eq.imageUrl,
  }));

  return {
    recommendations,
    warnings: [],
  };
}
