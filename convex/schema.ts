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
    serialNumber: v.optional(v.string()),
    managementCode: v.optional(v.string()),
    status: v.string(),
    note: v.optional(v.string()),
  }).index("by_equipmentId", ["equipmentId"]),

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

  // 7. 알림 테이블
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
