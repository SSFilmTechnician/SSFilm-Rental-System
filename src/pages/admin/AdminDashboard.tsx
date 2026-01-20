import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  Users,
  Calendar as CalendarIcon,
  LogOut,
  CheckCircle2,
  XCircle,
  Search,
  Trash2,
  Printer,
  Wrench,
  Save,
  MessageSquare,
  Edit,
  Plus,
  Minus,
  Check,
  AlertCircle,
  Package,
} from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
// ✅ [추가] useCartStore를 사용하기 위해 Import
import { useCartStore } from "../../stores/useCartStore";
import AssetManagement from "./AssetManagement";
import AssetAssignmentModal from "../../components/admin/AssetAssignmentModal";
import AssetReturnModal from "../../components/admin/AssetReturnModal";

// ----------------------------------------------------
// 1. 타입 정의
// ----------------------------------------------------
type FilterStatus = "pending" | "active" | "history" | "all";
type ActiveTab = "reservations" | "users" | "repairs" | "assets";
type UserTab = "all" | "pending";

interface EquipmentData {
  _id: Id<"equipment">;
  name: string;
  totalQuantity: number;
}

interface ReservationItem {
  equipmentId: Id<"equipment">;
  name: string;
  quantity: number;
  checkedOut: boolean;
  returned: boolean;
}

interface ReservationData {
  _id: Id<"reservations">;
  _creationTime: number;
  userId: Id<"users">;
  reservationNumber: string;
  leaderName: string;
  leaderPhone: string;
  status: string;
  startDate: string;
  endDate: string;
  purpose: string;
  purposeDetail: string;
  items: ReservationItem[];
}

interface EditingItem {
  equipmentId: Id<"equipment">;
  name: string;
  quantity: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const myProfile = useQuery(api.users.getMyProfile);

  // 탭 및 필터 상태
  const [activeTab, setActiveTab] = useState<ActiveTab>("reservations");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("pending");

  // 회원 관리용 상태
  const [userActiveTab, setUserActiveTab] = useState<UserTab>("all");
  const [userSearchTerm, setUserSearchTerm] = useState("");

  const [returnNotes, setReturnNotes] = useState<{ [key: string]: string }>({});
  const [repairMemoInputs, setRepairMemoInputs] = useState<{
    [key: string]: string;
  }>({});

  // 예약 수정 모달 상태
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingReservationId, setEditingReservationId] =
    useState<Id<"reservations"> | null>(null);
  const [editingItems, setEditingItems] = useState<EditingItem[]>([]);
  const [equipmentSearchTerm, setEquipmentSearchTerm] = useState("");
  const [selectedEquipmentToAdd, setSelectedEquipmentToAdd] =
    useState<string>("");

  // 장비 배정 모달 상태
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assigningReservation, setAssigningReservation] =
    useState<ReservationData | null>(null);

  // 반납 모달 상태
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returningReservation, setReturningReservation] =
    useState<ReservationData | null>(null);

  // ----------------------------------------------------
  // 2. Convex 데이터 불러오기
  // ----------------------------------------------------
  const rawReservations = useQuery(api.admin.getAllReservations);
  const reservations = rawReservations as ReservationData[] | undefined;

  const users = useQuery(api.users.getUsers);
  const repairs = useQuery(api.admin.getRepairs);

  const rawAllEquipment = useQuery(api.equipment.getAll);
  const allEquipment = rawAllEquipment as EquipmentData[] | undefined;

  // ----------------------------------------------------
  // 3. 기능 함수 (Mutations & Actions)
  // ----------------------------------------------------
  const updateResStatus = useMutation(api.admin.updateReservationStatus);
  const updateResItems = useMutation(api.admin.updateReservationItems);

  const approveUserMutation = useMutation(api.users.approveUser);
  const deleteUserAction = useAction(api.users.deleteUser);

  const toggleRepairStatus = useMutation(api.admin.toggleRepairStatus);
  const updateRepairMemo = useMutation(api.admin.updateRepairMemo);
  const deleteRepair = useMutation(api.admin.deleteRepair);

  const createNotification = useMutation(api.notifications.create);

  // ----------------------------------------------------
  // 4. 권한 및 초기화 체크
  // ----------------------------------------------------

  // ✅ 안전장치: 컴포넌트 마운트 시에도 장바구니 비우기 시도
  useEffect(() => {
    localStorage.removeItem("cart"); // 구버전 삭제
    // useCartStore 초기화는 아래 logout에서 처리하지만, 혹시 모르니 로컬스토리지 청소
    window.dispatchEvent(new Event("storage"));
  }, []);

  useEffect(() => {
    if (myProfile !== undefined) {
      if (!myProfile || myProfile.role !== "admin") {
        alert("관리자 권한이 없습니다.");
        navigate("/");
      }
    }
  }, [myProfile, navigate]);

  if (
    myProfile === undefined ||
    reservations === undefined ||
    users === undefined ||
    allEquipment === undefined
  ) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  if (myProfile?.role !== "admin") return null;

  // ----------------------------------------------------
  // 5. 핸들러 함수들
  // ----------------------------------------------------

  const handleLogout = async () => {
    // ✅ [수정됨] useCartStore를 실제로 사용하여 에러 해결 & 장바구니 초기화

    // 1. Zustand 메모리 비우기
    useCartStore.getState().clearCart();

    // 2. 로컬 스토리지 데이터 삭제
    localStorage.removeItem("cart-storage");
    localStorage.removeItem("cart");
    window.dispatchEvent(new Event("storage"));

    await signOut();
    navigate("/");
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:00`;
  };

  // --- 예약 상태 변경 ---
  const handleStatusChange = async (
    id: Id<"reservations">,
    status: string,
    repairNote?: string
  ) => {
    const confirmMsg = `상태를 '${getStatusLabel(status)}'(으)로 변경하시겠습니까?`;

    if (!confirm(confirmMsg)) return;

    try {
      const reservation = reservations?.find((r) => r._id === id);

      await updateResStatus({ id, status, repairNote });

      // 알림 생성 로직
      if (reservation) {
        let notificationTitle = "";
        let notificationMessage = "";
        let notificationType = "";

        switch (status) {
          case "approved":
            notificationTitle = "예약이 승인되었습니다";
            notificationMessage = `${reservation.leaderName}님의 예약이 승인되었습니다. 반출일: ${formatDate(reservation.startDate)}`;
            notificationType = "reservation_approved";
            break;
          case "rejected":
            notificationTitle = "예약이 거절되었습니다";
            notificationMessage = `${reservation.leaderName}님의 예약이 거절되었습니다.`;
            notificationType = "reservation_rejected";
            break;
          case "rented":
            notificationTitle = "장비가 반출되었습니다";
            notificationMessage = `${reservation.leaderName}님의 장비가 반출되었습니다. 반납일: ${formatDate(reservation.endDate)}`;
            notificationType = "reservation_rented";
            break;
          case "returned":
            notificationTitle = "장비가 반납되었습니다";
            notificationMessage = `${reservation.leaderName}님의 장비 반납이 확인되었습니다.`;
            notificationType = "reservation_returned";
            break;
        }

        if (notificationType) {
          await createNotification({
            userId: reservation.userId,
            type: notificationType,
            title: notificationTitle,
            message: notificationMessage,
            relatedId: id,
          });
        }
      }

      if (status === "returned") {
        setReturnNotes((prev) => ({ ...prev, [id]: "" }));
      }
    } catch (e) {
      alert("오류 발생: " + e);
    }
  };

  // 상태 라벨 헬퍼 함수
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "승인 대기";
      case "approved":
        return "예약 승인";
      case "rented":
        return "대여중 (반출)";
      case "returned":
        return "반납 완료";
      case "rejected":
        return "거절됨";
      case "cancelled":
        return "취소됨";
      default:
        return status;
    }
  };

  // --- 회원 관리 핸들러 ---
  const handleApproveUser = async (userId: Id<"users">, name: string) => {
    if (confirm(`'${name}' 회원을 승인하시겠습니까?`)) {
      await approveUserMutation({ userId });
    }
  };

  const handleDeleteUser = async (userId: Id<"users">, name: string) => {
    const isConfirmed = confirm(
      `정말 '${name}' 회원을 삭제하시겠습니까?\n\n※ 주의: 삭제 시 해당 회원의 모든 정보가 사라지며 복구할 수 없습니다.`
    );

    if (isConfirmed) {
      try {
        await deleteUserAction({ userId });
        alert("성공적으로 삭제되었습니다.");
      } catch (error) {
        let errorMessage = "삭제 실패";
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (
          typeof error === "object" &&
          error !== null &&
          "data" in error
        ) {
          const convexErr = error as { data: { message: string } };
          errorMessage = convexErr.data.message;
        }
        alert(errorMessage);
      }
    }
  };

  // --- 모달 관련 핸들러 ---
  const openEditModal = (res: ReservationData) => {
    setEditingReservationId(res._id);
    const items = res.items.map((item) => ({
      equipmentId: item.equipmentId,
      name: item.name,
      quantity: item.quantity,
    }));
    setEditingItems(items);
    setIsEditModalOpen(true);
    setEquipmentSearchTerm("");
    setSelectedEquipmentToAdd("");
  };

  const handleItemQuantityChange = (eqId: string, delta: number) => {
    setEditingItems((prev) =>
      prev.map((item) => {
        if (item.equipmentId === eqId) {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  const handleItemRemove = (eqId: string) => {
    if (confirm("이 장비를 목록에서 제거하시겠습니까?")) {
      setEditingItems((prev) =>
        prev.filter((item) => item.equipmentId !== eqId)
      );
    }
  };

  const handleAddItem = () => {
    if (!selectedEquipmentToAdd) return;
    const eqMaster = allEquipment?.find(
      (eq) => eq._id === selectedEquipmentToAdd
    );
    if (!eqMaster) return;

    const exists = editingItems.find(
      (item) => item.equipmentId === eqMaster._id
    );
    if (exists) {
      alert("이미 목록에 있는 장비입니다. 수량을 조절해주세요.");
      return;
    }

    setEditingItems((prev) => [
      ...prev,
      {
        equipmentId: eqMaster._id,
        name: eqMaster.name,
        quantity: 1,
      },
    ]);
    setSelectedEquipmentToAdd("");
    setEquipmentSearchTerm("");
  };

  const handleSaveEditedItems = async () => {
    if (!editingReservationId) return;
    try {
      const newItems = editingItems.map((item) => ({
        equipmentId: item.equipmentId,
        name: item.name,
        quantity: item.quantity,
        checkedOut: false,
        returned: false,
      }));

      await updateResItems({ id: editingReservationId, items: newItems });
      setIsEditModalOpen(false);
      alert("장비 목록이 수정되었습니다.");
    } catch (e) {
      alert("저장 실패: " + e);
    }
  };

  // ----------------------------------------------------
  // 6. 필터링 및 렌더링 준비
  // ----------------------------------------------------

  const filteredReservations = (reservations || []).filter((res) => {
    if (filterStatus === "pending") return res.status === "pending";
    if (filterStatus === "active")
      return ["approved", "rented"].includes(res.status);
    if (filterStatus === "history")
      return ["returned", "rejected", "cancelled"].includes(res.status);
    return true;
  });

  const pendingUserCount = users.filter(
    (u) => !u.isApproved && u.role !== "admin"
  ).length;

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      u.studentId?.includes(userSearchTerm);

    if (userActiveTab === "pending") {
      return matchesSearch && !u.isApproved && u.role !== "admin";
    }
    return matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-bold">
            승인대기
          </span>
        );
      case "approved":
        return (
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">
            예약승인
          </span>
        );
      case "rented":
        return (
          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">
            대여중
          </span>
        );
      case "returned":
        return (
          <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-bold">
            반납완료
          </span>
        );
      case "rejected":
        return (
          <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-bold">
            거절됨
          </span>
        );
      default:
        return (
          <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen pb-20">
      {/* 상단 헤더 */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold">관리자 대시보드</h2>
          <p className="text-gray-500 text-sm">예약 및 회원 관리</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/admin/calendar")}
            className="flex gap-2 bg-white border border-gray-200 px-4 py-2 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-black transition-colors"
          >
            <CalendarIcon className="w-4 h-4" /> 예약 캘린더
          </button>
          <button
            onClick={handleLogout}
            className="flex gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-black transition-colors"
          >
            <LogOut className="w-4 h-4" /> 로그아웃
          </button>
        </div>
      </div>

      {/* 메인 탭 */}
      <div className="flex gap-8 mb-6 border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab("reservations")}
          className={`pb-3 text-lg font-bold whitespace-nowrap ${
            activeTab === "reservations"
              ? "border-b-2 border-black"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          예약 관리
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`pb-3 text-lg font-bold flex gap-2 whitespace-nowrap items-center ${
            activeTab === "users"
              ? "border-b-2 border-black"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <Users className="w-5 h-5" /> 회원 관리
          {pendingUserCount > 0 && activeTab !== "users" && (
            <span className="flex items-center justify-center w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full -mt-1">
              {pendingUserCount > 99 ? "99+" : pendingUserCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("repairs")}
          className={`pb-3 text-lg font-bold flex gap-2 whitespace-nowrap ${
            activeTab === "repairs"
              ? "border-b-2 border-red-500 text-red-500"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <Wrench className="w-5 h-5" /> 수리사항
        </button>
        <button
          onClick={() => setActiveTab("assets")}
          className={`pb-3 text-lg font-bold flex gap-2 whitespace-nowrap ${
            activeTab === "assets"
              ? "border-b-2 border-black"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <Package className="w-5 h-5" /> 장비 관리
        </button>
      </div>

      {/* TAB 1: 예약 관리 */}
      {activeTab === "reservations" && (
        <>
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6 w-fit">
            {[
              { k: "pending", l: "승인 대기" },
              { k: "active", l: "진행중 (반출/예약)" },
              { k: "history", l: "종료/거절" },
              { k: "all", l: "전체" },
            ].map((t) => (
              <button
                key={t.k}
                onClick={() => setFilterStatus(t.k as FilterStatus)}
                className={`px-4 py-2 rounded text-sm font-bold ${
                  filterStatus === t.k ? "bg-white shadow-sm" : "text-gray-500"
                }`}
              >
                {t.l}
              </button>
            ))}
          </div>

          <div className="space-y-6">
            {filteredReservations.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                내역이 없습니다.
              </div>
            ) : (
              filteredReservations.map((res) => (
                <div
                  key={res._id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                >
                  <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      {getStatusBadge(res.status)}
                      <span className="text-sm text-gray-500 font-mono">
                        #{res.reservationNumber.slice(-4)}
                      </span>
                      <span className="font-bold">{res.leaderName}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="text-blue-600 font-bold mr-1">반출</span>{" "}
                      {formatDate(res.startDate)} →{" "}
                      <span className="text-red-600 font-bold mr-1">반납</span>{" "}
                      {formatDate(res.endDate)}
                    </div>
                  </div>

                  <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-gray-500 uppercase">
                        팀 정보
                      </h4>
                      <p className="text-sm">
                        <span className="font-bold">연락처:</span>{" "}
                        {res.leaderPhone}
                      </p>
                      <p className="text-sm text-gray-500 mt-2">사용 목적:</p>
                      <div className="text-sm bg-gray-50 p-3 rounded border whitespace-pre-wrap">
                        {res.purpose} / {res.purposeDetail}
                      </div>
                    </div>

                    <div className="space-y-2 flex flex-col h-full">
                      <h4 className="text-xs font-bold text-gray-500 uppercase">
                        촬영 정보
                      </h4>
                      <div className="text-sm bg-yellow-50 p-3 rounded border border-yellow-100 whitespace-pre-wrap">
                        {res.purposeDetail}
                      </div>
                      <div className="mt-auto pt-4">
                        <h4 className="text-xs font-bold text-red-500 uppercase mb-1 flex items-center gap-1">
                          <Wrench className="w-3 h-3" /> 수리/특이사항 메모
                        </h4>
                        <textarea
                          className="w-full text-sm bg-red-50 border border-red-100 rounded p-2 focus:outline-none focus:border-red-300 resize-none h-20 placeholder-red-200"
                          placeholder="반납 시 파손/특이사항 입력 -> [반납 확인] 클릭 시 수리사항으로 이동"
                          value={returnNotes[res._id] || ""}
                          onChange={(e) =>
                            setReturnNotes({
                              ...returnNotes,
                              [res._id]: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2 relative">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-bold text-gray-500 uppercase">
                          신청 장비
                        </h4>
                        {(res.status === "pending" ||
                          res.status === "approved") && (
                          <button
                            onClick={() => openEditModal(res)}
                            className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="w-3 h-3" /> 수정
                          </button>
                        )}
                      </div>
                      <ul className="text-sm divide-y divide-gray-100 border rounded bg-gray-50 max-h-60 overflow-y-auto">
                        {res.items.map((item, idx) => (
                          <li key={idx} className="p-2 flex justify-between">
                            <span>{item.name}</span>
                            <span className="font-bold text-blue-600">
                              {item.quantity}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="px-6 py-3 bg-gray-50 border-t flex flex-wrap justify-between items-center gap-4">
                    {/* 상태 변경 드롭박스 */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-500 uppercase">
                        상태 변경:
                      </span>
                      <select
                        className="text-sm border border-gray-300 rounded px-2 py-1.5 bg-white focus:ring-2 focus:ring-black focus:outline-none cursor-pointer"
                        value={res.status}
                        onChange={(e) =>
                          handleStatusChange(
                            res._id,
                            e.target.value,
                            returnNotes[res._id]
                          )
                        }
                      >
                        <option value="pending">승인 대기</option>
                        <option value="approved">예약 승인 (반출 전)</option>
                        <option value="rented">대여중 (반출 완료)</option>
                        <option value="returned">반납 완료</option>
                        <option value="rejected">거절됨</option>
                        <option value="cancelled">취소됨</option>
                      </select>
                    </div>

                    <div className="flex gap-2 items-center">
                      {(res.status === "approved" ||
                        res.status === "rented") && (
                        <button
                          onClick={() =>
                            window.open(
                              `/print/reservation/${res._id}`,
                              "_blank"
                            )
                          }
                          className="flex gap-1 px-3 py-1.5 border bg-white rounded text-sm hover:bg-gray-50"
                        >
                          <Printer className="w-4 h-4" /> 예약 리스트
                        </button>
                      )}
                      {res.status === "rented" && (
                        <button
                          onClick={() =>
                            window.open(
                              `/print/reservation/${res._id}?type=rental`,
                              "_blank"
                            )
                          }
                          className="flex gap-1 px-3 py-1.5 bg-gray-900 text-white rounded text-sm hover:bg-gray-700 transition-colors"
                        >
                          <Printer className="w-4 h-4" /> 반출 리스트
                        </button>
                      )}

                      <div className="w-px h-4 bg-gray-300 mx-2"></div>
                      {res.status === "pending" && (
                        <>
                          <button
                            onClick={() =>
                              handleStatusChange(res._id, "rejected")
                            }
                            className="px-4 py-1.5 border border-red-200 text-red-600 rounded text-sm hover:bg-red-50"
                          >
                            거절
                          </button>
                          <button
                            onClick={() => {
                              setAssigningReservation(res);
                              setIsAssignModalOpen(true);
                            }}
                            className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-bold shadow-sm"
                          >
                            승인
                          </button>
                        </>
                      )}
                      {res.status === "approved" && (
                        <button
                          onClick={() => handleStatusChange(res._id, "rented")}
                          className="px-4 py-1.5 bg-green-600 text-white rounded text-sm font-bold shadow-sm"
                        >
                          반출 처리
                        </button>
                      )}
                      {res.status === "rented" && (
                        <button
                          onClick={() => {
                            setReturningReservation(res);
                            setIsReturnModalOpen(true);
                          }}
                          className="px-4 py-1.5 bg-gray-800 text-white rounded text-sm font-bold shadow-sm"
                        >
                          반납 확인
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* TAB 2: 회원 관리 */}
      {activeTab === "users" && (
        <div className="space-y-6">
          {/* 회원 관리 탭 내용 (기존 유지) */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setUserActiveTab("all")}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${
                  userActiveTab === "all"
                    ? "bg-black text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                전체 회원
              </button>
              <button
                onClick={() => setUserActiveTab("pending")}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 ${
                  userActiveTab === "pending"
                    ? "bg-black text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                승인 대기
                {pendingUserCount > 0 && (
                  <span className="flex items-center justify-center w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full ml-1">
                    {pendingUserCount}
                  </span>
                )}
              </button>
            </div>

            <div className="relative w-full md:w-auto">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="이름 또는 학번 검색..."
                className="block w-full md:w-64 pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                    이름
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                    연락처
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                    가입일
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y">
                {filteredUsers.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      {u.role === "admin" ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          관리자
                        </span>
                      ) : u.isApproved ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> 승인됨
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 animate-pulse">
                          <AlertCircle className="w-3 h-3 mr-1" /> 승인 대기
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-bold">
                      {u.name}{" "}
                      <span className="text-gray-500 font-normal">
                        ({u.studentId || "학번없음"})
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {u.phone || "-"}
                      <br />
                      <span className="text-xs text-gray-400">{u.email}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(u._creationTime).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      {u.role !== "admin" && (
                        <>
                          {!u.isApproved && (
                            <button
                              onClick={() => handleApproveUser(u._id, u.name)}
                              className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" /> 승인
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteUser(u._id, u.name)}
                            className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                            title="회원 삭제"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: 수리 내역 */}
      {activeTab === "repairs" && (
        <div className="space-y-4">
          {repairs === undefined ? (
            <div>로딩 중...</div>
          ) : repairs.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 border border-dashed rounded text-gray-400">
              수리 내역 없음
            </div>
          ) : (
            repairs.map((log) => (
              <div
                key={log._id}
                className={`p-6 rounded-xl border flex flex-col gap-4 ${
                  log.isFixed
                    ? "bg-gray-50 opacity-70 border-gray-200"
                    : "bg-white border-red-200 shadow-sm"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {log.isFixed ? (
                        <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded text-xs font-bold">
                          수리완료
                        </span>
                      ) : (
                        <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold animate-pulse">
                          수리필요
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        {new Date(log._creationTime).toLocaleDateString()} 발생
                      </span>
                    </div>
                    <h4 className="font-bold text-lg text-gray-900">
                      {log.leaderName} 학생 대여 건
                    </h4>
                    <p className="text-sm text-gray-500">
                      예약번호: {log.reservationNumber}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        toggleRepairStatus({
                          id: log._id,
                          isFixed: !log.isFixed,
                        })
                      }
                      className={`px-4 py-2 rounded-lg text-sm font-bold ${log.isFixed ? "bg-white border text-gray-500" : "bg-black text-white"}`}
                    >
                      {log.isFixed ? "다시 수리필요" : "수리 완료 처리"}
                    </button>
                    <button
                      onClick={() =>
                        confirm("기록을 영구 삭제하시겠습니까?") &&
                        deleteRepair({ id: log._id })
                      }
                      className="text-red-500 p-2 rounded hover:bg-red-50"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="bg-red-50 p-4 rounded-lg border border-red-100 text-red-800 text-sm font-medium">
                  <div className="flex items-center gap-2 mb-1 text-red-900 font-bold">
                    <Wrench className="w-4 h-4" /> 고장 내용
                  </div>
                  {log.content}
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-2 mb-2 text-yellow-800 font-bold">
                    <MessageSquare className="w-4 h-4" /> 진행 상황 메모
                  </div>
                  <textarea
                    className="w-full text-sm bg-white border border-yellow-300 rounded p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none h-20"
                    placeholder="수리 업체 컨택, 부품 주문 등 진행 상황을 기록하세요."
                    defaultValue={log.adminMemo || ""}
                    onBlur={(e) =>
                      setRepairMemoInputs({
                        ...repairMemoInputs,
                        [log._id]: e.target.value,
                      })
                    }
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={() => {
                        const text = repairMemoInputs[log._id];
                        if (text !== undefined)
                          updateRepairMemo({ id: log._id, memo: text });
                      }}
                      className="bg-yellow-500 text-white px-4 py-1.5 rounded text-sm font-bold hover:bg-yellow-600 flex items-center gap-1"
                    >
                      <Save className="w-4 h-4" /> 메모 저장
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 4: 장비 관리 */}
      {activeTab === "assets" && <AssetManagement />}

      {/* 예약 수정 모달 */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-lg">장비 목록 수정</h3>
              <button onClick={() => setIsEditModalOpen(false)}>
                <XCircle className="w-6 h-6 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            {/* ... 모달 내용 (기존 유지) ... */}
            <div className="p-4 overflow-y-auto flex-1 space-y-6">
              <div>
                <h4 className="text-sm font-bold text-gray-500 mb-2">
                  현재 선택된 장비
                </h4>
                <ul className="space-y-2">
                  {editingItems.map((item) => (
                    <li
                      key={item.equipmentId}
                      className="flex items-center justify-between border p-2 rounded bg-white"
                    >
                      <span className="text-sm">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            handleItemQuantityChange(item.equipmentId, -1)
                          }
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <Minus className="w-4 h-4 text-gray-500" />
                        </button>
                        <span className="w-8 text-center font-bold text-sm">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            handleItemQuantityChange(item.equipmentId, 1)
                          }
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <Plus className="w-4 h-4 text-gray-500" />
                        </button>
                        <button
                          onClick={() => handleItemRemove(item.equipmentId)}
                          className="p-1 hover:bg-red-50 rounded ml-2 text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border-t pt-4">
                <h4 className="text-sm font-bold text-gray-500 mb-2">
                  장비 추가하기
                </h4>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="장비명 검색..."
                    className="flex-1 border px-2 py-1.5 rounded text-sm"
                    value={equipmentSearchTerm}
                    onChange={(e) => setEquipmentSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    className="flex-1 border px-2 py-1.5 rounded text-sm"
                    value={selectedEquipmentToAdd}
                    onChange={(e) => setSelectedEquipmentToAdd(e.target.value)}
                  >
                    <option value="">장비 선택...</option>
                    {(allEquipment || [])
                      .filter((eq) =>
                        eq.name
                          .toLowerCase()
                          .includes(equipmentSearchTerm.toLowerCase())
                      )
                      .map((eq) => (
                        <option key={eq._id} value={eq._id}>
                          {eq.name} (잔여: {eq.totalQuantity})
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={handleAddItem}
                    className="bg-black text-white px-3 py-1.5 rounded text-sm font-bold whitespace-nowrap"
                  >
                    추가
                  </button>
                </div>
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 border rounded text-sm font-medium hover:bg-gray-100"
              >
                취소
              </button>
              <button
                onClick={handleSaveEditedItems}
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-bold hover:bg-blue-700"
              >
                변경사항 저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 장비 배정 모달 */}
      {assigningReservation && (
        <AssetAssignmentModal
          isOpen={isAssignModalOpen}
          onClose={() => {
            setIsAssignModalOpen(false);
            setAssigningReservation(null);
          }}
          reservationId={assigningReservation._id}
          items={assigningReservation.items}
          onAssignComplete={async () => {
            // 배정 완료 후 상태 변경
            await handleStatusChange(assigningReservation._id, "approved");
            setIsAssignModalOpen(false);
            setAssigningReservation(null);
          }}
        />
      )}

      {/* 반납 모달 */}
      {returningReservation && (
        <AssetReturnModal
          isOpen={isReturnModalOpen}
          onClose={() => {
            setIsReturnModalOpen(false);
            setReturningReservation(null);
          }}
          reservationId={returningReservation._id}
          items={returningReservation.items}
          onReturnComplete={async () => {
            // 반납 완료 후 상태 변경
            await handleStatusChange(
              returningReservation._id,
              "returned",
              returnNotes[returningReservation._id]
            );
            setIsReturnModalOpen(false);
            setReturningReservation(null);
          }}
        />
      )}
    </div>
  );
}
