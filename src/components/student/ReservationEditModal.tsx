import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { X, Trash2, Calendar, FileText, Plus } from "lucide-react";

interface ReservationEditModalProps {
  reservation: {
    _id: Id<"reservations">;
    purpose: string;
    purposeDetail: string;
    startDate: string;
    endDate: string;
    items: Array<{
      equipmentId: Id<"equipment">;
      name: string;
      quantity: number;
    }>;
  };
  onClose: () => void;
}

// 사용 목적 옵션
const RESERVATION_PURPOSES = [
  { value: "class", label: "수업 실습" },
  { value: "graduation", label: "졸업 작품" },
  { value: "personal", label: "개인 작업" },
  { value: "etc", label: "기타" },
];

export default function ReservationEditModal({
  reservation,
  onClose,
}: ReservationEditModalProps) {
  const updateReservation = useMutation(api.reservations.update);
  const allEquipment = useQuery(api.equipment.getList, {});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [equipmentSearchTerm, setEquipmentSearchTerm] = useState("");
  const [selectedEquipmentToAdd, setSelectedEquipmentToAdd] = useState("");

  // 날짜와 시간 분리
  const parseDateTime = (dateTimeStr: string) => {
    if (!dateTimeStr) return { date: "", time: "10:00" };
    const [date, time] = dateTimeStr.split(" ");
    return { date, time: time || "10:00" };
  };

  const startDateTime = parseDateTime(reservation.startDate);
  const endDateTime = parseDateTime(reservation.endDate);

  const [formData, setFormData] = useState({
    purpose: reservation.purpose || "class",
    purposeDetail: reservation.purposeDetail || "",
    startDate: startDateTime.date,
    startTime: startDateTime.time,
    endDate: endDateTime.date,
    endTime: endDateTime.time,
  });

  const [items, setItems] = useState(reservation.items);

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

    if (items.length === 0) {
      return alert("최소 1개 이상의 장비를 선택해야 합니다.");
    }

    if (!formData.startDate || !formData.endDate) {
      return alert("대여 기간을 설정해주세요.");
    }

    if (!confirm("예약 정보를 수정하시겠습니까?")) return;

    setIsSubmitting(true);
    try {
      const startDateTime = `${formData.startDate} ${formData.startTime}`;
      const endDateTime = `${formData.endDate} ${formData.endTime}`;

      await updateReservation({
        reservationId: reservation._id,
        items: items.map((item) => ({
          equipmentId: item.equipmentId,
          quantity: item.quantity,
          name: item.name,
        })),
        purpose: formData.purpose,
        purposeDetail: formData.purposeDetail,
        startDate: startDateTime,
        endDate: endDateTime,
      });

      alert("예약이 수정되었습니다.");
      onClose();
    } catch (error) {
      console.error(error);
      alert("수정 실패: " + error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeItem = (equipmentId: Id<"equipment">) => {
    setItems(items.filter((item) => item.equipmentId !== equipmentId));
  };

  const updateQuantity = (equipmentId: Id<"equipment">, delta: number) => {
    setItems(
      items.map((item) => {
        if (item.equipmentId === equipmentId) {
          // 해당 장비의 totalQuantity 찾기
          const equipment = allEquipment?.find(
            (e: any) => e._id === equipmentId,
          );
          const maxQuantity = equipment?.totalQuantity || 999;
          const newQuantity = item.quantity + delta;

          return {
            ...item,
            quantity: Math.max(1, Math.min(maxQuantity, newQuantity)),
          };
        }
        return item;
      }),
    );
  };

  const handleAddItem = () => {
    if (!selectedEquipmentToAdd || !allEquipment) return;
    const eq = allEquipment.find((e: any) => e._id === selectedEquipmentToAdd);
    if (!eq) return;
    if (items.find((i) => i.equipmentId === eq._id)) {
      return alert("이미 목록에 있는 장비입니다.");
    }
    setItems([...items, { equipmentId: eq._id, name: eq.name, quantity: 1 }]);
    setSelectedEquipmentToAdd("");
    setEquipmentSearchTerm("");
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 pt-16 sm:pt-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:w-full sm:max-w-2xl h-[92vh] sm:h-auto sm:max-h-[70vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex-shrink-0 bg-gray-900 text-white p-5 flex justify-between items-center rounded-t-2xl">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <FileText className="w-5 h-5" />
            예약 수정
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            {/* 장비 목록 */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                선택한 장비 (
                {items.reduce((sum, item) => sum + item.quantity, 0)}개)
              </h3>
              {items.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm border border-dashed rounded-lg">
                  선택된 장비가 없습니다
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((item) => {
                    const equipment = allEquipment?.find(
                      (e: any) => e._id === item.equipmentId,
                    );
                    const maxQuantity = equipment?.totalQuantity || 999;
                    const isAtMax = item.quantity >= maxQuantity;

                    return (
                      <div
                        key={item.equipmentId}
                        className="flex items-start gap-3 p-2.5 border border-gray-200 rounded-lg hover:border-gray-300"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm break-words leading-tight">
                            {item.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            최대 {maxQuantity}개
                            {isAtMax && (
                              <span className="text-orange-600 font-bold ml-1">
                                (최대)
                              </span>
                            )}
                          </span>
                          <div className="flex items-center border border-gray-200 rounded-lg">
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(item.equipmentId, -1)
                              }
                              className="w-7 h-7 hover:bg-gray-100 text-gray-600 font-medium text-sm"
                            >
                              -
                            </button>
                            <span className="w-7 text-center text-sm font-bold">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(item.equipmentId, 1)
                              }
                              disabled={isAtMax}
                              className={`w-7 h-7 font-medium text-sm ${
                                isAtMax
                                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                  : "hover:bg-gray-100 text-gray-600"
                              }`}
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(item.equipmentId)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 장비 추가 */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3">
                장비 추가
              </h3>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  className="border rounded-lg px-3 py-2 w-full sm:flex-1 text-sm"
                  placeholder="장비 검색..."
                  value={equipmentSearchTerm}
                  onChange={(e) => setEquipmentSearchTerm(e.target.value)}
                />
                <select
                  className="border rounded-lg px-3 py-2 w-full sm:flex-1 text-sm"
                  value={selectedEquipmentToAdd}
                  onChange={(e) => setSelectedEquipmentToAdd(e.target.value)}
                >
                  <option value="">장비 선택...</option>
                  {allEquipment
                    ?.filter((e: any) =>
                      e.name
                        .toLowerCase()
                        .includes(equipmentSearchTerm.toLowerCase()),
                    )
                    .map((e: any) => (
                      <option key={e._id} value={e._id}>
                        {e.name}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 whitespace-nowrap flex items-center justify-center gap-1 w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4" /> 추가
                </button>
              </div>
            </div>

            {/* 대여 기간 */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                대여 기간
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-blue-600 mb-1.5 block">
                    대여 시작 (Pick-up)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      required
                      className="flex-1 border rounded-lg px-3 py-2 text-sm"
                      value={formData.startDate}
                      onChange={(e) =>
                        setFormData({ ...formData, startDate: e.target.value })
                      }
                    />
                    <select
                      className="border rounded-lg px-2 py-2 text-sm"
                      value={formData.startTime}
                      onChange={(e) =>
                        setFormData({ ...formData, startTime: e.target.value })
                      }
                    >
                      {timeOptions}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-red-500 mb-1.5 block">
                    반납 예정 (Return)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      required
                      className="flex-1 border rounded-lg px-3 py-2 text-sm"
                      value={formData.endDate}
                      onChange={(e) =>
                        setFormData({ ...formData, endDate: e.target.value })
                      }
                    />
                    <select
                      className="border rounded-lg px-2 py-2 text-sm"
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
            </div>

            {/* 사용 목적 */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-3">
                사용 목적
              </h3>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm mb-3"
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
              <textarea
                required
                placeholder="상세 목적 (예: 크리틱 4 <작품 제목> 테스트 촬영)"
                className="w-full border rounded-lg px-3 py-3 text-sm h-24 resize-none"
                value={formData.purposeDetail}
                onChange={(e) =>
                  setFormData({ ...formData, purposeDetail: e.target.value })
                }
              />
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex-shrink-0 p-6 pt-4 border-t flex gap-3 bg-white rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "처리 중..." : "수정 완료"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
