import React, { useMemo, useState } from 'react';
import {
  Plus,
  Search,
  BarChart3,
  Hash,
  Gauge,
  Layers,
  Sparkles,
  BookOpen,
  X,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Trash2,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import { useDatabase } from '@/context/DatabaseContext';
import { Button } from '@/components/ui/button';
import {
  AnalyticsComponentType,
  AnalyticsWidgetConfig,
  StaffMember,
} from '@/types';
import {
  ANALYTICS_MODULES,
  AnalyticsPortalDataset,
  buildStarterAnalyticsWidgets,
} from '@/lib/analyticsEngine';
import {
  isUserAdmin,
  canStaffAccessAllStudents,
} from '@/lib/staffPermissions';
import AnalyticsWidgetCard from '@/components/analytics/AnalyticsWidgetCard';
import AnalyticsComponentBuilderModal from '@/components/analytics/AnalyticsComponentBuilderModal';
import { sanitizeUserErrorMessage } from '@/lib/friendlyError';
import { cn } from '@/lib/utils';

type TypeFilter = 'all' | AnalyticsComponentType;

const DATE_OVERRIDES: { id: string; label: string }[] = [
  { id: 'widget_default', label: 'Date: Component Default' },
  { id: 'all_time', label: 'All Time' },
  { id: 'this_month', label: 'This Month' },
  { id: 'last_30_days', label: 'Last 30 Days' },
  { id: 'last_90_days', label: 'Last 90 Days' },
  { id: 'this_year', label: 'This Year' },
];

const WIDTH_CYCLE: Record<'sm' | 'md' | 'lg', 'sm' | 'md' | 'lg'> = {
  sm: 'md',
  md: 'lg',
  lg: 'sm',
};

function getGridSpanClass(width: 'sm' | 'md' | 'lg' | undefined): string {
  if (width === 'lg') return 'md:col-span-12';
  if (width === 'md') return 'md:col-span-6';
  return 'md:col-span-6 xl:col-span-4';
}

export default function TeamAnalytics() {
  const {
    currentUser,
    permissionsMatrix,
    students,
    staff,
    batches,
    events,
    launchpadEnrollments,
    launchpadProgress,
    launchpadCertifications,
    analyticsWidgets,
    saveAnalyticsWidget,
    deleteAnalyticsWidget,
    reorderAnalyticsWidgets,
  } = useDatabase();

  const isAdmin = isUserAdmin(currentUser);
  const hasOrgWideScope = canStaffAccessAllStudents(currentUser, permissionsMatrix);

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateOverride, setDateOverride] = useState<string>('widget_default');
  const [showModulesGuide, setShowModulesGuide] = useState(false);

  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<AnalyticsWidgetConfig | null>(null);
  const [pendingDeleteWidget, setPendingDeleteWidget] = useState<AnalyticsWidgetConfig | null>(null);

  const [isSeedingStarter, setIsSeedingStarter] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    window.setTimeout(() => {
      setFeedback((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  const staffMemberUser = useMemo<StaffMember | null>(() => {
    if (!currentUser || (currentUser.role || '').toUpperCase() === 'STUDENT') return null;
    return currentUser as StaffMember;
  }, [currentUser]);

  const dataset = useMemo<AnalyticsPortalDataset>(
    () => ({
      currentUser: staffMemberUser,
      permissionsMatrix,
      students,
      staff,
      batches,
      events,
      launchpadEnrollments,
      launchpadProgress,
      launchpadCertifications,
    }),
    [
      staffMemberUser,
      permissionsMatrix,
      students,
      staff,
      batches,
      events,
      launchpadEnrollments,
      launchpadProgress,
      launchpadCertifications,
    ]
  );

  const sortedWidgets = useMemo(
    () =>
      [...analyticsWidgets].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0) || a.title.localeCompare(b.title)
      ),
    [analyticsWidgets]
  );

  const counts = useMemo(() => {
    let kpi = 0;
    let chart = 0;
    let target_meter = 0;
    for (const w of sortedWidgets) {
      if (w.componentType === 'kpi') kpi += 1;
      else if (w.componentType === 'chart') chart += 1;
      else if (w.componentType === 'target_meter') target_meter += 1;
    }
    return { all: sortedWidgets.length, kpi, chart, target_meter };
  }, [sortedWidgets]);

  const filteredWidgets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sortedWidgets.filter((w) => {
      if (typeFilter !== 'all' && w.componentType !== typeFilter) return false;
      if (!q) return true;
      const mod = ANALYTICS_MODULES.find((m) => m.key === w.module);
      return (
        w.title.toLowerCase().includes(q) ||
        (w.description || '').toLowerCase().includes(q) ||
        (mod?.label || w.module).toLowerCase().includes(q) ||
        w.metric.toLowerCase().includes(q)
      );
    });
  }, [sortedWidgets, typeFilter, searchQuery]);

  const isFilteredView = typeFilter !== 'all' || searchQuery.trim().length > 0;
  const activeDateOverride = dateOverride === 'widget_default' ? undefined : dateOverride;

  const handleOpenCreate = () => {
    if (!isAdmin) return;
    setEditingWidget(null);
    setIsBuilderOpen(true);
  };

  const handleEdit = (widget: AnalyticsWidgetConfig) => {
    if (!isAdmin) return;
    setEditingWidget(widget);
    setIsBuilderOpen(true);
  };

  const handleSaveWidget = async (widget: AnalyticsWidgetConfig) => {
    if (!isAdmin) return;
    await saveAnalyticsWidget(widget);
    setIsBuilderOpen(false);
    setEditingWidget(null);
    showToast(
      'success',
      editingWidget ? `Updated "${widget.title}".` : `Added "${widget.title}" to Analytics & Reports.`
    );
  };

  const handleDuplicate = async (widget: AnalyticsWidgetConfig) => {
    if (!isAdmin) return;
    try {
      const duplicate: AnalyticsWidgetConfig = {
        ...widget,
        id: `aw_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        title: `${widget.title} (Copy)`,
        order: sortedWidgets.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveAnalyticsWidget(duplicate);
      showToast('success', `Duplicated "${widget.title}".`);
    } catch (error) {
      showToast(
        'error',
        sanitizeUserErrorMessage(error, 'Could not duplicate component. Please talk to your Admin.')
      );
    }
  };

  const handleResize = async (widget: AnalyticsWidgetConfig) => {
    if (!isAdmin) return;
    try {
      const currentWidth = widget.width || 'md';
      const nextWidth = WIDTH_CYCLE[currentWidth];
      await saveAnalyticsWidget({
        ...widget,
        width: nextWidth,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      showToast(
        'error',
        sanitizeUserErrorMessage(error, 'Could not resize component. Please talk to your Admin.')
      );
    }
  };

  const handleMove = async (widget: AnalyticsWidgetConfig, direction: -1 | 1) => {
    if (!isAdmin || isFilteredView) return;
    const ids = sortedWidgets.map((w) => w.id);
    const idx = ids.indexOf(widget.id);
    const targetIdx = idx + direction;
    if (idx < 0 || targetIdx < 0 || targetIdx >= ids.length) return;
    const reordered = [...ids];
    [reordered[idx], reordered[targetIdx]] = [reordered[targetIdx], reordered[idx]];
    try {
      await reorderAnalyticsWidgets(reordered);
    } catch (error) {
      showToast(
        'error',
        sanitizeUserErrorMessage(error, 'Could not reorder components. Please talk to your Admin.')
      );
    }
  };

  const handleConfirmDelete = async () => {
    if (!isAdmin || !pendingDeleteWidget) return;
    setIsDeleting(true);
    try {
      const deletedTitle = pendingDeleteWidget.title;
      await deleteAnalyticsWidget(pendingDeleteWidget.id);
      setPendingDeleteWidget(null);
      showToast('success', `Removed "${deletedTitle}".`);
    } catch (error) {
      showToast(
        'error',
        sanitizeUserErrorMessage(error, 'Could not delete component. Please talk to your Admin.')
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLoadStarterPack = async () => {
    if (!isAdmin || isSeedingStarter) return;
    setIsSeedingStarter(true);
    try {
      const starters = buildStarterAnalyticsWidgets();
      const baseOrder = sortedWidgets.length;
      const now = new Date().toISOString();
      for (let i = 0; i < starters.length; i += 1) {
        const s = starters[i];
        await saveAnalyticsWidget({
          ...s,
          id: `aw_starter_${Date.now()}_${i}`,
          order: baseOrder + i,
          createdBy: currentUser?.email || 'Admin',
          updatedBy: currentUser?.email || 'Admin',
          createdAt: now,
          updatedAt: now,
        });
      }
      showToast('success', `Added ${starters.length} starter KPI, Chart, and Target Meter components.`);
    } catch (error) {
      showToast(
        'error',
        sanitizeUserErrorMessage(error, 'Could not load starter components. Please talk to your Admin.')
      );
    } finally {
      setIsSeedingStarter(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Analytics &amp; Reports
            </h1>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 rounded-md px-2 py-0.5 whitespace-nowrap">
              {hasOrgWideScope ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  Organization Scope
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  Your Assigned Scope
                </>
              )}
            </span>
          </div>
          <p className="text-sm text-slate-600">
            {isAdmin
              ? 'Build live KPI cards, grouped X/Y charts, and banded target meters across portal modules. Metrics automatically filter to each staff member’s assigned scope.'
              : 'Live KPI cards, charts, and target meters published by your Admin, filtered to your assigned students and sessions.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowModulesGuide((prev) => !prev)}
            className={cn(
              'whitespace-nowrap border-slate-200 text-slate-700 hover:bg-slate-50',
              showModulesGuide && 'bg-slate-100 border-slate-300 text-slate-900'
            )}
          >
            <BookOpen className="w-4 h-4 mr-1.5" />
            {showModulesGuide ? 'Hide Modules & Metrics' : 'Modules & Metrics Guide'}
          </Button>

          {isAdmin && (
            <>
              {sortedWidgets.length === 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleLoadStarterPack}
                  disabled={isSeedingStarter}
                  className="whitespace-nowrap border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                >
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  {isSeedingStarter ? 'Loading Starter Pack...' : 'Add Starter Pack'}
                </Button>
              )}
              <Button
                type="button"
                onClick={handleOpenCreate}
                className="whitespace-nowrap bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add Component
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Inline Feedback Banner */}
      {feedback && (
        <div
          className={cn(
            'flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm',
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          )}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-current opacity-70 hover:opacity-100 p-1"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Collapsible Selectable Modules & Metrics Reference */}
      {showModulesGuide && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Available Modules, Metrics, Groupings &amp; Criteria ({ANALYTICS_MODULES.length} Live Modules)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                All modules below can be selected inside KPI, Chart (X-axis + optional secondary Y-series), and Target Meter (with Measuring Gradient bands) components.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowModulesGuide(false)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
              aria-label="Close guide"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {ANALYTICS_MODULES.map((mod) => (
              <div
                key={mod.key}
                className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 space-y-2.5"
              >
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{mod.label}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{mod.description}</p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    KPI / Target / Y-Axis Metrics ({mod.metrics.length})
                  </p>
                  <ul className="space-y-0.5 text-xs text-slate-700">
                    {mod.metrics.map((m) => (
                      <li key={m.id} className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-indigo-500 shrink-0" />
                        <span>{m.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-1 border-t border-slate-200/70">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    X / Y Grouping Fields
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {mod.groupByFields.map((f) => f.label).join(', ')}
                  </p>
                </div>

                <div className="pt-1 border-t border-slate-200/70">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Criteria Filter Fields
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {mod.criteriaFields.map((f) => f.label).join(', ')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter & Controls Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-3">
        {/* Component Type Filter */}
        <div className="flex items-center gap-1 flex-wrap">
          {(
            [
              { id: 'all', label: 'All Components', count: counts.all, icon: Layers },
              { id: 'kpi', label: 'KPI', count: counts.kpi, icon: Hash },
              { id: 'chart', label: 'Charts', count: counts.chart, icon: BarChart3 },
              { id: 'target_meter', label: 'Target Meters', count: counts.target_meter, icon: Gauge },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = typeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTypeFilter(tab.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap',
                  active
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                <span
                  className={cn(
                    'tabular-nums text-[11px] ml-0.5',
                    active ? 'text-slate-300' : 'text-slate-400'
                  )}
                >
                  ({tab.count})
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Date Override */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search components..."
              className="w-full h-9 pl-8 pr-3 text-xs rounded-lg border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="relative flex items-center">
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
            <select
              value={dateOverride}
              onChange={(e) => setDateOverride(e.target.value)}
              aria-label="Global date range override"
              className="h-9 pl-8 pr-7 text-xs font-medium text-slate-700 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              {DATE_OVERRIDES.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Widget Grid or Empty State */}
      {sortedWidgets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center max-w-2xl mx-auto">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">
            {isAdmin ? 'Build your live Analytics & Reports canvas' : 'No analytics components published yet'}
          </h2>
          <p className="text-sm text-slate-600 mt-1.5 max-w-md mx-auto">
            {isAdmin
              ? 'Create custom KPI cards, grouped X/Y charts, and banded target meters across Students, Tasks, Sessions, Shortlists, Essays, Vault, Batches, Launchpad, and Staff.'
              : 'Your Admin hasn’t published any custom KPI, Chart, or Target Meter components yet. Once added, they will appear here automatically scoped to your students.'}
          </p>

          {isAdmin && (
            <div className="flex items-center justify-center gap-3 mt-6 flex-wrap">
              <Button
                type="button"
                onClick={handleOpenCreate}
                className="bg-indigo-600 hover:bg-indigo-700 text-white whitespace-nowrap"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Create First Component
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleLoadStarterPack}
                disabled={isSeedingStarter}
                className="border-slate-200 text-slate-700 hover:bg-slate-50 whitespace-nowrap"
              >
                <Sparkles className="w-4 h-4 mr-1.5 text-indigo-600" />
                {isSeedingStarter ? 'Adding Starter Pack...' : 'Load 7 Starter Components'}
              </Button>
            </div>
          )}
        </div>
      ) : filteredWidgets.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
          <p className="text-sm font-medium text-slate-700">
            No components match your current filter or search.
          </p>
          <button
            type="button"
            onClick={() => {
              setTypeFilter('all');
              setSearchQuery('');
            }}
            className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {filteredWidgets.map((widget, idx) => (
            <div key={widget.id} className={getGridSpanClass(widget.width)}>
              <AnalyticsWidgetCard
                widget={widget}
                dataset={dataset}
                overrideDateRange={activeDateOverride}
                isAdmin={isAdmin}
                canMoveLeft={isAdmin && !isFilteredView && idx > 0}
                canMoveRight={isAdmin && !isFilteredView && idx < filteredWidgets.length - 1}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onDelete={(w) => setPendingDeleteWidget(w)}
                onResize={handleResize}
                onMoveLeft={(w) => handleMove(w, -1)}
                onMoveRight={(w) => handleMove(w, 1)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Admin-only Component Builder Modal */}
      {isAdmin && isBuilderOpen && (
        <AnalyticsComponentBuilderModal
          initialWidget={editingWidget}
          dataset={dataset}
          nextOrder={sortedWidgets.length}
          onSave={handleSaveWidget}
          onClose={() => {
            setIsBuilderOpen(false);
            setEditingWidget(null);
          }}
        />
      )}

      {/* In-App Delete Confirmation Modal */}
      {isAdmin && pendingDeleteWidget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Delete analytics component?
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  This will remove <span className="font-semibold text-slate-900">{pendingDeleteWidget.title}</span> from Analytics &amp; Reports for all team members.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={isDeleting}
                onClick={() => setPendingDeleteWidget(null)}
                className="border-slate-200"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {isDeleting ? 'Deleting...' : 'Delete Component'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
