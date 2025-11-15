import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Calendar, Clock, TrendingUp, Edit } from 'lucide-react';
import { api, Subject, User } from '../services/api';
import { toast } from 'sonner';

export function ProfilePage() {
  const { userId } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalMinutes: 0,
    thisWeekMinutes: 0,
    avgSessionLength: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const profile = await api.getMe();
      setUser(profile);
    } catch (error) {
      toast.error('프로필을 불러오는데 실패했습니다');
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      // 이번 주 월요일부터 오늘까지 각 날짜별로 세션 조회
      const weekStartISO = getWeekStart();
      const weekStartDateStr = weekStartISO.split('T')[0]; // YYYY-MM-DD 형식
      
      const today = new Date();
      const todayDateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD 형식
      
      // 이번 주의 각 날짜별로 세션 조회 (월요일부터 오늘까지 포함)
      const weekSessionPromises: Promise<Session[]>[] = [];
      
      // 날짜 문자열을 직접 파싱하여 날짜 숫자로 변환
      const [startYear, startMonth, startDay] = weekStartDateStr.split('-').map(Number);
      const [endYear, endMonth, endDay] = todayDateStr.split('-').map(Number);
      
      let currentDate = new Date(startYear, startMonth - 1, startDay);
      const endDate = new Date(endYear, endMonth - 1, endDay);
      
      // 오늘까지 포함하도록 <= 사용
      while (currentDate <= endDate) {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        weekSessionPromises.push(
          api.getSessions({ date: dateStr }).catch(() => [] as Session[])
        );
        // 다음 날로 이동
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      console.log('Fetching sessions from', weekStartDateStr, 'to', todayDateStr, '- Total days:', weekSessionPromises.length);
      
      const [subjectsData, ...weekSessionsArrays] = await Promise.all([
        api.getSubjects(false),
        ...weekSessionPromises
      ]);
      
      const allWeekSessions = weekSessionsArrays.flat();
      
      // 주간 세션 필터링: 이미 각 날짜별로 조회했으므로, 상태만 확인
      const weekSessions = allWeekSessions.filter(
        (session) => (session.status === 'completed' || session.status === 'stopped')
      );

      // 디버깅: 세션 데이터 확인
      console.log('All week sessions:', allWeekSessions);
      console.log('Filtered week sessions:', weekSessions);

      const subjectMap = new Map<string, number>();
      weekSessions.forEach((session) => {
        const subjectId = String(session.subjectId); // 타입 일치시키기
        const current = subjectMap.get(subjectId) || 0;
        subjectMap.set(subjectId, current + session.duration);
      });
      
      console.log('Subject map:', subjectMap);

      // 이번 주 목표: 현재는 오늘 분배받은 일일 목표만 저장되므로, 
      // 실제로는 "한 주 동안 분배받은 일일 목표의 합"을 표시해야 하지만
      // 현재 데이터 구조로는 오늘의 일일 목표를 그대로 표시
      // (한 주 동안 분배받은 목표를 합산하려면 백엔드에서 각 날짜별 분배 데이터를 저장해야 함)
      const chartData = subjectsData.map((subject) => {
        const subjectId = String(subject.id); // 타입 일치시키기
        const minutes = subjectMap.get(subjectId) || 0;
        console.log(`Subject ${subject.name} (${subjectId}): minutes=${minutes}`);
        return {
          name: subject.name,
          minutes,
          target: subject.targetDailyMin || 0, // 일일 목표를 그대로 표시 (주간이 아닌)
          color: subject.color,
        };
      });
      
      console.log('Chart data:', chartData);

      setWeeklyData(chartData);

      const completedSessions = allWeekSessions.filter((session) => session.status === 'completed' || session.status === 'stopped');
      const totalMinutes = completedSessions.reduce((sum, session) => sum + session.duration, 0);
      const thisWeekMinutes = weekSessions.reduce((sum, session) => sum + session.duration, 0);
      const avgSessionLength = completedSessions.length
        ? Math.round(totalMinutes / completedSessions.length)
        : 0;

      setStats({
        totalMinutes,
        thisWeekMinutes,
        avgSessionLength,
      });
    } catch (error) {
      toast.error('학습 데이터를 불러오는데 실패했습니다');
      setWeeklyData([]);
      setStats({ totalMinutes: 0, thisWeekMinutes: 0, avgSessionLength: 0 });
    } finally {
      setLoading(false);
    }
  };

  const getWeekStart = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-[1120px] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-[16px] text-neutral-950">프로필</h1>
          {user && (
            <Link to={`/profile/edit/${user.id}`}>
              <button className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[8px] px-4 h-[36px] text-[14px] text-neutral-950 hover:bg-gray-50 transition-colors flex items-center gap-2">
                <Edit className="w-4 h-4" />
                프로필 수정
              </button>
            </Link>
          )}
        </div>

        {user && (
          <div className="bg-white rounded-[14px] border border-[rgba(0,0,0,0.1)] p-6 mb-8">
            <h2 className="text-[16px] text-neutral-950 mb-4">기본 정보</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <span className="text-[14px] text-[#6a7282] w-20">아이디</span>
                <span className="text-[14px] text-neutral-950">{user.email}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[14px] text-[#6a7282] w-20">닉네임</span>
                <span className="text-[14px] text-neutral-950">{user.nickname || '닉네임 미설정'}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[14px] text-[#6a7282] w-20">학년</span>
                <span className="text-[14px] text-neutral-950">{user.grade ? `${user.grade}학년` : '학년 미설정'}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[14px] text-[#6a7282] w-20">성별</span>
                <span className="text-[14px] text-neutral-950">
                  {user.gender === 'male'
                    ? '남자'
                    : user.gender === 'female'
                      ? '여자'
                      : user.gender === 'Male'
                        ? '남자'
                        : user.gender === 'Female'
                          ? '여자'
                          : '성별 미설정'}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-purple-100 rounded-[14px] border border-[rgba(0,0,0,0.1)] p-6">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-purple-100 rounded-[10px] flex items-center justify-center">
                <Clock className="w-5 h-5 text-[#9810fa]" />
              </div>
              <span className="text-[16px] text-[#4a5565]">총 학습 시간</span>
            </div>
            <p className="text-[30px] text-neutral-950">
              {Math.floor(stats.totalMinutes / 60)}h {stats.totalMinutes % 60}m
            </p>
          </div>

          <div className="bg-blue-100 rounded-[14px] border border-[rgba(0,0,0,0.1)] p-6">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-blue-100 rounded-[10px] flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[#155DFC]" />
              </div>
              <span className="text-[16px] text-[#4a5565]">이번 주 학습</span>
            </div>
            <p className="text-[30px] text-neutral-950">
              {Math.floor(stats.thisWeekMinutes / 60)}h {stats.thisWeekMinutes % 60}m
            </p>
          </div>

          <div className="bg-green-100 rounded-[14px] border border-[rgba(0,0,0,0.1)] p-6">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-green-100 rounded-[10px] flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#00A63E]" />
              </div>
              <span className="text-[16px] text-[#4a5565]">평균 세션</span>
            </div>
            <p className="text-[30px] text-neutral-950">{stats.avgSessionLength}분</p>
          </div>
        </div>

        <div className="bg-white rounded-[14px] border border-[rgba(0,0,0,0.1)] p-6 mb-8">
          <h2 className="text-[16px] text-neutral-950 mb-6">이번 주 과목별 학습 시간</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#CCCCCC" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#666666' }} />
              <YAxis tick={{ fontSize: 12, fill: '#666666' }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '16px' }} iconType="square" />
              <Bar dataKey="minutes" fill="#8B5CF6" name="학습 시간 (분)" />
              <Bar dataKey="target" fill="#D1D5DB" name="목표 (분)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-[14px] border border-[rgba(0,0,0,0.1)] p-6">
            <h2 className="text-[16px] text-neutral-950 mb-10">과목별 진행 상황</h2>
            <div className="space-y-4">
              {weeklyData.map((item, index) => {
                const target = item.target || 1;
                const percentage = target > 0 ? (item.minutes / target) * 100 : 0;
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color ?? '#8B5CF6' }}
                        />
                        <span className="text-[14px] text-neutral-950">{item.name}</span>
                      </div>
                      <span className="text-[14px] text-[#4a5565]">
                        {item.minutes}/{item.target}분
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          backgroundColor: item.color ?? '#8B5CF6',
                          width: `${Math.min(percentage, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-[14px] border border-[rgba(0,0,0,0.1)] p-6">
            <h2 className="text-[16px] text-neutral-950 mb-10">리포트</h2>
            <div className="space-y-4">
              <Link to={`/reports/weekly/${userId ?? user?.id ?? ''}`}>
                <button className="w-full bg-white border border-[rgba(0,0,0,0.1)] rounded-[8px] h-[36px] text-[14px] text-neutral-950 hover:bg-gray-50 transition-colors">
                  📊 주간 리포트 보기
                </button>
              </Link>
              <Link to={`/reports/daily/${userId ?? user?.id ?? ''}`}>
                <button className="w-full bg-white border border-[rgba(0,0,0,0.1)] rounded-[8px] h-[36px] text-[14px] text-neutral-950 hover:bg-gray-50 transition-colors">
                  📅 일간 리포트 보기
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
