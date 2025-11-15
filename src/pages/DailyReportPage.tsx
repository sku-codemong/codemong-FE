import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar as CalendarIcon, Clock, List, BookOpen } from 'lucide-react';
import { api, DailyReport, Session, Subject } from '../services/api';
import { Toaster, toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Calendar } from '../components/ui/calendar';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

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

  // 총 학습 시간을 초 단위로 계산 (세션 데이터에서 직접 계산)
  const totalSeconds = sessions
    .filter(s => s.status === 'completed' || s.status === 'stopped')
    .reduce((sum, s) => {
      let durationSec = 0;
      if (s.endTime) {
        const start = new Date(s.startTime).getTime();
        const end = new Date(s.endTime).getTime();
        durationSec = Math.floor((end - start) / 1000);
      } else {
        durationSec = (s.duration || 0) * 60;
      }
      return sum + durationSec;
    }, 0);
  const totalHours = Math.floor(totalSeconds / 3600);
  const totalMins = Math.floor((totalSeconds % 3600) / 60);
  const totalSecs = totalSeconds % 60;

  // 각 과목별 초 단위 계산
  const subjectSecondsMap = new Map<string, number>();
  sessions
    .filter(s => s.status === 'completed' || s.status === 'stopped')
    .forEach(s => {
      let durationSec = 0;
      if (s.endTime) {
        const start = new Date(s.startTime).getTime();
        const end = new Date(s.endTime).getTime();
        durationSec = Math.floor((end - start) / 1000);
      } else {
        durationSec = (s.duration || 0) * 60;
      }
      const current = subjectSecondsMap.get(s.subjectId) || 0;
      subjectSecondsMap.set(s.subjectId, current + durationSec);
    });

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
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="cursor-pointer hover:opacity-70 transition-opacity">
                      <CalendarIcon className="w-[32px] h-[32px] text-[#9810fa]" strokeWidth={2.67} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white border border-gray-200 shadow-lg" align="end">
                    <Calendar
                      mode="single"
                      selected={new Date(selectedDate)}
                      onSelect={(date) => {
                        if (date) {
                          setSelectedDate(format(date, 'yyyy-MM-dd'));
                        }
                      }}
                      locale={ko}
                      className="rounded-md border-0"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-[16px]">
                <div className="bg-purple-50 rounded-[14px] p-[16px]">
                  <div className="flex items-center gap-[8px] mb-[8px]">
                    <Clock className="w-[20px] h-[20px] text-[#9810fa]" strokeWidth={1.67} />
                    <span className="text-[16px] text-[#4a5565]">총 학습 시간</span>
                  </div>
                  <p className="text-[16px] text-neutral-950">
                    {totalHours > 0 ? `${totalHours}시간 ` : ''}{totalMins}분 {totalSecs}초
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
              
              {sessions.filter(s => s.status === 'completed' || s.status === 'stopped').length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  이 날짜에는 학습 기록이 없습니다
                </p>
              ) : (
                <div className="flex flex-col gap-[16px]">
                  {sessions
                    .filter(s => (s.status === 'completed' || s.status === 'stopped') && s.endTime)
                    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                    .map((session, index) => {
                      // 과목 정보 찾기
                      const subjectInfo = subjects.find(s => String(s.id) === String(session.subjectId));
                      const subjectColor = subjectInfo?.color || '#3B82F6';
                      const subjectName = subjectInfo?.name || '알 수 없는 과목';
                      
                      // 시작/종료 시간
                      const start = new Date(session.startTime);
                      const end = session.endTime ? new Date(session.endTime) : null;
                      const startTime = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
                      const endTime = end ? `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}` : '진행 중';
                      
                      // 세션 시간 계산 (초 단위)
                      let durationSec = 0;
                      if (end) {
                        durationSec = Math.floor((end.getTime() - start.getTime()) / 1000);
                      } else {
                        durationSec = (session.duration || 0) * 60;
                      }
                      
                      const hours = Math.floor(durationSec / 3600);
                      const mins = Math.floor((durationSec % 3600) / 60);
                      const secs = durationSec % 60;
                      const minutes = Math.floor(durationSec / 60);
                      
                      return (
                        <div key={session.id || index} className="border border-gray-200 rounded-[14px] p-[17px]">
                          <div className="flex items-start gap-[16px]">
                            {/* Color Icon */}
                            <div
                              className="w-[48px] h-[48px] rounded-full flex-shrink-0"
                              style={{ backgroundColor: subjectColor }}
                            />
                            
                            {/* Content */}
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-[8px]">
                                <div>
                                  <h3 className="text-[18px] text-neutral-950 mb-[3px]">
                                    {subjectName}
                                  </h3>
                                  <p className="text-[16px] text-[#6a7282]">
                                    {startTime} - {endTime}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[16px] text-neutral-950">
                                    {hours > 0 ? `${hours}시간 ` : ''}{mins}분 {secs}초
                                  </p>
                                </div>
                              </div>
                              
                              {/* Note */}
                              <div className="bg-gray-50 rounded-[10px] p-[12px]">
                                <p className="text-[16px] text-[#4a5565]">
                                  📝 학습 내용 기록
                                </p>
                                {session.note ? (
                                  <p className="text-[14px] text-neutral-950 mt-[8px] whitespace-pre-wrap">
                                    {session.note}
                                  </p>
                                ) : (
                                  <p className="text-[14px] text-[#9ca3af] mt-[8px]">
                                    기록된 내용이 없습니다
                                  </p>
                                )}
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
