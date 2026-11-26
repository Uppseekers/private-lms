import React, { useMemo, useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Hash,
  BarChart3,
  Gauge,
  Filter,
  Sparkles,
  Check,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AnalyticsComponentType,
  AnalyticsCriterion,
  AnalyticsModuleKey,
  AnalyticsOperator,
  AnalyticsVisualStyle,
  AnalyticsWidgetConfig,
  TargetGradientBand,
} from '@/types';
import {
  ANALYTICS_MODULES,
  AnalyticsPortalDataset,
  DEFAULT_GRADIENT_BANDS,
  getModuleDefinition,
} from '@/lib/analyticsEngine';
import AnalyticsWidgetCard from '@/components/analytics/AnalyticsWidgetCard';
import { cn } from '@/lib/utils';
import { sanitizeUserErrorMessage } from '@/lib/friendlyError';

interface AnalyticsComponentBuilderModalProps {
  initialWidget?: AnalyticsWidgetConfig | null;
  dataset: AnalyticsPortalDataset;
  nextOrder: number;
  onSave: (widget: AnalyticsWidgetConfig) => Promise<void>;
  onClose: () => void;
}

const VISUAL_STYLES_BY_TYPE: Record<
  AnalyticsComponentType,
  { id: AnalyticsVisualStyle; label: string; hint: string }[]
> = {
  kpi: [
    { id: 'standard', label: 'Standard KPI', hint: 'Headline metric value' },
    { id: 'scorecard', label: 'Scorecard', hint: 'Headline + progress bar' },
    { id: 'comparison', label: 'Comparison', hint: 'Metric + prior period delta' },
  ],
  chart: [
    { id: 'column', label: 'Column Chart', hint: 'Vertical bars by X-axis' },
    { id: 'stacked_column', label: 'Stacked Column', hint: 'X-axis + Secondary Y-series' },
    { id: 'bar', label: 'Horizontal Bar', hint: 'Ranked horizontal comparison' },
    { id: 'line', label: 'Line Chart', hint: 'Trend line across groups' },
    { id: 'area', label: 'Area Chart', hint: 'Filled trend visualization' },
    { id: 'donut', label: 'Donut Chart', hint: 'Proportional ring breakdown' },
    { id: 'pie', label: 'Pie Chart', hint: 'Share of total breakdown' },
    { id: 'funnel', label: 'Funnel', hint: 'Pipeline stage progression' },
  ],
  target_meter: [
    { id: 'gauge', label: 'Dial Gauge', hint: '180° radial meter with bands' },
    { id: 'progress_bar', label: 'Banded Progress Bar', hint: 'Horizontal gradient bar' },
    { id: 'bullet', label: 'Bullet Meter', hint: 'Compact target benchmark bar' },
  ],
};

const OPERATORS: { id: AnalyticsOperator; label: string; needsValue: boolean }[] = [
  { id: 'equals', label: 'Equals', needsValue: true },
  { id: 'not_equals', label: 'Not Equals', needsValue: true },
  { id: 'contains', label: 'Contains', needsValue: true },
  { id: 'gte', label: 'Greater or Equal (≥)', needsValue: true },
  { id: 'lte', label: 'Less or Equal (≤)', needsValue: true },
  { id: 'is_not_empty', label: 'Is Not Empty', needsValue: false },
  { id: 'is_empty', label: 'Is Empty', needsValue: false },
];

const BAND_SWATCHES = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#10b981', '#0ea5e9', '#4f46e5'];

export default function AnalyticsComponentBuilderModal({
  initialWidget,
  dataset,
  nextOrder,
  onSave,
  onClose,
}: AnalyticsComponentBuilderModalProps) {
  const isEditing = Boolean(initialWidget?.id);

  const [componentType, setComponentType] = useState<AnalyticsComponentType>(
    initialWidget?.componentType || 'kpi'
  );
  const [visualStyle, setVisualStyle] = useState<AnalyticsVisualStyle>(
    initialWidget?.visualStyle || 'standard'
  );
  const [title, setTitle] = useState(initialWidget?.title || '');
  const [description, setDescription] = useState(initialWidget?.description || '');
  const [moduleKey, setModuleKey] = useState<AnalyticsModuleKey>(initialWidget?.module || 'students');
  const [metric, setMetric] = useState(initialWidget?.metric || 'count');
  const [groupBy, setGroupBy] = useState(initialWidget?.groupBy || 'counselor');
  const [secondaryGroupBy, setSecondaryGroupBy] = useState(initialWidget?.secondaryGroupBy || '');
  const [sortBy, setSortBy] = useState<'value_desc' | 'value_asc' | 'label_asc'>(
    initialWidget?.sortBy || 'value_desc'
  );
  const [limit, setLimit] = useState<number>(initialWidget?.limit || 10);
  const [targetValue, setTargetValue] = useState<number>(initialWidget?.targetValue ?? 85);
  const [targetUnit, setTargetUnit] = useState<string>(initialWidget?.targetUnit || '');
  const [gradientBands, setGradientBands] = useState<TargetGradientBand[]>(
    initialWidget?.gradientBands && initialWidget.gradientBands.length > 0
      ? initialWidget.gradientBands
      : DEFAULT_GRADIENT_BANDS
  );
  const [criteriaLogic, setCriteriaLogic] = useState<'AND' | 'OR'>(initialWidget?.criteriaLogic || 'AND');
  const [criteria, setCriteria] = useState<AnalyticsCriterion[]>(initialWidget?.criteria || []);
  const [dateRange, setDateRange] = useState<
    'all_time' | 'this_month' | 'last_30_days' | 'last_90_days' | 'this_year'
  >(initialWidget?.dateRange || 'all_time');
  const [width, setWidth] = useState<'sm' | 'md' | 'lg'>(initialWidget?.width || (componentType === 'chart' ? 'md' : 'sm'));

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const moduleDef = useMemo(() => getModuleDefinition(moduleKey), [moduleKey]);

  const handleComponentTypeChange = (nextType: AnalyticsComponentType) => {
    setComponentType(nextType);
    const firstStyle = VISUAL_STYLES_BY_TYPE[nextType][0].id;
    setVisualStyle(firstStyle);
    if (!isEditing) {
      setWidth(nextType === 'chart' ? 'md' : 'sm');
    }
  };

  const handleModuleChange = (nextMod: AnalyticsModuleKey) => {
    setModuleKey(nextMod);
    const def = getModuleDefinition(nextMod);
    setMetric(def.metrics[0]?.id || 'count');
    setGroupBy(def.groupByFields[0]?.id || '');
    setSecondaryGroupBy('');
    setCriteria([]);
  };

  const handleAddCriterion = () => {
    const firstField = moduleDef.criteriaFields[0]?.id || 'status';
    setCriteria((prev) => [
      ...prev,
      { id: `crit_${Date.now()}_${prev.length}`, field: firstField, operator: 'equals', value: '' },
    ]);
  };

  const handleUpdateCriterion = (id: string, patch: Partial<AnalyticsCriterion>) => {
    setCriteria((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const handleRemoveCriterion = (id: string) => {
    setCriteria((prev) => prev.filter((c) => c.id !== id));
  };

  const handleAddBand = () => {
    const lastMax = gradientBands.length > 0 ? gradientBands[gradientBands.length - 1].max : 0;
    const nextMin = Math.min(95, lastMax);
    const nextMax = 100;
    setGradientBands((prev) => [
      ...prev,
      {
        id: `band_${Date.now()}`,
        label: `Tier ${prev.length + 1}`,
        min: nextMin,
        max: nextMax,
        color: BAND_SWATCHES[prev.length % BAND_SWATCHES.length],
      },
    ]);
  };

  const handleUpdateBand = (id: string, patch: Partial<TargetGradientBand>) => {
    setGradientBands((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const handleRemoveBand = (id: string) => {
    if (gradientBands.length <= 1) return;
    setGradientBands((prev) => prev.filter((b) => b.id !== id));
  };

  const autoTitle = useMemo(() => {
    const mLabel = moduleDef.metrics.find((m) => m.id === metric)?.label || metric;
    if (componentType === 'chart') {
      const gLabel = moduleDef.groupByFields.find((g) => g.id === groupBy)?.label || groupBy;
      return `${mLabel} by ${gLabel}`;
    }
    if (componentType === 'target_meter') {
      return `${mLabel} Target`;
    }
    return mLabel;
  }, [componentType, moduleDef, metric, groupBy]);

  const draftWidget: AnalyticsWidgetConfig = useMemo(
    () => ({
      id: initialWidget?.id || `AW_${Date.now()}`,
      title: title.trim() || autoTitle,
      description: description.trim() || undefined,
      componentType,
      visualStyle,
      module: moduleKey,
      metric,
      groupBy: componentType === 'chart' ? groupBy : undefined,
      secondaryGroupBy:
        componentType === 'chart' && secondaryGroupBy ? secondaryGroupBy : undefined,
      sortBy: componentType === 'chart' ? sortBy : undefined,
      limit: componentType === 'chart' ? limit : undefined,
      targetValue: componentType === 'target_meter' ? targetValue : undefined,
      targetUnit: targetUnit.trim() || undefined,
      gradientBands: componentType === 'target_meter' ? gradientBands : undefined,
      criteriaLogic,
      criteria,
      dateRange,
      width,
      order: initialWidget?.order ?? nextOrder,
      portalScope: 'verified_staff',
      createdBy: initialWidget?.createdBy,
      createdAt: initialWidget?.createdAt,
    }),
    [
      initialWidget,
      title,
      autoTitle,
      description,
      componentType,
      visualStyle,
      moduleKey,
      metric,
      groupBy,
      secondaryGroupBy,
      sortBy,
      limit,
      targetValue,
      targetUnit,
      gradientBands,
      criteriaLogic,
      criteria,
      dateRange,
      width,
      nextOrder,
    ]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (componentType === 'target_meter' && (!Number.isFinite(targetValue) || targetValue <= 0)) {
      setErrorMsg('Please enter a Target Value greater than 0.');
      return;
    }
    setIsSaving(true);
    try {
      await onSave(draftWidget);
      onClose();
    } catch (err: any) {
      setErrorMsg(
        sanitizeUserErrorMessage(
          err,
          'Unable to save this component right now. Please try again or talk to your Admin.'
        )
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              {isEditing ? 'Edit Analytics Component' : 'Add New Analytics Component'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure a KPI, Chart, or Target Meter across live portal modules. All staff automatically see data filtered to their assigned scope.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Split Body: Left Config Form / Right Live Preview */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Left Configuration Column */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 border-b lg:border-b-0 lg:border-r border-slate-200">
            {errorMsg && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 1. Component Type */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                1. Component Type
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {(
                  [
                    { id: 'kpi', label: 'KPI', sub: 'Headline metric', icon: Hash },
                    { id: 'chart', label: 'Chart', sub: 'Grouped visual', icon: BarChart3 },
                    { id: 'target_meter', label: 'Target Meter', sub: 'Goal & gradient', icon: Gauge },
                  ] as const
                ).map((item) => {
                  const Icon = item.icon;
                  const active = componentType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleComponentTypeChange(item.id)}
                      className={cn(
                        'p-3 rounded-xl border text-left transition-colors cursor-pointer',
                        active
                          ? 'border-indigo-600 bg-indigo-50/60 text-indigo-900'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <Icon className={cn('w-4 h-4', active ? 'text-indigo-600' : 'text-slate-400')} />
                        {active && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                      </div>
                      <div className="text-xs font-bold mt-2">{item.label}</div>
                      <div className="text-[11px] text-slate-500">{item.sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Visual Style */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                2. Visual Style
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {VISUAL_STYLES_BY_TYPE[componentType].map((st) => {
                  const active = visualStyle === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setVisualStyle(st.id)}
                      className={cn(
                        'px-3 py-2 rounded-lg border text-left transition-colors cursor-pointer',
                        active
                          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      )}
                    >
                      <div className="text-xs font-semibold">{st.label}</div>
                      <div className="text-[10px] text-slate-500 truncate">{st.hint}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Module & Metric Selection */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                3. Module &amp; Metric (Measure / Y-Axis)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Portal Module</label>
                  <select
                    value={moduleKey}
                    onChange={(e) => handleModuleChange(e.target.value as AnalyticsModuleKey)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {ANALYTICS_MODULES.map((m) => (
                      <option key={m.key} value={m.key}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">KPI / Measure Metric</label>
                  <select
                    value={metric}
                    onChange={(e) => setMetric(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {moduleDef.metrics.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">{moduleDef.description}</p>
            </div>

            {/* 4A. Chart Grouping (X and Y) */}
            {componentType === 'chart' && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  4. Grouping (X-Axis &amp; Optional Secondary Y-Series)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Primary Grouping (X-Axis)
                    </label>
                    <select
                      value={groupBy}
                      onChange={(e) => setGroupBy(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {moduleDef.groupByFields.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Secondary Grouping / Y-Series (Optional)
                    </label>
                    <select
                      value={secondaryGroupBy}
                      onChange={(e) => setSecondaryGroupBy(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">None (Single Series)</option>
                      {moduleDef.groupByFields
                        .filter((g) => g.id !== groupBy)
                        .map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.label}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Sort Order</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="value_desc">Highest Value First</option>
                      <option value="value_asc">Lowest Value First</option>
                      <option value="label_asc">Label (A → Z)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Max Groups (Top N)</label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={limit}
                      onChange={(e) => setLimit(Math.max(1, Math.min(30, Number(e.target.value) || 10)))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 4B. Target Meter & Measuring Gradient Bands */}
            {componentType === 'target_meter' && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    4. Target Goal &amp; Measuring Gradient Bands
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddBand}
                    className="h-7 px-2.5 text-[11px] font-semibold"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Band
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Target Value *</label>
                    <input
                      type="number"
                      min={1}
                      step="any"
                      value={targetValue}
                      onChange={(e) => setTargetValue(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Display Unit (Optional)</label>
                    <input
                      type="text"
                      value={targetUnit}
                      onChange={(e) => setTargetUnit(e.target.value)}
                      placeholder="e.g. %, students, sessions"
                      maxLength={20}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Gradient Bands Editor */}
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-500">
                    Define % attainment thresholds (0–100%) and semantic colors for the measuring gradient:
                  </p>
                  {gradientBands.map((band) => (
                    <div
                      key={band.id}
                      className="grid grid-cols-12 gap-2 items-center bg-slate-50 border border-slate-200 rounded-lg p-2"
                    >
                      <div className="col-span-4">
                        <input
                          type="text"
                          value={band.label}
                          onChange={(e) => handleUpdateBand(band.id, { label: e.target.value })}
                          placeholder="Band label"
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={band.min}
                          onChange={(e) => handleUpdateBand(band.id, { min: Number(e.target.value) })}
                          title="Min %"
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs tabular-nums text-slate-800"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={band.max}
                          onChange={(e) => handleUpdateBand(band.id, { max: Number(e.target.value) })}
                          title="Max %"
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs tabular-nums text-slate-800"
                        />
                      </div>
                      <div className="col-span-3 flex items-center gap-1">
                        {BAND_SWATCHES.slice(0, 5).map((sw) => (
                          <button
                            key={sw}
                            type="button"
                            onClick={() => handleUpdateBand(band.id, { color: sw })}
                            className={cn(
                              'w-4 h-4 rounded-full border cursor-pointer',
                              band.color === sw ? 'ring-2 ring-offset-1 ring-slate-900 border-white' : 'border-transparent'
                            )}
                            style={{ backgroundColor: sw }}
                          />
                        ))}
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveBand(band.id)}
                          disabled={gradientBands.length <= 1}
                          className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. Criteria Filter Builder */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-indigo-600" />
                  5. Criteria Filter Rules (Optional)
                </label>
                <div className="flex items-center gap-2">
                  {criteria.length > 1 && (
                    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[11px] font-semibold">
                      {(['AND', 'OR'] as const).map((logic) => (
                        <button
                          key={logic}
                          type="button"
                          onClick={() => setCriteriaLogic(logic)}
                          className={cn(
                            'px-2 py-0.5 rounded-md cursor-pointer transition-colors',
                            criteriaLogic === logic ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500'
                          )}
                        >
                          Match {logic}
                        </button>
                      ))}
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddCriterion}
                    className="h-7 px-2.5 text-[11px] font-semibold"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Condition
                  </Button>
                </div>
              </div>

              {criteria.length === 0 ? (
                <p className="text-[11px] text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-lg px-3 py-2.5">
                  No criteria applied — includes all scoped records in {moduleDef.label}. Click <strong>+ Add Condition</strong> to filter by counselor, status, intake, grade, country, or numeric score.
                </p>
              ) : (
                <div className="space-y-2">
                  {criteria.map((c) => {
                    const fieldMeta = moduleDef.criteriaFields.find((f) => f.id === c.field);
                    const opMeta = OPERATORS.find((o) => o.id === c.operator);
                    const needsVal = opMeta?.needsValue ?? true;
                    return (
                      <div
                        key={c.id}
                        className="grid grid-cols-12 gap-2 items-center bg-slate-50 border border-slate-200 rounded-lg p-2"
                      >
                        <select
                          value={c.field}
                          onChange={(e) => handleUpdateCriterion(c.id, { field: e.target.value })}
                          className="col-span-4 bg-white border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-800"
                        >
                          {moduleDef.criteriaFields.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                        <select
                          value={c.operator}
                          onChange={(e) =>
                            handleUpdateCriterion(c.id, { operator: e.target.value as AnalyticsOperator })
                          }
                          className="col-span-3 bg-white border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-800"
                        >
                          {OPERATORS.map((op) => (
                            <option key={op.id} value={op.id}>
                              {op.label}
                            </option>
                          ))}
                        </select>
                        <div className="col-span-4">
                          {needsVal ? (
                            <>
                              <input
                                type="text"
                                list={`suggestions_${c.id}`}
                                value={c.value}
                                onChange={(e) => handleUpdateCriterion(c.id, { value: e.target.value })}
                                placeholder="Value..."
                                className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800"
                              />
                              {fieldMeta?.suggestions && (
                                <datalist id={`suggestions_${c.id}`}>
                                  {fieldMeta.suggestions.map((sug) => (
                                    <option key={sug} value={sug} />
                                  ))}
                                </datalist>
                              )}
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic px-1">No value needed</span>
                          )}
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveCriterion(c.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 6. Title, Date Window & Layout */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                6. Display Title, Date Window &amp; Card Size
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Component Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={autoTitle}
                    maxLength={160}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Subtitle / Note (Optional)</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Short helper description shown under the card title"
                    maxLength={250}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Default Date Window</label>
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all_time">All Time</option>
                    <option value="this_month">This Month</option>
                    <option value="last_30_days">Last 30 Days</option>
                    <option value="last_90_days">Last 90 Days</option>
                    <option value="this_year">This Year</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Card Width</label>
                  <select
                    value={width}
                    onChange={(e) => setWidth(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="sm">Compact (1/3 Width)</option>
                    <option value="md">Standard (1/2 Width)</option>
                    <option value="lg">Wide (Full Width)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Right Live Preview Column */}
          <div className="w-full lg:w-[420px] xl:w-[460px] bg-slate-50/90 p-6 flex flex-col justify-between gap-5 overflow-y-auto shrink-0">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Live Portal Data Preview
                </span>
                <span className="text-[11px] font-medium text-slate-400">Real-time calculation</span>
              </div>

              <div className="min-h-[260px]">
                <AnalyticsWidgetCard widget={draftWidget} dataset={dataset} isPreview />
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1.5 text-[11px] text-slate-600">
                <p className="font-semibold text-slate-800">Role-Scoped Visibility Guaranteed</p>
                <p>
                  Only Admins can create or modify components. Every staff role viewing <strong>Analytics &amp; Reports</strong> automatically sees this component calculated exclusively on their assigned students, batches, and sessions.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSaving} className="h-9 text-xs font-semibold">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white h-9 px-5 text-xs font-semibold"
              >
                {isSaving ? 'Saving...' : isEditing ? 'Update Component' : 'Publish to Analytics'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
