import { v } from "convex/values";
import { query, internalQuery, httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";

// ===========================
// 1. 특정 날짜의 카테고리별 가용 장비 조회 (변경 없음)
// ===========================

export const getAvailableByDate = internalQuery({
  args: {
    startDate: v.string(),
    endDate: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log("🔍 [getAvailableByDate] 시작");
    console.log("📅 요청 날짜 범위:", { startDate: args.startDate, endDate: args.endDate });

    const allEquipment = await ctx.db.query("equipment").collect();
    const visibleEquipment = allEquipment.filter(
      (eq) => eq.isVisible !== false,
    );

    const allCategories = await ctx.db.query("categories").collect();
    const categoryMap = new Map(allCategories.map((c) => [c._id, c]));

    const matchesCategory = (eq: Doc<"equipment">, targetCategory: string) => {
      const cat = categoryMap.get(eq.categoryId);
      if (!cat) return false;
      const parentCat = cat.parentId ? categoryMap.get(cat.parentId) : null;
      const catName = (parentCat?.name || cat.name).toUpperCase();
      const target = targetCategory.toUpperCase();
      return catName.includes(target) || target.includes(catName);
    };

    let filteredEquipment = visibleEquipment;
    if (args.category) {
      filteredEquipment = visibleEquipment.filter((eq) =>
        matchesCategory(eq, args.category!),
      );
    }

    const reservations = await ctx.db.query("reservations").collect();
    console.log("📋 전체 예약 수:", reservations.length);

    // 날짜 형식 확인을 위해 첫 번째 예약 샘플 출력
    if (reservations.length > 0) {
      const sample = reservations[0];
      console.log("📋 예약 날짜 샘플:", {
        startDate: sample.startDate,
        endDate: sample.endDate,
        status: sample.status,
      });
    }

    const activeReservations = reservations.filter(
      (r) =>
        (r.status === "approved" || r.status === "rented") &&
        r.endDate >= args.startDate &&
        r.startDate <= args.endDate,
    );

    console.log("✅ 활성 예약 수 (approved/rented + 날짜 겹침):", activeReservations.length);

    // Alexa Mini 예약만 출력
    const alexaMiniReservations = activeReservations.filter(r =>
      r.items.some(item => item.name.includes("Alexa"))
    );
    if (alexaMiniReservations.length > 0) {
      console.log("🎬 Alexa Mini 관련 예약:", alexaMiniReservations.map(r => ({
        reservationNumber: r.reservationNumber,
        status: r.status,
        startDate: r.startDate,
        endDate: r.endDate,
        items: r.items.filter(item => item.name.includes("Alexa")),
      })));
    }

    const reservedCount = new Map<Id<"equipment">, number>();
    for (const reservation of activeReservations) {
      for (const item of reservation.items) {
        const current = reservedCount.get(item.equipmentId) || 0;
        reservedCount.set(item.equipmentId, current + item.quantity);
      }
    }

    console.log("📊 예약된 장비 수량 맵:", Array.from(reservedCount.entries()).map(([id, count]) => ({
      equipmentId: id,
      reservedQuantity: count,
    })));

    const result = filteredEquipment.map((eq) => ({
      _id: eq._id,
      name: eq.name,
      categoryId: eq.categoryId,
      categoryName: categoryMap.get(eq.categoryId)?.name || "Unknown",
      totalQuantity: eq.totalQuantity,
      reservedQuantity: reservedCount.get(eq._id) || 0,
      availableQuantity: Math.max(
        0,
        eq.totalQuantity - (reservedCount.get(eq._id) || 0),
      ),
      description: eq.description,
      manufacturer: eq.manufacturer,
    }));

    // Alexa Mini 결과 출력
    const alexaMiniResult = result.find(r => r.name.includes("Alexa"));
    if (alexaMiniResult) {
      console.log("🎬 Alexa Mini 재고 결과:", alexaMiniResult);
    }

    console.log("🔍 [getAvailableByDate] 완료, 반환 장비 수:", result.length);
    return result;
  },
});

// ===========================
// 2. 학생의 과거 예약 이력 조회 (변경 없음)
// ===========================

export const getStudentHistory = internalQuery({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const reservations = await ctx.db
      .query("reservations")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);

    const equipmentIds = new Set<Id<"equipment">>();
    const equipmentCount = new Map<Id<"equipment">, number>();

    for (const reservation of reservations) {
      for (const item of reservation.items) {
        equipmentIds.add(item.equipmentId);
        const count = equipmentCount.get(item.equipmentId) || 0;
        equipmentCount.set(item.equipmentId, count + 1);
      }
    }

    const equipmentList = await Promise.all(
      Array.from(equipmentIds).map((id) => ctx.db.get(id)),
    );

    return equipmentList
      .filter((eq): eq is Doc<"equipment"> => eq !== null)
      .map((eq) => ({
        _id: eq._id,
        name: eq.name,
        categoryId: eq.categoryId,
        timesUsed: equipmentCount.get(eq._id) || 0,
      }))
      .sort((a, b) => b.timesUsed - a.timesUsed);
  },
});

// ===========================
// 3. 학과 전체 인기 장비 통계 (변경 없음)
// ===========================

export const getPopularEquipment = internalQuery({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    const sixMonthsAgo = Date.now() - 180 * 24 * 60 * 60 * 1000;
    const allReservations = await ctx.db.query("reservations").collect();
    const recentReservations = allReservations.filter(
      (r) => (r._creationTime || 0) >= sixMonthsAgo,
    );

    const equipmentCount = new Map<Id<"equipment">, number>();
    for (const reservation of recentReservations) {
      for (const item of reservation.items) {
        const count = equipmentCount.get(item.equipmentId) || 0;
        equipmentCount.set(item.equipmentId, count + 1);
      }
    }

    const equipmentList = await Promise.all(
      Array.from(equipmentCount.keys()).map((id) => ctx.db.get(id)),
    );

    return equipmentList
      .filter((eq): eq is Doc<"equipment"> => eq !== null)
      .map((eq) => ({
        _id: eq._id,
        name: eq.name,
        categoryId: eq.categoryId,
        timesReserved: equipmentCount.get(eq._id) || 0,
      }))
      .sort((a, b) => b.timesReserved - a.timesReserved)
      .slice(0, limit);
  },
});

// ===========================
// 4. 시스템 프롬프트 (그대로 유지)
// ===========================

const SYSTEM_PROMPT = `[CRITICAL LANGUAGE REQUIREMENT - READ THIS FIRST]
You MUST write ALL responses in Korean language ONLY. Your response will be REJECTED if it contains any non-Korean characters.

FORBIDDEN CHARACTERS - DO NOT USE:
❌ Chinese characters: 优秀, 进行, उपलब, 適合, 使用, 可以 etc.
❌ Japanese characters: の, は, です, ます etc.
❌ Any other non-Korean language

ALLOWED:
✅ Korean (한글): 우수한, 진행, 적합, 사용, 할 수 있습니다
✅ Equipment names: FX3, Alexa Mini, APUTURE
✅ Numbers: 1, 2, 3

WRONG EXAMPLE: "저조도 성능이 优秀합니다" ❌
RIGHT EXAMPLE: "저조도 성능이 우수합니다" ✅

WRONG EXAMPLE: "촬영을 进行할 수 있습니다" ❌
RIGHT EXAMPLE: "촬영을 진행할 수 있습니다" ✅

너는 영화예술전공의 장비 대여 추천 AI야. 학생이 촬영에 필요한 장비를 효율적으로 선택할 수 있도록 도와줘.

## 역할
- 촬영조명팀 인원 수와 예약 날짜를 기반으로 최적의 장비 세트를 추천
- 각 추천에 대해 형식적인 답변이 아닌, 현장 경험 기반의 실질적인 이유를 설명
- 현재 재고 상태를 확인하여 대여 가능한 장비만 추천
- 재고가 없는 경우 대안 장비를 자동 추천

## 추천 원칙
1. **[CRITICAL] 재고 상태에 관계없이 최적의 장비를 추천하세요**
   - availableQuantity가 0인 장비도 해당 인원에게 최적이라면 반드시 recommendations에 포함
   - 예: 4명 이상 팀에게는 Alexa Mini가 최적 → 재고가 0이어도 반드시 추천
   - reason에 재고 상태 명시: "현재 재고 없음, 대안 장비를 확인하세요"
   - 재고 0인 장비를 추천하지 않으면 학생이 왜 대여할 수 없는지 이해하지 못함
2. **중복 방지**: recommendations에 포함된 장비는 alternatives에 절대 포함하지 마세요
3. 인원이 적을수록 운용 편의성이 높은 장비 우선 (소형, 올인원)
4. 인원이 많을수록 화질/출력을 높이는 방향으로 업그레이드
5. 카메라-렌즈 마운트 호환성 반드시 확인
6. FX3/A7S2에 EF 렌즈 사용 시 EF to E 어댑터 재고 확인 필수
7. 모니터/무선 장비 선택 시 → SDI(short) 또는 HDMI 케이블 자동 추천
8. 조명 수에 맞는 스탠드+모래주머니 자동 매칭 (1:1 비율)
9. 스탠드 선택 시 → 반드시 모래주머니 추천 (안전상 필수)
10. 배터리는 조명 1대당 최소 1개, 카메라용 별도

## 조명 추천 우선순위 (COB 조명)
1. APUTURE LS 600C Pro II (최우선 - 600W 바이컬러)
2. APUTURE LS 600D Pro (600C와 동급 - 600W 데이라이트)
3. APUTURE 400X (재고 있으면 무조건 추천 - 400W 바이컬러)
4. Amaran F21C (재고 있으면 추천 - 플렉서블 바이컬러)
5. RC220B (보조등 - 9대 보유, 범용성 높음)

## 카메라별 특징
- Alexa Mini: PL/EF 마운트, 시네마급 화질, 학과 메인 카메라 (4대)
- FX3: E-mount, 소형 시네마 카메라, PZ 28-135mm 줌 내장 (2대)
- A7S2: E-mount, 미러리스, 저조도 강점 (1대)

## 인원수별 기본 추천
- 2명: FX3 고정 (소형, 빠른 셋업)
- 3명: Alexa Mini와 FX3 둘 다 제시 (각각 "3명 추천" 라벨)
- 4명+: Alexa Mini 고정 (본격 시네마 구성)

## 마운트 호환성
- Alexa Mini (PL/EF): CANON Cine Prime, SAMYANG VDSLR, CN-E Zoom, 100mm Macro, EF Zoom 100-400
- FX3/A7S2 (E-mount): 내장 렌즈 + (EF to E 어댑터 필수) 모든 EF 렌즈

## 트라이포드/그립 단계 추천 시
- 이 단계에서는 트라이포드와 그립 장비를 모두 추천합니다
- 트라이포드: 일반 삼각대, 비디오 삼각대 등
- 그립 장비: Handheld Rig, Dolly, 달리 등
- **중요**: FX3 카메라는 Handheld Rig 사용 불가 (호환성 문제)
  - FX3 선택 시 → Tripod 또는 Dolly 추천
  - Alexa Mini 선택 시 → Tripod, Handheld Rig, Dolly 모두 가능

## 모니터/무선 단계 추천 시
- 모니터 또는 무선 송수신기 선택 시 → SDI(short) 또는 HDMI 케이블 자동 추천
- 카메라에 따른 케이블 선택: Alexa Mini → SDI, FX3/A7S2 → HDMI
- 케이블 수량은 모니터/무선 장비 수량과 동일하게

## 스탠드 단계 추천 시
- 스탠드 1대당 모래주머니 1개 필수 (안전 확보)
- 스탠드 수량 = 이전 단계에서 선택한 조명 수량
- 모래주머니는 스탠드 수량과 동일하게 자동 추천

## 추천 이유 작성 가이드
- **모든 설명은 순수 한국어로만 작성** (영어, 중국어, 일본어 금지)
- "이 장비가 좋습니다" 같은 형식적 문장 금지
- 인원 수와 연결된 구체적 운용 시나리오로 설명
- 예: "2명이면 렌즈 교체할 시간이 부족하므로, 줌렌즈가 포함된 FX3가 효율적입니다"
- 예: "조명 담당이 2명이면 600D처럼 PSU가 별도인 대형 조명도 세팅 가능합니다"
- **재고 부족 시**: "현재 재고가 X개로 부족하니, 대안 장비를 확인해주세요" 같은 구체적 안내

## 응답 형식
반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.
모든 "reason" 필드는 순수 한국어로만 작성하세요.
{
  "step": "camera|lens|tripod_grip|monitor|lighting|stand|accessory|summary",
  "recommendations": [
    {
      "equipment_name": "장비명 (DB의 장비명과 정확히 일치)",
      "quantity": 추천 수량,
      "reason": "순수 한국어로 작성된 실질적인 추천 이유 (2~3문장, 영어/중국어/일본어 절대 금지)",
      "alternatives": [
        {
          "equipment_name": "대안 장비명",
          "reason": "순수 한국어로 작성된 대안 추천 이유"
        }
      ]
    }
  ],
  "step_summary": "순수 한국어로 작성된 이 단계 전체 요약 (1문장)"
}`;

// ===========================
// 5. OpenAI API 호출 Action (변경됨)
// ===========================

export const getRecommendation = httpAction(async (ctx, request) => {
  // CORS 헤더 설정
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // OPTIONS 요청 (preflight) 처리
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const body = await request.json();
    const { step, crewSize, pickupDate, returnDate, selectedEquipment } = body;

    // 1. 해당 날짜 범위의 실시간 재고 조회
    const category = stepToCategory(step);
    console.log(`🔍 Step: ${step}, Category: ${category}`);

    const availableEquipment = await ctx.runQuery(
      internal.ai.getAvailableByDate,
      { startDate: pickupDate, endDate: returnDate, category }
    );

    console.log(`📦 ${step} 단계 전체 장비: ${availableEquipment.length}개`);
    if (availableEquipment.length > 0) {
      console.log(`📋 첫 3개 장비:`, availableEquipment.slice(0, 3).map(eq => ({ name: eq.name, category: eq.categoryName })));
    } else {
      console.warn(`⚠️ ${step} 단계에서 장비를 찾을 수 없습니다!`);
    }

    // 2. 학생 과거 예약 이력 조회 (옵션)
    const studentHistory: Array<{
      _id: string;
      name: string;
      categoryId: string;
      timesUsed: number;
    }> = [];

    // 3. 학과 전체 인기 장비 통계
    const popularStats = await ctx.runQuery(
      internal.ai.getPopularEquipment,
      { limit: 20 }
    );

    // 4. 프롬프트 구성
    const prompt = buildPrompt({
      step,
      crewSize,
      pickupDate,
      returnDate,
      selectedEquipment,
      availableEquipment,
      studentHistory,
      popularStats,
    });

    // 5. Groq API 호출 (Llama 3.1 사용 - 무료!)
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      throw new Error("GROQ_API_KEY not configured");
    }

    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
        }),
      }
    );

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();

      // Rate limit 에러 특별 처리
      if (groqResponse.status === 429) {
        console.error("🚨 Groq API Rate Limit 초과:", errorText);

        // 에러 메시지에서 대기 시간 추출
        const waitTimeMatch = errorText.match(/try again in ([\d.]+)s/);
        const waitTime = waitTimeMatch ? Math.ceil(parseFloat(waitTimeMatch[1])) : 30;

        throw new Error(`AI 서비스 요청이 너무 많습니다. ${waitTime}초 후 자동으로 재시도됩니다.`);
      }

      throw new Error(`Groq API error: ${groqResponse.statusText} - ${errorText}`);
    }

    const result = await groqResponse.json();

    // 6. 응답 파싱 및 검증
    const content = result.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("No content in Groq response");
    }

    // 중국어/일본어 문자 검증 및 자동 재시도
    const chineseJapaneseRegex = /[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]/;
    if (chineseJapaneseRegex.test(content)) {
      console.error("🚫 AI 응답에 중국어/일본어 문자 감지, 자동 재시도합니다...");

      // 재시도 (온도 낮춤)
      const retryResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt } // 수정: userPrompt -> prompt
          ],
          response_format: { type: "json_object" },
          temperature: 0.3, // 온도를 낮춰서 더 일관된 응답
        }),
      });

      if (!retryResponse.ok) {
        const errorText = await retryResponse.text();
        console.error("🔴 재시도 실패:", errorText);

        // Rate limit 에러 특별 처리
        if (retryResponse.status === 429) {
          const waitTimeMatch = errorText.match(/try again in ([\d.]+)s/);
          const waitTime = waitTimeMatch ? Math.ceil(parseFloat(waitTimeMatch[1])) : 30;
          throw new Error(`AI 서비스 요청이 너무 많습니다. ${waitTime}초 후 자동으로 재시도됩니다.`);
        }

        throw new Error(`재시도 실패: ${retryResponse.statusText}`);
      }

      const retryResult = await retryResponse.json();
      const retryContent = retryResult.choices?.[0]?.message?.content;

      if (!retryContent || chineseJapaneseRegex.test(retryContent)) {
        throw new Error("AI가 한국어가 아닌 언어를 사용했습니다. 다시 시도해주세요.");
      }

      const recommendation = JSON.parse(retryContent);
      console.log("✅ 재시도 성공!");

      // 장비별 재고 정보 맵 생성 (클라이언트에서 사용)
      const availableEquipmentMap: Record<string, number> = {};
      availableEquipment.forEach(eq => {
        availableEquipmentMap[eq.name] = eq.availableQuantity;
      });

      return new Response(JSON.stringify({
        success: true,
        data: recommendation,
        availableEquipmentMap, // 날짜별 재고 정보 추가
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    const recommendation = JSON.parse(content);

    // 장비별 재고 정보 맵 생성 (클라이언트에서 사용)
    const availableEquipmentMap: Record<string, number> = {};
    availableEquipment.forEach(eq => {
      availableEquipmentMap[eq.name] = eq.availableQuantity;
    });

    return new Response(JSON.stringify({
      success: true,
      data: recommendation,
      availableEquipmentMap, // 날짜별 재고 정보 추가
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("AI recommendation error:", error);
    console.error("Error stack:", error.stack);
    console.error("Error details:", JSON.stringify(error, null, 2));

    // 에러 시 폴백 응답 (더 자세한 정보 포함)
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Unknown error",
      errorType: error.name,
      errorDetails: error.toString(),
      fallback: true,
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  }
});

// ===========================
// 헬퍼 함수 (그대로 유지)
// ===========================

function stepToCategory(step: string): string | undefined {
  const mapping: Record<string, string> = {
    camera: "Camera",
    lens: "Lens",
    tripod_grip: "Tripod",
    monitor: "Monitor",
    lighting: "Lighting",
    stand: "Stand",
    accessory: "ACC",
  };
  return mapping[step];
}

function buildPrompt(params: {
  step: string;
  crewSize: number;
  pickupDate: string;
  returnDate: string;
  selectedEquipment: any[];
  availableEquipment: any[];
  studentHistory: any[];
  popularStats: any[];
}): string {
  const {
    step,
    crewSize,
    pickupDate,
    returnDate,
    selectedEquipment,
    availableEquipment,
    studentHistory,
    popularStats,
  } = params;

  let prompt = `[입력 정보]\n`;
  prompt += `- 대여 시작 (Pick-up): ${pickupDate}\n`;
  prompt += `- 반납 예정 (Return): ${returnDate}\n`;
  prompt += `- 촬영조명팀 인원 수: ${crewSize}명\n\n`;

  if (selectedEquipment && selectedEquipment.length > 0) {
    prompt += `[이전 단계에서 선택한 장비]\n`;
    prompt += JSON.stringify(selectedEquipment, null, 2) + "\n\n";
  }

  prompt += `[현재 재고 상태 - ${pickupDate} ~ ${returnDate} 기간 기준]\n`;
  prompt += JSON.stringify(availableEquipment, null, 2) + "\n\n";

  if (studentHistory.length > 0) {
    prompt += `[이 학생의 과거 예약 이력]\n`;
    prompt += JSON.stringify(studentHistory, null, 2) + "\n\n";
  }

  if (popularStats.length > 0) {
    prompt += `[학과 전체 인기 장비 통계]\n`;
    prompt += JSON.stringify(popularStats, null, 2) + "\n\n";
  }

  const stepNames: Record<string, string> = {
    camera: "카메라",
    lens: "렌즈",
    tripod_grip: "트라이포드/그립",
    monitor: "모니터/무선",
    lighting: "조명",
    stand: "스탠드",
    accessory: "악세서리",
    summary: "전체 요약",
  };

  prompt += `${stepNames[step] || step}를 추천해주세요.`;

  return prompt;
}
