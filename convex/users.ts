import {
  query,
  mutation,
  action,
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

const ADMIN_EMAILS = ["SSFT@ssfilm.ac.kr", "cinedop@naver.com"];

// 1. 내 정보 가져오기 (장비리스트 포함)
export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
  },
});

// ✅ [NEW] Clerk ID로 사용자 조회 (공간 예약 알림용)
export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .first();
  },
});

// ✅ [NEW] 장비리스트 저장하기
export const saveCart = mutation({
  args: { cartJson: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, {
      cart: args.cartJson,
    });
  },
});

// 2. [로그인/가입] 유저 생성 또는 조회
export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const email = identity.email || "";
    const isAdminEmail = ADMIN_EMAILS.includes(email);

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    // [경우 1] 이미 가입된 유저인 경우
    if (user !== null) {
      if (isAdminEmail && user.role !== "admin") {
        await ctx.db.patch(user._id, {
          role: "admin",
          isApproved: true,
          studentId: "ADMIN",
        });
      }
      return user._id;
    }

    // [경우 2] 신규 가입인 경우
    if (isAdminEmail) {
      return await ctx.db.insert("users", {
        name: identity.name || "Admin",
        email: email,
        clerkId: identity.subject,
        role: "admin",
        isApproved: true,
        studentId: "ADMIN",
        phone: "000-0000-0000",
        department: "관리자",
        cart: "[]", // 초기 장비리스트
      });
    }

    return await ctx.db.insert("users", {
      name: identity.name || "",
      email: email,
      clerkId: identity.subject,
      role: "student",
      isApproved: false,
      studentId: "",
      phone: "",
      department: "",
      cart: "[]", // 초기 장비리스트
    });
  },
});

// 3. [최초 가입] 필수 정보 입력
export const updateProfile = mutation({
  args: {
    name: v.string(),
    studentId: v.string(),
    phone: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("로그인이 필요합니다.");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("유저 정보가 없습니다.");

    if (user.studentId && user.role !== "admin") {
      throw new Error("이미 정보가 등록되어 있습니다.");
    }

    await ctx.db.patch(user._id, {
      name: args.name,
      studentId: args.studentId,
      phone: args.phone,
    });
  },
});

// ==========================================================
// 👇 관리자용 함수
// ==========================================================

export const getUsers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").order("desc").collect();
  },
});

export const approveUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      isApproved: true,
    });
  },
});

// ==========================================================
// 🚨 [핵심] 안전 삭제 로직 (Clerk 연동 + DB 삭제)
// ==========================================================

export const checkCanDelete = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("존재하지 않는 유저입니다.");

    if (user.role === "admin")
      throw new Error("관리자 계정은 삭제할 수 없습니다.");

    const activeReservations = await ctx.db
      .query("reservations")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "rented"),
          q.eq(q.field("status"), "approved")
        )
      )
      .first();

    if (activeReservations) {
      throw new Error(
        "❌ 삭제 불가: 반납되지 않은 장비가 있거나 승인된 예약이 있습니다."
      );
    }

    return { clerkId: user.clerkId };
  },
});

export const deleteUserInternal = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.userId);
  },
});

export const deleteUser = action({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { clerkId } = await ctx.runQuery(internal.users.checkCanDelete, {
      userId: args.userId,
    });

    if (clerkId) {
      const clerkSecretKey = process.env.CLERK_SECRET_KEY;
      if (!clerkSecretKey) {
        throw new Error(
          "서버 설정 오류: CLERK_SECRET_KEY가 설정되지 않았습니다."
        );
      }

      const response = await fetch(
        `https://api.clerk.com/v1/users/${clerkId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${clerkSecretKey}`,
          },
        }
      );

      if (!response.ok && response.status !== 404) {
        console.error("Clerk Delete Error:", await response.text());
        throw new Error("Clerk 계정 삭제 중 오류가 발생했습니다.");
      }
    }

    await ctx.runMutation(internal.users.deleteUserInternal, {
      userId: args.userId,
    });
  },
});
