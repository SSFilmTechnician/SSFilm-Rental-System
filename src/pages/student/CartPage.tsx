import { useState } from "react"; // ✅ useEffect 삭제
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useCartStore } from "../../stores/useCartStore";
import {
  Trash2,
  Calendar,
  Users,
  FileText,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

// 사용 목적 옵션
const RESERVATION_PURPOSES = [
  { value: "class", label: "수업 실습" },
  { value: "graduation", label: "졸업 작품" },
  { value: "personal", label: "개인 작업" },
  { value: "etc", label: "기타" },
];

export default function CartPage() {
  const navigate = useNavigate();
  const { items, removeItem, clearCart, increaseQuantity, decreaseQuantity } =
    useCartStore();

  // 내 정보(이름, 학번) 불러오기
  const userProfile = useQuery(api.users.getMyProfile);

  // 예약 생성 API 및 장바구니 DB 저장
  const createReservation = useMutation(api.reservations.create);
  const saveCartToDB = useMutation(api.users.saveCart);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 폼 데이터 상태
  const [formData, setFormData] = useState({
    directorName: "",
    producer: "",
    sound: "",
    cinematographer: "",
    staffList: "",
    startDate: "",
    startTime: "10:00",
    endDate: "",
    endTime: "18:00",
    shootSchedule: "",
    purpose: "class",
    purposeDetail: "",
    inquiry: "",
  });

  // 시간 옵션 (00:00 ~ 23:00)
  const timeOptions = [...Array(24)].map((_, i) => {
    const hour = i.toString().padStart(2, "0");
    return (
      <option key={hour} value={`${hour}:00`}>
        {hour}:00
      </option>
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return alert("장바구니가 비어있습니다.");
    if (!formData.startDate || !formData.endDate)
      return alert("대여 기간을 설정해주세요.");

    // 프로필 정보가 아직 로딩 안 됐거나 없을 경우 안전장치
    if (!userProfile)
      return alert("유저 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.");

    if (!confirm("이대로 예약을 진행하시겠습니까?")) return;

    setIsSubmitting(true);
    try {
      const startDateTime = `${formData.startDate} ${formData.startTime}`;
      const endDateTime = `${formData.endDate} ${formData.endTime}`;

      const combinedDetail = `
[팀 구성]
연출: ${formData.directorName || "-"} / 제작: ${formData.producer || "-"}
음향: ${formData.sound || "-"} / 촬영: ${formData.cinematographer || "-"}
팀원 명단: ${formData.staffList || "없음"}

[촬영 스케줄]
${formData.shootSchedule || "내용 없음"}

[상세 내용]
${formData.purposeDetail}

[문의 사항]
${formData.inquiry || "없음"}
      `.trim();

      await createReservation({
        items: items.map((item) => ({
          equipmentId: item.equipmentId as Id<"equipment">,
          quantity: item.quantity,
          name: item.name,
        })),
        purpose: formData.purpose,
        purposeDetail: combinedDetail,
        startDate: startDateTime,
        endDate: endDateTime,
      });

      // 예약 성공 시 즉시 장바구니 비우기 (로컬 + DB)
      clearCart();
      await saveCartToDB({ cartJson: "[]" });

      alert("예약 신청이 성공적으로 접수되었습니다.");
      navigate("/mypage");
    } catch (error) {
      console.error(error);
      alert("예약 실패: " + error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (userProfile === undefined)
    return (
      <div className="p-20 text-center animate-pulse">
        정보를 불러오는 중...
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 pb-32">
      {/* 헤더 영역 */}
      <div className="flex items-end justify-between mb-8 border-b pb-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900">장바구니</h1>
          <p className="text-gray-500 mt-1 text-sm">
            신청서를 작성하고 예약을 완료하세요.
          </p>
        </div>
        {items.length > 0 && (
          <button
            onClick={() => confirm("정말 비우시겠습니까?") && clearCart()}
            className="text-red-500 text-sm font-bold hover:bg-red-50 px-3 py-2 rounded-lg transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-4 h-4" /> 전체 삭제
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
        {/* === 왼쪽: 장비 리스트 === */}
        <div className="flex-1 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b bg-gray-50 flex justify-between items-center">
              <h2 className="font-bold text-gray-700 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                선택한 장비 ({items.reduce((acc, cur) => acc + cur.quantity, 0)}
                개)
              </h2>
            </div>

            <div className="p-5 space-y-4">
              {items.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <div className="mb-2">담겨진 장비리스트가 없습니다</div>
                  <button
                    onClick={() => navigate("/")}
                    className="text-blue-600 underline text-sm hover:text-blue-800"
                  >
                    장비 둘러보기
                  </button>
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.equipmentId}
                    className="flex gap-4 p-4 border border-gray-100 rounded-xl hover:border-blue-200 transition-colors bg-white"
                  >
                    {/* 이미지 */}
                    <div className="w-24 h-24 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-gray-400">No Image</span>
                      )}
                    </div>

                    {/* 정보 & 컨트롤 */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded mb-1 inline-block uppercase">
                          {item.category}
                        </span>
                        <h3 className="font-bold text-gray-900 text-lg leading-tight">
                          {item.name}
                        </h3>
                      </div>

                      <div className="flex justify-between items-end mt-2">
                        {/* 수량 조절 */}
                        <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50">
                          <button
                            onClick={() => decreaseQuantity(item.equipmentId)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 text-gray-600"
                          >
                            -
                          </button>
                          <span className="w-8 text-center text-sm font-bold bg-white h-8 leading-8 border-x border-gray-200">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => increaseQuantity(item.equipmentId)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 text-gray-600"
                          >
                            +
                          </button>
                        </div>

                        {/* 삭제 버튼 */}
                        <button
                          onClick={() => removeItem(item.equipmentId)}
                          className="text-gray-400 hover:text-red-500 p-2"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* === 오른쪽: 신청서 폼 === */}
        <div className="w-full lg:w-[450px]">
          <div className="sticky top-24 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-5 bg-gray-900 text-white">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <FileText className="w-5 h-5" /> 예약 신청서
              </h2>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar"
            >
              {/* 1. 대여자 정보 */}
              <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Users className="w-4 h-4" /> 대여자 정보
                </h3>
                {userProfile ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">
                        이름
                      </label>
                      <input
                        readOnly
                        value={userProfile.name}
                        className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm font-bold text-gray-700"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">
                        학번
                      </label>
                      <input
                        readOnly
                        value={userProfile.studentId || "정보없음"}
                        className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm font-bold text-gray-700"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-gray-500 block mb-1">
                        연락처
                      </label>
                      <input
                        readOnly
                        value={userProfile.phone || "정보없음"}
                        className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm font-bold text-gray-700"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-amber-600 text-sm p-2 bg-amber-50 rounded">
                    <AlertCircle className="w-4 h-4" /> 프로필 정보를 불러올 수
                    없습니다.
                  </div>
                )}
              </div>

              {/* 2. 일정 선택 */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> 일정
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-blue-600 mb-1 block">
                      대여 시작 (Pick-up)
                    </label>
                    <div className="flex gap-1">
                      <input
                        type="date"
                        required
                        className="w-full border rounded px-2 py-2 text-sm"
                        value={formData.startDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            startDate: e.target.value,
                          })
                        }
                      />
                      <select
                        className="border rounded px-1 py-2 text-sm"
                        value={formData.startTime}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            startTime: e.target.value,
                          })
                        }
                      >
                        {timeOptions}
                      </select>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-red-500 mb-1 block">
                      반납 예정 (Return)
                    </label>
                    <div className="flex gap-1">
                      <input
                        type="date"
                        required
                        className="w-full border rounded px-2 py-2 text-sm"
                        value={formData.endDate}
                        onChange={(e) =>
                          setFormData({ ...formData, endDate: e.target.value })
                        }
                      />
                      <select
                        className="border rounded px-1 py-2 text-sm"
                        value={formData.endTime}
                        onChange={(e) =>
                          setFormData({ ...formData, endTime: e.target.value })
                        }
                      >
                        {timeOptions}
                      </select>
                    </div>
                  </div>
                </div>
                <textarea
                  placeholder="상세 촬영 스케줄 (일일촬영표 기준 콜타임 · 엔드타임)
                  예시) 1/16 12:00 - 1/16 15:00"
                  className="w-full border rounded px-3 py-2 text-sm h-20 resize-none"
                  value={formData.shootSchedule}
                  onChange={(e) =>
                    setFormData({ ...formData, shootSchedule: e.target.value })
                  }
                />
              </div>

              {/* 3. 팀 정보 */}
              <div className="space-y-3 pt-4 border-t border-dashed">
                <h3 className="text-sm font-bold text-gray-900">팀 구성</h3>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    placeholder="연출"
                    className="border rounded px-3 py-2 text-sm"
                    value={formData.directorName}
                    onChange={(e) =>
                      setFormData({ ...formData, directorName: e.target.value })
                    }
                  />
                  <input
                    placeholder="제작"
                    className="border rounded px-3 py-2 text-sm"
                    value={formData.producer}
                    onChange={(e) =>
                      setFormData({ ...formData, producer: e.target.value })
                    }
                  />
                  <input
                    placeholder="음향"
                    className="border rounded px-3 py-2 text-sm"
                    value={formData.sound}
                    onChange={(e) =>
                      setFormData({ ...formData, sound: e.target.value })
                    }
                  />
                  <input
                    placeholder="촬영"
                    className="border rounded px-3 py-2 text-sm"
                    value={formData.cinematographer}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cinematographer: e.target.value,
                      })
                    }
                  />
                </div>
                <textarea
                  placeholder="촬영 · 조명팀 명단"
                  className="w-full border rounded px-3 py-2 text-sm h-16 resize-none"
                  value={formData.staffList}
                  onChange={(e) =>
                    setFormData({ ...formData, staffList: e.target.value })
                  }
                />
              </div>

              {/* 4. 목적 및 기타 */}
              <div className="space-y-3 pt-4 border-t border-dashed">
                <h3 className="text-sm font-bold text-gray-900">사용 목적</h3>
                <select
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={formData.purpose}
                  onChange={(e) =>
                    setFormData({ ...formData, purpose: e.target.value })
                  }
                >
                  {RESERVATION_PURPOSES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <input
                  required
                  placeholder="상세 목적 (예: 크리틱 4 <작품 제목> 테스트 촬영)"
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={formData.purposeDetail}
                  onChange={(e) =>
                    setFormData({ ...formData, purposeDetail: e.target.value })
                  }
                />
                <textarea
                  placeholder="기타 문의사항"
                  className="w-full border rounded px-3 py-2 text-sm h-16 resize-none"
                  value={formData.inquiry}
                  onChange={(e) =>
                    setFormData({ ...formData, inquiry: e.target.value })
                  }
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {isSubmitting ? "처리 중..." : "예약 신청 완료"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
