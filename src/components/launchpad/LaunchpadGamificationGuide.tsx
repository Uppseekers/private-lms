import React, { useState } from 'react';
import { Trophy, Zap, Star, Award, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RankTier {
  name: string;
  minXP: number;
  maxXP: number | null;
  rangeLabel: string;
}

const RANK_TIERS: RankTier[] = [
  { name: 'Starter', minXP: 0, maxXP: 299, rangeLabel: '0–299 XP' },
  { name: 'Explorer', minXP: 300, maxXP: 799, rangeLabel: '300–799 XP' },
  { name: 'Scholar', minXP: 800, maxXP: 1499, rangeLabel: '800–1,499 XP' },
  { name: 'Launchpad Fellow', minXP: 1500, maxXP: 2499, rangeLabel: '1,500–2,499 XP' },
  { name: 'Trailblazer', minXP: 2500, maxXP: null, rangeLabel: '2,500+ XP' },
];

interface LaunchpadGamificationGuideProps {
  mode?: 'student' | 'team';
  totalEarnedXP?: number;
  certifiedCount?: number;
  totalSubjects?: number;
}

export function LaunchpadGamificationGuide({
  mode = 'student',
  totalEarnedXP = 0,
  certifiedCount = 0,
  totalSubjects = 8,
}: LaunchpadGamificationGuideProps) {
  const storageKey =
    mode === 'student'
      ? 'uppseekers_lp_gamification_open_student_v1'
      : 'uppseekers_lp_gamification_open_team_v1';

  const [isOpen, setIsOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) return saved === 'true';
    } catch {
      // ignore storage errors
    }
    return mode === 'student';
  });

  const handleToggle = () => {
    setIsOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(storageKey, String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  let currentTierIndex = 0;
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (totalEarnedXP >= RANK_TIERS[i].minXP) {
      currentTierIndex = i;
      break;
    }
  }
  const currentTier = RANK_TIERS[currentTierIndex];
  const nextTier = RANK_TIERS[currentTierIndex + 1] || null;

  const xpIntoTier = totalEarnedXP - currentTier.minXP;
  const tierSpan = nextTier ? nextTier.minXP - currentTier.minXP : 1;
  const tierProgressPct = nextTier
    ? Math.min(100, Math.max(0, Math.round((xpIntoTier / tierSpan) * 100)))
    : 100;
  const xpToNextRank = nextTier ? Math.max(0, nextTier.minXP - totalEarnedXP) : 0;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      {/* Top Interactive Summary Bar */}
      <div className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {mode === 'student' ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 min-w-0 flex-1">
            <div className="flex items-center gap-2.5 shrink-0">
              <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
              <div className="text-xs sm:text-sm text-slate-900 font-semibold whitespace-nowrap">
                Rank: {currentTier.name}
              </div>
              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>
              <span className="text-xs sm:text-sm font-semibold text-indigo-700 tabular-nums whitespace-nowrap">
                {totalEarnedXP.toLocaleString()} XP
              </span>
            </div>

            <div className="flex items-center gap-3 flex-1 max-w-md">
              <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-600 transition-transform duration-200 origin-left"
                  style={{ transform: `scaleX(${tierProgressPct / 100})` }}
                />
              </div>
              <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap shrink-0">
                {nextTier
                  ? `${xpToNextRank.toLocaleString()} XP to ${nextTier.name}`
                  : `Max Rank · ${certifiedCount}/${totalSubjects} Certified`}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700">
            <Zap className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="font-semibold text-slate-900">Launchpad Gamification System</span>
            <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
              ·
            </span>
            <span className="text-slate-500 hidden sm:inline">
              XP economy, 5 student ranks, weekly milestone stars, and certification gates
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={handleToggle}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <span>{isOpen ? 'Hide Guide' : 'How XP, Stars & Ranks Work'}</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Crisp 4-Column Breakdown */}
      {isOpen && (
        <div className="border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 text-left">
          {/* Column 1: XP Economy */}
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">01. Earn XP</h3>
              <Zap className="w-4 h-4 text-indigo-600 shrink-0" />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Every weekly chapter awards up to 150 XP across 3 steps, plus a certification bonus.
            </p>
            <dl className="space-y-1.5 text-xs pt-1 tabular-nums">
              <div className="flex items-center justify-between text-slate-700">
                <dt>Reading Guide</dt>
                <dd className="font-semibold text-slate-900">+50 XP</dd>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <dt>Video Lecture</dt>
                <dd className="font-semibold text-slate-900">+50 XP</dd>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <dt>Practical Exercise</dt>
                <dd className="font-semibold text-slate-900">+50 XP</dd>
              </div>
              <div className="flex items-center justify-between text-indigo-700 pt-1 border-t border-slate-100">
                <dt className="font-medium">Final Certification Pass</dt>
                <dd className="font-bold">+200 XP</dd>
              </div>
            </dl>
          </div>

          {/* Column 2: 5 Rank Tiers */}
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">02. Climb 5 Ranks</h3>
              <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Cumulative XP across all unlocked subjects automatically promotes your rank.
            </p>
            <dl className="space-y-1.5 text-xs pt-1 tabular-nums">
              {RANK_TIERS.map((tier) => {
                const isCurrent = mode === 'student' && tier.name === currentTier.name;
                return (
                  <div
                    key={tier.name}
                    className={cn(
                      'flex items-center justify-between',
                      isCurrent ? 'text-indigo-700 font-bold' : 'text-slate-600'
                    )}
                  >
                    <dt className="truncate pr-2">
                      {tier.name}
                      {isCurrent ? ' (You)' : ''}
                    </dt>
                    <dd className="shrink-0">{tier.rangeLabel}</dd>
                  </div>
                );
              })}
            </dl>
          </div>

          {/* Column 3: Weekly Stars & Sequential Unlocks */}
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">03. Weekly Stars</h3>
              <Star className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0" />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Chapters unlock in order—submitting Week 1&apos;s exercise unlocks Week 2.
            </p>
            <div className="space-y-2 text-xs pt-1">
              <div className="flex items-start gap-2 text-slate-700">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-900">Gold Star:</strong> Earned as soon as that week&apos;s practical worksheet is submitted.
                </span>
              </div>
              <div className="flex items-start gap-2 text-slate-700">
                <Star className="w-3.5 h-3.5 text-rose-500 fill-rose-100 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-rose-700">Rose Star:</strong> Counselor requested revisions—resubmit to restore your gold star.
                </span>
              </div>
            </div>
          </div>

          {/* Column 4: Final Exam & Certificate */}
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">04. Get Certified</h3>
              <Award className="w-4 h-4 text-emerald-600 shrink-0" />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Finish all 3 steps in every week to unlock the subject&apos;s Final Certification Test.
            </p>
            <div className="space-y-1.5 text-xs text-slate-700 pt-1 tabular-nums">
              <p>
                <strong className="text-slate-900">Timed Exam:</strong> 20-minute assessment combining MCQs (70%) and situational responses (30%).
              </p>
              <p>
                <strong className="text-slate-900">Reward:</strong> Score 75%+ (or subject threshold) to earn +200 XP and a verifiable certificate.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
