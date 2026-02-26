import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  Calendar as CalendarIcon,
  LogOut,
  CheckCircle2,
  XCircle,
  Search,
  Printer,
  Wrench,
  Check,
  Edit,
  AlertTriangle,
  AlertCircle,
  MessageSquare,
  Save,
  Trash2,
  Minus,
  Plus,
  Download,
  Upload,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useAuth } from "@clerk/clerk-react";
import { useCartStore } from "../../stores/useCartStore";

// 컴포넌트 import
import AssetManagement from "./AssetManagement";
import RepairManagement from "../../components/admin/RepairManagement";
import AssetAssignmentModal from "../../components/admin/AssetAssignmentModal";
import AssetReturnModal from "../../components/admin/AssetReturnModal";
import AssetEditModal from "../../components/admin/AssetEditModal";
import ExcelImportModal from "../../components/admin/ExcelImportModal";

type FilterStatus = "pending" | "approved" | "rented" | "history" | "all";
type ActiveTab = "reservations" | "users" | "repairs" | "assets";
type UserTab = "all" | "pending";

export interface EquipmentData {
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
  assignedAssets?: Id<"assets">[];
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

const getISOWeek = (date: Date): number => {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
};

const getProjectTitle = (text: string) => {
  if (!text) return "";
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l);
  const inquiryIndex = lines.findIndex((line) => line.startsWith("[문의"));
  if (inquiryIndex > 0) return lines[inquiryIndex - 1];
  if (lines.length >= 2) return lines[lines.length - 2];
  return lines[0] || "";
};

// [수정된 컴포넌트] 실시간 재고 확인 패널
const AvailabilityStatus = ({
  reservationId,
  status,
}: {
  reservationId: Id<"reservations">;
  status: string;
}) => {
  const check = useQuery(api.admin.checkAvailability, { reservationId });

  if (!check)
    return <div className="text-xs text-gray-400 p-2">재고 확인 중...</div>;

  if (status !== "pending") {
    return (
      <div className="text-xs bg-blue-50 p-3 rounded border border-blue-100 text-blue-700 flex items-center gap-2 font-medium">
        <CheckCircle2 className="w-4 h-4" />
        재고가 확보되었습니다.
      </div>
    );
  }

  return (
    <div
      className={`text-sm p-3 rounded border ${
        check.isFullyAvailable
          ? "bg-blue-50 border-blue-100"
          : "bg-red-50 border-red-100"
      }`}
    >
      <div className="flex justify-between items-center mb-2 border-b pb-2 border-black/10">
        <h4
          className={`text-xs font-bold flex items-center gap-1 ${
            check.isFullyAvailable ? "text-blue-600" : "text-red-600"
          }`}
        >
          {check.isFullyAvailable ? (
            <>
              <Check className="w-4 h-4" /> 예약 가능 (재고 충분)
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4" /> 예약 불가 (재고 부족)
            </>
          )}
        </h4>
        {/* 범례 표시 */}
        <span className="text-[10px] text-gray-400">
          (총 / 수리 / 대여 / 재고 / 요청)
        </span>
      </div>

      <ul className="space-y-2">
        {check.details.map((item) => (
          <li
            key={item.equipmentId}
            className="flex justify-between items-center text-xs border-b border-dashed border-gray-200 pb-1 last:border-0"
          >
            <span
              className="text-gray-700 truncate max-w-[40%] font-medium"
              title={item.name}
            >
              {item.name}
            </span>

            {/* [수정] 요청하신 포맷: 총 / 수리 / 대여 / 재고 / 요청 */}
            <div className="font-mono flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded">
              <span title="총 보유량" className="text-gray-600">
                {item.total}
              </span>
              <span className="text-gray-300">/</span>

              <span
                title="수리/고장"
                className={`${item.broken > 0 ? "text-red-500 font-bold" : "text-gray-400"}`}
              >
                {item.broken}
              </span>
              <span className="text-gray-300">/</span>

              <span
                title="다른 예약 대여중"
                className={`${item.rented > 0 ? "text-orange-500" : "text-gray-400"}`}
              >
                {item.rented}
              </span>
              <span className="text-gray-300">/</span>

              <span
                title="현재 가용 재고"
                className={`font-bold ${item.remaining < item.requested ? "text-red-600" : "text-blue-600"}`}
              >
                {item.remaining}
              </span>
              <span className="text-gray-300">/</span>

              <span title="요청 수량" className="text-black font-bold">
                {item.requested}
              </span>
            </div>
          </li>
        ))}
      </ul>

      {/* [수정] 문구 변경 */}
      {!check.isFullyAvailable && (
        <div className="mt-2 text-[11px] text-red-600 font-bold bg-white/50 p-1.5 rounded leading-tight text-center">
          ※ 겹치는 예약이 있거나 가용 재고가 부족합니다.
        </div>
      )}
    </div>
  );
};

const ConflictingReservations = ({
  reservationId,
  status,
}: {
  reservationId: Id<"reservations">;
  status: string;
}) => {
  const conflicts = useQuery(api.admin.getConflictingReservations, {
    reservationId,
  });

  if (!conflicts)
    return <div className="text-xs text-gray-400 p-2">확인 중...</div>;

  if (status !== "pending") return null;

  if (conflicts.length === 0) {
    return (
      <div className="text-xs bg-green-50 p-3 rounded border border-green-100 text-green-700 flex items-center gap-2 font-medium">
        <CheckCircle2 className="w-4 h-4" />
        중복된 예약이 없습니다.
      </div>
    );
  }

  const formatConflictDate = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:00`;
  };

  return (
    <div className="text-sm p-3 rounded border bg-orange-50 border-orange-200">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-orange-200">
        <AlertTriangle className="w-4 h-4 text-orange-600" />
        <h4 className="text-xs font-bold text-orange-600">
          예약 충돌 ({conflicts.length}건)
        </h4>
      </div>

      <ul className="space-y-2 max-h-[150px] overflow-y-auto">
        {conflicts.map((conflict) => (
          <li
            key={conflict.reservationId}
            className="bg-white p-2 rounded border border-orange-100"
          >
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-xs text-gray-800">
                {conflict.leaderName}
              </span>
              <span className="text-[10px] text-gray-500 font-mono">
                #{conflict.reservationNumber.slice(-4)}
              </span>
            </div>
            <div className="text-[10px] text-gray-500 mb-1">
              {formatConflictDate(conflict.startDate)} ~{" "}
              {formatConflictDate(conflict.endDate)}
            </div>
            <div className="flex flex-wrap gap-1">
              {conflict.conflictingItems.map((item, idx) => (
                <span
                  key={idx}
                  className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded"
                >
                  {item.name} x{item.quantity}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const myProfile = useQuery(api.users.getMyProfile);

  const [activeTab, setActiveTab] = useState<ActiveTab>("reservations");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("pending");
  const [userActiveTab, setUserActiveTab] = useState<UserTab>("all");
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [returnNotes, setReturnNotes] = useState<{ [key: string]: string }>({});
  const [repairMemoInputs, setRepairMemoInputs] = useState<{
    [key: string]: string;
  }>({});

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingReservationId, setEditingReservationId] =
    useState<Id<"reservations"> | null>(null);
  const [editingItems, setEditingItems] = useState<EditingItem[]>([]);
  const [equipmentSearchTerm, setEquipmentSearchTerm] = useState("");
  const [selectedEquipmentToAdd, setSelectedEquipmentToAdd] =
    useState<string>("");

  // 날짜 필터 (week 제거, date 추가, month를 string으로 변경)
  const [dateFilterType, setDateFilterType] = useState<
    "all" | "year" | "month" | "date"
  >("all");
  const [filterYear, setFilterYear] = useState<number>(
    new Date().getFullYear(),
  );
  const [filterMonth, setFilterMonth] = useState<string>(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`,
  );
  const [filterDate, setFilterDate] = useState<string>("");
  // 페이지네이션
  const [currentPage, setCurrentPage] = useState(1);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assigningReservation, setAssigningReservation] =
    useState<ReservationData | null>(null);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returningReservation, setReturningReservation] =
    useState<ReservationData | null>(null);
  const [isAssignmentEditModalOpen, setIsAssignmentEditModalOpen] =
    useState(false);
  const [editingAssignmentReservation, setEditingAssignmentReservation] =
    useState<ReservationData | null>(null);

  const rawReservations = useQuery(api.admin.getAllReservations);
  const reservations = rawReservations as ReservationData[] | undefined;
  const users = useQuery(api.users.getUsers);
  const rawAllEquipment = useQuery(api.equipment.getAll);
  const allEquipment = rawAllEquipment as EquipmentData[] | undefined;

  // 엑셀 내보내기/가져오기용 데이터 (장비 관리 탭)
  const exportEquipment = useQuery(api.equipment.getAllForExport);
  const exportAssets = useQuery(api.assets.getAll);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Repairs 데이터 (수리 탭용)
  const repairs = useQuery(api.admin.getRepairs, { status: "in_progress" });

  const updateResStatus = useMutation(api.admin.updateReservationStatus);
  const updateResItems = useMutation(api.admin.updateReservationItems);
  const approveUserMutation = useMutation(api.users.approveUser);
  const deleteUserAction = useAction(api.users.deleteUser);
  const createNotification = useMutation(api.notifications.create);

  const updateRepairMemo = useMutation(api.admin.updateRepairMemo);
  const toggleRepairStatus = useMutation(api.admin.toggleRepairStatus);
  const deleteRepair = useMutation(api.admin.deleteRepair);
  const createExcelLog = useMutation(api.excelLogs.createLog);

  useEffect(() => {
    localStorage.removeItem("cart");
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

  const handleLogout = async () => {
    useCartStore.getState().clearCart();
    localStorage.removeItem("cart-storage");
    localStorage.removeItem("cart");
    window.dispatchEvent(new Event("storage"));
    await signOut();
    navigate("/");
  };

  const handleExcelExport = async () => {
    if (!exportEquipment || !exportAssets || !myProfile) return;
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const fileName = `SSFilm_장비목록_${today}.xlsx`;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        exportEquipment.map((eq) => ({
          equipment_id: eq._id,
          장비명: eq.name,
          카테고리: eq.category,
          서브카테고리: eq.subCategory,
          전체수량: eq.totalQuantity,
          설명: eq.description,
          상태: eq.isVisible ? "노출" : "숨김",
        })),
      ),
      "장비목록",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        exportAssets.map((a) => ({
          asset_id: a._id,
          장비명: a.equipmentName,
          자산번호: a.managementCode ?? "",
          시리얼넘버: a.serialNumber ?? "",
          상태: a.status,
          컨디션: "",
          비고: a.note ?? "",
          equipment_id: a.equipmentId,
        })),
      ),
      "자산목록",
    );
    XLSX.writeFile(wb, fileName);

    // 로그 기록
    await createExcelLog({
      userId: myProfile._id,
      userName: myProfile.name,
      userEmail: myProfile.email,
      action: "export",
      fileName,
      equipmentCount: exportEquipment.length,
      assetCount: exportAssets.length,
    });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:00`;
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "승인 대기";
      case "approved":
        return "예약 승인";
      case "rented":
        return "대여중";
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

  const handleStatusChange = async (
    id: Id<"reservations">,
    status: string,
    repairNote?: string,
  ) => {
    const confirmMsg = `상태를 '${getStatusLabel(status)}'(으)로 변경하시겠습니까?`;
    if (!confirm(confirmMsg)) return;

    try {
      const reservation = reservations?.find((r) => r._id === id);
      await updateResStatus({ id, status, repairNote });

      if (reservation) {
        let type = "";
        if (status === "approved") type = "reservation_approved";
        else if (status === "rejected") type = "reservation_rejected";
        else if (status === "rented") type = "reservation_rented";
        else if (status === "returned") type = "reservation_returned";

        if (type)
          await createNotification({
            userId: reservation.userId,
            type,
            title: getStatusLabel(status),
            message: "상태가 변경되었습니다.",
            relatedId: id,
          });
      }
      if (status === "returned")
        setReturnNotes((prev) => ({ ...prev, [id]: "" }));
    } catch (e: any) {
      const rawMsg = e.message || e.toString();
      let cleanMsg = rawMsg;
      if (rawMsg.includes("Uncaught Error:")) {
        cleanMsg = rawMsg.split("Uncaught Error:")[1];
      }
      cleanMsg = cleanMsg.split("\n")[0].trim();
      cleanMsg = cleanMsg.replace(/\(잔여: \d+개\)/g, "").trim();
      alert(`상태 변경 실패:\n${cleanMsg}`);
    }
  };

  const handleApproveUser = async (userId: Id<"users">, name: string) => {
    if (confirm(`'${name}' 회원을 승인하시겠습니까?`)) {
      await approveUserMutation({ userId });
    }
  };

  const handleDeleteUser = async (userId: Id<"users">, name: string) => {
    if (
      confirm(
        `정말 '${name}' 회원을 삭제하시겠습니까?\n\n※ 주의: 삭제 시 복구할 수 없습니다.`,
      )
    ) {
      try {
        await deleteUserAction({ userId });
        alert("성공적으로 삭제되었습니다.");
      } catch (error: any) {
        alert(error.message || "삭제 실패");
      }
    }
  };

  const openEditModal = (res: ReservationData) => {
    setEditingReservationId(res._id);
    setEditingItems(
      res.items.map((i) => ({
        equipmentId: i.equipmentId,
        name: i.name,
        quantity: i.quantity,
      })),
    );
    setIsEditModalOpen(true);
  };

  const handleItemQuantityChange = (eqId: string, delta: number) => {
    const eq = allEquipment?.find((e) => e._id === eqId);
    const maxQty = eq?.totalQuantity ?? 999;
    setEditingItems((prev) =>
      prev.map((i) =>
        i.equipmentId === eqId
          ? {
              ...i,
              quantity: Math.min(maxQty, Math.max(1, i.quantity + delta)),
            }
          : i,
      ),
    );
  };

  const handleItemRemove = (eqId: string) => {
    if (confirm("삭제하시겠습니까?")) {
      setEditingItems((prev) => prev.filter((i) => i.equipmentId !== eqId));
    }
  };

  const handleAddItem = () => {
    if (!selectedEquipmentToAdd) return;
    const eq = allEquipment?.find((e) => e._id === selectedEquipmentToAdd);
    if (!eq) return;
    if (editingItems.find((i) => i.equipmentId === eq._id)) {
      return alert("이미 목록에 있습니다.");
    }
    setEditingItems((prev) => [
      ...prev,
      { equipmentId: eq._id, name: eq.name, quantity: 1 },
    ]);
    setSelectedEquipmentToAdd("");
    setEquipmentSearchTerm("");
  };

  const handleSaveEditedItems = async () => {
    if (!editingReservationId) return;
    try {
      await updateResItems({
        id: editingReservationId,
        items: editingItems.map((i) => ({
          ...i,
          checkedOut: false,
          returned: false,
        })),
      });
      setIsEditModalOpen(false);
      alert("수정되었습니다.");
    } catch (e: any) {
      const raw: string = e.message || String(e);
      const match = raw.match(/Uncaught Error: ([^\n]+)/);
      alert(match ? match[1].trim() : raw.split("\n")[0].trim());
    }
  };

  const statusFiltered = (reservations || []).filter((res) => {
    if (filterStatus === "pending") return res.status === "pending";
    if (filterStatus === "approved") return res.status === "approved";
    if (filterStatus === "rented") return res.status === "rented";
    if (filterStatus === "history")
      return ["returned", "rejected", "cancelled"].includes(res.status);
    return true;
  });

  const dateFiltered = statusFiltered.filter((res) => {
    if (dateFilterType === "all") return true;
    const d = new Date(res.startDate);
    if (dateFilterType === "year") return d.getFullYear() === filterYear;
    if (dateFilterType === "month")
      return d.getFullYear() === filterYear && d.getMonth() + 1 === filterMonth;
    if (dateFilterType === "date" && filterDate) {
      const fDate = new Date(filterDate);
      return (
        d.getFullYear() === fDate.getFullYear() &&
        d.getMonth() === fDate.getMonth() &&
        d.getDate() === fDate.getDate()
      );
    }
    return true;
  });

  const sortedReservations = [...dateFiltered].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
  );

  const ITEMS_PER_PAGE = 7;
  const totalPages = Math.max(
    1,
    Math.ceil(sortedReservations.length / ITEMS_PER_PAGE),
  );
  const paginatedReservations = sortedReservations.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const filteredUsers = users.filter((u) => {
    const match =
      u.name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      u.studentId?.includes(userSearchTerm);
    if (userActiveTab === "pending")
      return match && !u.isApproved && u.role !== "admin";
    return match;
  });

  const pendingUserCount = users.filter(
    (u) => !u.isApproved && u.role !== "admin",
  ).length;

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-8 min-h-screen pb-20">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold">관리자 대시보드</h2>
          <p className="text-gray-500 text-sm">예약 및 회원 관리</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/admin/calendar")}
            className="flex gap-2 bg-white border px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-50"
          >
            <CalendarIcon className="w-4 h-4" /> 예약 캘린더
          </button>
          <button
            onClick={handleLogout}
            className="flex gap-2 bg-black text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-800"
          >
            <LogOut className="w-4 h-4" /> 로그아웃
          </button>
        </div>
      </div>

      <div className="flex items-end justify-between mb-6 border-b gap-4">
        {/* 탭 목록 */}
        <div className="flex gap-8 overflow-x-auto touch-pan-x">
          {(["reservations", "users", "repairs", "assets"] as const).map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-lg font-bold flex gap-2 items-center whitespace-nowrap ${
                  activeTab === tab
                    ? "border-b-2 border-black"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {tab === "reservations"
                  ? "예약 관리"
                  : tab === "users"
                    ? "회원 관리"
                    : tab === "repairs"
                      ? "수리 현황"
                      : "장비 관리"}
                {tab === "users" &&
                  pendingUserCount > 0 &&
                  tab !== activeTab && (
                    <span className="bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full -mt-1">
                      {pendingUserCount}
                    </span>
                  )}
              </button>
            ),
          )}
        </div>

        {/* 장비 관리 탭 전용 액션 버튼 */}
        {activeTab === "assets" && (
          <div className="flex gap-2 pb-2 shrink-0">
            <button
              onClick={handleExcelExport}
              disabled={!exportEquipment || !exportAssets}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5" /> 엑셀 내보내기
            </button>
            <button
              onClick={() => setIsImportModalOpen(true)}
              disabled={!exportEquipment || !exportAssets}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Upload className="w-3.5 h-3.5" /> 엑셀 가져오기
            </button>
          </div>
        )}
      </div>

      {/* 1. 예약 관리 */}
      {activeTab === "reservations" && (
        <>
          {/* [수정] 상태 필터와 날짜 필터를 한 줄에 배치 (양쪽 정렬) */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            {/* 왼쪽: 상태 필터 탭 */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-full md:w-auto overflow-x-auto">
              {[
                { k: "pending", l: "승인 대기" },
                { k: "approved", l: "예약 승인" },
                { k: "rented", l: "대여중" },
                { k: "history", l: "완료/취소" },
                { k: "all", l: "전체" },
              ].map((t) => (
                <button
                  key={t.k}
                  onClick={() => {
                    setFilterStatus(t.k as FilterStatus);
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 rounded text-sm font-bold whitespace-nowrap flex-1 md:flex-none transition-colors ${
                    filterStatus === t.k
                      ? "bg-white shadow-sm text-black"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {t.l}
                </button>
              ))}
            </div>

            {/* 오른쪽: 날짜 필터 (배경 제거, 우측 정렬, 달력 픽커 적용) */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
              <CalendarIcon className="w-4 h-4 text-gray-500 hidden md:block" />
              <select
                className="bg-transparent border-none font-bold text-sm text-gray-700 outline-none focus:ring-0 cursor-pointer pl-1 pr-6 py-1"
                value={dateFilterType}
                onChange={(e) => {
                  setDateFilterType(e.target.value as any);
                  setCurrentPage(1);
                }}
              >
                <option value="all">전체 기간</option>
                <option value="year">연간</option>
                <option value="month">월간</option>
                <option value="date">일간 (날짜선택)</option>
              </select>

              {dateFilterType === "year" && (
                <input
                  type="number"
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-24 outline-none focus:border-black bg-white"
                  value={filterYear}
                  onChange={(e) => {
                    setFilterYear(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  placeholder="YYYY"
                />
              )}

              {dateFilterType === "month" && (
                <div className="flex gap-2">
                  <input
                    type="number"
                    className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-24 outline-none focus:border-black bg-white"
                    value={filterYear}
                    onChange={(e) => {
                      setFilterYear(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    placeholder="YYYY"
                  />
                  <select
                    className="border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none focus:border-black bg-white cursor-pointer"
                    value={filterMonth}
                    onChange={(e) => {
                      setFilterMonth(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {m}월
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 주간 대신 달력을 클릭하는 일간(date) 입력창 */}
              {dateFilterType === "date" && (
                <input
                  type="date"
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none focus:border-black bg-white cursor-pointer"
                  value={filterDate}
                  onChange={(e) => {
                    setFilterDate(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              )}
            </div>
          </div>

          {/* [수정] filteredReservations -> paginatedReservations 로 맵핑 변경 */}
          <div className="space-y-6">
            {paginatedReservations.length === 0 ? (
              <div className="text-center py-20 bg-gray-50 border border-dashed rounded-xl text-gray-400 font-medium">
                예약 내역이 없습니다.
              </div>
            ) : (
              paginatedReservations.map((res) => {
                const projectTitle = getProjectTitle(res.purposeDetail);
                return (
                  // ... (기존 예약 카드 렌더링 <div key={res._id} className="bg-white rounded-xl shadow-sm..."> 내부 코드는 동일하게 유지하세요) ...
                  <div
                    key={res._id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                  >
                    <div className="bg-gray-50 px-4 md:px-6 py-4 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-bold ${
                            res.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : res.status === "approved"
                                ? "bg-blue-100 text-blue-800"
                                : res.status === "rented"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100"
                          }`}
                        >
                          {getStatusLabel(res.status)}
                        </span>
                        <span className="text-sm text-gray-500 font-mono">
                          #{res.reservationNumber.slice(-4)}
                        </span>
                        <span className="font-bold">{res.leaderName}</span>
                      </div>
                      <div className="text-sm text-gray-600 bg-white md:bg-transparent p-2 md:p-0 rounded border md:border-0 w-full md:w-auto text-center md:text-left">
                        <span className="text-blue-600 font-bold mr-1">
                          반출
                        </span>{" "}
                        {formatDate(res.startDate)}
                        <span className="mx-2 text-gray-300">|</span>
                        <span className="text-red-600 font-bold mr-1">
                          반납
                        </span>{" "}
                        {formatDate(res.endDate)}
                      </div>
                    </div>

                    <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                      <div className="lg:col-span-4 space-y-4 border-b pb-6 lg:border-b-0 lg:pb-0 lg:border-r lg:pr-6 border-gray-100">
                        <div>
                          <h4 className="text-xs font-bold text-gray-500 mb-1">
                            대여자 정보
                          </h4>
                          <p className="text-sm font-bold text-black">
                            {res.leaderName}
                          </p>
                          <p className="text-sm text-gray-600">
                            연락처: {res.leaderPhone}
                          </p>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-gray-500 mb-2">
                            촬영 정보
                          </h4>
                          <div className="text-sm bg-gray-50 p-3 rounded border whitespace-pre-wrap max-h-32 overflow-y-auto">
                            {projectTitle && (
                              <p className="font-bold text-base text-black mb-2">
                                {projectTitle}
                              </p>
                            )}
                            <div className="text-gray-600 text-xs">
                              {res.purposeDetail
                                .split("\n")
                                .slice(projectTitle ? 1 : 0)
                                .join("\n")
                                .trim()}
                            </div>
                          </div>
                        </div>
                        {res.status === "pending" && (
                          <div>
                            <h4 className="text-xs font-bold text-gray-500 mb-2">
                              중복 장비 확인
                            </h4>
                            <ConflictingReservations
                              reservationId={res._id}
                              status={res.status}
                            />
                          </div>
                        )}
                      </div>

                      <div className="lg:col-span-4 space-y-4 flex flex-col border-b pb-6 lg:border-b-0 lg:pb-0 lg:border-r lg:pr-6 border-gray-100">
                        <div className="flex-1">
                          <h4 className="text-xs font-bold text-gray-500 mb-2">
                            실시간 재고 확인
                          </h4>
                          <AvailabilityStatus
                            reservationId={res._id}
                            status={res.status}
                          />
                        </div>
                        <div className="pt-4 border-t border-gray-100">
                          <h4 className="text-xs font-bold text-red-500 mb-2 flex items-center gap-1">
                            <Wrench className="w-3 h-3" /> 수리/특이사항 메모
                          </h4>
                          <textarea
                            className="w-full text-sm bg-red-50 border border-red-100 rounded p-2 focus:outline-none focus:border-red-300 resize-none h-20 placeholder-red-200"
                            placeholder="반납 시 파손, 분실, 특이사항 입력"
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

                      <div className="lg:col-span-4 flex flex-col h-full">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-xs font-bold text-gray-500">
                            신청 장비 리스트
                          </h4>
                          {(res.status === "pending" ||
                            res.status === "approved") && (
                            <button
                              onClick={() => openEditModal(res)}
                              className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                            >
                              <Edit className="w-3 h-3" /> 수정
                            </button>
                          )}
                        </div>
                        <ul className="text-sm divide-y divide-gray-100 border rounded bg-gray-50 flex-1 overflow-y-auto max-h-[300px]">
                          {res.items.map((item, idx) => (
                            <li
                              key={idx}
                              className="p-3 flex justify-between items-center hover:bg-gray-100"
                            >
                              <span className="font-medium text-gray-700">
                                {item.name}
                              </span>
                              <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-xs">
                                {item.quantity}개
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="px-4 md:px-6 py-3 bg-gray-50 border-t flex flex-col md:flex-row justify-between items-center gap-4">
                      <div className="flex items-center gap-2 w-full md:w-auto">
                        <span className="text-xs font-bold text-gray-500 whitespace-nowrap">
                          상태 변경:
                        </span>
                        <select
                          className="flex-1 md:flex-none text-sm border border-gray-300 rounded px-2 py-1.5 bg-white cursor-pointer"
                          value={res.status}
                          onChange={(e) =>
                            handleStatusChange(
                              res._id,
                              e.target.value,
                              returnNotes[res._id],
                            )
                          }
                        >
                          <option value="pending">승인 대기</option>
                          <option value="approved">예약 승인</option>
                          <option value="rented">대여중</option>
                          <option value="returned">반납 완료</option>
                          <option value="rejected">거절됨</option>
                          <option value="cancelled">취소됨</option>
                        </select>
                      </div>
                      <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
                        {(res.status === "approved" ||
                          res.status === "rented") && (
                          <button
                            onClick={() =>
                              window.open(
                                `/print/reservation/${res._id}`,
                                "_blank",
                              )
                            }
                            className="flex-1 md:flex-none flex items-center justify-center gap-1 px-3 py-1.5 border bg-white rounded text-sm hover:bg-gray-50 whitespace-nowrap"
                          >
                            <Printer className="w-4 h-4" /> 예약 확정 장비리스트
                          </button>
                        )}
                        {res.status === "rented" && (
                          <>
                            <button
                              onClick={() =>
                                window.open(
                                  `/print/reservation/${res._id}?type=rental`,
                                  "_blank",
                                )
                              }
                              className="flex-1 md:flex-none flex items-center justify-center gap-1 px-3 py-1.5 bg-gray-900 text-white rounded text-sm hover:bg-gray-700 whitespace-nowrap"
                            >
                              <Printer className="w-4 h-4" /> 반출 장비리스트
                            </button>
                            <button
                              onClick={() => {
                                setEditingAssignmentReservation(res);
                                setIsAssignmentEditModalOpen(true);
                              }}
                              className="flex-1 md:flex-none flex items-center justify-center gap-1 px-3 py-1.5 border border-orange-300 text-orange-600 rounded text-sm hover:bg-orange-50 whitespace-nowrap"
                            >
                              <Edit className="w-4 h-4" /> 장비 번호 배정 변경
                            </button>
                          </>
                        )}
                        {res.status === "pending" && (
                          <>
                            <button
                              onClick={() =>
                                handleStatusChange(res._id, "rejected")
                              }
                              className="flex-1 md:flex-none px-4 py-1.5 border border-red-200 text-red-600 rounded text-sm hover:bg-red-50 font-medium"
                            >
                              거절
                            </button>
                            <button
                              onClick={() =>
                                handleStatusChange(res._id, "approved")
                              }
                              className="flex-1 md:flex-none px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-bold hover:bg-blue-700 shadow-sm"
                            >
                              승인
                            </button>
                          </>
                        )}
                        {res.status === "approved" && (
                          <>
                            <button
                              onClick={() => {
                                setAssigningReservation(res);
                                setIsAssignModalOpen(true);
                              }}
                              className="flex-1 md:flex-none px-4 py-1.5 bg-orange-600 text-white rounded text-sm font-bold shadow-sm whitespace-nowrap"
                            >
                              장비 번호 배정
                            </button>
                            <button
                              onClick={() =>
                                handleStatusChange(res._id, "rented")
                              }
                              className="flex-1 md:flex-none px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-bold shadow-sm whitespace-nowrap"
                            >
                              반출 처리
                            </button>
                          </>
                        )}
                        {res.status === "rented" && (
                          <button
                            onClick={() => {
                              setReturningReservation(res);
                              setIsReturnModalOpen(true);
                            }}
                            className="flex-1 md:flex-none px-4 py-1.5 bg-gray-800 text-white rounded text-sm font-bold shadow-sm whitespace-nowrap"
                          >
                            반납 확인
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* [추가] 페이지네이션 UI (하단) */}
          {totalPages > 0 && (
            <div className="flex items-center justify-center gap-4 mt-8 pt-4 border-t">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border rounded-lg text-sm font-bold text-gray-700 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                이전
              </button>
              <span className="text-sm font-bold text-gray-700 min-w-[4rem] text-center">
                {currentPage}{" "}
                <span className="text-gray-400 font-normal">
                  / {totalPages}
                </span>
              </span>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
                className="px-4 py-2 border rounded-lg text-sm font-bold text-gray-700 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}

      {/* 2. 회원 관리 */}
      {activeTab === "users" && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex gap-2 w-full md:w-auto">
              <button
                onClick={() => setUserActiveTab("all")}
                className={`flex-1 md:flex-none px-4 py-2 text-sm font-bold rounded-lg transition-colors text-center ${
                  userActiveTab === "all"
                    ? "bg-black text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                전체 회원
              </button>
              <button
                onClick={() => setUserActiveTab("pending")}
                className={`flex-1 md:flex-none px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${
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
            {/* 모바일에서 테이블 가로 스크롤 허용 */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">
                      상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">
                      이름
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">
                      연락처
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">
                      가입일
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase whitespace-nowrap">
                      관리
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y">
                  {filteredUsers.map((u) => (
                    <tr key={u._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
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
                      <td className="px-6 py-4 font-bold whitespace-nowrap">
                        {u.name}{" "}
                        <span className="text-gray-500 font-normal">
                          ({u.studentId || "학번없음"})
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap">
                        {u.phone || "-"}
                        <br />
                        <span className="text-xs text-gray-400">{u.email}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                        {new Date(u._creationTime).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right flex justify-end gap-2 whitespace-nowrap">
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
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-gray-400"
                      >
                        회원이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. 수리 현황 */}
      {activeTab === "repairs" && <RepairManagement />}

      {/* 4. 장비 관리 */}
      {activeTab === "assets" && <AssetManagement />}

      {/* Modals */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className="bg-white rounded-xl w-full max-w-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: "min(90vh, 700px)" }}
          >
            {/* 헤더 */}
            <div className="px-6 py-4 border-b flex-shrink-0">
              <h3 className="font-bold text-lg">장비 수정</h3>
            </div>

            {/* 장비 목록 (스크롤) */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
              {editingItems.map((item) => (
                <div
                  key={item.equipmentId}
                  className="flex justify-between items-center border p-2 rounded"
                >
                  <span className="text-sm">{item.name}</span>
                  <div className="flex gap-2 items-center">
                    <button
                      onClick={() =>
                        handleItemQuantityChange(item.equipmentId, -1)
                      }
                      className="p-1 bg-gray-100 rounded"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-sm font-bold">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        handleItemQuantityChange(item.equipmentId, 1)
                      }
                      className="p-1 bg-gray-100 rounded"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleItemRemove(item.equipmentId)}
                      className="text-red-500 ml-2"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 장비 추가 영역 */}
            <div className="px-6 py-3 border-t flex-shrink-0">
              <div className="flex gap-2">
                <input
                  className="border rounded px-2 py-1 flex-1 text-sm"
                  placeholder="장비 검색"
                  value={equipmentSearchTerm}
                  onChange={(e) => setEquipmentSearchTerm(e.target.value)}
                />
                <select
                  className="border rounded px-2 py-1 flex-1 text-sm"
                  value={selectedEquipmentToAdd}
                  onChange={(e) => setSelectedEquipmentToAdd(e.target.value)}
                >
                  <option value="">선택...</option>
                  {allEquipment
                    ?.filter((e) =>
                      e.name
                        .toLowerCase()
                        .includes(equipmentSearchTerm.toLowerCase()),
                    )
                    .map((e) => (
                      <option key={e._id} value={e._id}>
                        {e.name}
                      </option>
                    ))}
                </select>
                <button
                  onClick={handleAddItem}
                  className="bg-black text-white px-3 py-1 rounded text-sm font-bold whitespace-nowrap"
                >
                  추가
                </button>
              </div>
            </div>

            {/* 저장/취소 버튼 */}
            <div className="px-6 py-4 border-t flex-shrink-0 flex justify-end gap-2">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="border px-4 py-2 rounded text-sm"
              >
                취소
              </button>
              <button
                onClick={handleSaveEditedItems}
                className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {assigningReservation && (
        <AssetAssignmentModal
          key={assigningReservation._id}
          isOpen={isAssignModalOpen}
          onClose={() => {
            setIsAssignModalOpen(false);
            setAssigningReservation(null);
          }}
          reservationId={assigningReservation._id}
          items={assigningReservation.items}
          onAssignComplete={async () => {
            await handleStatusChange(assigningReservation._id, "approved");
            setIsAssignModalOpen(false);
            setAssigningReservation(null);
          }}
        />
      )}
      {returningReservation && (
        <AssetReturnModal
          key={returningReservation._id}
          isOpen={isReturnModalOpen}
          onClose={() => {
            setIsReturnModalOpen(false);
            setReturningReservation(null);
          }}
          reservationId={returningReservation._id}
          items={returningReservation.items}
          onReturnComplete={async () => {
            await handleStatusChange(
              returningReservation._id,
              "returned",
              returnNotes[returningReservation._id],
            );
            setIsReturnModalOpen(false);
            setReturningReservation(null);
          }}
        />
      )}
      {editingAssignmentReservation && (
        <AssetEditModal
          key={editingAssignmentReservation._id}
          isOpen={isAssignmentEditModalOpen}
          onClose={() => {
            setIsAssignmentEditModalOpen(false);
            setEditingAssignmentReservation(null);
          }}
          reservationId={editingAssignmentReservation._id}
          items={editingAssignmentReservation.items}
          onEditComplete={() => {
            setIsAssignmentEditModalOpen(false);
            setEditingAssignmentReservation(null);
          }}
        />
      )}

      {exportEquipment && exportAssets && myProfile && (
        <ExcelImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          existingEquipment={exportEquipment}
          existingAssets={exportAssets}
          currentUser={{
            _id: myProfile._id,
            name: myProfile.name,
            email: myProfile.email,
          }}
        />
      )}
    </div>
  );
}
