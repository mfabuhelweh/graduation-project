import * as React from 'react';
import { useState, useEffect } from 'react';
import { 
  PlusCircle, 
  AlertCircle, 
  X, 
  ShieldCheck,
  UserPlus,
  Search,
  CheckCircle2
} from 'lucide-react';
import { db, handleFirestoreError } from '../firebase';
import { collection, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { cn } from '../lib/utils';

interface CandidateManagementProps {
  setToast: (t: any) => void;
  language: 'ar' | 'en';
}

export const CandidateManagement = ({ setToast, language }: CandidateManagementProps) => {
  const [elections, setElections] = useState<any[]>([]);
  const [selectedElectionId, setSelectedElectionId] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Candidate form state
  const [candidateName, setCandidateName] = useState('');
  const [candidateType, setCandidateType] = useState<'عام' | 'كوتا' | 'شركس/شيشان' | 'شباب'>('عام');
  const [candidateGender, setCandidateGender] = useState<'male' | 'female'>('male');
  const [candidateAge, setCandidateAge] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchElections = async () => {
      try {
        const snap = await getDocs(collection(db, 'elections'));
        setElections(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      } catch (error) {
        handleFirestoreError(error, 'GET', 'elections');
      }
    };
    fetchElections();
  }, []);

  const handleAddCandidate = async () => {
    if (!selectedElectionId) {
      alert(language === 'ar' ? 'يرجى اختيار الانتخابات أولاً' : 'Please select an election first');
      return;
    }
    if (!candidateName.trim()) {
      alert(language === 'ar' ? 'يرجى إدخال اسم المرشح' : 'Please enter candidate name');
      return;
    }

    setIsSubmitting(true);
    try {
      const electionRef = doc(db, 'elections', selectedElectionId);
      const newCandidate = {
        id: Math.random().toString(36).substr(2, 9),
        name: candidateName,
        type: candidateType,
        gender: candidateGender,
        age: candidateAge,
        votes: 0
      };

      await updateDoc(electionRef, {
        candidatesList: arrayUnion(newCandidate)
      });

      setToast({ 
        message: language === 'ar' ? 'تم إضافة المرشح بنجاح' : 'Candidate added successfully', 
        type: 'success' 
      });
      
      // Reset form
      setCandidateName('');
      setCandidateType('عام');
      setIsSubmitting(false);
      
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      handleFirestoreError(error, 'UPDATE', 'elections');
      setIsSubmitting(false);
    }
  };

  const selectedElection = elections.find(e => e.id === selectedElectionId);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-right">
        <h2 className="text-2xl font-bold text-slate-900">إدارة وإضافة المرشحين</h2>
        <p className="text-sm text-slate-500">إضافة مرشحين جدد للدوائر المحلية أو القوائم الحزبية وتصنيفهم</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            {/* Election Selection */}
            <div className="space-y-4">
              <label className="block text-sm font-bold text-slate-700 text-right">اختر الانتخابات / القائمة</label>
              <select 
                value={selectedElectionId}
                onChange={(e) => setSelectedElectionId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-right focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              >
                <option value="">-- اختر من القائمة --</option>
                {elections.map(e => (
                  <option key={e.id} value={e.id}>{e.title} ({e.type})</option>
                ))}
              </select>
            </div>

            {selectedElectionId && (
              <div className="space-y-6 pt-6 border-t border-slate-100 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700 text-right">اسم المرشح الكامل</label>
                    <input 
                      type="text" 
                      value={candidateName}
                      onChange={(e) => setCandidateName(e.target.value)}
                      placeholder="أدخل الاسم الرباعي..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-right focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700 text-right">تصنيف المقعد / الكوتا</label>
                    <select 
                      value={candidateType}
                      onChange={(e) => setCandidateType(e.target.value as any)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-right focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    >
                      <option value="عام">تنافس (عام)</option>
                      <option value="كوتا">كوتا نسائية</option>
                      <option value="شركس/شيشان">شركس / شيشان</option>
                      <option value="شباب">مقعد شباب</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700 text-right">الجنس</label>
                    <div className="flex gap-4">
                      <button 
                        onClick={() => setCandidateGender('male')}
                        className={cn(
                          "flex-1 py-3 rounded-xl font-bold border transition-all",
                          candidateGender === 'male' ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-white border-slate-200 text-slate-400"
                        )}
                      >
                        ذكر
                      </button>
                      <button 
                        onClick={() => setCandidateGender('female')}
                        className={cn(
                          "flex-1 py-3 rounded-xl font-bold border transition-all",
                          candidateGender === 'female' ? "bg-rose-50 border-rose-200 text-rose-600" : "bg-white border-slate-200 text-slate-400"
                        )}
                      >
                        أنثى
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700 text-right">العمر</label>
                    <input 
                      type="number" 
                      value={candidateAge}
                      onChange={(e) => setCandidateAge(parseInt(e.target.value))}
                      min={25}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-right focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleAddCandidate}
                  disabled={isSubmitting}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
                  إضافة المرشح للقاعدة
                </button>
              </div>
            )}
          </div>

          {selectedElection && selectedElection.candidatesList && (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="text-right">
                <h4 className="text-lg font-bold text-slate-900">المرشحون الحاليون في {selectedElection.title}</h4>
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-100">
                <table className="w-full text-right">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">الاسم</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">التصنيف</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">الجنس</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">العمر</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {selectedElection.candidatesList.map((c: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold text-slate-900">{c.name}</td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2 py-1 rounded-lg text-[10px] font-bold",
                            c.type === 'كوتا' ? "bg-rose-50 text-rose-600" :
                            c.type === 'شباب' ? "bg-amber-50 text-amber-600" :
                            c.type === 'شركس/شيشان' ? "bg-purple-50 text-purple-600" :
                            "bg-blue-50 text-blue-600"
                          )}>
                            {c.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">{c.gender === 'male' ? 'ذكر' : 'أنثى'}</td>
                        <td className="px-6 py-4 text-sm text-slate-500">{c.age}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h4 className="text-lg font-bold text-slate-900 text-right mb-4">تعليمات الترشح</h4>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <div className="flex items-center gap-3 justify-end mb-2">
                  <span className="text-sm font-bold text-blue-900">الكوتا النسائية</span>
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-xs text-blue-700 text-right leading-relaxed">
                  يخصص مقعد واحد للمرأة في كل دائرة انتخابية محلية، بالإضافة إلى المقاعد التنافسية.
                </p>
              </div>
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <div className="flex items-center gap-3 justify-end mb-2">
                  <span className="text-sm font-bold text-amber-900">مقعد الشباب</span>
                  <ShieldCheck className="w-5 h-5 text-amber-600" />
                </div>
                <p className="text-xs text-amber-700 text-right leading-relaxed">
                  يجب أن تتضمن القوائم الحزبية شباباً دون سن الـ 35 في المراكز الأولى لضمان التمثيل.
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
                <div className={cn("flex items-center gap-3 justify-end mb-2")}>
                  <span className="text-sm font-bold text-purple-900">الشركس والشيشان</span>
                  <ShieldCheck className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-xs text-purple-700 text-right leading-relaxed">
                  مقاعد مخصصة للمكون الشركسي والشيشاني في دوائر محددة (عمان، الزرقاء).
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Loader2 = ({ className }: { className?: string }) => (
  <svg className={cn("animate-spin", className)} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);
