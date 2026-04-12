/**
 * Jordan Election Laws & Logic (2024)
 * ملف منطق الحسابات والقوانين - نظيف 100%
 */

export const ELECTION_CONSTANTS = {
  TOTAL_SEATS: 138,
  GENERAL_SEATS: 41,
  LOCAL_SEATS: 97,
  GENERAL_THRESHOLD_PERCENT: 2.5,
  LOCAL_THRESHOLD_PERCENT: 7.0,
  TOTAL_DISTRICTS: 18,
  WOMEN_QUOTA_PER_DISTRICT: 1,
};

export interface Candidate {
  id: string;
  name: string;
  gender: 'male' | 'female';
  age: number;
  isMinority?: 'christian' | 'circassian' | 'chechen' | null;
  votes: number;
}

export interface ElectionList {
  id: string;
  name: string;
  type: 'general' | 'local';
  districtId?: string;
  candidates: Candidate[];
  totalVotes: number;
}

/**
 * التحقق من شروط القائمة العامة (المرأة والشباب)
 */
export const validateGeneralList = (candidates: Candidate[]): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!candidates || candidates.length === 0) {
    return { isValid: false, errors: ['القائمة فارغة'] };
  }

  // 1. امرأة ضمن أول 3 مترشحين
  const womanInTop3 = candidates.slice(0, 3).some(c => c.gender === 'female');
  if (!womanInTop3) {
    errors.push('يجب أن تضم القائمة امرأة ضمن أول 3 مترشحين');
  }

  // 2. شاب (تحت 35) ضمن أول 5 مترشحين
  const youthInTop5 = candidates.slice(0, 5).some(c => c.age < 35);
  if (!youthInTop5) {
    errors.push('يجب أن تضم القائمة شاباً (أقل من 35 سنة) ضمن أول 5 مترشحين');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * حساب العتبة (النسبة الحسم)
 */
export const applyThreshold = (lists: ElectionList[], totalVotes: number, thresholdPercent: number): ElectionList[] => {
  if (totalVotes <= 0) return [];
  const thresholdValue = totalVotes * (thresholdPercent / 100);
  return lists.filter(list => list.totalVotes >= thresholdValue);
};

/**
 * توزيع المقاعد (نظام الباقي الأقوى المطور)
 */
export const distributeSeats = (lists: ElectionList[], totalSeats: number): Map<string, number> => {
  const seatMap = new Map<string, number>();
  
  if (!lists || lists.length === 0 || totalSeats <= 0) return seatMap;

  const totalVotesOfQualified = lists.reduce((sum, list) => sum + list.totalVotes, 0);
  
  if (totalVotesOfQualified === 0) return seatMap;

  let allocatedSeats = 0;
  
  // المرحلة الأولى: التوزيع النسبي
  lists.forEach(list => {
    const seats = Math.floor((list.totalVotes / totalVotesOfQualified) * totalSeats);
    seatMap.set(list.id, seats);
    allocatedSeats += seats;
  });

  // المرحلة الثانية: توزيع المقاعد المتبقية بناءً على أعلى الكسور
  const remainders = lists.map(list => ({
    id: list.id,
    remainder: ((list.totalVotes / totalVotesOfQualified) * totalSeats) - (seatMap.get(list.id) || 0)
  })).sort((a, b) => b.remainder - a.remainder);

  let i = 0;
  while (allocatedSeats < totalSeats && i < remainders.length) {
    const currentSeats = seatMap.get(remainders[i].id) || 0;
    seatMap.set(remainders[i].id, currentSeats + 1);
    allocatedSeats++;
    i++;
  }

  return seatMap;
};