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

    // ✅ [NEW] 장바구니 데이터 영구 저장 (JSON 문자열)
    cart: v.optional(v.string()),
  }).index("by_clerkId", ["clerkId"]),

  // 2. 카테고리 테이블
  categories: defineTable({
    name: v.string(),
    parentId: v.optional(v.id("categories")),
    order: v.optional(v.number()),
  }),

  // 3. 장비 마스터 테이블
  equipment: defineTable({
    name: v.string(),
    categoryId: v.id("categories"),
    description: v.optional(v.string()),
    manufacturer: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    totalQuantity: v.number(),
    isGroupPrint: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  }).index("by_category", ["categoryId"]),

  // 4. 개별 자산(Asset) 테이블
  assets: defineTable({
    equipmentId: v.id("equipment"),
    equipmentName: v.optional(v.string()),  // 장비명 (조회 편의용)
    serialNumber: v.optional(v.string()),  // 시리얼 번호 (A, B, 1, 2 등)
    managementCode: v.optional(v.string()),
    status: v.string(),  // "available" | "rented" | "maintenance"
    note: v.optional(v.string()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  }).index("by_equipmentId", ["equipmentId"])
    .index("by_status", ["status"]),

  // 5. 예약 테이블
  reservations: defineTable({
    userId: v.id("users"),
    reservationNumber: v.string(),
    status: v.string(),
    purpose: v.string(),
    purposeDetail: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    leaderName: v.string(),
    leaderPhone: v.string(),
    leaderStudentId: v.string(),
    items: v.array(
      v.object({
        equipmentId: v.id("equipment"),
        quantity: v.number(),
        name: v.string(),
        checkedOut: v.boolean(),
        returned: v.boolean(),
        assignedAssets: v.optional(v.array(v.id("assets"))),  // 배정된 개별 장비
      })
    ),
  })
    .index("by_userId", ["userId"])
    .index("by_status", ["status"])
    .index("by_date", ["startDate"]),

  // 6. 수리 내역 테이블
  repairs: defineTable({
    reservationId: v.id("reservations"),
    equipmentId: v.optional(v.id("equipment")),
    assetId: v.optional(v.id("assets")),
    content: v.string(),
    adminMemo: v.optional(v.string()),
    isFixed: v.boolean(),
  }).index("by_reservationId", ["reservationId"]),

  // 7. 장비 이력 테이블 (대여/반납 기록)
  assetHistory: defineTable({
    assetId: v.id("assets"),
    equipmentName: v.optional(v.string()),  // 장비명 (조회 편의용)
    serialNumber: v.optional(v.string()),   // 시리얼 번호 (조회 편의용)
    reservationId: v.id("reservations"),
    userId: v.id("users"),
    userName: v.optional(v.string()),       // 사용자명 (조회 편의용)
    action: v.string(),  // "rented" | "returned"
    returnCondition: v.optional(v.string()),  // "normal" | "damaged" | "missing_parts"
    returnNotes: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_assetId", ["assetId"])
    .index("by_reservationId", ["reservationId"]),

  // 8. 알림 테이블
  notifications: defineTable({
    userId: v.id("users"),
    type: v.string(), // "reservation_approved", "reservation_rejected", "reservation_rented", "reservation_returned"
    title: v.string(),
    message: v.string(),
    relatedId: v.optional(v.id("reservations")),
    read: v.boolean(),
    readAt: v.optional(v.number()), // 읽은 시간 (timestamp)
  })
    .index("by_userId", ["userId"])
    .index("by_userId_read", ["userId", "read"]),
});
