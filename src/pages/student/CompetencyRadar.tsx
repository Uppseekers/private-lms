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
  Table as TableIcon
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
    keywords: ['research', 'academics', 'olympiads', 'debates', 'logic', 'analysis', 'evaluate', 'critique', 'strategy', 'theory', 'investigative', 'audit', 'study', 'hypothesis', 'proof', 'literature', 'synthesis', 'papers', 'philosophy'],
    description: 'Research, Academics, Olympiads, Debates, Logic, Analysis'
  },
  {
    id: 'problem_solving',
    name: 'Problem Solving',
    color: '#06b6d4', // cyan-500
    bgLight: 'bg-cyan-50 text-cyan-700',
    borderLight: 'border-cyan-200',
    categoryTriggers: ['Leadership & STEM', 'STEM', 'STEM & Science'],
    keywords: ['stem', 'algorithms', 'engineering', 'hackathons', 'robotics', 'sciences', 'solve', 'debug', 'troubleshoot', 'optimize', 'innovate', 'resolve', 'fix', 'challenge', 'solution', 'diagnostic', 'inventions', 'capstone'],
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
    keywords: ['athletics', 'sports', 'clubs', 'committees', 'volunteering', 'orchestras', 'bands', 'team', 'collaborate', 'member', 'partner', 'organize', 'peer', 'volunteer', 'community', 'coordination', 'mentor', 'outreach', 'varsity', 'tournaments', 'charity'],
    description: 'Athletics/Sports, Clubs, Committees, Volunteering, Orchestras/Bands'
  },
  {
    id: 'creativity',
    name: 'Creativity',
    color: '#eab308', // yellow-500
    bgLight: 'bg-amber-50 text-amber-800',
    borderLight: 'border-amber-200',
    categoryTriggers: ['Arts, Music & Design', 'Arts & Music', 'Art & Music'],
    keywords: ['art', 'music', 'ui/ux design', 'creative writing', 'film', 'architecture', 'design', 'create', 'compose', 'paint', 'build', 'perform', 'produce', 'artistic', 'novel', 'concept', 'media', 'theater', 'prototype', 'animation', 'story'],
    description: 'Art & Music, UI/UX Design, Creative Writing, Film, Architecture'
  },
  {
    id: 'technical_skills',
    name: 'Technical Skills',
    color: '#f97316', // orange-500
    bgLight: 'bg-orange-50 text-orange-700',
    borderLight: 'border-orange-200',
    categoryTriggers: ['Coding & Engineering', 'Internship & Projects', 'Internship & Work'],
    keywords: ['code', 'software', 'hardware', 'arduino', 'labs', 'data analytics', 'program', 'python', 'java', 'cad', 'experiment', 'biotech', 'web', 'ai', 'machine learning', 'circuit', 'biology', 'chemistry', 'physics', 'app launches'],
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
    return { points: 0.5, category: 'Light Commitment (< 25 hrs/yr)' };
  } else if (annualHours <= 99) {
    return { points: 1.0, category: 'Moderate Commitment (25 – 99 hrs/yr)' };
  } else {
    return { points: 1.5, category: 'High Commitment (≥ 100 hrs/yr)' };
  }
}

function getRoleMetrics(roleRaw: string): { bonus: number; multiplier: number; label: string } {
  const r = (roleRaw || '').toLowerCase();
  if (r.includes('founder') || r.includes('initiator') || r.includes('director')) {
    return { bonus: 0.5, multiplier: 1.5, label: 'Founder / Initiator (+0.5 Bonus, 1.5× Multiplier)' };
  } else if (r.includes('leadership') || r.includes('officer') || r.includes('captain') || r.includes('president')) {
    return { bonus: 0.3, multiplier: 1.3, label: 'Leadership / Officer (+0.3 Bonus, 1.3× Multiplier)' };
  } else if (r.includes('core') || r.includes('lead') || r.includes('treasurer') || r.includes('secretary') || r.includes('vice')) {
    return { bonus: 0.15, multiplier: 1.15, label: 'Core Member / Lead (+0.15 Bonus, 1.15× Multiplier)' };
  } else {
    return { bonus: 0.0, multiplier: 1.0, label: 'Individual Participant (1.0× Multiplier)' };
  }
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

  // Profile Intended Majors from Section 4
  const profileMajor1 = currentStudent?.major1 || '';
  const profileMajor2 = currentStudent?.major2 || '';

  // Selected major view mode: 'major1' | 'major2' | preset id
  const [selectedMajorSource, setSelectedMajorSource] = useState<string>('major1');

  // Extract Profile Activities from Section 6
  const profileActivities: ActivityRecord[] = useMemo(() => {
    const rawList = [
      ...(currentStudent?.activities || []),
      ...(currentStudent?.extracurriculars || [])
    ];

    if (!rawList || rawList.length === 0) return [];

    const seen = new Set<string>();
    const result: ActivityRecord[] = [];

    rawList.forEach((act: any, idx: number) => {
      const rawTitle = act.title || act.description || act.organization || `Activity #${idx + 1}`;
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
        description: act.description || `${act.organization ? act.organization + ' - ' : ''}${rawTitle}`
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

      // 1. Matrix Domain Mapping Check
      DOMAIN_COVERAGE_MATRIX.forEach(domain => {
        const catMatch = domain.categoryTriggers.some(c => act.category.toLowerCase().includes(c.toLowerCase()));
        const indicatorMatch = domain.indicators.some(ind => fullText.includes(ind.toLowerCase()));

        if (catMatch || indicatorMatch) {
          const matchLabel = catMatch ? `Domain: ${domain.fieldType}` : `Keywords (${domain.fieldType})`;

          // Primary vectors get 100% points
          domain.primaryVectors.forEach(vecId => {
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
          domain.secondaryVectors.forEach(vecId => {
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
      });

      // 2. Direct Fallback Competency Keyword Check (if not already mapped)
      COMPETENCIES.forEach(comp => {
        let isMatch = false;
        let matchReason = '';

        if (comp.categoryTriggers.some(c => act.category.toLowerCase().includes(c.toLowerCase()))) {
          isMatch = true;
          matchReason = `Category (${act.category})`;
        }

        comp.keywords.forEach(kw => {
          if (fullText.includes(kw.toLowerCase())) {
            isMatch = true;
            matchReason = matchReason ? `${matchReason}, Keyword (${kw})` : `Keyword (${kw})`;
          }
        });

        if (isMatch && !matchedVectorsForThisAct.some(v => v.includes(comp.name))) {
          rawScores[comp.id] += calculatedPoints;
          matchedVectorsForThisAct.push(comp.name);
          vectorMatchDetails[comp.id].push({
            activityTitle: act.title,
            points: calculatedPoints,
            reason: matchReason,
            roleLabel: roleInfo.label,
            hoursLabel: baseInfo.category
          });
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
        mappedVectors: matchedVectorsForThisAct
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

          {/* Activity Breakdown Vault Card (Synced Read-Only View) */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-indigo-600" /> Synced Profile Building Activities ({profileActivities.length})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Live synced from Section 6 (Profile Building) of the Student Profile
                </p>
              </div>

              {!isTeamView && (
                <Link to="/student/profile">
                  <Button size="sm" variant="outline" className="text-xs font-bold h-8 px-3 rounded-xl border-indigo-200 text-indigo-700 hover:bg-indigo-50 flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5" /> Edit Section 6
                  </Button>
                </Link>
              )}
            </div>

            {/* Read-Only Notice */}
            <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl flex items-center gap-2 text-xs text-indigo-900">
              <Lock className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                Scores update automatically when activities are updated or added in Section 6 (Profile Building).
              </span>
            </div>

            {/* Detailed Activity Breakdown Cards */}
            <div className="space-y-3">
              {activityBreakdown.length > 0 ? (
                activityBreakdown.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="p-4 bg-slate-50/90 border border-slate-200/90 rounded-xl space-y-2.5 transition-all hover:border-indigo-200"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span className="font-bold text-xs text-slate-900 block">{item.title}</span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {item.roleLabel}
                          </span>
                          <span className="text-[10px] font-medium bg-slate-200/70 text-slate-700 px-2 py-0.5 rounded-md">
                            {item.baseCategory}
                          </span>
                        </div>
                      </div>

                      {/* Weightage points shown on Team View */}
                      {isTeamView && (
                        <div className="text-right shrink-0">
                          <span className="text-xs font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg inline-block">
                            +{item.totalPoints} pts
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-200/60 gap-1">
                      <span className="flex items-center gap-1 font-medium text-slate-600">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {item.annualHours} Annual Hours
                      </span>
                      <span className="text-slate-600 font-semibold">
                        Mapped Vectors: {item.mappedVectors.length > 0 ? item.mappedVectors.join(', ') : 'General'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl space-y-3">
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

            {/* Live Vector Score Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
              {COMPETENCIES.map((comp) => {
                const score = competencyScores[comp.id] || 0;
                const matches = matchedActivitiesByVector[comp.id] || [];
                const percent = Math.min(100, (score / 10.0) * 100);

                return (
                  <div
                    key={comp.id}
                    onMouseEnter={() => setHoveredCompetency(comp.id)}
                    onMouseLeave={() => setHoveredCompetency(null)}
                    className={cn(
                      "p-2.5 rounded-xl border transition-all cursor-pointer space-y-1.5",
                      hoveredCompetency === comp.id ? "ring-2 ring-indigo-500 bg-white shadow-xs" : "bg-slate-50/70 border-slate-200/80"
                    )}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-800 truncate" style={{ color: comp.color }}>
                        {comp.name}
                      </span>
                      <span className="font-extrabold text-slate-900">{score.toFixed(1)}</span>
                    </div>

                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%`, backgroundColor: comp.color }}
                      />
                    </div>

                    <div className="text-[9px] text-slate-500 truncate" title={comp.description}>
                      {matches.length > 0 ? `${matches.length} activity ${matches.length === 1 ? 'contribution' : 'contributions'}` : 'No activity matches'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Automated Portfolio Strategy Index */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" /> Automated Portfolio Strategy Index
              </h3>
              <p className="text-[11px] text-slate-500">Holistic evaluation based on university admissions assessment standards</p>
            </div>

            {/* Portfolio Coverage & Gaps Meter */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-indigo-600" /> Portfolio Coverage Index
                </span>
                <span className="text-sm font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-lg">
                  {portfolioCoveragePct}% Overall Balance
                </span>
              </div>

              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="h-2.5 rounded-full bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-500 transition-all duration-700"
                  style={{ width: `${portfolioCoveragePct}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium pt-0.5">
                <span>0% (Developing)</span>
                <span>50% (Balanced Matrix)</span>
                <span>100% (Standout Spike & Coverage)</span>
              </div>
            </div>

            {/* Dominant Competencies & Identified Gaps Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* Dominant Competency Card */}
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs">
                  <Award className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Dominant Competency</span>
                </div>
                <div className="text-sm font-extrabold text-slate-900">
                  {topCompetency.name} ({topCompetency.score} / 10.0)
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {isSpikeAlignedWithMajor ? (
                    <>Strong alignment with target field in <strong>{currentMajorInfo.label}</strong>.</>
                  ) : (
                    <>Provides a strong secondary pillar alongside <strong>{currentMajorInfo.label}</strong>.</>
                  )}
                </p>
              </div>

              {/* Identified Gaps Card */}
              <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Identified Gaps ({identifiedGaps.length})</span>
                </div>
                <div className="text-xs font-bold text-slate-800">
                  {identifiedGaps.length > 0 ? (
                    identifiedGaps.map(g => g.name).join(', ')
                  ) : (
                    'No critical gaps identified!'
                  )}
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {identifiedGaps.length > 0 ? (
                    <>Focus on adding activities matching these vector domains to balance coverage.</>
                  ) : (
                    <>High overall balance across vector domains.</>
                  )}
                </p>
              </div>

            </div>

            {/* Strategic Admissions Officer Profile Synthesis */}
            <div className="p-4 bg-indigo-50/80 border border-indigo-100 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center gap-2 text-indigo-950 font-bold">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Admissions Strategy & Guidance</span>
              </div>

              <p className="text-slate-700 leading-relaxed text-[11px]">
                {isSpikeProminent && isSpikeAlignedWithMajor ? (
                  <>
                    The student profile exhibits a distinct <strong>{topCompetency.name}</strong> spike that directly supports target applications in <strong>{currentMajorInfo.label}</strong>. Top-tier university admissions favor candidates with clear domain depth supported by meaningful leadership roles.
                  </>
                ) : (
                  <>
                    The student's top competency is <strong>{topCompetency.name} ({topCompetency.score}/10)</strong>. To optimize the profile for <strong>{currentMajorInfo.label}</strong>, focus on converting key activities into high-commitment entries with initiative or leadership roles.
                  </>
                )}
              </p>

              <div className="pt-2 border-t border-indigo-100/80 space-y-1">
                <span className="text-[10px] font-bold text-indigo-900 uppercase block">Actionable Recommendations:</span>
                <ul className="list-disc list-inside text-[11px] text-slate-600 space-y-1">
                  <li>In Section 6 (Profile Building), emphasize student-led initiatives and leadership positions for maximum impact.</li>
                  <li>Log consistent weekly hours and weeks per year to demonstrate high commitment and sustained dedication.</li>
                  <li>Include specific project descriptions and domain keywords for accurate multi-vector competency mapping.</li>
                </ul>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
