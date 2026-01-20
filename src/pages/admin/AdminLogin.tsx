import { useState } from "react";
import { useNavigate } from "react-router-dom";
// import { supabase } from "../../lib/supabase"; // 삭제 또는 주석

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // [Convex 마이그레이션 임시 조치]
      // Supabase 로그인 로직 제거됨
      console.log("입력된 정보(임시):", email, password); // 변수 미사용 에러 방지

      /* const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      */

      // 임시로 바로 로그인 성공 처리 (추후 Convex Auth로 교체 필요)
      navigate("/admin");
    } catch (error) {
      console.error(error);
      alert("로그인에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
          🔒 관리자 로그인 (Convex 마이그레이션 중)
        </h2>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              이메일
            </label>
            <input
              type="email"
              required
              className="w-full border rounded-md px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@ssfilm.ac.kr"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호
            </label>
            <input
              type="password"
              required
              className="w-full border rounded-md px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gray-900 text-white py-3 rounded-lg font-bold hover:bg-black transition-colors"
          >
            {isLoading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <a href="/" className="text-sm text-gray-500 hover:text-gray-900">
            ← 메인으로 돌아가기
          </a>
        </div>
      </div>
    </div>
  );
}
