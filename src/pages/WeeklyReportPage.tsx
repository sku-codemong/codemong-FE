import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ArrowLeft, Calendar, Clock, TrendingUp, Award, CalendarDays } from 'lucide-react';
import { api, WeeklyReport, Subject } from '../services/api';

import { Toaster, toast } from "sonner";

export function WeeklyReportPage() {
  const navigate = useNavigate();
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReport();
  }, [weekStart]);

  function getMonday(date: Date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split('T')[0];
  }

  const loadReport = async () => {
    setLoading(true);
    try {
      const [reportData, subjectsData] = await Promise.all([
        api.getWeeklyReport(weekStart),
        api.getSubjects(false).catch(() => [] as Subject[])
      ]);
      
      // 과목 정보를 사용하여 리포트의 과목 색상 매핑
      const reportWithColors = {
        ...reportData,
        subjects: reportData.subjects.map(subject => {
          const subjectInfo = subjectsData.find(s => String(s.id) === subject.subjectId);
          return {
            ...subject,
            color: subjectInfo?.color || subject.color || '#3B82F6'
          };
        })
      };
      
      setReport(reportWithColors);
      setSubjects(subjectsData);
    } catch (error) {
      toast.error('리포트를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const formatWeekRange = () => {
    if (!report) return '';
    const start = new Date(report.weekStart);
    // weekEnd가 없으면 weekStart에서 6일 더한 날짜 사용
    const endDate = report.weekEnd ? new Date(report.weekEnd) : new Date(start);
    if (!report.weekEnd) {
      endDate.setDate(start.getDate() + 6);
    }
    return `${start.getFullYear()}년 ${start.getMonth() + 1}월 ${start.getDate()}일 - ${endDate.getMonth() + 1}월 ${endDate.getDate()}일`;
  };

  // 주간 데이터가 없으면 7일치 빈 데이터 생성
  const dailyChartData = report?.dailyBreakdown && report.dailyBreakdown.length > 0
    ? report.dailyBreakdown.map(day => ({
        date: new Date(day.date).toLocaleDateString('ko-KR', { weekday: 'short' }),
        minutes: day.minutes || 0
      }))
    : (() => {
        const start = new Date(report?.weekStart || weekStart);
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        return Array.from({ length: 7 }, (_, i) => {
          const date = new Date(start);
          date.setDate(start.getDate() + i);
          return {
            date: days[date.getDay()],
            minutes: 0
          };
        });
      })();

  const pieChartData = report?.subjects.map(s => ({
    name: s.subjectName,
    value: s.minutes,
    color: s.color
  })) || [];

  const avgDaily = report ? Math.round(report.totalMinutes / 7) : 0;
  const totalTargetMinutes = report?.subjects.reduce((sum, s) => sum + s.targetMinutes, 0) || 1;
  const achievementRate = report ? Math.round((report.totalMinutes / totalTargetMinutes) * 100) : 0;
  const studyDays = report?.dailyBreakdown.filter(d => d.minutes > 0).length || 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-[1104px] mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-3 h-[36px] px-3 rounded-[8px] hover:bg-gray-100 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-[14px] text-neutral-950">돌아가기</span>
        </button>

        {loading ? (
          <div className="text-center py-8">로딩 중...</div>
        ) : !report ? (
          <div className="text-center py-8">리포트를 불러올 수 없습니다</div>
        ) : (
          <>
            {/* Header Card */}
            <div className="bg-white rounded-[16px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] p-[32px] mb-[24px]">
              <div className="flex items-center justify-between mb-[24px]">
                <div>
                  <h1 className="text-[24px] text-neutral-950 mb-[8px]">주간 학습 리포트</h1>
                  <p className="text-[16px] text-[#4a5565]">{formatWeekRange()}</p>
                </div>
                <Calendar className="w-[32px] h-[32px] text-[#9810fa]" strokeWidth={2.67} />
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-[16px]">
                <div className="bg-purple-50 rounded-[14px] p-[16px]">
                  <div className="flex items-center gap-[8px] mb-[8px]">
                    <Clock className="w-[20px] h-[20px] text-[#9810fa]" strokeWidth={1.67} />
                    <span className="text-[16px] text-[#4a5565]">총 학습 시간</span>
                  </div>
                  <p className="text-[16px] text-neutral-950">
                    {Math.floor(report.totalMinutes / 60)}시간 {report.totalMinutes % 60}분
                  </p>
                </div>

                <div className="bg-blue-50 rounded-[14px] p-[16px]">
                  <div className="flex items-center gap-[8px] mb-[8px]">
                    <TrendingUp className="w-[20px] h-[20px] text-[#155dfc]" strokeWidth={1.67} />
                    <span className="text-[16px] text-[#4a5565]">일일 평균</span>
                  </div>
                  <p className="text-[16px] text-neutral-950">
                    {Math.floor(avgDaily / 60)}시간 {avgDaily % 60}분
                  </p>
                </div>

                <div className="bg-emerald-50 rounded-[14px] p-[16px]">
                  <div className="flex items-center gap-[8px] mb-[8px]">
                    <Award className="w-[20px] h-[20px] text-[#009966]" strokeWidth={1.67} />
                    <span className="text-[16px] text-[#4a5565]">목표 달성률</span>
                  </div>
                  <p className="text-[16px] text-neutral-950">{achievementRate}%</p>
                </div>

                <div className="bg-amber-50 rounded-[14px] p-[16px]">
                  <div className="flex items-center gap-[8px] mb-[8px]">
                    <CalendarDays className="w-[20px] h-[20px] text-[#e17100]" strokeWidth={1.67} />
                    <span className="text-[16px] text-[#4a5565]">학습일</span>
                  </div>
                  <p className="text-[16px] text-neutral-950">{studyDays}일 / 7일</p>
                </div>
              </div>
            </div>

            {/* Daily Chart */}
            <div className="bg-white rounded-[16px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] p-[32px] mb-[24px]">
              <h2 className="text-[20px] text-neutral-950 mb-[24px]">일별 학습 시간</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="date" stroke="#6A7282" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#6A7282" style={{ fontSize: '12px' }} />
                  <Tooltip />
                  <Bar dataKey="minutes" fill="#9810fa" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Subject Distribution */}
            <div className="bg-white rounded-[16px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] p-[32px]">
              <h2 className="text-[20px] text-neutral-950 mb-[24px]">과목별 학습 시간 분포</h2>
              
              <div className="grid grid-cols-2 gap-[32px]">
                {/* Pie Chart */}
                <div className="flex items-center justify-center">
                  {pieChartData.length > 0 && (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Subject List */}
                <div className="flex flex-col gap-[16px]">
                  {report.subjects.map((subject, index) => {
                    const hours = Math.floor(subject.minutes / 60);
                    const mins = subject.minutes % 60;
                    
                    return (
                      <div key={index} className="bg-gray-50 rounded-[14px] p-[16px] flex items-center justify-between">
                        <div className="flex items-center gap-[12px]">
                          <div
                            className="w-[16px] h-[16px] rounded-full"
                            style={{ backgroundColor: subject.color }}
                          />
                          <span className="text-[16px] text-neutral-950">{subject.subjectName}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-[16px] text-neutral-950">{subject.minutes}분</p>
                          <p className="text-[16px] text-[#6a7282]">{hours}시간 {mins}분</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
