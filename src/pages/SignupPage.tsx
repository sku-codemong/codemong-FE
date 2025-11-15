import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import { api } from '../services/api';
import { Toaster, toast } from "sonner";

interface SignupPageProps {
  onLogin: (user: { id: string; name: string; email: string }) => void;
}

export function SignupPage({ onLogin }: SignupPageProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !email || !password || !confirmPassword) {
      toast.error('모든 항목을 입력해주세요');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('비밀번호가 일치하지 않습니다');
      return;
    }

    if (password.length < 6) {
      toast.error('비밀번호는 최소 6자 이상이어야 합니다');
      return;
    }

    setLoading(true);
    
    try {
      const user = await api.register({ name, email, password });
      toast.success('회원가입 성공! 로그인 페이지로 이동합니다.');
      // 회원가입 후 로그인 페이지로 이동
      setTimeout(() => {
        navigate('/login');
      }, 1000);
    } catch (error) {
      toast.error('회원가입에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[14px] border border-[rgba(0,0,0,0.1)] w-full max-w-[448px]">
        <div className="px-[33px] py-[33px] flex flex-col gap-[40px]">
          {/* Logo and Header */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative rounded-[16px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] size-[40px] bg-[#9810fa] flex items-center justify-center overflow-hidden">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-[#9810fa] text-[16px]">Study Timer</h1>
            <p className="text-[#6a7282] text-[14px] text-center">새로운 계정을 만들어보세요</p>
          </div>

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="name" className="text-[14px] text-neutral-950">
                이름
              </label>
              <input
                id="name"
                type="text"
                placeholder="홍길동"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-[#f3f3f5] rounded-[8px] px-3 py-2 text-[16px] text-neutral-950 placeholder:text-[#717182] border-0 focus:outline-none focus:ring-2 focus:ring-[#9810fa]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="email" className="text-[14px] text-neutral-950">
                이메일
              </label>
              <input
                id="email"
                type="email"
                placeholder="student@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[#f3f3f5] rounded-[8px] px-3 py-2 text-[16px] text-neutral-950 placeholder:text-[#717182] border-0 focus:outline-none focus:ring-2 focus:ring-[#9810fa]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="password" className="text-[14px] text-neutral-950">
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-[#f3f3f5] rounded-[8px] px-3 py-2 text-[16px] text-neutral-950 placeholder:text-[#717182] border-0 focus:outline-none focus:ring-2 focus:ring-[#9810fa]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="confirmPassword" className="text-[14px] text-neutral-950">
                비밀번호 확인
              </label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-[#f3f3f5] rounded-[8px] px-3 py-2 text-[16px] text-neutral-950 placeholder:text-[#717182] border-0 focus:outline-none focus:ring-2 focus:ring-[#9810fa]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-[#9810fa] hover:bg-[#8610da] text-white rounded-[8px] h-[36px] text-[14px] disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
            >
              {loading ? '가입 중...' : '회원가입'}
            </button>
          </form>

          {/* Login Link */}
          <p className="text-center text-[14px] text-[#6a7282]">
            이미 계정이 있으신가요?{' '}
            <Link to="/login" className="text-[#9810fa] hover:underline">
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
