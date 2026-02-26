import { v } from "convex/values";
import { query, internalQuery, action } from "./_generated/server"; // httpAction 제거, action 추가
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import OpenAI from "openai"; // OpenAI 임포트

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
    const activeReservations = reservations.filter(
      (r) =>
        (r.status === "approved" || r.status === "rented") &&
        r.endDate >= args.startDate &&
        r.startDate <= args.endDate,
    );

    const reservedCount = new Map<Id<"equipment">, number>();
    for (const reservation of activeReservations) {
      for (const item of reservation.items) {
        const current = reservedCount.get(item.equipmentId) || 0;
        reservedCount.set(item.equipmentId, current + item.quantity);
      }
    }

    return filteredEquipment.map((eq) => ({
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

const SYSTEM_PROMPT = `너는 영화예술전공의 장비 대여 추천 AI야. 학생이 촬영에 필요한 장비를 효율적으로 선택할 수 있도록 도와줘.

## 역할
- 촬영조명팀 인원 수와 예약 날짜를 기반으로 최적의 장비 세트를 추천
- 각 추천에 대해 형식적인 답변이 아닌, 현장 경험 기반의 실질적인 이유를 설명
- 현재 재고 상태를 확인하여 대여 가능한 장비만 추천
- 재고가 없는 경우 대안 장비를 자동 추천

## 추천 원칙
1. 인원이 적을수록 운용 편의성이 높은 장비 우선 (소형, 올인원)
2. 인원이 많을수록 화질/출력을 높이는 방향으로 업그레이드
3. 카메라-렌즈 마운트 호환성 반드시 확인
4. FX3/A7S2에 EF 렌즈 사용 시 EF to E 어댑터 재고 확인 필수
5. 모니터/무선 장비 선택 시 → SDI(short) 또는 HDMI 케이블 자동 추천
6. 조명 수에 맞는 스탠드+모래주머니 자동 매칭 (1:1 비율)
7. 스탠드 선택 시 → 반드시 모래주머니 추천 (안전상 필수)
8. 배터리는 조명 1대당 최소 1개, 카메라용 별도

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

## 모니터/무선 단계 추천 시
- 모니터 또는 무선 송수신기 선택 시 → SDI(short) 또는 HDMI 케이블 자동 추천
- 카메라에 따른 케이블 선택: Alexa Mini → SDI, FX3/A7S2 → HDMI
- 케이블 수량은 모니터/무선 장비 수량과 동일하게

## 스탠드 단계 추천 시
- 스탠드 1대당 모래주머니 1개 필수 (안전 확보)
- 스탠드 수량 = 이전 단계에서 선택한 조명 수량
- 모래주머니는 스탠드 수량과 동일하게 자동 추천

## 추천 이유 작성 가이드
- "이 장비가 좋습니다" 같은 형식적 문장 금지
- 인원 수와 연결된 구체적 운용 시나리오로 설명
- 예: "2명이면 렌즈 교체할 시간이 부족하므로, 줌렌즈가 포함된 FX3가 효율적입니다"
- 예: "조명 담당이 2명이면 600D처럼 PSU가 별도인 대형 조명도 세팅 가능합니다"

## 응답 형식
반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.
{
  "step": "camera|lens|tripod_grip|monitor|lighting|stand|accessory|summary",
  "recommendations": [
    {
      "equipment_name": "장비명 (DB의 장비명과 정확히 일치)",
      "quantity": 추천 수량,
      "reason": "실질적인 추천 이유 (2~3문장)",
      "alternatives": [
        {
          "equipment_name": "대안 장비명",
          "reason": "대안 추천 이유"
        }
      ]
    }
  ],
  "step_summary": "이 단계 전체 요약 (1문장)"
}`;

// ===========================
// 5. OpenAI API 호출 Action (변경됨)
// ===========================

export const getRecommendation = action({
  // httpAction 대신 일반 action 사용 (보안/호출 용이성)
  args: {
    step: v.string(),
    crewSize: v.number(),
    pickupDate: v.string(),
    returnDate: v.string(),
    selectedEquipment: v.any(), // 복잡한 객체는 any로 처리하거나 v.array(v.object({...}))로 정의 가능
    userId: v.optional(v.string()), // userId가 없을 수도 있으므로 optional
  },
  handler: async (ctx, args) => {
    try {
      // 1. OpenAI 클라이언트 초기화
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY, // Convex 대시보드에 설정된 키 사용
      });

      // 2. 해당 날짜 범위의 실시간 재고 조회
      const category = stepToCategory(args.step);
      const availableEquipment = await ctx.runQuery(
        internal.ai.getAvailableByDate,
        { startDate: args.pickupDate, endDate: args.returnDate, category },
      );

      // 3. 학생 과거 예약 이력 조회 (옵션)
      // let studentHistory: any[] = [];
      // if (args.userId) { ... }

      // 4. 학과 전체 인기 장비 통계
      const popularStats = await ctx.runQuery(internal.ai.getPopularEquipment, {
        limit: 20,
      });

      // 5. 프롬프트 구성
      const prompt = buildPrompt({
        step: args.step,
        crewSize: args.crewSize,
        pickupDate: args.pickupDate,
        returnDate: args.returnDate,
        selectedEquipment: args.selectedEquipment,
        availableEquipment,
        studentHistory: [], // 필요 시 추가
        popularStats,
      });

      // 6. OpenAI API 호출 (GPT-4o-mini 사용)
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" }, // JSON 응답 강제
      });

      const content = completion.choices[0].message.content;
      if (!content) throw new Error("No content from OpenAI");

      const result = JSON.parse(content);

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      console.error("OpenAI Recommendation Error:", error);
      return {
        success: false,
        error: error.message || "Unknown error",
      };
    }
  },
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
