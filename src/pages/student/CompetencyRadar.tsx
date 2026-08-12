import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  BookOpen, 
  Info, 
  TrendingUp, 
  BarChart3, 
  ShieldCheck, 
  Briefcase,
  ExternalLink,
  Lock,
  UserCheck,
  ChevronDown,
  Award,
  Zap,
  Target,
  Layers,
  Table as TableIcon,
  X,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useDatabase } from '@/context/DatabaseContext';

export interface ActivityRecord {
  id: string;
  title: string;
  category: string;
  role: string;
  organization?: string;
  hoursPerWeek: number;
  weeksPerYear: number;
  description: string;
  years?: string;
}

export interface CompetencyVector {
  id: string;
  name: string;
  color: string;
  bgLight: string;
  borderLight: string;
  categoryTriggers: string[];
  keywords: string[];
  description: string;
}

export const COMPETENCIES: CompetencyVector[] = [
  {
    id: 'critical_thinking',
    name: 'Critical Thinking',
    color: '#3b82f6', // blue-500
    bgLight: 'bg-blue-50 text-blue-700',
    borderLight: 'border-blue-200',
    categoryTriggers: ['Research & Academic', 'Academic', 'Supercurricular'],
    keywords: ['research', 'academics', 'olympiads', 'debates', 'logic', 'analysis', 'evaluate', 'critique', 'strategy', 'strategising', 'theory', 'investigative', 'audit', 'study', 'hypothesis', 'proof', 'literature', 'synthesis', 'papers', 'philosophy'],
    description: 'Research, Academics, Olympiads, Debates, Logic, Analysis'
  },
  {
    id: 'problem_solving',
    name: 'Problem Solving',
    color: '#06b6d4', // cyan-500
    bgLight: 'bg-cyan-50 text-cyan-700',
    borderLight: 'border-cyan-200',
    categoryTriggers: ['Leadership & STEM', 'STEM', 'STEM & Science'],
    keywords: ['stem', 'algorithms', 'engineering', 'hackathons', 'robotics', 'sciences', 'solve', 'debug', 'troubleshoot', 'optimize', 'innovate', 'resolve', 'fix', 'challenge', 'solution', 'diagnostic', 'inventions', 'capstone', 'bug', 'bugs', 'testing', 'test', 'issue', 'issues'],
    description: 'STEM, Algorithms, Engineering, Hackathons, Robotics, Sciences'
  },
  {
    id: 'communication',
    name: 'Communication',
    color: '#10b981', // emerald-500
    bgLight: 'bg-emerald-50 text-emerald-700',
    borderLight: 'border-emerald-200',
    categoryTriggers: ['Writing, Media & Speaking', 'Writing & Media'],
    keywords: ['writing', 'public speaking', 'model un', 'podcasts', 'marketing', 'tutoring', 'speak', 'publish', 'present', 'edit', 'debate', 'articulate', 'blog', 'report', 'teach', 'translate', 'author', 'essay', 'speech', 'newsletter', 'outreach'],
    description: 'Writing, Public Speaking, Model UN, Podcasts, Marketing, Tutoring'
  },
  {
    id: 'team_work',
    name: 'Team Work',
    color: '#84cc16', // lime-500
    bgLight: 'bg-lime-50 text-lime-700',
    borderLight: 'border-lime-200',
    categoryTriggers: ['Community Service & Clubs', 'Athletics & Sports', 'Community Service'],
    keywords: ['athletics', 'sports', 'clubs', 'committees', 'volunteering', 'orchestras', 'bands', 'team', 'collaborate', 'member', 'partner', 'organize', 'peer', 'volunteer', 'community', 'coordination', 'mentor', 'outreach', 'varsity', 'tournaments', 'charity', 'leadership', 'lead', 'officer', 'president', 'captain', 'director', 'manager', 'intern', 'internship', 'deliver', 'project'],
    description: 'Athletics/Sports, Clubs, Committees, Volunteering, Orchestras/Bands'
  },
  {
    id: 'creativity',
    name: 'Creativity',
    color: '#eab308', // yellow-500
    bgLight: 'bg-amber-50 text-amber-800',
    borderLight: 'border-amber-200',
    categoryTriggers: ['Arts, Music & Design', 'Arts & Music', 'Art & Music'],
    keywords: ['art', 'music', 'ui/ux design', 'creative writing', 'film', 'architecture', 'design', 'designing', 'create', 'compose', 'paint', 'build', 'building', 'perform', 'produce', 'artistic', 'novel', 'concept', 'media', 'theater', 'prototype', 'animation', 'story'],
    description: 'Art & Music, UI/UX Design, Creative Writing, Film, Architecture'
  },
  {
    id: 'technical_skills',
    name: 'Technical Skills',
    color: '#f97316', // orange-500
    bgLight: 'bg-orange-50 text-orange-700',
    borderLight: 'border-orange-200',
    categoryTriggers: ['Coding & Engineering', 'Internship & Projects', 'Internship & Work'],
    keywords: ['code', 'software', 'hardware', 'arduino', 'labs', 'data analytics', 'program', 'python', 'java', 'cad', 'experiment', 'biotech', 'web', 'ai', 'machine learning', 'circuit', 'biology', 'chemistry', 'physics', 'app launches', 'tool', 'tools', 'bug', 'bugs', 'testing', 'test', 'building', 'build', 'fintech', 'loan', 'credit', 'cibil', 'cobil', 'framework', 'system', 'database', 'api', 'engineering', 'dev', 'developer', 'automation', 'feature'],
    description: 'Code, Software, Hardware/Arduino, Labs, Data Analytics'
  }
];

export interface DomainMapping {
  fieldType: string;
  categoryTriggers: string[];
  primaryVectors: string[]; // ids of competencies
  secondaryVectors: string[]; // ids of competencies
  indicators: string[]; // Key indicators / keywords
}

export const DOMAIN_COVERAGE_MATRIX: DomainMapping[] = [
  {
    fieldType: 'STEM & Science',
    categoryTriggers: ['STEM & Science', 'STEM', 'Science', 'Coding & Engineering', 'Engineering'],
    primaryVectors: ['problem_solving', 'technical_skills'],
    secondaryVectors: ['critical_thinking'],
    indicators: ['Coding', 'Math', 'Physics', 'Engineering', 'Robotics', 'Algorithms', 'Hackathons']
  },
  {
    fieldType: 'Research & Academics',
    categoryTriggers: ['Research & Academics', 'Research & Academic', 'Academic', 'Supercurricular'],
    primaryVectors: ['critical_thinking', 'problem_solving'],
    secondaryVectors: ['communication'],
    indicators: ['Literature Reviews', 'Thesis', 'Olympiads', 'Papers', 'Data Analysis', 'Philosophy']
  },
  {
    fieldType: 'Community Service',
    categoryTriggers: ['Community Service', 'Volunteering', 'Community Service & Clubs', 'Outreach'],
    primaryVectors: ['team_work', 'communication'],
    secondaryVectors: ['creativity'],
    indicators: ['Volunteering', 'Outreach', 'Non-profit', 'Fundraising', 'Charity']
  },
  {
    fieldType: 'Athletics & Sports',
    categoryTriggers: ['Athletics & Sports', 'Sports', 'Athletics'],
    primaryVectors: ['team_work'],
    secondaryVectors: ['communication'],
    indicators: ['Varsity Teams', 'Competitions', 'Tournaments', 'Fitness']
  },
  {
    fieldType: 'Art & Music',
    categoryTriggers: ['Art & Music', 'Arts & Music', 'Arts, Music & Design', 'Creative'],
    primaryVectors: ['creativity'],
    secondaryVectors: ['technical_skills', 'communication'],
    indicators: ['Design', 'Painting', 'Orchestra', 'Theater', 'Film', 'Creative Writing', 'UX/UI']
  },
  {
    fieldType: 'Internship & Work',
    categoryTriggers: ['Internship & Work', 'Internship & Projects', 'Work', 'Job'],
    primaryVectors: ['technical_skills', 'communication'],
    secondaryVectors: ['problem_solving', 'team_work'],
    indicators: ['Work Experience', 'Industry Training', 'Professional Projects']
  },
  {
    fieldType: 'Project Work',
    categoryTriggers: ['Project Work', 'Projects', 'Capstone', 'Endeavor'],
    primaryVectors: ['problem_solving', 'creativity'],
    secondaryVectors: ['technical_skills'],
    indicators: ['Capstone Projects', 'App Launches', 'Inventions', 'Independent Endeavors']
  }
];

const PRESET_MAJORS = [
  { id: 'cs_eng', label: 'Computer Science & Software Engineering', expectedSpikes: ['technical_skills', 'problem_solving'] },
  { id: 'pre_med', label: 'Pre-Med, Biology & Bioengineering', expectedSpikes: ['critical_thinking', 'technical_skills', 'problem_solving'] },
  { id: 'business_econ', label: 'Business, Economics & Finance', expectedSpikes: ['communication', 'team_work', 'critical_thinking'] },
  { id: 'humanities_law', label: 'Humanities, History & Pre-Law', expectedSpikes: ['communication', 'critical_thinking'] },
  { id: 'arts_media', label: 'Design, Fine Arts & Digital Media', expectedSpikes: ['creativity', 'communication'] },
  { id: 'undecided', label: 'Undecided / Interdisciplinary', expectedSpikes: ['critical_thinking', 'problem_solving', 'communication'] }
];

// Exact Math Helper Functions per Specification
function getHoursBasePoints(annualHours: number): { points: number; category: string } {
  if (annualHours < 25) {
    return { points: 0.5, category: 'Light Commitment' };
  } else if (annualHours <= 99) {
    return { points: 1.0, category: 'Moderate Commitment' };
  } else {
    return { points: 1.5, category: 'High Commitment' };
  }
}

function getRoleMetrics(roleRaw: string): { bonus: number; multiplier: number; label: string } {
  const r = (roleRaw || '').toLowerCase();
  if (r.includes('founder') || r.includes('initiator') || r.includes('director')) {
    return { bonus: 0.5, multiplier: 1.5, label: 'Founder / Initiator' };
  } else if (r.includes('leadership') || r.includes('officer') || r.includes('captain') || r.includes('president')) {
    return { bonus: 0.3, multiplier: 1.3, label: 'Leadership / Officer' };
  } else if (r.includes('core') || r.includes('lead') || r.includes('treasurer') || r.includes('secretary') || r.includes('vice')) {
    return { bonus: 0.15, multiplier: 1.15, label: 'Core Member / Lead' };
  } else {
    return { bonus: 0.0, multiplier: 1.0, label: 'Individual Participant' };
  }
}

function isPureExtracurricularActivity(act: any): boolean {
  if (!act) return false;

  // 1. Exclude operational / counselor logs / website activity attributes
  if (act.activityType || act.performedBy || act.attendees) return false;

  // 2. Exclude non-extracurricular activity types
  const typeUpper = String(act.type || '').toUpperCase();
  if (['WHATSAPP CHAT', 'AUDIO CALL', 'ZOHO/ZOOM CALL', 'ZOOM CALL', 'TASK', 'ESSAY', 'DOCUMENT', 'COUNSELOR_LOG', 'STATUS', 'LOG', 'MEETING', 'SYSTEM'].includes(typeUpper)) {
    return false;
  }

  // 3. Exclude non-extracurricular activity categories
  const catUpper = String(act.category || '').toUpperCase();
  if (['MEETING', 'TASK', 'ESSAY', 'DOCUMENT', 'COUNSELOR_LOG', 'STATUS', 'SYSTEM_LOG'].includes(catUpper)) {
    return false;
  }

  // 4. Exclude titles/names/descriptions that indicate portal logs or essay/task updates
  const titleLower = String(act.title || act.name || act.activityName || act.description || '').toLowerCase().trim();
  if (
    titleLower.startsWith('essay:') ||
    titleLower.startsWith('task:') ||
    titleLower.startsWith('document:') ||
    titleLower.includes('whatsapp chat') ||
    titleLower.includes('zoho call') ||
    titleLower.includes('zoom call') ||
    titleLower.includes('audio call') ||
    titleLower.includes('counselor update') ||
    titleLower.includes('counselor log') ||
    titleLower.includes('essay draft') ||
    titleLower.includes('essay review') ||
    titleLower.includes('task revision') ||
    titleLower.includes('essay writing')
  ) {
    return false;
  }

  // 5. Must have a valid title or name or activityName or organization
  const hasTitle = Boolean(act.title || act.name || act.activityName || act.organization);
  if (!hasTitle) return false;

  return true;
}

interface CompetencyRadarProps {
  student?: any;
  isTeamView?: boolean;
}

export default function CompetencyRadar({ student: customStudent, isTeamView = false }: CompetencyRadarProps) {
  const { currentUser, students } = useDatabase();
  
  // Resolve target student
  const currentStudent = customStudent || students.find(s => s.id === currentUser?.id || s.email === currentUser?.email) || (currentUser as any);

  const [hoveredCompetency, setHoveredCompetency] = useState<string | null>(null);
  const [showMathDetails, setShowMathDetails] = useState<boolean>(isTeamView);
  const [showMatrixTable, setShowMatrixTable] = useState<boolean>(isTeamView);
  const [isStrategyModalOpen, setIsStrategyModalOpen] = useState<boolean>(false);

  // Profile Intended Majors from Section 4
  const profileMajor1 = currentStudent?.major1 || '';
  const profileMajor2 = currentStudent?.major2 || '';

  // Selected major view mode: 'major1' | 'major2' | preset id
  const [selectedMajorSource, setSelectedMajorSource] = useState<string>('major1');

  // Extract Profile Activities from Section 6 (Profile Building Extracurriculars)
  const profileActivities: ActivityRecord[] = useMemo(() => {
    // Prefer student.extracurriculars array (Section 6 Profile Building)
    const rawList = Array.isArray(currentStudent?.extracurriculars)
      ? currentStudent.extracurriculars
      : (Array.isArray(currentStudent?.activities) ? currentStudent.activities : []);

    if (!rawList || rawList.length === 0) return [];

    const pureActivities = rawList.filter(isPureExtracurricularActivity);
    if (pureActivities.length === 0) return [];

    const seen = new Set<string>();
    const result: ActivityRecord[] = [];

    pureActivities.forEach((act: any, idx: number) => {
      const rawTitle = act.title || act.activityName || act.name || act.organization || `Activity #${idx + 1}`;
      const key = act.id || `${rawTitle}_${idx}`;
      if (seen.has(key)) return;
      seen.add(key);

      const category = act.category || 'Research & Academic';
      const role = act.role || 'Core Member / Lead';

      const hpw = parseFloat(act.hoursPerWeek) || 5;
      const wpy = parseFloat(act.weeksPerYear) || 30;

      result.push({
        id: String(key),
        title: rawTitle,
        category,
        role,
        organization: act.organization || '',
        hoursPerWeek: Math.min(168, Math.max(1, hpw)),
        weeksPerYear: Math.min(52, Math.max(1, wpy)),
        description: act.description || `${act.organization ? act.organization + ' - ' : ''}${rawTitle}`,
        years: act.classes || act.years || act.date || ''
      });
    });

    return result;
  }, [currentStudent]);

  // Skill Vector Calculation Engine mapped against Domain Coverage Matrix & Core Competency Vectors
  const { competencyScores, matchedActivitiesByVector, totalAnnualHours, activityBreakdown } = useMemo(() => {
    let hoursSum = 0;

    const rawScores: Record<string, number> = {
      critical_thinking: 0,
      problem_solving: 0,
      communication: 0,
      team_work: 0,
      creativity: 0,
      technical_skills: 0
    };

    const vectorMatchDetails: Record<string, { activityTitle: string; points: number; reason: string; roleLabel: string; hoursLabel: string }[]> = {
      critical_thinking: [],
      problem_solving: [],
      communication: [],
      team_work: [],
      creativity: [],
      technical_skills: []
    };

    const breakdowns: any[] = [];

    profileActivities.forEach(act => {
      const annualHours = act.hoursPerWeek * act.weeksPerYear;
      hoursSum += annualHours;

      const baseInfo = getHoursBasePoints(annualHours);
      const roleInfo = getRoleMetrics(act.role);

      // Formula: (Base Points + Role Bonus) × Multiplier
      const calculatedPoints = Number(((baseInfo.points + roleInfo.bonus) * roleInfo.multiplier).toFixed(2));

      const fullText = `${act.title} ${act.description} ${act.category} ${act.role} ${act.organization || ''}`.toLowerCase();

      const matchedVectorsForThisAct: string[] = [];

      // 1. Matrix Domain Mapping Check based on Activity Category Field
      let matchedDomain = DOMAIN_COVERAGE_MATRIX.find(domain =>
        domain.categoryTriggers.some(c => act.category.toLowerCase().includes(c.toLowerCase()))
      );

      if (!matchedDomain) {
        matchedDomain = DOMAIN_COVERAGE_MATRIX.find(domain =>
          act.category.toLowerCase().includes(domain.fieldType.toLowerCase())
        );
      }

      if (matchedDomain) {
        const matchLabel = `Domain (${matchedDomain.fieldType})`;

        // Primary vectors get 100% points
        matchedDomain.primaryVectors.forEach(vecId => {
          if (rawScores[vecId] !== undefined) {
            rawScores[vecId] += calculatedPoints;
            const vecObj = COMPETENCIES.find(c => c.id === vecId);
            if (vecObj && !matchedVectorsForThisAct.includes(vecObj.name)) {
              matchedVectorsForThisAct.push(vecObj.name);
            }
            vectorMatchDetails[vecId].push({
              activityTitle: act.title,
              points: calculatedPoints,
              reason: `Primary ${matchLabel}`,
              roleLabel: roleInfo.label,
              hoursLabel: baseInfo.category
            });
          }
        });

        // Secondary vectors get 50% points (0.5x weightage)
        matchedDomain.secondaryVectors.forEach(vecId => {
          if (rawScores[vecId] !== undefined) {
            const secPts = Number((calculatedPoints * 0.5).toFixed(2));
            rawScores[vecId] += secPts;
            const vecObj = COMPETENCIES.find(c => c.id === vecId);
            if (vecObj && !matchedVectorsForThisAct.includes(`${vecObj.name} (Sec)`)) {
              matchedVectorsForThisAct.push(`${vecObj.name} (Sec)`);
            }
            vectorMatchDetails[vecId].push({
              activityTitle: act.title,
              points: secPts,
              reason: `Secondary ${matchLabel}`,
              roleLabel: roleInfo.label,
              hoursLabel: baseInfo.category
            });
          }
        });
      }

      // 2. Key Indicator & Keyword Check (Covers other vectors beyond primary & secondary)
      COMPETENCIES.forEach(comp => {
        let isMatch = false;
        let matchReason = '';

        const matchedKw = comp.keywords.find(kw => fullText.includes(kw.toLowerCase()));
        if (matchedKw) {
          isMatch = true;
          matchReason = `Key Indicator (${matchedKw})`;
        } else if (comp.categoryTriggers.some(c => act.category.toLowerCase().includes(c.toLowerCase()))) {
          isMatch = true;
          matchReason = `Category (${act.category})`;
        }

        const isPrimaryMapped = matchedVectorsForThisAct.includes(comp.name);
        const isSecondaryMapped = matchedVectorsForThisAct.includes(`${comp.name} (Sec)`);

        if (isMatch && !isPrimaryMapped) {
          if (isSecondaryMapped) {
            // Upgrade secondary 50% mapping to full 100% mapping via direct key indicator match
            const addedPoints = Number((calculatedPoints * 0.5).toFixed(2));
            rawScores[comp.id] += addedPoints;
            const secIdx = matchedVectorsForThisAct.indexOf(`${comp.name} (Sec)`);
            if (secIdx !== -1) matchedVectorsForThisAct[secIdx] = comp.name;
            vectorMatchDetails[comp.id].push({
              activityTitle: act.title,
              points: addedPoints,
              reason: `Primary Upgrade: ${matchReason}`,
              roleLabel: roleInfo.label,
              hoursLabel: baseInfo.category
            });
          } else {
            // Key indicator covers other vector than primary and secondary (3rd or 4th vector gets 25% weightage)
            const thirdOrFourthPoints = Number((calculatedPoints * 0.25).toFixed(2));
            rawScores[comp.id] += thirdOrFourthPoints;
            matchedVectorsForThisAct.push(`${comp.name} (25%)`);
            vectorMatchDetails[comp.id].push({
              activityTitle: act.title,
              points: thirdOrFourthPoints,
              reason: `3rd/4th Vector Highlight (${matchReason})`,
              roleLabel: roleInfo.label,
              hoursLabel: baseInfo.category
            });
          }
        }
      });

      breakdowns.push({
        title: act.title,
        annualHours,
        basePoints: baseInfo.points,
        baseCategory: baseInfo.category,
        roleBonus: roleInfo.bonus,
        roleMultiplier: roleInfo.multiplier,
        roleLabel: roleInfo.label,
        totalPoints: calculatedPoints,
        mappedVectors: matchedVectorsForThisAct,
        activity: act,
        category: act.category,
        description: act.description,
        role: act.role,
        hoursPerWeek: act.hoursPerWeek,
        weeksPerYear: act.weeksPerYear
      });
    });

    // Final capped scores (0.0 to 10.0) formatted to 1 decimal
    const competencyScores: Record<string, number> = {};
    Object.keys(rawScores).forEach(key => {
      competencyScores[key] = Math.min(10.0, Math.max(0.0, Number(rawScores[key].toFixed(1))));
    });

    return {
      competencyScores,
      matchedActivitiesByVector: vectorMatchDetails,
      totalAnnualHours: hoursSum,
      activityBreakdown: breakdowns
    };
  }, [profileActivities]);

  // Target Major Info & Benchmark Spikes
  const currentMajorInfo = useMemo(() => {
    let activeLabel = 'Intended Major';
    let queryText = '';

    if (selectedMajorSource === 'major1') {
      activeLabel = profileMajor1 ? `Intended Major 1: ${profileMajor1}` : 'Intended Major 1 (Not specified in Profile)';
      queryText = profileMajor1;
    } else if (selectedMajorSource === 'major2') {
      activeLabel = profileMajor2 ? `Intended Major 2: ${profileMajor2}` : 'Intended Major 2 (Not specified in Profile)';
      queryText = profileMajor2;
    } else {
      const preset = PRESET_MAJORS.find(p => p.id === selectedMajorSource);
      if (preset) {
        return { label: preset.label, expectedSpikes: preset.expectedSpikes };
      }
    }

    const q = queryText.toLowerCase();
    let expectedSpikes: string[] = ['critical_thinking', 'problem_solving'];

    if (/cs|computer|software|coding|program|tech|data|ai|robotics/i.test(q)) {
      expectedSpikes = ['technical_skills', 'problem_solving'];
    } else if (/med|bio|health|doctor|pharma|chem|gene/i.test(q)) {
      expectedSpikes = ['critical_thinking', 'technical_skills', 'problem_solving'];
    } else if (/econ|business|finance|management|market|entrepreneur/i.test(q)) {
      expectedSpikes = ['communication', 'team_work', 'critical_thinking'];
    } else if (/law|history|policy|politics|literature|philosophy|journalism/i.test(q)) {
      expectedSpikes = ['communication', 'critical_thinking'];
    } else if (/art|design|media|film|music|theater|fine/i.test(q)) {
      expectedSpikes = ['creativity', 'communication'];
    }

    return { label: activeLabel, expectedSpikes };
  }, [selectedMajorSource, profileMajor1, profileMajor2]);

  // Dominant Competency & Spike Detection
  const topCompetency = useMemo(() => {
    let topId = COMPETENCIES[0].id;
    let maxScore = -1;
    COMPETENCIES.forEach(c => {
      if ((competencyScores[c.id] || 0) > maxScore) {
        maxScore = competencyScores[c.id] || 0;
        topId = c.id;
      }
    });
    const details = COMPETENCIES.find(c => c.id === topId) || COMPETENCIES[0];
    return { ...details, score: maxScore };
  }, [competencyScores]);

  const isSpikeProminent = topCompetency.score >= 4.0;
  const isSpikeAlignedWithMajor = currentMajorInfo.expectedSpikes.includes(topCompetency.id);

  // Portfolio Coverage Index Math (Sum of 6 scores / 60.0 * 100)
  const portfolioCoveragePct = useMemo(() => {
    const totalScoreSum = COMPETENCIES.reduce((acc, c) => acc + (competencyScores[c.id] || 0), 0);
    return Math.min(100, Math.round((totalScoreSum / 60.0) * 100));
  }, [competencyScores]);

  // Identified Gaps
  const identifiedGaps = useMemo(() => {
    const gaps: CompetencyVector[] = [];
    COMPETENCIES.forEach(c => {
      const score = competencyScores[c.id] || 0;
      const isExpected = currentMajorInfo.expectedSpikes.includes(c.id);
      if (score < 3.0 || (isExpected && score < 5.0)) {
        gaps.push(c);
      }
    });
    return gaps;
  }, [competencyScores, currentMajorInfo]);

  // Portfolio Commitment Depth Calculations
  const portfolioCommitmentDepth = useMemo(() => {
    const totalHours = activityBreakdown.reduce((sum, a) => sum + (a.annualHours || 0), 0);
    const highCommitmentCount = profileActivities.filter(a => {
      const h = (Number(a.hoursPerWeek) || 0) * (Number(a.weeksPerYear) || 0);
      const isLeader = /president|founder|captain|lead|head|chair|director|chief|initiator|creator/i.test(a.role || '');
      return h >= 80 || isLeader;
    }).length;

    let tierLabel = 'Tier 3: Early Depth (<150 hrs/yr)';
    let tierBadge = 'bg-slate-100 text-slate-700 border-slate-200';
    if (totalHours >= 300) {
      tierLabel = 'Tier 1: High Depth (>300 hrs/yr)';
      tierBadge = 'bg-emerald-100 text-emerald-800 border-emerald-300';
    } else if (totalHours >= 150) {
      tierLabel = 'Tier 2: Moderate Depth (150-300 hrs/yr)';
      tierBadge = 'bg-blue-100 text-blue-800 border-blue-300';
    }

    const totalWeeklyHours = profileActivities.reduce((acc, a) => acc + (Number(a.hoursPerWeek) || 0), 0);
    const avgWeeklyHours = profileActivities.length > 0 ? (totalWeeklyHours / profileActivities.length).toFixed(1) : '0';

    return {
      totalHours,
      highCommitmentCount,
      tierLabel,
      tierBadge,
      avgWeeklyHours
    };
  }, [activityBreakdown, profileActivities]);

  // Portfolio Engagement Width Calculations
  const portfolioEngagementWidth = useMemo(() => {
    const activeVectorsCount = COMPETENCIES.filter(c => (competencyScores[c.id] || 0) > 0).length;
    let widthLabel = 'Specialized Focus (1-2 Vectors)';
    let widthBadge = 'bg-amber-100 text-amber-800 border-amber-300';

    if (activeVectorsCount >= 5) {
      widthLabel = 'Broad Multi-Disciplinary Width (5-6 Vectors)';
      widthBadge = 'bg-indigo-100 text-indigo-800 border-indigo-300';
    } else if (activeVectorsCount >= 3) {
      widthLabel = 'Balanced Core Width (3-4 Vectors)';
      widthBadge = 'bg-blue-100 text-blue-800 border-blue-300';
    }

    return {
      activeVectorsCount,
      totalActivitiesCount: profileActivities.length,
      widthLabel,
      widthBadge,
      coveredPct: Math.round((activeVectorsCount / 6) * 100)
    };
  }, [competencyScores, profileActivities]);

  // SVG Spider Radar Coordinates Calculation
  const CX = 180;
  const CY = 180;
  const R = 120;
  const N = COMPETENCIES.length;

  const radialAxes = useMemo(() => {
    return COMPETENCIES.map((comp, i) => {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / N;
      const xPole = CX + R * Math.cos(angle);
      const yPole = CY + R * Math.sin(angle);

      const score = competencyScores[comp.id] || 0;
      const rScore = R * (score / 10.0);
      const xScore = CX + rScore * Math.cos(angle);
      const yScore = CY + rScore * Math.sin(angle);

      const rLabel = R + 28;
      const xLabel = CX + rLabel * Math.cos(angle);
      const yLabel = CY + rLabel * Math.sin(angle);

      return {
        comp,
        angle,
        xPole,
        yPole,
        score,
        xScore,
        yScore,
        xLabel,
        yLabel
      };
    });
  }, [competencyScores]);

  const polygonPoints = useMemo(() => {
    return radialAxes.map(a => `${a.xScore.toFixed(1)},${a.yScore.toFixed(1)}`).join(' ');
  }, [radialAxes]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto w-full pb-16 px-4 sm:px-6">
      
      {/* Team View Counsellor Header Badge */}
      {isTeamView && (
        <div className="bg-indigo-900 text-indigo-100 px-4 py-2.5 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-sm border border-indigo-700">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span>Assigned Counselor View • Student Database Analytical Audit Mode for <strong>{currentStudent?.name || 'Student'}</strong></span>
          </div>
          <span className="bg-indigo-800 text-indigo-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
            Team Portal Full Visibility
          </span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-400/30 px-3 py-1 rounded-full text-xs font-semibold text-indigo-200">
              <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Synced from Profile (Section 6 Profile Building)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Competency Vector Radar & Portfolio Strategy Index
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Real-time 6-axis competency mapping and portfolio coverage analysis for holistic university admissions evaluation.
            </p>
          </div>

          {/* Top Metric Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-3 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-300 block">Logged Activities</span>
              <span className="text-xl font-extrabold text-white">{profileActivities.length}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-3 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-300 block">Annual Hours</span>
              <span className="text-xl font-extrabold text-emerald-400">{totalAnnualHours}h</span>
            </div>
            <div className="col-span-2 sm:col-span-1 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-3 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-300 block">Coverage Index</span>
              <span className="text-xl font-extrabold text-amber-300 block mt-0.5">
                {portfolioCoveragePct}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ONLY ON TEAM PORTAL: Formulas & Rules Explainer Accordion Banner */}
      {isTeamView && (
        <div className="bg-indigo-50/70 border border-indigo-200/90 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowMathDetails(!showMathDetails)}>
            <div className="flex items-center gap-2 text-indigo-950 font-bold text-xs sm:text-sm">
              <Zap className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Built-in Point Rules & Weightage Engine</span>
              <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md ml-1">
                Visible to Assigned Counselor in Team Database
              </span>
            </div>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-bold text-indigo-700 gap-1">
              {showMathDetails ? 'Hide Rules' : 'View Formula Rules'} <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showMathDetails && "rotate-180")} />
            </Button>
          </div>

          {showMathDetails && (
            <div className="mt-4 pt-4 border-t border-indigo-100 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-700 animate-in fade-in">
              <div className="bg-white p-3.5 rounded-xl border border-indigo-100 space-y-1 shadow-2xs">
                <span className="font-bold text-indigo-900 block text-[11px] uppercase">1. Hours-to-Points Rules</span>
                <ul className="space-y-1 text-[11px] text-slate-600">
                  <li>• Light (&lt; 25 hrs/yr): <strong className="text-slate-900">+0.5 Base Points</strong></li>
                  <li>• Moderate (25–99 hrs/yr): <strong className="text-slate-900">+1.0 Base Points</strong></li>
                  <li>• High (≥ 100 hrs/yr): <strong className="text-slate-900">+1.5 Base Points</strong></li>
                </ul>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-indigo-100 space-y-1 shadow-2xs">
                <span className="font-bold text-indigo-900 block text-[11px] uppercase">2. Role Bonus & Multipliers</span>
                <ul className="space-y-1 text-[11px] text-slate-600">
                  <li>• Founder / Initiator: <strong className="text-indigo-700">+0.5 Bonus | 1.5×</strong></li>
                  <li>• Leadership / Officer: <strong className="text-indigo-700">+0.3 Bonus | 1.3×</strong></li>
                  <li>• Core Member / Lead: <strong className="text-indigo-700">+0.15 Bonus | 1.15×</strong></li>
                  <li>• Individual Participant: <strong className="text-slate-700">+0.0 Bonus | 1.0×</strong></li>
                </ul>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-indigo-100 space-y-1 shadow-2xs">
                <span className="font-bold text-indigo-900 block text-[11px] uppercase">3. Calculation Formula</span>
                <p className="text-[11px] text-slate-600 font-mono bg-indigo-50/50 p-2 rounded-lg border border-indigo-100">
                  Points = (Base + Role Bonus) × Multiplier
                </p>
                <p className="text-[10px] text-slate-500">
                  Mapped across Primary (100% pts) & Secondary (50% pts) vectors up to max 10.0.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ONLY ON TEAM PORTAL: Activity Domain Coverage Matrix across Core Vectors Table */}
      {isTeamView && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowMatrixTable(!showMatrixTable)}>
            <div className="flex items-center gap-2">
              <TableIcon className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">3. Activity Domain Coverage Matrix across Core Vectors</h3>
            </div>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-bold text-indigo-700 gap-1">
              {showMatrixTable ? 'Collapse Matrix' : 'Expand Matrix'} <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showMatrixTable && "rotate-180")} />
            </Button>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Each activity field maps automatically to specific target competency vectors based on domain characteristics:
          </p>

          {showMatrixTable && (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Activity Field / Field Type</th>
                    <th className="px-4 py-3">Primary Vectors Covered</th>
                    <th className="px-4 py-3">Secondary Vectors Covered</th>
                    <th className="px-4 py-3">Key Indicators / Keywords</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {DOMAIN_COVERAGE_MATRIX.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-slate-900 bg-slate-50/40">
                        {row.fieldType}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-indigo-700">
                        {row.primaryVectors.map(v => COMPETENCIES.find(c => c.id === v)?.name).join(', ')}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-600">
                        {row.secondaryVectors.map(v => COMPETENCIES.find(c => c.id === v)?.name).join(', ')}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 text-[11px]">
                        {row.indicators.join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Synced Profile Target Majors & Activity Vault */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Target Major Selector */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Target Field of Study / Intended Major</h3>
                  <p className="text-[11px] text-slate-500">Synced from Profile Section 4 (Target Intake & Preferences)</p>
                </div>
              </div>

              {!isTeamView && (
                <Link to="/student/profile">
                  <Button variant="ghost" size="sm" className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold gap-1 h-8 px-2">
                    Edit Profile <ExternalLink className="w-3 h-3" />
                  </Button>
                </Link>
              )}
            </div>

            {/* Major Source Pills */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <button
                onClick={() => setSelectedMajorSource('major1')}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border text-left",
                  selectedMajorSource === 'major1' 
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs" 
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                )}
              >
                Intended Major 1: {profileMajor1 || 'Unspecified'}
              </button>

              {profileMajor2 && (
                <button
                  onClick={() => setSelectedMajorSource('major2')}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border text-left",
                    selectedMajorSource === 'major2' 
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs" 
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  )}
                >
                  Major 2: {profileMajor2}
                </button>
              )}
            </div>

            {/* Benchmark Major Dropdown */}
            <div className="pt-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Or Benchmark Field of Study:
              </label>
              <select
                value={selectedMajorSource}
                onChange={e => setSelectedMajorSource(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="major1">
                  Intended Major 1 ({profileMajor1 || 'Section 4 Profile Field'})
                </option>
                {profileMajor2 && (
                  <option value="major2">
                    Intended Major 2 ({profileMajor2})
                  </option>
                )}
                <optgroup label="Standard Domain Benchmarks">
                  {PRESET_MAJORS.map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>
                Expected Vector Spikes for <strong>{currentMajorInfo.label}</strong>: {' '}
                <strong className="text-indigo-700">
                  {currentMajorInfo.expectedSpikes.map(s => COMPETENCIES.find(c => c.id === s)?.name).join(', ')}
                </strong>
              </span>
            </div>
          </div>

          {/* Activity Breakdown Vault Card (Synced View) */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-indigo-600" /> Admissions Activity Vault
                  </h3>
                  <span className="text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                    {profileActivities.length} / 10 Max
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 pt-0.5 leading-relaxed">
                  Build your portfolio. Competencies (Critical Thinking, Problem Solving, Communication, Team Work, Creativity, Technical Skills) are calculated automatically based on action verbs, description details, and duration.
                </p>
              </div>

              {!isTeamView && (
                <Link to="/student/profile">
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8 px-3 rounded-xl gap-1.5 shrink-0">
                    + Add Activity
                  </Button>
                </Link>
              )}
            </div>

            {/* Detailed Activity Vault Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {activityBreakdown.length > 0 ? (
                activityBreakdown.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="p-3.5 bg-white border border-slate-200/90 rounded-2xl space-y-2 shadow-2xs hover:border-indigo-300 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 inline-flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-blue-500" />
                          {item.baseCategory || 'Supercurricular'}
                        </span>
                        {!isTeamView && (
                          <Link to="/student/profile" className="text-slate-400 hover:text-indigo-600 p-0.5">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </div>

                      <h4 className="font-bold text-xs text-slate-900 leading-tight">
                        {item.title}
                      </h4>

                      <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-slate-500 font-medium">
                        <span>Role: <strong className="text-slate-800 font-semibold">{item.role || item.roleLabel || 'Individual'}</strong></span>
                        <span>• Time: <strong className="text-slate-800 font-semibold">{item.hoursPerWeek || 5}h/wk</strong> for <strong className="text-slate-800 font-semibold">{item.weeksPerYear || 30} wks</strong> ({item.annualHours} hrs/yr)</span>
                        {item.years && (
                          <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-md font-bold text-[9px] inline-flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5 text-indigo-500" />
                            {item.years}
                          </span>
                        )}
                      </div>

                      <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[11px] text-slate-600 leading-relaxed line-clamp-3 font-normal">
                        {item.description || 'Action-oriented activity profile entry logged under Section 6 (Profile Building).'}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-1">
                      <span className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider block">
                        Competency Mapping
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.mappedVectors.length > 0 ? (
                          item.mappedVectors.map((vName: string) => {
                            const cleanName = String(vName).replace(/\s*\([^)]*\)/g, '').trim();
                            return (
                              <span 
                                key={vName}
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100"
                              >
                                {cleanName}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600">
                            General Involvement
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl space-y-3">
                  <Info className="w-8 h-8 text-indigo-400 mx-auto" />
                  <p className="font-semibold text-slate-700 text-xs">No profile building activities recorded yet</p>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    Add leadership roles, research projects, clubs, and honors in Section 6 (Profile Building).
                  </p>
                  {!isTeamView && (
                    <Link to="/student/profile" className="inline-block pt-1">
                      <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8 px-4 rounded-xl">
                        Go to Section 6 (Profile Building)
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Spider Radar Chart & Portfolio Strategy Index */}
        <div className="lg:col-span-6 space-y-6">

          {/* SVG Spider Radar Chart Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-600" /> 6-Axis Competency Vector Radar
                </h3>
                <p className="text-[11px] text-slate-500">Real-time 6-axis polygon computed from profile hours & domain activity vectors</p>
              </div>
            </div>

            {/* Radar Spider SVG Canvas */}
            <div className="relative flex justify-center items-center py-2 bg-slate-50/50 rounded-2xl border border-slate-100">
              <svg width="360" height="360" viewBox="0 0 360 360" className="overflow-visible">
                {/* Grid Concentric Rings (Levels 1.0 to 10.0) */}
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => {
                  const rRing = R * (level / 10);
                  const ringPoints = COMPETENCIES.map((_, i) => {
                    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / N;
                    const x = CX + rRing * Math.cos(angle);
                    const y = CY + rRing * Math.sin(angle);
                    return `${x.toFixed(1)},${y.toFixed(1)}`;
                  }).join(' ');

                  const isLabelLevel = level % 2 === 0 || level === 10;

                  return (
                    <g key={`ring-${level}`}>
                      <polygon
                        points={ringPoints}
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth="1"
                        strokeDasharray={level === 10 ? 'none' : '3,3'}
                      />
                      {/* Level Ticks along Top Axis */}
                      {isLabelLevel && (
                        <text
                          x={CX + 4}
                          y={CY - rRing + 3}
                          fontSize="8"
                          fontWeight="bold"
                          fill="#94a3b8"
                        >
                          {level}.0
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Radial Axis Lines from Center to Pole */}
                {radialAxes.map((axis, i) => (
                  <line
                    key={`axis-${i}`}
                    x1={CX}
                    y1={CY}
                    x2={axis.xPole}
                    y2={axis.yPole}
                    stroke="#cbd5e1"
                    strokeWidth="1.2"
                  />
                ))}

                {/* Data Polygon Fill & Stroke */}
                <polygon
                  points={polygonPoints}
                  fill="url(#radarGradient)"
                  stroke="#4f46e5"
                  strokeWidth="2.5"
                  className="transition-all duration-500 ease-out"
                />

                {/* Polygon Gradient */}
                <defs>
                  <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.15" />
                  </linearGradient>
                </defs>

                {/* Vertex Point Markers */}
                {radialAxes.map((axis) => {
                  const isHovered = hoveredCompetency === axis.comp.id;
                  return (
                    <g 
                      key={`vertex-${axis.comp.id}`}
                      onMouseEnter={() => setHoveredCompetency(axis.comp.id)}
                      onMouseLeave={() => setHoveredCompetency(null)}
                      className="cursor-pointer group"
                    >
                      <circle
                        cx={axis.xScore}
                        cy={axis.yScore}
                        r={isHovered ? 7 : 5}
                        fill={axis.comp.color}
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="transition-all duration-200"
                      />
                    </g>
                  );
                })}

                {/* Outer Axis Labels */}
                {radialAxes.map((axis) => {
                  const isHovered = hoveredCompetency === axis.comp.id;
                  return (
                    <g key={`label-${axis.comp.id}`}>
                      <text
                        x={axis.xLabel}
                        y={axis.yLabel}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize="10"
                        fontWeight="bold"
                        fill={isHovered ? axis.comp.color : '#334155'}
                        className="transition-colors duration-200 font-sans"
                      >
                        {axis.comp.name}
                      </text>
                      <text
                        x={axis.xLabel}
                        y={axis.yLabel + 12}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize="9"
                        fontWeight="extrabold"
                        fill={axis.comp.color}
                      >
                        {axis.score.toFixed(1)} / 10.0
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Sleek Horizontal Vector Legend */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-3 border-t border-slate-100">
              {COMPETENCIES.map((comp) => (
                <div 
                  key={comp.id} 
                  onMouseEnter={() => setHoveredCompetency(comp.id)}
                  onMouseLeave={() => setHoveredCompetency(null)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: comp.color }} />
                  <span>{comp.name}</span>
                  <span className="font-extrabold text-slate-900">({(competencyScores[comp.id] || 0).toFixed(1)})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Automated Portfolio Strategy Index Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" /> AUTOMATED PORTFOLIO STRATEGY INDEX
                  </h3>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">
                    T-Shaped Model
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 pt-0.5">
                  Real-time admissions evaluation comparing your profile against Top 20 & Ivy League benchmarks
                </p>
              </div>

              <Button 
                onClick={() => setIsStrategyModalOpen(true)}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl h-8 px-3.5 flex items-center gap-1.5 transition-colors shrink-0 shadow-xs cursor-pointer"
              >
                <span>Full Strategy Report</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* ADMISSIONS SPIKE ASSESSMENT SUMMARY */}
            <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[11px] font-extrabold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-indigo-600 shrink-0" /> ADMISSIONS SPIKE ASSESSMENT
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                    Spike: {topCompetency.name} ({topCompetency.score.toFixed(1)}/10.0)
                  </span>
                  <span className={cn(
                    "text-[10px] font-bold px-2.5 py-0.5 rounded-full border",
                    isSpikeAlignedWithMajor 
                      ? "bg-emerald-100 text-emerald-800 border-emerald-200" 
                      : "bg-blue-100 text-blue-800 border-blue-200"
                  )}>
                    {isSpikeAlignedWithMajor ? "Major Aligned" : "Secondary Talent Pillar"}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed">
                {isSpikeProminent ? (
                  <>
                    <strong>The T-Shaped Spike:</strong> You have cultivated an anchor spike in <strong>{topCompetency.name} ({topCompetency.score.toFixed(1)}/10.0)</strong>. {isSpikeAlignedWithMajor ? (
                      <>This directly powers your target major <strong>"{currentMajorInfo.label}"</strong>. Elite admissions committees view this domain depth as a primary academic engine demonstrating ready research/leadership capability.</>
                    ) : (
                      <>While a strong personal asset, this spike lies outside primary vectors expected for <strong>"{currentMajorInfo.label}"</strong>. It functions as a compelling secondary talent pillar (e.g. the 'Musician-Engineer' archetype). We recommend building a complementary academic spike in expected major vectors.</>
                    )}
                  </>
                ) : (
                  <>
                    <strong>Developing Spike:</strong> Your profile currently displays a balanced/flat curve (top score: {topCompetency.score.toFixed(1)}/10.0). Elite universities build a <em>well-rounded class of spiked specialists</em>. We recommend channeling 70% of supercurricular time into 1–2 core projects for <strong>"{currentMajorInfo.label}"</strong> to create a standout spike.
                  </>
                )}
              </p>
            </div>

            {/* TARGET vs ACHIEVED: COMMITMENT DEPTH & ENGAGEMENT WIDTH GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Commitment Depth: Target vs Achieved */}
              <div className="p-4 bg-slate-50/80 border border-slate-200/90 rounded-2xl space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                    <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> COMMITMENT DEPTH
                    </span>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      {portfolioCommitmentDepth.totalHours >= 300 ? 'Tier 1 Elite' : portfolioCommitmentDepth.totalHours >= 150 ? 'Tier 2 Strong' : 'Tier 3 Developing'}
                    </span>
                  </div>

                  {/* Target vs Achieved Comparative Bar */}
                  <div className="space-y-1.5 pt-0.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-700">Achieved: <span className="text-emerald-700">{portfolioCommitmentDepth.totalHours} Hrs/Yr</span></span>
                      <span className="text-slate-500 font-medium">Target: <span className="text-slate-900 font-bold">300+ Hrs/Yr</span></span>
                    </div>

                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden relative">
                      <div 
                        className="h-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.round((portfolioCommitmentDepth.totalHours / 300) * 100))}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-500 font-medium">
                      <span>0 Hrs</span>
                      <span>150 Hrs (Tier 2)</span>
                      <span>300+ Hrs (Top 20 Target)</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed pt-1">
                    <strong>100-Hour Rule in Admissions:</strong> Elite admissions officers value multi-year depth over short-term club hopping. {portfolioCommitmentDepth.totalHours >= 300 ? (
                      <>Your <strong>{portfolioCommitmentDepth.totalHours} annual hours</strong> reach the T20 depth threshold.</>
                    ) : (
                      <>You have logged <strong>{portfolioCommitmentDepth.totalHours} hours/yr</strong>. Increase weekly hours on core academic/leadership projects to hit the 300+ hour Tier 1 target.</>
                    )}
                  </p>
                </div>
              </div>

              {/* Engagement Width: Target vs Achieved */}
              <div className="p-4 bg-slate-50/80 border border-slate-200/90 rounded-2xl space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                    <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-cyan-600" /> ENGAGEMENT WIDTH
                    </span>
                    <span className="text-[10px] font-bold text-cyan-800 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-full">
                      {portfolioEngagementWidth.activeVectorsCount >= 3 && portfolioEngagementWidth.activeVectorsCount <= 4 ? 'Optimal Target Match' : portfolioEngagementWidth.activeVectorsCount > 4 ? 'Broad Diversity' : 'Narrow Focus'}
                    </span>
                  </div>

                  {/* Target vs Achieved Vector Grid */}
                  <div className="space-y-1.5 pt-0.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-700">Achieved: <span className="text-cyan-700">{portfolioEngagementWidth.activeVectorsCount} / 6 Vectors</span></span>
                      <span className="text-slate-500 font-medium">Ideal Target: <span className="text-slate-900 font-bold">3 – 4 Core Vectors</span></span>
                    </div>

                    {/* Vector slots comparison */}
                    <div className="grid grid-cols-6 gap-1.5 pt-1">
                      {COMPETENCIES.map((c, idx) => {
                        const isActive = (competencyScores[c.id] || 0) > 0;
                        const isTargetZone = idx < 4;
                        return (
                          <div 
                            key={c.id} 
                            title={`${c.name}: ${(competencyScores[c.id] || 0).toFixed(1)}/10.0`}
                            className={cn(
                              "h-3.5 rounded-md transition-all flex items-center justify-center text-[8px] font-extrabold",
                              isActive 
                                ? "bg-cyan-600 text-white shadow-2xs" 
                                : isTargetZone 
                                  ? "bg-cyan-100/80 border border-dashed border-cyan-300 text-cyan-700" 
                                  : "bg-slate-200 text-slate-400"
                            )}
                          >
                            V{idx + 1}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-500 font-medium pt-0.5">
                      <span>V1–V2 (Narrow)</span>
                      <span className="text-cyan-700 font-bold">V3–V4 (T-Shaped Ideal)</span>
                      <span>V5–V6 (Broad)</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed pt-1">
                    <strong>T-Shaped Horizontal Bar:</strong> {portfolioEngagementWidth.activeVectorsCount >= 3 && portfolioEngagementWidth.activeVectorsCount <= 4 ? (
                      <>Your <strong>{portfolioEngagementWidth.activeVectorsCount} active vectors</strong> perfectly align with the 3–4 vector ideal target, balancing versatility without diluting your spike.</>
                    ) : portfolioEngagementWidth.activeVectorsCount < 3 ? (
                      <>Your <strong>{portfolioEngagementWidth.activeVectorsCount} active vectors</strong> represent a singular focus. Add a supportive teamwork or community initiative to reach the 3-4 vector target.</>
                    ) : (
                      <>Your <strong>{portfolioEngagementWidth.activeVectorsCount} active vectors</strong> show wide breadth. Ensure your top spike remains dominant so activities don't look scattered.</>
                    )}
                  </p>
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>

      {/* DETAILED STRATEGY ANALYSIS MODAL */}
      {isStrategyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white flex items-center justify-between shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  <h2 className="text-base sm:text-xl font-extrabold tracking-tight">Automated Portfolio Strategy Index & Admissions Alignment</h2>
                </div>
                <p className="text-xs text-indigo-200">
                  Comprehensive Evaluation: T-Shaped Profile Framework, Target vs Achieved Benchmarks, and Major Alignment
                </p>
              </div>
              <button 
                onClick={() => setIsStrategyModalOpen(false)}
                className="p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1 text-slate-800">

              {/* Section 1: The T-Shaped Profile & Admissions Analogy Framework */}
              <div className="p-5 bg-gradient-to-br from-indigo-50/90 via-slate-50 to-blue-50/80 border border-indigo-200/80 rounded-2xl space-y-3 shadow-2xs">
                <div className="flex items-center justify-between gap-2 flex-wrap border-b border-indigo-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-sm font-extrabold text-indigo-950 uppercase tracking-wider">
                      Admissions Officer Strategic Framework: The T-Shaped Profile
                    </h3>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-600 text-white shadow-2xs">
                    Target Major: {currentMajorInfo.label}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700 leading-relaxed pt-1">
                  <div className="p-3.5 bg-white/90 border border-indigo-100 rounded-xl space-y-2">
                    <div className="font-bold text-indigo-950 flex items-center gap-1.5 text-xs">
                      <Award className="w-4 h-4 text-indigo-600" />
                      <span>The Vertical Stem (The Academic Spike)</span>
                    </div>
                    <p className="text-slate-600">
                      Top universities (Ivy League, Stanford, Top 20) do <strong>not</strong> build a freshman class out of "well-rounded" students who do a little bit of everything. Instead, they assemble a <strong>well-rounded class composed of spiked specialists</strong> — pairing the top student researcher, the national tech builder, the passionate community organizer, and the creative writer. Your vertical spike is your primary academic engine.
                    </p>
                  </div>

                  <div className="p-3.5 bg-white/90 border border-indigo-100 rounded-xl space-y-2">
                    <div className="font-bold text-indigo-950 flex items-center gap-1.5 text-xs">
                      <Zap className="w-4 h-4 text-cyan-600" />
                      <span>The Horizontal Bar (Engagement Width)</span>
                    </div>
                    <p className="text-slate-600">
                      Your horizontal bar represents cross-disciplinary breadth and versatility (Communication, Teamwork, Leadership, Creativity). It proves to admissions committees that you are not an isolated lone worker, but a collaborative, adaptable team player ready to contribute to residential campus life.
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 2: Deep Admissions Spike Assessment */}
              <div className="p-5 bg-white border border-slate-200/90 rounded-2xl space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                      Deep Spike Analysis & Major Alignment Synergy
                    </h3>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                    Top Spike: {topCompetency.name} ({topCompetency.score.toFixed(1)} / 10.0)
                  </span>
                </div>

                <div className="space-y-3 text-xs sm:text-sm text-slate-700 leading-relaxed">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                      <Target className="w-4 h-4 text-indigo-600" /> Major Synergy Evaluation for "{currentMajorInfo.label}"
                    </h4>
                    <p className="text-slate-600 text-xs">
                      <strong>Expected Major Spikes:</strong> {currentMajorInfo.expectedSpikes.map(id => COMPETENCIES.find(c => c.id === id)?.name).filter(Boolean).join(', ')}.
                    </p>
                    <p className="text-slate-700 text-xs leading-relaxed pt-1">
                      {isSpikeProminent ? (
                        isSpikeAlignedWithMajor ? (
                          <>
                            <strong>Direct Academic Synergy:</strong> Your primary spike in <strong>{topCompetency.name}</strong> ({topCompetency.score.toFixed(1)}/10.0) directly matches expected core competencies for <strong>{currentMajorInfo.label}</strong>. In holistic admissions, this signals an applicant who is already driving field-specific research, problem-solving, or technical execution.
                          </>
                        ) : (
                          <>
                            <strong>Secondary Talent Pillar (The Musician-Scientist Archetype):</strong> Your primary spike in <strong>{topCompetency.name}</strong> ({topCompetency.score.toFixed(1)}/10.0) is a strong personal distinction, but sits outside the primary academic vectors expected for <strong>{currentMajorInfo.label}</strong>. Admissions officers view this as a positive secondary talent pillar, but will still search your profile for a secondary academic spike in expected major vectors.
                          </>
                        )
                      ) : (
                        <>
                          <strong>Flattop Profile Warning:</strong> Your competency profile shows a balanced/flat curve with a top score of <strong>{topCompetency.score.toFixed(1)}/10.0</strong>. At Top 20 universities, flat profiles risk being filtered out during committee deliberations as 'jack-of-all-trades' applications. Concentrate your supercurricular hours to elevate 1–2 target vectors above 4.0+.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 3: Target vs Achieved Detailed Comparison Matrix */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Target vs Achieved: Commitment Depth */}
                <div className="p-5 bg-white border border-slate-200/90 rounded-2xl space-y-4 shadow-2xs flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                        <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                          Commitment Depth: Target vs Achieved
                        </h4>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {portfolioCommitmentDepth.tierLabel.split(':')[0]}
                      </span>
                    </div>

                    <div className="p-3.5 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-700">Achieved: <span className="text-emerald-800">{portfolioCommitmentDepth.totalHours} Annual Hours</span></span>
                        <span className="text-slate-500">Target: <span className="text-slate-900">300+ Annual Hours</span></span>
                      </div>

                      <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className="h-2.5 rounded-full bg-emerald-600 transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.round((portfolioCommitmentDepth.totalHours / 300) * 100))}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-emerald-900 font-semibold text-right">
                        {Math.min(100, Math.round((portfolioCommitmentDepth.totalHours / 300) * 100))}% of Tier 1 Elite Benchmark
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 leading-relaxed">
                      <p>• <strong>Logged Activities:</strong> {portfolioCommitmentDepth.highCommitmentCount} high-commitment / leadership entries</p>
                      <p>• <strong>Average Commitment:</strong> {portfolioCommitmentDepth.avgWeeklyHours} hours/week across entries</p>
                      <p>• <strong>Strategic Rationale:</strong> Admissions officers measure depth to distinguish genuine passion from artificial resume padding. Sustained 300+ hours demonstrate multi-year commitment and leadership continuity.</p>
                    </div>
                  </div>
                </div>

                {/* Target vs Achieved: Engagement Width */}
                <div className="p-5 bg-white border border-slate-200/90 rounded-2xl space-y-4 shadow-2xs flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-cyan-600" />
                        <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                          Engagement Width: Target vs Achieved
                        </h4>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-200">
                        {portfolioEngagementWidth.widthLabel.split('(')[0].trim()}
                      </span>
                    </div>

                    <div className="p-3.5 bg-cyan-50/50 border border-cyan-100 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-700">Achieved: <span className="text-cyan-800">{portfolioEngagementWidth.activeVectorsCount} / 6 Active Vectors</span></span>
                        <span className="text-slate-500">Target: <span className="text-slate-900">3 – 4 Core Vectors</span></span>
                      </div>

                      <div className="grid grid-cols-6 gap-1.5 pt-1">
                        {COMPETENCIES.map((c, idx) => {
                          const isActive = (competencyScores[c.id] || 0) > 0;
                          return (
                            <div 
                              key={c.id} 
                              className={cn(
                                "p-1 rounded-md text-center text-[9px] font-bold transition-all",
                                isActive ? "bg-cyan-600 text-white shadow-2xs" : "bg-slate-100 text-slate-400 border border-slate-200"
                              )}
                            >
                              {c.name.split(' ')[0]}
                            </div>
                          );
                        })}
                      </div>
                      <div className="text-[10px] text-cyan-900 font-semibold text-right">
                        {portfolioEngagementWidth.activeVectorsCount >= 3 && portfolioEngagementWidth.activeVectorsCount <= 4 ? 'Optimal T-Shaped Balance' : 'Adjust Focus towards 3–4 Vectors'}
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 leading-relaxed">
                      <p>• <strong>Active Dimensions:</strong> {portfolioEngagementWidth.activeVectorsCount} out of 6 competency vectors mapped</p>
                      <p>• <strong>Vector Gaps:</strong> {identifiedGaps.length > 0 ? identifiedGaps.map(g => g.name).join(', ') : 'None identified'}</p>
                      <p>• <strong>Strategic Rationale:</strong> Covering 3–4 vectors provides the ideal horizontal bar for your T-shaped profile. Covering all 6 vectors thinly risks diluting your spike, while covering only 1 vector can appear overly narrow.</p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Section 4: Actionable Admissions Guidance */}
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Target className="w-4 h-4 text-indigo-600" /> Strategic Action Plan for Profile Elevation
                </h3>
                <ul className="space-y-2 text-xs text-slate-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Elevate Key Roles:</strong> Upgrade core participant entries into student-led initiatives, founder roles, or committee captainships to boost competency weightage and role multipliers.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Sustain Dedicated Hours:</strong> Aim for at least 300+ total annual hours across core endeavors to hit the Tier 1 Depth threshold expected at Ivy/Top 20 institutions.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Focus Width on 3–4 Vectors:</strong> {identifiedGaps.length > 0 ? `Target missing vectors expected for ${currentMajorInfo.label} (${identifiedGaps.map(g => g.name).join(', ')}) with dedicated supercurricular projects.` : 'Maintain active engagement across your 3-4 core vector domains to preserve T-shaped balance.'}</span>
                  </li>
                </ul>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <Button onClick={() => setIsStrategyModalOpen(false)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 rounded-xl cursor-pointer">
                Close Report
              </Button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
