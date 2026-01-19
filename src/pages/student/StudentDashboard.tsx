import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { User, LogOut, Phone, Mail, GraduationCap } from "lucide-react";

interface UserProfile {
  name: string;
  student_id: string;
  phone: string;
  email: string;
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          navigate("/login");
          return;
        }

        // 프로필 정보만 가져오기
        const { data, error } = await supabase
          .from("profiles")
          .select("name, student_id, phone, email")
          .eq("id", user.id)
          .single();

        if (error) throw error;
        setProfile(data);
      } catch (error) {
        console.error("프로필 불러오기 실패:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
    alert("로그아웃 되었습니다.");
  };

  if (loading)
    return (
      <div className="p-10 text-center text-gray-400">
        정보를 불러오는 중...
      </div>
    );

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        {/* 상단 헤더 배경 */}
        <div className="bg-black h-32 relative">
          <div className="absolute -bottom-12 left-8">
            <div className="w-24 h-24 bg-white rounded-full p-1 flex items-center justify-center shadow-md">
              <div className="w-full h-full bg-gray-100 rounded-full flex items-center justify-center">
                <User className="w-10 h-10 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {/* 프로필 내용 */}
        <div className="pt-16 pb-8 px-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">
                {profile?.name}
              </h1>
              <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold tracking-wide">
                STUDENT
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              로그아웃
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                <GraduationCap className="w-5 h-5 text-gray-700" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase">
                  학번
                </p>
                <p className="font-semibold text-gray-900">
                  {profile?.student_id}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                <Phone className="w-5 h-5 text-gray-700" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase">
                  연락처
                </p>
                <p className="font-semibold text-gray-900">{profile?.phone}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                <Mail className="w-5 h-5 text-gray-700" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase">
                  이메일
                </p>
                <p className="font-semibold text-gray-900">{profile?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
