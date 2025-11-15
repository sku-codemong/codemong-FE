import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, List, BookOpen } from 'lucide-react';
import { api, DailyReport, Session, Subject } from '../services/api';
import { Toaster, toast } from "sonner";

export function DailyReportPage() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [report, setReport] = useState<DailyReport | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReport();
  }, [selectedDate]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const [reportData, sessionsData, subjectsData] = await Promise.all([
        api.getDailyReport(selectedDate),
        api.getSessions({ date: selectedDate }).catch(() => [] as Session[]),
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
      setSessions(sessionsData);
      setSubjects(subjectsData);
      
      // 디버깅: 세션 데이터 확인
      console.log('Sessions data:', sessionsData);
      console.log('Report data:', reportWithColors);
    } catch (error) {
      toast.error('리포트를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${date.toLocaleDateString('ko-KR', { weekday: 'long' })})`;
  };

  const sessionCount = report?.subjects.reduce((sum, s) => sum + (s.minutes > 0 ? 1 : 0), 0) || 0;
  const subjectCount = report?.subjects.length || 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-[848px] mx-auto">
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
                  <h1 className="text-[24px] text-neutral-950 mb-[8px]">일일 학습 리포트</h1>
                  <p className="text-[16px] text-[#4a5565]">{formatDate(selectedDate)}</p>
                </div>
                <Calendar className="w-[32px] h-[32px] text-[#9810fa]" strokeWidth={2.67} />
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-[16px]">
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
                    <List className="w-[20px] h-[20px] text-[#155dfc]" strokeWidth={1.67} />
                    <span className="text-[16px] text-[#4a5565]">학습 세션</span>
                  </div>
                  <p className="text-[16px] text-neutral-950">{sessionCount}개</p>
                </div>

                <div className="bg-emerald-50 rounded-[14px] p-[16px]">
                  <div className="flex items-center gap-[8px] mb-[8px]">
                    <BookOpen className="w-[20px] h-[20px] text-[#009966]" strokeWidth={1.67} />
                    <span className="text-[16px] text-[#4a5565]">과목 수</span>
                  </div>
                  <p className="text-[16px] text-neutral-950">{subjectCount}과목</p>
                </div>
              </div>
            </div>

            {/* Sessions Card */}
            <div className="bg-white rounded-[16px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] p-[32px]">
              <h2 className="text-[20px] text-neutral-950 mb-[24px]">학습 세션 기록</h2>
              
              {report.subjects.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  이 날짜에는 학습 기록이 없습니다
                </p>
              ) : (
                <div className="flex flex-col gap-[16px]">
                  {report.subjects.map((subject, index) => {
                    if (subject.minutes === 0) return null;
                    
                    // 리포트 응답에 시작/종료 시간이 있으면 사용, 없으면 세션 데이터에서 찾기
                    let startTime = '';
                    let endTime = '';
                    
                    if (subject.startTime && subject.endTime) {
                      // 리포트 응답에 시간 정보가 있으면 사용
                      const start = new Date(subject.startTime);
                      const end = new Date(subject.endTime);
                      startTime = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
                      endTime = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
                    } else {
                      // 리포트 응답에 시간 정보가 없으면 세션 데이터에서 찾기
                      // subjectId를 문자열로 비교 (타입 불일치 방지)
                      const subjectSessions = sessions.filter(s => {
                        const matchesSubject = String(s.subjectId) === String(subject.subjectId);
                        const isCompleted = s.status === 'completed' || s.status === 'stopped';
                        return matchesSubject && isCompleted && s.endTime; // endTime이 있는 세션만
                      });
                      
                      if (subjectSessions.length > 0) {
                        // 시작 시간 기준으로 정렬
                        const sortedSessions = [...subjectSessions].sort((a, b) => 
                          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
                        );
                        const firstSession = sortedSessions[0];
                        const lastSession = sortedSessions[sortedSessions.length - 1];
                        
                        // 로컬 시간으로 변환
                        const start = new Date(firstSession.startTime);
                        const end = lastSession.endTime ? new Date(lastSession.endTime) : new Date(start.getTime() + subject.minutes * 60 * 1000);
                        
                        // 로컬 시간으로 포맷팅 (한국 시간대 고려)
                        startTime = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
                        endTime = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
                      } else {
                        // 세션 데이터도 없으면 기본값 사용
                        startTime = '09:00';
                        const endHours = Math.floor(subject.minutes / 60);
                        const endMins = subject.minutes % 60;
                        endTime = `${String(9 + endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
                      }
                    }
                    
                    const hours = Math.floor(subject.minutes / 60);
                    const mins = subject.minutes % 60;
                    
                    return (
                      <div key={index} className="border border-gray-200 rounded-[14px] p-[17px]">
                        <div className="flex items-start gap-[16px]">
                          {/* Color Icon */}
                          <div
                            className="w-[48px] h-[48px] rounded-full flex-shrink-0"
                            style={{ backgroundColor: subject.color }}
                          />
                          
                          {/* Content */}
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-[8px]">
                              <div>
                                <h3 className="text-[18px] text-neutral-950 mb-[3px]">
                                  {subject.subjectName}
                                </h3>
                                <p className="text-[16px] text-[#6a7282]">
                                  {startTime} - {endTime}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-[16px] text-neutral-950">{subject.minutes}분</p>
                                <p className="text-[16px] text-[#6a7282]">{hours}시간 {mins}분</p>
                              </div>
                            </div>
                            
                            {/* Note */}
                            <div className="bg-gray-50 rounded-[10px] p-[12px]">
                              <p className="text-[16px] text-[#4a5565]">
                                📝 학습 내용 기록
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
