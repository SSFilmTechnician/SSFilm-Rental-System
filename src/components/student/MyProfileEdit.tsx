import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

interface ProfileProps {
  name?: string;
  studentId?: string;
  phone?: string;
}

interface Props {
  profile: ProfileProps;
  onCancel: () => void;
}

export default function MyProfileEdit({ profile, onCancel }: Props) {
  const updateProfile = useMutation(api.users.updateProfile);
  const [form, setForm] = useState({
    name: profile?.name || "",
    studentId: profile?.studentId || "",
    phone: profile?.phone || "",
  });

  const handleSave = async () => {
    if (!form.name || !form.studentId || !form.phone)
      return alert("빈칸을 채워주세요.");

    await updateProfile(form);
    alert("수정되었습니다.");
    onCancel();
  };

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-gray-900">내 정보 수정</h3>
      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">이름</label>
          <input
            placeholder="이름"
            className="w-full border p-2 rounded text-sm"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">학번</label>
          <input
            placeholder="학번"
            className="w-full border p-2 rounded text-sm"
            value={form.studentId}
            onChange={(e) => setForm({ ...form, studentId: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">연락처</label>
          <input
            placeholder="연락처"
            className="w-full border p-2 rounded text-sm"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <button
          onClick={onCancel}
          className="px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded"
        >
          취소
        </button>
        <button
          onClick={handleSave}
          className="px-3 py-2 text-sm bg-black text-white rounded hover:bg-gray-800"
        >
          저장
        </button>
      </div>
    </div>
  );
}
