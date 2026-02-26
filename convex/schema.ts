import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // 1. 유저 테이블
  users: defineTable({
    name: v.string(),
    email: v.string(),
    clerkId: v.string(),
    role: v.string(),
    studentId: v.optional(v.string()),
    phone: v.optional(v.string()),
    department: v.optional(v.string()),
    isApproved: v.optional(v.boolean()),
    cart: v.optional(v.string()),
  }).index("by_clerkId", ["clerkId"]),

  // 2. 카테고리 테이블
  categories: defineTable({
    name: v.string(),
    parentId: v.optional(v.id("categories")),
    order: v.optional(v.number()),
  }),

  // 3. 장비 마스터 테이블 (문법 오류 수정 완료)
  equipment: defineTable({
    name: v.string(),
    categoryId: v.id("categories"),
    description: v.optional(v.string()),
    manufacturer: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    totalQuantity: v.number(),
    isGroupPrint: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),

    // ★ [핵심] 학생 페이지 노출 여부 (기존 데이터 호환을 위해 optional 사용)
    isVisible: v.optional(v.boolean()),
  })
    .index("by_category", ["categoryId"])
    // ★ [추가] 카테고리별로 "보이는 장비"만 빠르게 불러오기 위한 인덱스
    .index("by_category_visibility", ["categoryId", "isVisible"]),

  // 4. 개별 자산(Asset) 테이블 (단순화)
  assets: defineTable({
    equipmentId: v.id("equipment"),
    equipmentName: v.optional(v.string()),
    categoryName: v.optional(v.string()),
    serialNumber: v.optional(v.string()),
    managementCode: v.optional(v.string()),
    status: v.string(),
    note: v.optional(v.string()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_equipmentId", ["equipmentId"])
    .index("by_status", ["status"]),

  // 5. 예약 테이블 (단품/세트 통합형)
  reservations: defineTable({
    userId: v.id("users"),
    reservationNumber: v.string(),
    status: v.string(), // "pending" | "approved" | "rented" | "returned" | "canceled"
    purpose: v.string(),
    purposeDetail: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    leaderName: v.string(),
    leaderPhone: v.string(),
    leaderStudentId: v.string(),

    // 예약된 물품 목록
    items: v.array(
      v.object({
        equipmentId: v.id("equipment"), // (수정) setId 없이 equipmentId로 통일
        name: v.string(), // 장비명 (예: "MIXPRE-3 II 풀패키지")
        quantity: v.number(), // 예약 수량
        checkedOut: v.boolean(),
        returned: v.boolean(),
        // 관리자가 배정한 실제 자산 ID 목록
        assignedAssets: v.optional(v.array(v.id("assets"))),
      }),
    ),
  })
    .index("by_userId", ["userId"])
    .index("by_status", ["status"])
    .index("by_date", ["startDate"]),

  // 6. 수리 내역 테이블 (5단계 워크플로우)
  repairs: defineTable({
    reservationId: v.optional(v.id("reservations")),
    equipmentId: v.optional(v.id("equipment")),
    assetId: v.optional(v.id("assets")),

    equipmentName: v.optional(v.string()),
    serialNumber: v.optional(v.string()),
    studentName: v.optional(v.string()),
    studentPhone: v.optional(v.string()),

    stage: v.string(),

    damageType: v.string(),
    damageDescription: v.string(),
    damagePhotos: v.optional(v.array(v.string())),
    damageConfirmedAt: v.number(),

    chargeType: v.optional(v.string()),
    chargeDecidedAt: v.optional(v.number()),

    estimateMemo: v.optional(v.string()),
    estimateRequestedAt: v.optional(v.number()),

    finalAmount: v.optional(v.number()),
    paymentConfirmedAt: v.optional(v.number()),

    repairResult: v.optional(v.string()),
    completedAt: v.optional(v.number()),

    adminMemo: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),

    isFixed: v.boolean(),
  })
    .index("by_reservationId", ["reservationId"])
    .index("by_assetId", ["assetId"])
    .index("by_stage", ["stage"]),

  // 7. 장비 이력 테이블
  assetHistory: defineTable({
    assetId: v.id("assets"),
    equipmentName: v.optional(v.string()),
    serialNumber: v.optional(v.string()),
    reservationId: v.optional(v.id("reservations")),
    userId: v.optional(v.id("users")),
    userName: v.optional(v.string()),
    action: v.string(),
    returnCondition: v.optional(v.string()),
    returnNotes: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_assetId", ["assetId"])
    .index("by_reservationId", ["reservationId"]),

  // 8. 알림 테이블
  notifications: defineTable({
    userId: v.id("users"),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    relatedId: v.optional(v.id("reservations")),
    read: v.boolean(),
    readAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_read", ["userId", "read"]),

  // 9. 엑셀 가져오기/내보내기 로그 테이블
  excelLogs: defineTable({
    userId: v.id("users"),
    userName: v.string(),
    userEmail: v.string(),
    action: v.string(), // "export" | "import"
    fileName: v.string(),
    equipmentCount: v.optional(v.number()),
    assetCount: v.optional(v.number()),
    importResult: v.optional(v.object({
      equipmentCreated: v.number(),
      equipmentUpdated: v.number(),
      equipmentErrors: v.number(),
      assetCreated: v.number(),
      assetUpdated: v.number(),
      assetErrors: v.number(),
    })),
    timestamp: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_action", ["action"])
    .index("by_timestamp", ["timestamp"]),

  // 10. 장비/자산 변경 이력 테이블
  changeHistory: defineTable({
    versionMajor: v.number(), // 엑셀 Import 시에만 증가
    versionMinor: v.number(), // 수동 수정 시 증가
    userId: v.string(),
    userName: v.string(),
    userEmail: v.string(),
    targetType: v.string(), // "equipment" | "asset"
    targetId: v.string(),
    targetName: v.string(),
    action: v.string(), // "create" | "update" | "delete" | "status_change"
    changes: v.array(v.object({
      field: v.string(),
      fieldLabel: v.string(),
      oldValue: v.optional(v.string()),
      newValue: v.optional(v.string()),
    })),
    source: v.string(), // "manual" | "excel_import"
    sourceDetail: v.optional(v.string()),
    batchId: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_targetId", ["targetId", "timestamp"])
    .index("by_batchId", ["batchId"])
    .index("by_version", ["versionMajor", "versionMinor"]),
});
