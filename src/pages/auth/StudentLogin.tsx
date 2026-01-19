import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export default function StudentLogin() {
  const navigate = useNavigate();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [loading, setLoading] = useState(false);

  // 입력값 상태
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLoginMode) {
        // =================================================
        // 🔹 1. 로그인 모드
        // =================================================
        const { data: authData, error: authError } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        // 🚨 에러 발생 시 catch 블록으로 이동
        if (authError) throw authError;

        if (authData.user) {
          // 승인 여부 확인
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("is_approved")
            .eq("id", authData.user.id)
            .single();

          if (profileError) {
            await supabase.auth.signOut();
            alert("회원 정보를 불러올 수 없습니다. 관리자에게 문의하세요.");
            return;
          }

          // ⛔ 승인 안 된 경우 -> 쫓아내기
          if (!profile.is_approved) {
            await supabase.auth.signOut();
            alert(
              "관리자 승인 대기 중인 계정입니다.\n기술팀에 문의하거나 승인을 기다려주세요."
            );
            return;
          }

          alert("로그인 되었습니다.");
          navigate("/");
        }
      } else {
        // =================================================
        // 🔹 2. 회원가입 모드
        // =================================================

        // A. 인증 계정 생성 (Auth)
        const { data: signUpData, error: signUpError } =
          await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                student_id: studentId,
                name: name,
                phone: phone,
              },
            },
          });

        if (signUpError) throw signUpError;

        // B. profiles 테이블에 직접 정보 저장
        if (signUpData.user) {
          const { error: profileError } = await supabase
            .from("profiles")
            .insert({
              id: signUpData.user.id,
              email: email,
              name: name,
              student_id: studentId,
              phone: phone,
              is_approved: false,
              is_admin: false,
            });

          if (profileError) {
            console.error("프로필 저장 실패:", profileError);
          }
        }

        alert(
          "계정 신청이 완료되었습니다!\n관리자 승인 후 로그인이 가능합니다."
        );
        setIsLoginMode(true); // 로그인 화면으로 전환
      }
    } catch (error) {
      // ✅ [수정됨] 에러 메시지 한글화 처리
      if (error instanceof Error) {
        if (error.message.includes("Invalid login credentials")) {
          alert("아이디(이메일) 또는 비밀번호가 일치하지 않습니다.");
        } else if (error.message.includes("User already registered")) {
          alert("이미 가입된 이메일입니다.");
        } else if (error.message.includes("Email not confirmed")) {
          alert("이메일 인증이 완료되지 않았습니다.");
        } else {
          // 그 외 에러는 그대로 출력 (디버깅용)
          alert("오류 발생: " + error.message);
        }
      } else {
        alert("알 수 없는 오류가 발생했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {isLoginMode ? "SSFILM 로그인" : "학생 계정 신청"}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {isLoginMode
            ? "승인된 계정만 로그인 가능합니다."
            : "가입 후 관리자 승인이 필요합니다."}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleAuth}>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                이메일
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                비밀번호
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black sm:text-sm"
              />
            </div>

            {!isLoginMode && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    이름
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    연락처
                  </label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="010-0000-0000"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    학번
                  </label>
                  <input
                    type="text"
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black sm:text-sm"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50"
            >
              {loading
                ? "처리 중..."
                : isLoginMode
                ? "로그인"
                : "계정 신청하기"}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  {isLoginMode
                    ? "계정이 없으신가요?"
                    : "이미 계정이 있으신가요?"}
                </span>
              </div>
            </div>
            <div className="mt-6">
              <button
                onClick={() => setIsLoginMode(!isLoginMode)}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                {isLoginMode ? "회원가입 신청" : "로그인 하기"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
