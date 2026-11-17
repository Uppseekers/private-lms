import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  GraduationCap, 
  MapPin, 
  Calendar, 
  IndianRupee, 
  SlidersHorizontal, 
  Layers, 
  CheckCircle2, 
  X, 
  Clock, 
  ArrowUpDown, 
  Sparkles, 
  Printer, 
  Info,
  ChevronDown
} from 'lucide-react';
import { TOP_100_UNIVERSITIES, UniversityRecord } from '@/data/universitiesData';
import { calculateAdmissionStatus, AdmissionCategory } from '@/lib/admissionsEngine';
import { UniversityCard } from '@/components/universities/UniversityCard';
import { UniversityComparisonModal } from '@/components/universities/UniversityComparisonModal';
import { ShortlistToStudentModal } from '@/components/universities/ShortlistToStudentModal';
import { UniversityDetailsModal } from '@/components/universities/UniversityDetailsModal';
import { cn } from '@/lib/utils';

// Country region groupings
const REGION_MAP: Record<string, string[]> = {
  'USA': ['USA'],
  'UK': ['UK'],
  'Australia & NZ': ['Australia', 'New Zealand'],
  'Canada': ['Canada'],
  'Singapore & HK': ['Singapore', 'Hong Kong SAR'],
  'Europe': ['Switzerland', 'Germany', 'France', 'Netherlands', 'Sweden', 'Ireland', 'Belgium', 'Italy', 'Denmark'],
  'East & SE Asia': ['China', 'South Korea', 'Japan', 'Taiwan', 'Malaysia', 'Saudi Arabia'],
};

export default function TeamUniversities() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('All');
  const [selectedCountry, setSelectedCountry] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closing_soon' | 'rolling' | 'closed'>('all');
  const [maxTuitionInr, setMaxTuitionInr] = useState<number>(85);
  const [currencyView, setCurrencyView] = useState<'inr' | 'local' | 'both'>('both');
  const [sortBy, setSortBy] = useState<'rank' | 'tuition_asc' | 'tuition_desc' | 'days_left'>('rank');

  // Modals state
  const [selectedForCompare, setSelectedForCompare] = useState<UniversityRecord[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [detailsUni, setDetailsUni] = useState<UniversityRecord | null>(null);
  const [shortlistUni, setShortlistUni] = useState<UniversityRecord | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Region count compute
  const regionCounts = useMemo(() => {
    const counts: Record<string, number> = { All: TOP_100_UNIVERSITIES.length };
    Object.entries(REGION_MAP).forEach(([region, countries]) => {
      counts[region] = TOP_100_UNIVERSITIES.filter(u => countries.includes(u.country)).length;
    });
    return counts;
  }, []);

  // Distinct countries list
  const allCountries = useMemo(() => {
    const set = new Set<string>();
    TOP_100_UNIVERSITIES.forEach(u => set.add(u.country));
    return Array.from(set).sort();
  }, []);

  // Toggle compare selection
  const handleToggleCompare = (uni: UniversityRecord) => {
    if (selectedForCompare.some(u => u.id === uni.id)) {
      setSelectedForCompare(prev => prev.filter(u => u.id !== uni.id));
    } else {
      if (selectedForCompare.length >= 4) {
        alert('You can select up to 4 universities for side-by-side comparison.');
        return;
      }
      setSelectedForCompare(prev => [...prev, uni]);
    }
  };

  // Filtered and sorted universities
  const filteredUniversities = useMemo(() => {
    return TOP_100_UNIVERSITIES.filter(uni => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = uni.name.toLowerCase().includes(query);
        const matchesCountry = uni.country.toLowerCase().includes(query);
        const matchesCampus = uni.campus.toLowerCase().includes(query);
        const matchesWhy = uni.whyStudyHere.toLowerCase().includes(query);
        const matchesRoute = uni.applicationRoute.toLowerCase().includes(query);
        if (!matchesName && !matchesCountry && !matchesCampus && !matchesWhy && !matchesRoute) {
          return false;
        }
      }

      // 2. Region Segmentation
      if (selectedRegion !== 'All') {
        const allowedCountries = REGION_MAP[selectedRegion] || [];
        if (!allowedCountries.includes(uni.country)) return false;
      }

      // 3. Country filter
      if (selectedCountry !== 'All') {
        if (uni.country !== selectedCountry) return false;
      }

      // 4. Tuition Max (INR Lakhs)
      if (maxTuitionInr < 85) {
        if (uni.tuitionMinInrLakh > maxTuitionInr) return false;
      }

      // 5. Admission Status Filter
      if (statusFilter !== 'all') {
        const status = calculateAdmissionStatus(uni);
        if (statusFilter === 'open' && (status.category !== 'open' && status.category !== 'closing_soon' && status.category !== 'rolling')) return false;
        if (statusFilter === 'closing_soon' && status.category !== 'closing_soon') return false;
        if (statusFilter === 'rolling' && status.category !== 'rolling') return false;
        if (statusFilter === 'closed' && status.category !== 'closed') return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'rank') {
        return a.rank - b.rank;
      }
      if (sortBy === 'tuition_asc') {
        return a.tuitionMinInrLakh - b.tuitionMinInrLakh;
      }
      if (sortBy === 'tuition_desc') {
        return b.tuitionMaxInrLakh - a.tuitionMaxInrLakh;
      }
      if (sortBy === 'days_left') {
        const statusA = calculateAdmissionStatus(a);
        const statusB = calculateAdmissionStatus(b);
        const daysA = statusA.daysRemaining ?? 999;
        const daysB = statusB.daysRemaining ?? 999;
        return daysA - daysB;
      }
      return 0;
    });
  }, [searchQuery, selectedRegion, selectedCountry, maxTuitionInr, statusFilter, sortBy]);

  const handleShortlistSuccess = (studentName: string) => {
    setSuccessToast(`Successfully shortlisted ${shortlistUni?.name} for ${studentName}!`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-sm animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <GraduationCap className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Global Universities Directory & Admissions Radar
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time QS Top 100 deadlines, parent tuition analytics in ₹ Lakhs, side-by-side comparison, and direct student portfolio shortlisting.
          </p>
        </div>

        {/* Real-time sync note & print summary */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            <span>As of Today · Live 2027/2028 Deadlines</span>
          </div>

          {selectedForCompare.length > 0 && (
            <button
              onClick={() => setIsCompareModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Compare ({selectedForCompare.length})</span>
            </button>
          )}

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print Sheet</span>
          </button>
        </div>
      </div>

      {/* Country Wise Segmentation Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {['All', 'USA', 'UK', 'Australia & NZ', 'Canada', 'Singapore & HK', 'Europe', 'East & SE Asia'].map(region => (
          <button
            key={region}
            onClick={() => {
              setSelectedRegion(region);
              setSelectedCountry('All');
            }}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 shrink-0",
              selectedRegion === region
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
            )}
          >
            <span>{region}</span>
            <span className={cn(
              "text-[10px] font-mono px-1.5 py-0.2 rounded-full",
              selectedRegion === region 
                ? "bg-indigo-700 text-indigo-100" 
                : "bg-slate-100 dark:bg-slate-700 text-slate-500"
            )}>
              {regionCounts[region] ?? 0}
            </span>
          </button>
        ))}

        {/* Specific Country Dropdown */}
        <div className="relative shrink-0 ml-1">
          <select
            value={selectedCountry}
            onChange={e => {
              setSelectedCountry(e.target.value);
              setSelectedRegion('All');
            }}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="All">Specific Country (All {allCountries.length})</option>
            {allCountries.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          
          {/* Search Input */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by university name, campus, country, or academic strength..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Admission Status Filter */}
          <div className="md:col-span-4">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Admission Status: All Active & Closed</option>
              <option value="open">Active Rounds (RD Open / EA Open / Rolling)</option>
              <option value="closing_soon">Closing Soon (≤ 25 Days Remaining)</option>
              <option value="rolling">Rolling Admissions Only (e.g. Australia)</option>
              <option value="closed">Closed for 2027 (Plan 2028 Intake)</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="md:col-span-3">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="rank">Sort: QS Rank (Top 100)</option>
              <option value="days_left">Sort: Deadline Approaching Soonest</option>
              <option value="tuition_asc">Sort: Tuition (Low to High ₹)</option>
              <option value="tuition_desc">Sort: Tuition (High to Low ₹)</option>
            </select>
          </div>
        </div>

        {/* Second Row: Tuition Slider & Currency Toggles */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          
          {/* Tuition Cap Slider */}
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <span className="text-slate-500 font-medium whitespace-nowrap">
              Max Tuition:
            </span>
            <input
              type="range"
              min="5"
              max="85"
              step="5"
              value={maxTuitionInr}
              onChange={e => setMaxTuitionInr(parseInt(e.target.value, 10))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200 min-w-[70px] text-right">
              {maxTuitionInr >= 85 ? 'Any (₹85L+)' : `≤ ₹${maxTuitionInr} L`}
            </span>
            {maxTuitionInr < 85 && (
              <button
                onClick={() => setMaxTuitionInr(85)}
                className="text-[11px] text-indigo-600 hover:underline"
              >
                Reset
              </button>
            )}
          </div>

          {/* Currency Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-slate-500 font-medium">Currency View:</span>
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800">
              <button
                onClick={() => setCurrencyView('inr')}
                className={cn(
                  "px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors",
                  currencyView === 'inr' 
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs" 
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                ₹ Lakhs
              </button>
              <button
                onClick={() => setCurrencyView('local')}
                className={cn(
                  "px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors",
                  currencyView === 'local' 
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs" 
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                Native
              </button>
              <button
                onClick={() => setCurrencyView('both')}
                className={cn(
                  "px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors",
                  currencyView === 'both' 
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs" 
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                Both
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <div>
          Showing <span className="font-semibold text-slate-900 dark:text-white font-mono">{filteredUniversities.length}</span> of {TOP_100_UNIVERSITIES.length} universities
          {selectedRegion !== 'All' && ` in ${selectedRegion}`}
          {selectedCountry !== 'All' && ` (${selectedCountry})`}
          {statusFilter !== 'all' && ` · ${statusFilter.replace('_', ' ')}`}
          {maxTuitionInr < 85 && ` · budget ≤ ₹${maxTuitionInr} Lakhs`}
        </div>

        {selectedForCompare.length > 0 && (
          <div className="flex items-center gap-2">
            <span>{selectedForCompare.length} selected for comparison</span>
            <button
              onClick={() => setSelectedForCompare([])}
              className="text-rose-600 hover:underline"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Universities Card Grid */}
      {filteredUniversities.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredUniversities.map(uni => (
            <UniversityCard
              key={uni.id}
              university={uni}
              isSelectedForCompare={selectedForCompare.some(u => u.id === uni.id)}
              onToggleCompare={handleToggleCompare}
              onViewDetails={setDetailsUni}
              onShortlistForStudent={setShortlistUni}
              currencyView={currencyView}
            />
          ))}
        </div>
      ) : (
        <div className="p-12 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
          <GraduationCap className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            No universities match your filters
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Try resetting your budget slider, changing the region filter, or broadening your search terms.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedRegion('All');
              setSelectedCountry('All');
              setStatusFilter('all');
              setMaxTuitionInr(85);
            }}
            className="mt-4 px-4 py-2 text-xs font-medium rounded-lg text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 transition-colors"
          >
            Reset All Filters
          </button>
        </div>
      )}

      {/* Floating Bottom Comparison Dock */}
      {selectedForCompare.length > 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-slate-900 dark:bg-slate-800 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 animate-in slide-in-from-bottom-3 duration-200 max-w-2xl w-[90%] sm:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold whitespace-nowrap">
              Compare ({selectedForCompare.length}/4):
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-[280px]">
              {selectedForCompare.map(u => (
                <span
                  key={u.id}
                  className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-200 border border-slate-700 flex items-center gap-1 shrink-0"
                >
                  <span className="font-mono text-indigo-400">#{u.rank}</span>
                  <span className="truncate max-w-[70px]">{u.name}</span>
                  <button
                    onClick={() => handleToggleCompare(u)}
                    className="hover:text-rose-400 ml-0.5"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto shrink-0">
            <button
              onClick={() => setIsCompareModalOpen(true)}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white transition-colors shadow-sm"
            >
              Open Comparison Matrix
            </button>
            <button
              onClick={() => setSelectedForCompare([])}
              className="p-1.5 text-slate-400 hover:text-slate-200"
              title="Clear all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <UniversityComparisonModal
        universities={selectedForCompare}
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        onRemoveUni={id => setSelectedForCompare(prev => prev.filter(u => u.id !== id))}
        onShortlistUni={uni => setShortlistUni(uni)}
      />

      <ShortlistToStudentModal
        university={shortlistUni}
        isOpen={!!shortlistUni}
        onClose={() => setShortlistUni(null)}
        onSuccess={handleShortlistSuccess}
      />

      <UniversityDetailsModal
        university={detailsUni}
        isOpen={!!detailsUni}
        onClose={() => setDetailsUni(null)}
        onShortlist={uni => setShortlistUni(uni)}
      />
    </div>
  );
}
