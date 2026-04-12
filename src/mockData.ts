import { ELECTION_CONSTANTS } from './lib/electionLogic';

export const hourlyData = [
  { time: '08:00', votes: 120, cumulative: 120 },
  { time: '09:00', votes: 250, cumulative: 370 },
  { time: '10:00', votes: 420, cumulative: 790 },
  { time: '11:00', votes: 380, cumulative: 1170 },
  { time: '12:00', votes: 310, cumulative: 1480 },
  { time: '13:00', votes: 210, cumulative: 1690 },
  { time: '14:00', votes: 157, cumulative: 1847 },
  { time: '15:00', votes: 280, cumulative: 2127 },
  { time: '16:00', votes: 340, cumulative: 2467 },
  { time: '17:00', votes: 410, cumulative: 2877 },
  { time: '18:00', votes: 190, cumulative: 3067 },
];

export const candidateData = [
  { id: 'p1', name: 'حزب الميثاق الوطني', votes: 245820, color: '#2563eb', party: 'الميثاق الوطني' },
  { id: 'p2', name: 'حزب إرادة', votes: 182450, color: '#10b981', party: 'إرادة' },
  { id: 'p3', name: 'جبهة العمل الإسلامي', votes: 156340, color: '#059669', party: 'العمل الإسلامي' },
  { id: 'p4', name: 'حزب تقدم', votes: 112890, color: '#f59e0b', party: 'تقدم' },
  { id: 'p5', name: 'حزب العمال', votes: 45210, color: '#ef4444', party: 'العمال' },
  { id: 'p6', name: 'حزب الأرض', votes: 32450, color: '#64748b', party: 'الأرض' },
  { id: 'p7', name: 'حزب التيار الوطني', votes: 28900, color: '#8b5cf6', party: 'التيار الوطني' },
  { id: 'p8', name: 'حزب الوحدة الشعبية', votes: 15600, color: '#ec4899', party: 'الوحدة الشعبية' },
];

export const localCandidateData = [
  { id: 'l1', name: 'قائمة الكرامة', votes: 15420, color: '#2563eb' },
  { id: 'l2', name: 'قائمة الاتحاد', votes: 12850, color: '#10b981' },
  { id: 'l3', name: 'قائمة الوفاء', votes: 8420, color: '#059669' },
  { id: 'l4', name: 'قائمة النشامى', votes: 3210, color: '#f59e0b' },
];

export const elections = [
  {
    id: 1,
    title: 'الدائرة الأولى - عمّان',
    type: 'محلي',
    faculty: 'محافظة العاصمة',
    voters: 150000,
    votes: 53820,
    turnout: 35.8,
    candidates: 12,
    status: 'Active',
  },
  {
    id: 2,
    title: 'القائمة الوطنية الحزبية',
    type: 'عام',
    faculty: 'المملكة',
    voters: 4500000,
    votes: 1200000,
    turnout: 26.6,
    candidates: ELECTION_CONSTANTS.GENERAL_SEATS,
    status: 'Voting Open',
  },
  {
    id: 3,
    title: 'الدائرة الثانية - إربد',
    type: 'محلي',
    faculty: 'محافظة إربد',
    voters: 120000,
    votes: 98400,
    turnout: 82,
    candidates: 10,
    status: 'Results Published',
  },
  {
    id: 4,
    title: 'دائرة الزرقاء',
    type: 'محلي',
    faculty: 'محافظة الزرقاء',
    voters: 95000,
    votes: 0,
    turnout: 0,
    candidates: 8,
    status: 'Draft',
  },
  {
    id: 5,
    title: 'دائرة الكرك',
    type: 'محلي',
    faculty: 'محافظة الكرك',
    voters: 85000,
    votes: 42500,
    turnout: 50,
    candidates: 7,
    status: 'Closed',
  },
];
