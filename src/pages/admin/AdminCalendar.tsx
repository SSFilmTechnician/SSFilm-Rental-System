import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Search } from "lucide-react";
import { InventoryCheckModal } from "../../components/admin/InventoryCheckModal";
import { useAuth } from "@clerk/clerk-react";

interface CalendarItem {
  equipmentId: Id<"equipment">;
  name: string;
  quantity: number;
  checkedOut: boolean;
  returned: boolean;
}

interface CalendarReservation {
  _id: Id<"reservations">;
  userId: Id<"users">;
  reservationNumber: string;
  status: string;
  purpose: string;
  purposeDetail: string;
  startDate: string;
  endDate: string;
  leaderName: string;
  leaderPhone: string;
  leaderStudentId: string;
  items: CalendarItem[];
  _creationTime: number;
}

export default function AdminCalendar() {
  const navigate = useNavigate();
  const { userId: clerkUserId } = useAuth();

  const [baseDate, setBaseDate] = useState(new Date());
  const [selectedRes, setSelectedRes] = useState<CalendarReservation | null>(
    null
  );
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);

  const myProfile = useQuery(api.users.getMyProfile);
  const equipments = useQuery(api.admin.getEquipmentsForCalendar);
  const reservations = useQuery(api.admin.getReservationsForCalendar) as
    | CalendarReservation[]
    | undefined;

  // 권한 체크
  useEffect(() => {
    if (myProfile !== undefined) {
      if (!myProfile || myProfile.role !== "admin") {
        alert("관리자 권한이 없습니다.");
        navigate("/");
      }
    }
  }, [myProfile, navigate]);

  // UTC ISO String -> YYYY-MM-DD (날짜 비교용)
  const parseToKST = (isoString: string) => {
    try {
      if (!isoString) return "";
      const date = new Date(isoString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    } catch {
      return "";
    }
  };

  const scheduleMap = useMemo(() => {
    const map: Record<string, Record<string, CalendarReservation>> = {};
    if (!reservations) return map;

    reservations.forEach((res) => {
      const sStr = parseToKST(res.startDate);
      const eStr = parseToKST(res.endDate);
      if (!sStr || !eStr) return;

      const sDate = new Date(sStr);
      const eDate = new Date(eStr);

      (res.items || []).forEach((item) => {
        const eqId = String(item.equipmentId);
        const iter = new Date(sDate);

        while (iter <= eDate) {
          const k = parseToKST(iter.toISOString());
          if (!map[eqId]) map[eqId] = {};
          map[eqId][k] = res;
          iter.setDate(iter.getDate() + 1);
        }
      });
    });

    return map;
  }, [reservations]);

  const dates = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => {
        const d = new Date(baseDate);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [baseDate]
  );

  const moveDate = (d: number) => {
    const n = new Date(baseDate);
    n.setDate(n.getDate() + d);
    setBaseDate(n);
  };

  const todayStr = parseToKST(new Date().toISOString());

  const formatDateTime = (isoString: string | undefined) => {
    if (!isoString) return "-";
    const d = new Date(isoString);
    return d.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  // 로딩 중
  if (!clerkUserId || myProfile === undefined || equipments === undefined) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  // 권한 없음
  if (myProfile?.role !== "admin") return null;

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#fff",
        fontFamily: "sans-serif",
      }}
    >
      {/* 헤더 */}
      <header
        style={{
          flex: "none",
          padding: "15px 20px",
          borderBottom: "1px solid #ddd",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "#fff",
          zIndex: 50,
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1.2rem", color: "#333" }}>
          SSFILM 장비 현황판
        </h2>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={() => setIsInventoryModalOpen(true)}
            style={{
              padding: "8px 16px",
              fontSize: "14px",
              backgroundColor: "#fff",
              color: "#333",
              border: "1px solid #ddd",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              marginRight: "10px",
            }}
          >
            <Search size={16} /> 재고/일정 조회
          </button>

          {/* 달력 이동 버튼 그룹 */}
          <div
            style={{
              backgroundColor: "#f5f5f5",
              padding: "5px",
              borderRadius: "8px",
              display: "flex",
              gap: "5px",
            }}
          >
            <button
              onClick={() => moveDate(-7)}
              style={{
                border: "none",
                background: "white",
                padding: "5px 10px",
                borderRadius: "4px",
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
              }}
            >
              ◀ 이전
            </button>
            <button
              onClick={() => setBaseDate(new Date())}
              style={{
                border: "none",
                background: "#e6f7ff",
                color: "#1890ff",
                fontWeight: "bold",
                padding: "5px 10px",
                borderRadius: "4px",
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
              }}
            >
              오늘
            </button>
            <button
              onClick={() => moveDate(7)}
              style={{
                border: "none",
                background: "white",
                padding: "5px 10px",
                borderRadius: "4px",
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
              }}
            >
              다음 ▶
            </button>
          </div>

          <button
            onClick={() => navigate("/admin")}
            style={{
              marginLeft: "10px",
              padding: "8px 16px",
              fontSize: "14px",
              backgroundColor: "#333",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            관리자 홈으로
          </button>
        </div>
      </header>

      {/* 메인 스케줄러 영역 */}
      <div style={{ flex: 1, overflow: "auto", position: "relative" }}>
        <div style={{ minWidth: "1200px", paddingBottom: "50px" }}>
          {/* 날짜 헤더 */}
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 40,
              display: "flex",
              borderBottom: "1px solid #ccc",
              backgroundColor: "#f9f9f9",
              boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                position: "sticky",
                left: 0,
                zIndex: 50,
                width: "220px",
                flexShrink: 0,
                padding: "10px",
                fontWeight: "bold",
                backgroundColor: "#f0f0f0",
                borderRight: "1px solid #ccc",
                textAlign: "center",
                boxShadow: "2px 0 5px rgba(0,0,0,0.05)",
              }}
            >
              장비명 / 날짜
            </div>
            {dates.map((date) => {
              const dStr = parseToKST(date.toISOString());
              const isToday = dStr === todayStr;
              const dayName = ["일", "월", "화", "수", "목", "금", "토"][
                date.getDay()
              ];
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;

              return (
                <div
                  key={dStr}
                  style={{
                    flex: 1,
                    minWidth: "80px",
                    borderRight: "1px solid #eee",
                    padding: "8px 0",
                    textAlign: "center",
                    backgroundColor: isToday ? "#e6f7ff" : "#fff",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      color: isWeekend ? "red" : "#888",
                      marginBottom: "2px",
                    }}
                  >
                    {dayName}
                  </div>
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: "bold",
                      color: isToday ? "#1890ff" : "#333",
                    }}
                  >
                    {date.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 장비 리스트 */}
          <div style={{ backgroundColor: "white" }}>
            {equipments?.map((eq, idx) => (
              <div
                key={String(eq._id)}
                style={{
                  display: "flex",
                  height: "50px",
                  borderBottom: "1px solid #f0f0f0",
                  backgroundColor: idx % 2 === 0 ? "white" : "#fafafa",
                }}
              >
                {/* 장비명 고정 */}
                <div
                  style={{
                    position: "sticky",
                    left: 0,
                    zIndex: 30,
                    width: "220px",
                    flexShrink: 0,
                    backgroundColor: "white",
                    borderRight: "1px solid #ddd",
                    padding: "0 15px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    boxShadow: "2px 0 5px rgba(0,0,0,0.05)",
                  }}
                >
                  <div
                    style={{
                      fontWeight: "bold",
                      fontSize: "13px",
                      color: "#333",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {eq.name}
                  </div>
                </div>

                {/* 예약 바 표시 */}
                {dates.map((date) => {
                  const dStr = parseToKST(date.toISOString());
                  const res = scheduleMap[String(eq._id)]?.[dStr];
                  const isToday = dStr === todayStr;

                  const barStyle: React.CSSProperties = {
                    height: "100%",
                    width: "100%",
                    fontSize: "11px",
                    color: "white",
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    borderRadius: "2px",
                  };

                  if (res) {
                    const s = parseToKST(res.startDate);
                    const e = parseToKST(res.endDate);
                    if (s === dStr && e === dStr) {
                      barStyle.borderRadius = "4px";
                      barStyle.margin = "0 4px";
                      barStyle.width = "calc(100% - 8px)";
                    } else if (s === dStr) {
                      barStyle.borderTopLeftRadius = "4px";
                      barStyle.borderBottomLeftRadius = "4px";
                      barStyle.marginLeft = "4px";
                      barStyle.width = "calc(100% - 4px)";
                    } else if (e === dStr) {
                      barStyle.borderTopRightRadius = "4px";
                      barStyle.borderBottomRightRadius = "4px";
                      barStyle.marginRight = "4px";
                      barStyle.width = "calc(100% - 4px)";
                    }
                  }

                  return (
                    <div
                      key={`${eq._id}-${dStr}`}
                      style={{
                        flex: 1,
                        minWidth: "80px",
                        borderRight: "1px solid #f0f0f0",
                        padding: "4px 0",
                        backgroundColor: isToday ? "#f0faff" : "transparent",
                      }}
                    >
                      {res && (
                        <div
                          onClick={() => setSelectedRes(res)}
                          style={{
                            ...barStyle,
                            backgroundColor:
                              res.status === "pending"
                                ? "#faad14"
                                : res.status === "approved"
                                ? "#1890ff"
                                : res.status === "rented"
                                ? "#52c41a"
                                : "#8c8c8c",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                          }}
                        >
                          <span
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              padding: "0 2px",
                            }}
                          >
                            {res.leaderName}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 예약 상세 모달 */}
      {selectedRes && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 9999,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backdropFilter: "blur(3px)",
          }}
          onClick={() => setSelectedRes(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "white",
              padding: "0",
              borderRadius: "16px",
              width: "420px",
              maxWidth: "90%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: "20px",
                borderBottom: "1px solid #eee",
                backgroundColor: "#fff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                position: "sticky",
                top: 0,
                zIndex: 10,
              }}
            >
              <h3 style={{ margin: 0, fontSize: "20px", color: "#333" }}>
                예약 상세 정보
              </h3>
              <span
                style={{
                  fontSize: "12px",
                  padding: "6px 10px",
                  borderRadius: "20px",
                  fontWeight: "bold",
                  backgroundColor:
                    selectedRes.status === "approved" ? "#e6f4ea" : "#fff1f0",
                  color:
                    selectedRes.status === "approved" ? "#137333" : "#cf1322",
                  border:
                    selectedRes.status === "approved"
                      ? "1px solid #b7eb8f"
                      : "1px solid #ffa39e",
                }}
              >
                {selectedRes.status.toUpperCase()}
              </span>
            </div>
            <div style={{ padding: "25px", fontSize: "15px", color: "#444" }}>
              <div style={{ marginBottom: "20px" }}>
                <div
                  style={{
                    fontSize: "13px",
                    color: "#888",
                    marginBottom: "6px",
                    fontWeight: "bold",
                  }}
                >
                  장비 대여 기간
                </div>
                <div style={{ fontSize: "16px", color: "#333" }}>
                  {formatDateTime(selectedRes.startDate)} ~ <br />
                  {formatDateTime(selectedRes.endDate)}
                </div>
              </div>
              <div
                style={{
                  marginBottom: "25px",
                  backgroundColor: "#eff6ff",
                  padding: "15px",
                  borderRadius: "8px",
                  border: "1px solid #dbeafe",
                  borderLeft: "5px solid #2563eb",
                }}
              >
                <div
                  style={{
                    fontSize: "13px",
                    color: "#2563eb",
                    fontWeight: "bold",
                    marginBottom: "8px",
                  }}
                >
                  상세 촬영 일정
                </div>
                <div
                  style={{
                    fontSize: "15px",
                    color: "#1e3a8a",
                    whiteSpace: "pre-wrap",
                    lineHeight: "1.5",
                  }}
                >
                  {selectedRes.purposeDetail || "입력된 촬영 스케줄이 없습니다."}
                </div>
              </div>
              <hr
                style={{
                  border: "none",
                  borderTop: "1px solid #eee",
                  margin: "20px 0",
                }}
              />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex" }}>
                  <span
                    style={{ fontWeight: "bold", width: "90px", color: "#666" }}
                  >
                    대표자
                  </span>
                  <span style={{ flex: 1, color: "#333", fontWeight: "bold" }}>
                    {selectedRes.leaderName}
                  </span>
                </div>
                <div style={{ display: "flex" }}>
                  <span
                    style={{ fontWeight: "bold", width: "90px", color: "#666" }}
                  >
                    학번
                  </span>
                  <span style={{ flex: 1 }}>
                    {selectedRes.leaderStudentId || "-"}
                  </span>
                </div>
                <div style={{ display: "flex" }}>
                  <span
                    style={{ fontWeight: "bold", width: "90px", color: "#666" }}
                  >
                    전화번호
                  </span>
                  <span style={{ flex: 1 }}>
                    {selectedRes.leaderPhone || "-"}
                  </span>
                </div>
                <div style={{ display: "flex" }}>
                  <span
                    style={{ fontWeight: "bold", width: "90px", color: "#666" }}
                  >
                    사용 목적
                  </span>
                  <span style={{ flex: 1 }}>{selectedRes.purpose}</span>
                </div>
                {selectedRes.purposeDetail && (
                  <div style={{ display: "flex", marginTop: "5px" }}>
                    <span
                      style={{
                        fontWeight: "bold",
                        width: "90px",
                        color: "#666",
                      }}
                    >
                      상세 내용
                    </span>
                    <span
                      style={{
                        flex: 1,
                        color: "#555",
                        fontSize: "14px",
                        whiteSpace: "pre-wrap",
                        backgroundColor: "#f9f9f9",
                        padding: "8px",
                        borderRadius: "4px",
                      }}
                    >
                      {selectedRes.purposeDetail}
                    </span>
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    marginTop: "10px",
                    fontSize: "12px",
                    color: "#999",
                  }}
                >
                  <span style={{ width: "90px" }}>신청일</span>
                  <span>
                    {new Date(selectedRes._creationTime).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            <div
              style={{
                padding: "20px",
                backgroundColor: "#fff",
                borderTop: "1px solid #eee",
              }}
            >
              <button
                onClick={() => setSelectedRes(null)}
                style={{
                  width: "100%",
                  padding: "14px",
                  border: "none",
                  backgroundColor: "#333",
                  color: "white",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "16px",
                  transition: "background 0.2s",
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 재고 조회 모달 */}
      <InventoryCheckModal
        isOpen={isInventoryModalOpen}
        onClose={() => setIsInventoryModalOpen(false)}
      />
    </div>
  );
}
