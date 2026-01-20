import { useState } from "react";
import { useNavigate } from "react-router-dom";
// import { supabase } from "../../lib/supabase"; // 삭제 또는 주석

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

    // [Convex 마이그레이션 임시 조치] 변수 사용 처리 (빌드 에러 방지)
    console.log("제출 데이터:", { email, password, studentId, name, phone });

    try {
      if (isLoginMode) {
        // =================================================
        // 🔹 1. 로그인 모드 (Supabase 로직 주석 처리)
        // =================================================
        /*
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (authError) throw authError;
        // ... (프로필 확인 로직 생략) ...
        */

        alert("Convex 마이그레이션 진행 중입니다. 임시로 로그인 처리됩니다.");
        navigate("/");
      } else {
        // =================================================
        // 🔹 2. 회원가입 모드 (Supabase 로직 주석 처리)
        // =================================================
        /*
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ ... });
        // ... (프로필 저장 로직 생략) ...
        */

        alert(
          "Convex 마이그레이션 진행 중입니다. 회원가입 기능이 잠시 중단되었습니다."
        );
        setIsLoginMode(true);
      }
    } catch (error) {
      console.error(error);
      alert("오류 발생");
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
          (Convex DB 마이그레이션 작업 중)
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleAuth}>
            {/* ... 기존 UI 코드 유지 ... */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                이메일
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm"
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
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm"
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
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm"
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
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm"
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
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm"
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
