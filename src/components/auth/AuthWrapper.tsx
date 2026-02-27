import { useState } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { LogOut } from "lucide-react";

// 승인 대기 화면 컴포넌트
function PendingApprovalScreen({
  userProfile,
  updateUser,
  signOut,
}: {
  userProfile: {
    name?: string;
    studentId?: string;
    phone?: string;
    isApproved?: boolean;
  };
  updateUser: (args: {
    name: string;
    studentId: string;
    phone: string;
  }) => Promise<null>;
  signOut: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: userProfile.name || "",
    studentId: userProfile.studentId || "",
    phone: userProfile.phone || "",
  });

  const handleSaveEdit = async () => {
    if (!editForm.name || !editForm.studentId || !editForm.phone) {
      return alert("모든 항목을 입력해주세요.");
    }

    try {
      await updateUser({
        name: editForm.name,
        studentId: editForm.studentId,
        phone: editForm.phone,
      });
      alert("정보가 수정되었습니다.");
      setIsEditing(false);
    } catch (error) {
      alert("수정 실패: " + error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-5 text-center">
      <div className="bg-white p-10 rounded-3xl shadow-xl max-w-sm w-full border border-gray-100">
        <div className="w-16 h-16 bg-yellow-50 text-yellow-500 rounded-2xl flex items-center justify-center mx-auto mb-6 text-3xl shadow-sm">
          🔒
        </div>
        <h2 className="text-xl font-black text-gray-900 mb-3">
          관리자 승인 대기 중
        </h2>
        <p className="text-gray-500 mb-8 text-sm leading-relaxed">
          <span className="font-bold text-gray-900">{userProfile.name}</span>
          님, 가입 신청이 접수되었습니다.
          <br />
          학과 사무실 승인 후 이용 가능합니다.
        </p>

        {isEditing ? (
          // 편집 모드
          <div className="bg-gray-50 p-5 rounded-xl text-sm text-left mb-8 space-y-3 border border-gray-100">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                이름
              </label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:outline-none"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                학번 (8자리)
              </label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:outline-none"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={editForm.studentId}
                onChange={(e) =>
                  setEditForm({ ...editForm, studentId: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                연락처
              </label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:outline-none"
                value={editForm.phone}
                onChange={(e) =>
                  setEditForm({ ...editForm, phone: e.target.value })
                }
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setEditForm({
                    name: userProfile.name || "",
                    studentId: userProfile.studentId || "",
                    phone: userProfile.phone || "",
                  });
                  setIsEditing(false);
                }}
                className="flex-1 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 px-3 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                저장
              </button>
            </div>
          </div>
        ) : (
          // 조회 모드
          <div className="bg-gray-50 p-5 rounded-xl text-sm text-left text-gray-600 mb-8 space-y-2 border border-gray-100">
            <p className="flex justify-between">
              <span>학번:</span>{" "}
              <span className="font-bold">{userProfile.studentId}</span>
            </p>
            <p className="flex justify-between">
              <span>연락처:</span>{" "}
              <span className="font-bold">{userProfile.phone}</span>
            </p>
            <button
              onClick={() => setIsEditing(true)}
              className="w-full mt-3 py-2 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
            >
              정보 수정하기
            </button>
          </div>
        )}

        <button
          onClick={() => signOut()}
          className="flex items-center justify-center gap-2 w-full bg-gray-900 text-white py-3.5 rounded-xl hover:bg-black transition-colors font-bold text-sm"
        >
          <LogOut className="w-4 h-4" /> 로그아웃
        </button>
      </div>
    </div>
  );
}

export default function AuthWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded } = useUser();
  const { signOut } = useAuth();

  const userProfile = useQuery(api.users.getMyProfile);
  const updateUser = useMutation(api.users.updateProfile);

  const [form, setForm] = useState({ name: "", studentId: "", phone: "" });

  // 1. 로딩 중 (Convex 데이터 가져오는 중)
  if (!isLoaded || userProfile === undefined) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black mb-4"></div>
        <div className="font-bold text-gray-500">정보 확인 중...</div>
      </div>
    );
  }

  // ✅ [핵심 수정] 관리자(admin)라면 모든 검사를 무시하고 바로 통과!
  // 학번이 없어도, 승인 대기 상태여도 관리자는 프리패스입니다.
  if (userProfile?.role === "admin") {
    return <>{children}</>;
  }

  // ---------------------------------------------------------
  // 👇 여기서부터는 "일반 학생"에게만 적용되는 검문소입니다.
  // ---------------------------------------------------------

  // 2. [가입 직후] 필수 정보가 없는 경우 -> 입력 폼 표시
  if (userProfile === null || !userProfile.studentId) {
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.name || !form.studentId || !form.phone)
        return alert("모두 입력해주세요.");

      try {
        await updateUser({
          name: form.name,
          studentId: form.studentId,
          phone: form.phone,
        });
        alert("정보가 등록되었습니다. 관리자 승인을 기다려주세요.");
      } catch (error) {
        alert("등록 실패: " + error);
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg">
          <h1 className="text-2xl font-black text-gray-900 mb-2">
            👋 환영합니다!
          </h1>
          <p className="text-gray-500 mb-8 text-sm leading-relaxed">
            원활한 장비 대여를 위해 필수 정보를 입력해주세요.
            <br />
            <span className="text-red-500 font-bold">
              * 입력 후에는 수정이 불가능합니다.
            </span>
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                이름 (실명)
              </label>
              <input
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-black focus:outline-none transition-all"
                placeholder="예: 홍길동"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                학번 (8자리)
              </label>
              <input
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-black focus:outline-none transition-all"
                placeholder="예: 20240001"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={form.studentId}
                onChange={(e) =>
                  setForm({ ...form, studentId: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                연락처
              </label>
              <input
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-black focus:outline-none transition-all"
                placeholder="예: 010-1234-5678"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <button className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-transform active:scale-95">
              정보 등록하기
            </button>
          </form>
          <button
            onClick={() => signOut()}
            className="mt-4 text-xs text-gray-400 underline w-full text-center"
          >
            다음에 입력하기 (로그아웃)
          </button>
        </div>
      </div>
    );
  }

  // 3. [승인 대기] 정보는 있는데 승인이 안 된 경우 -> 차단 화면 표시 (수정 가능)
  if (userProfile.isApproved !== true) {
    return (
      <PendingApprovalScreen
        userProfile={userProfile}
        updateUser={updateUser}
        signOut={signOut}
      />
    );
  }

  // 4. [통과] 승인된 학생 -> 앱 실행
  return <>{children}</>;
}