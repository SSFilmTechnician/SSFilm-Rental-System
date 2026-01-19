import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { CheckCircle, User, ShieldAlert, Trash2 } from "lucide-react";

export default function UserManagement() {
  const users = useQuery(api.users.getUsers);
  const approveUser = useMutation(api.users.approveUser);

  const deleteUserAction = useAction(api.users.deleteUser);

  if (users === undefined) return <div className="p-10">로딩 중...</div>;

  const handleDelete = async (userId: Id<"users">, userName: string) => {
    const isConfirmed = confirm(
      `정말 '${userName}' 회원을 삭제하시겠습니까?\n\n※ 주의: 삭제 시 해당 회원의 모든 정보가 사라지며 복구할 수 없습니다.`
    );

    if (isConfirmed) {
      try {
        await deleteUserAction({ userId });
        alert("성공적으로 삭제되었습니다.");
      } catch (error) {
        // ✅ [수정] any 제거 후 안전한 타입 단언 사용
        const err = error as { data?: { message?: string }; message?: string };
        const errorMessage = err.data?.message || err.message || "삭제 실패";
        alert(errorMessage);
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-10">
      <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
        <User className="w-8 h-8" /> 유저 관리
      </h1>
      <p className="text-gray-500 mb-8">
        가입 신청한 학생들을 승인하거나 관리합니다.
      </p>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 text-sm font-bold text-gray-500">이름</th>
              <th className="p-4 text-sm font-bold text-gray-500">학번</th>
              <th className="p-4 text-sm font-bold text-gray-500">연락처</th>
              <th className="p-4 text-sm font-bold text-gray-500">이메일</th>
              <th className="p-4 text-sm font-bold text-gray-500">상태</th>
              <th className="p-4 text-sm font-bold text-gray-500 text-right">
                관리
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((user) => (
              <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4 font-bold">
                  {user.name || "미입력"}
                  {user.role === "admin" && (
                    <span className="ml-2 text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold">
                      ADMIN
                    </span>
                  )}
                </td>
                <td className="p-4">{user.studentId || "-"}</td>
                <td className="p-4">{user.phone || "-"}</td>
                <td className="p-4 text-gray-500 text-sm">{user.email}</td>
                <td className="p-4">
                  {user.isApproved ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                      <CheckCircle className="w-3 h-3" /> 승인됨
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">
                      <ShieldAlert className="w-3 h-3" /> 대기중
                    </span>
                  )}
                </td>
                <td className="p-4 text-right space-x-2">
                  {user.role !== "admin" && (
                    <>
                      {!user.isApproved && (
                        <button
                          onClick={() => approveUser({ userId: user._id })}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors"
                        >
                          승인하기
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(user._id, user.name)}
                        className="border border-gray-300 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-gray-400 px-3 py-1.5 rounded text-xs font-bold transition-colors inline-flex items-center gap-1"
                        title="회원 삭제"
                      >
                        <Trash2 className="w-3 h-3" /> 삭제
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="p-10 text-center text-gray-400">
                  가입된 유저가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
