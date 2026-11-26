import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Edit3,
  Trash2,
  Copy,
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Maximize2,
} from 'lucide-react';
import { AnalyticsWidgetConfig } from '@/types';
import {
  ANALYTICS_COLOR_PALETTE,
  AnalyticsPortalDataset,
  computeChartWidget,
  computeKpiWidget,
  computeTargetMeterWidget,
  getModuleDefinition,
} from '@/lib/analyticsEngine';
import { cn } from '@/lib/utils';

interface AnalyticsWidgetCardProps {
  widget: AnalyticsWidgetConfig;
  dataset: AnalyticsPortalDataset;
  overrideDateRange?: string;
  isAdmin?: boolean;
  isPreview?: boolean;
  canMoveLeft?: boolean;
  canMoveRight?: boolean;
  onEdit?: (widget: AnalyticsWidgetConfig) => void;
  onDuplicate?: (widget: AnalyticsWidgetConfig) => void;
  onDelete?: (widget: AnalyticsWidgetConfig) => void;
  onResize?: (widget: AnalyticsWidgetConfig) => void;
  onMoveLeft?: (widget: AnalyticsWidgetConfig) => void;
  onMoveRight?: (widget: AnalyticsWidgetConfig) => void;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 180) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(cx: number, cy: number, r: number, startPct: number, endPct: number) {
  const startAngle = (Math.max(0, Math.min(100, startPct)) / 100) * 180;
  const endAngle = (Math.max(0, Math.min(100, endPct)) / 100) * 180;
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

export default function AnalyticsWidgetCard({
  widget,
  dataset,
  overrideDateRange,
  isAdmin = false,
  isPreview = false,
  canMoveLeft = false,
  canMoveRight = false,
  onEdit,
  onDuplicate,
  onDelete,
  onResize,
  onMoveLeft,
  onMoveRight,
}: AnalyticsWidgetCardProps) {
  const moduleDef = useMemo(() => getModuleDefinition(widget.module), [widget.module]);
  const metricDef = useMemo(
    () => moduleDef.metrics.find((m) => m.id === widget.metric) || moduleDef.metrics[0],
    [moduleDef, widget.metric]
  );

  const kpiResult = useMemo(
    () => (widget.componentType === 'kpi' ? computeKpiWidget(widget, dataset, overrideDateRange) : null),
    [widget, dataset, overrideDateRange]
  );

  const chartResult = useMemo(
    () => (widget.componentType === 'chart' ? computeChartWidget(widget, dataset, overrideDateRange) : null),
    [widget, dataset, overrideDateRange]
  );

  const targetResult = useMemo(
    () =>
      widget.componentType === 'target_meter'
        ? computeTargetMeterWidget(widget, dataset, overrideDateRange)
        : null,
    [widget, dataset, overrideDateRange]
  );

  const activeCriteriaCount = (widget.criteria || []).filter((c) => c.field).length;

  return (
    <div className="bg-white border border-slate-200 rounded-xl flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-slate-100 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400">
            <span>{moduleDef.shortLabel}</span>
            <span>·</span>
            <span className="truncate">{metricDef.label}</span>
            {activeCriteriaCount > 0 && (
              <>
                <span>·</span>
                <span className="text-indigo-600 font-semibold tabular-nums">
                  {activeCriteriaCount} filter{activeCriteriaCount === 1 ? '' : 's'}
                </span>
              </>
            )}
          </div>
          <h3 className="text-sm font-bold text-slate-900 truncate mt-0.5">{widget.title}</h3>
          {widget.description && (
            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{widget.description}</p>
          )}
        </div>

        {isAdmin && !isPreview && (
          <div className="flex items-center gap-1 shrink-0">
            {canMoveLeft && onMoveLeft && (
              <button
                type="button"
                onClick={() => onMoveLeft(widget)}
                title="Move left"
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            )}
            {canMoveRight && onMoveRight && (
              <button
                type="button"
                onClick={() => onMoveRight(widget)}
                title="Move right"
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            {onResize && (
              <button
                type="button"
                onClick={() => onResize(widget)}
                title={`Cycle width (current: ${widget.width || 'md'})`}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}
            {onDuplicate && (
              <button
                type="button"
                onClick={() => onDuplicate(widget)}
                title="Duplicate component"
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            )}
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(widget)}
                title="Edit component"
                className="p-1.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(widget)}
                title="Delete component"
                className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        {/* 1. KPI VIEW */}
        {widget.componentType === 'kpi' && kpiResult && (
          <div className="flex flex-col justify-between h-full min-h-[126px]">
            <div className="my-auto py-2">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-4xl font-bold tracking-tight text-slate-900 tabular-nums">
                  {kpiResult.formattedValue}
                </span>
                {kpiResult.deltaPercent !== null && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 text-xs font-semibold tabular-nums',
                      kpiResult.deltaPercent > 0
                        ? 'text-emerald-600'
                        : kpiResult.deltaPercent < 0
                          ? 'text-rose-600'
                          : 'text-slate-500'
                    )}
                  >
                    {kpiResult.deltaPercent > 0 ? (
                      <TrendingUp className="w-3.5 h-3.5" />
                    ) : kpiResult.deltaPercent < 0 ? (
                      <TrendingDown className="w-3.5 h-3.5" />
                    ) : (
                      <Minus className="w-3.5 h-3.5" />
                    )}
                    {kpiResult.deltaPercent > 0 ? '+' : ''}
                    {kpiResult.deltaPercent}% vs prior
                  </span>
                )}
              </div>

              {widget.visualStyle === 'scorecard' && (
                <div className="mt-3">
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all"
                      style={{
                        width: `${
                          kpiResult.format === 'percent'
                            ? Math.max(0, Math.min(100, kpiResult.value))
                            : Math.min(100, kpiResult.value > 0 ? 100 : 0)
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {widget.visualStyle === 'comparison' && kpiResult.previousValue === null && (
                <p className="text-[11px] text-slate-400 mt-2">
                  Select a time window (e.g. Last 30 Days or This Month) to view period-over-period variance.
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="tabular-nums">
                Based on <strong className="text-slate-700">{kpiResult.matchedRecords.toLocaleString()}</strong> records
              </span>
              <span className="capitalize">
                {(overrideDateRange && overrideDateRange !== 'widget_default'
                  ? overrideDateRange
                  : widget.dateRange || 'all_time'
                ).replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        )}

        {/* 2. TARGET METER VIEW */}
        {widget.componentType === 'target_meter' && targetResult && (
          <div className="flex flex-col justify-between h-full min-h-[180px] space-y-3">
            {widget.visualStyle === 'gauge' && (
              <div className="flex flex-col items-center">
                <svg viewBox="0 0 220 124" className="w-full max-w-[230px] h-auto overflow-visible">
                  {/* Base track */}
                  <path
                    d={describeArc(110, 108, 82, 0, 100)}
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="16"
                    strokeLinecap="butt"
                  />
                  {/* Measuring Gradient Bands */}
                  {targetResult.bands.map((band) => (
                    <path
                      key={band.id}
                      d={describeArc(110, 108, 82, band.min, band.max)}
                      fill="none"
                      stroke={band.color}
                      strokeWidth="16"
                      strokeLinecap="butt"
                      opacity={0.92}
                    />
                  ))}
                  {/* Needle */}
                  {(() => {
                    const tip = polarToCartesian(110, 108, 66, (targetResult.clampedPercent / 100) * 180);
                    return (
                      <g>
                        <line
                          x1="110"
                          y1="108"
                          x2={tip.x}
                          y2={tip.y}
                          stroke="#0f172a"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                        <circle cx="110" cy="108" r="6" fill="#0f172a" />
                        <circle cx="110" cy="108" r="2.5" fill="#ffffff" />
                      </g>
                    );
                  })()}
                  <text x="16" y="122" fontSize="10" fill="#94a3b8" className="tabular-nums">0%</text>
                  <text x="184" y="122" fontSize="10" fill="#94a3b8" className="tabular-nums">100%</text>
                </svg>

                <div className="text-center -mt-1">
                  <div className="text-2xl font-bold text-slate-900 tabular-nums">
                    {targetResult.formattedCurrent}
                    <span className="text-xs font-normal text-slate-400 ml-1.5">
                      / {targetResult.formattedTarget}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-center gap-2 text-xs">
                    <span
                      className="w-2 h-2 rounded-full inline-block shrink-0"
                      style={{ backgroundColor: targetResult.activeBand.color }}
                    />
                    <span className="font-semibold text-slate-700">{targetResult.activeBand.label}</span>
                    <span className="text-slate-400 tabular-nums">({targetResult.percentOfTarget}%)</span>
                  </div>
                </div>
              </div>
            )}

            {widget.visualStyle === 'progress_bar' && (
              <div className="my-auto space-y-3 py-2">
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    <span className="text-3xl font-bold text-slate-900 tabular-nums">
                      {targetResult.formattedCurrent}
                    </span>
                    <span className="text-xs text-slate-500 ml-1.5 tabular-nums">
                      of {targetResult.formattedTarget} goal
                    </span>
                  </div>
                  <div className="text-right">
                    <span
                      className="text-sm font-bold tabular-nums"
                      style={{ color: targetResult.activeBand.color }}
                    >
                      {targetResult.percentOfTarget}%
                    </span>
                    <p className="text-[11px] text-slate-500">{targetResult.activeBand.label}</p>
                  </div>
                </div>

                {/* Segmented Gradient Track with Indicator */}
                <div className="relative pt-1">
                  <div className="h-3.5 w-full rounded-full bg-slate-100 overflow-hidden flex">
                    {targetResult.bands.map((band) => {
                      const widthPct = Math.max(0, band.max - band.min);
                      return (
                        <div
                          key={band.id}
                          style={{ width: `${widthPct}%`, backgroundColor: band.color, opacity: 0.25 }}
                          className="h-full"
                        />
                      );
                    })}
                  </div>
                  <div
                    className="h-3.5 rounded-full absolute top-1 left-0 transition-all"
                    style={{
                      width: `${targetResult.clampedPercent}%`,
                      backgroundColor: targetResult.activeBand.color,
                    }}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                  {targetResult.bands.map((band) => (
                    <span key={band.id} className="inline-flex items-center gap-1.5 tabular-nums">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: band.color }}
                      />
                      {band.label} ({band.min}–{band.max}%)
                    </span>
                  ))}
                </div>
              </div>
            )}

            {widget.visualStyle === 'bullet' && (
              <div className="my-auto space-y-3 py-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-3xl font-bold text-slate-900 tabular-nums">
                    {targetResult.formattedCurrent}
                  </span>
                  <span className="text-xs font-semibold text-slate-600 tabular-nums">
                    Target: {targetResult.formattedTarget} ({targetResult.percentOfTarget}%)
                  </span>
                </div>

                <div className="relative h-7 rounded-md overflow-hidden bg-slate-100 flex">
                  {targetResult.bands.map((band) => (
                    <div
                      key={band.id}
                      style={{
                        width: `${Math.max(0, band.max - band.min)}%`,
                        backgroundColor: band.color,
                        opacity: 0.22,
                      }}
                      className="h-full"
                    />
                  ))}
                  {/* Inner actual bar */}
                  <div
                    className="absolute top-1.5 bottom-1.5 left-0 rounded-r-sm transition-all"
                    style={{
                      width: `${targetResult.clampedPercent}%`,
                      backgroundColor: targetResult.activeBand.color,
                    }}
                  />
                  {/* Target marker at 100% */}
                  <div className="absolute top-0 bottom-0 right-0.5 w-0.5 bg-slate-900" title="Target" />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: targetResult.activeBand.color }}
                    />
                    {targetResult.activeBand.label}
                  </span>
                  <span className="tabular-nums">Matched: {targetResult.matchedRecords}</span>
                </div>
              </div>
            )}

            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="tabular-nums">{targetResult.matchedRecords.toLocaleString()} records evaluated</span>
              <span className="tabular-nums">Goal: {targetResult.formattedTarget}</span>
            </div>
          </div>
        )}

        {/* 3. CHART VIEW */}
        {widget.componentType === 'chart' && chartResult && (
          <div className="flex flex-col justify-between h-full">
            {chartResult.data.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-xs text-slate-400 bg-slate-50/70 rounded-lg border border-dashed border-slate-200">
                No matching records for the current scope &amp; criteria.
              </div>
            ) : widget.visualStyle === 'funnel' ? (
              <div className="space-y-2 py-2 min-h-[220px]">
                {(() => {
                  const maxVal = Math.max(1, ...chartResult.data.map((d) => Number(d.value || 0)));
                  return chartResult.data.map((pt, idx) => {
                    const widthPct = Math.max(14, Math.round((Number(pt.value || 0) / maxVal) * 100));
                    return (
                      <div key={pt.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-700 truncate pr-2">{pt.name}</span>
                          <span className="font-semibold text-slate-900 tabular-nums shrink-0">
                            {pt.value}
                            {chartResult.unit}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-md h-6 flex items-center justify-center overflow-hidden">
                          <div
                            className="h-full rounded-md transition-all"
                            style={{
                              width: `${widthPct}%`,
                              backgroundColor: ANALYTICS_COLOR_PALETTE[idx % ANALYTICS_COLOR_PALETTE.length],
                            }}
                          />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            ) : (
              <div className="h-[235px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {widget.visualStyle === 'bar' ? (
                    <BarChart data={chartResult.data} layout="vertical" margin={{ top: 6, right: 18, left: 10, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={108}
                        tick={{ fontSize: 11, fill: '#475569' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '8px',
                          borderColor: '#e2e8f0',
                          fontSize: '12px',
                        }}
                      />
                      {chartResult.seriesKeys.length > 1 && <Legend wrapperStyle={{ fontSize: '11px' }} />}
                      {chartResult.seriesKeys.map((sk, idx) => (
                        <Bar
                          key={sk}
                          dataKey={sk}
                          name={sk === 'value' ? metricDef.label : sk}
                          stackId={chartResult.seriesKeys.length > 1 ? 'a' : undefined}
                          fill={ANALYTICS_COLOR_PALETTE[idx % ANALYTICS_COLOR_PALETTE.length]}
                          radius={chartResult.seriesKeys.length > 1 ? [0, 0, 0, 0] : [0, 4, 4, 0]}
                          maxBarSize={24}
                        />
                      ))}
                    </BarChart>
                  ) : widget.visualStyle === 'line' ? (
                    <LineChart data={chartResult.data} margin={{ top: 8, right: 16, left: -12, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '8px', borderColor: '#e2e8f0', fontSize: '12px' }} />
                      {chartResult.seriesKeys.length > 1 && <Legend wrapperStyle={{ fontSize: '11px' }} />}
                      {chartResult.seriesKeys.map((sk, idx) => (
                        <Line
                          key={sk}
                          type="monotone"
                          dataKey={sk}
                          name={sk === 'value' ? metricDef.label : sk}
                          stroke={ANALYTICS_COLOR_PALETTE[idx % ANALYTICS_COLOR_PALETTE.length]}
                          strokeWidth={2.25}
                          dot={{ r: 3.5 }}
                          activeDot={{ r: 5 }}
                        />
                      ))}
                    </LineChart>
                  ) : widget.visualStyle === 'area' ? (
                    <AreaChart data={chartResult.data} margin={{ top: 8, right: 16, left: -12, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '8px', borderColor: '#e2e8f0', fontSize: '12px' }} />
                      {chartResult.seriesKeys.length > 1 && <Legend wrapperStyle={{ fontSize: '11px' }} />}
                      {chartResult.seriesKeys.map((sk, idx) => (
                        <Area
                          key={sk}
                          type="monotone"
                          dataKey={sk}
                          name={sk === 'value' ? metricDef.label : sk}
                          stroke={ANALYTICS_COLOR_PALETTE[idx % ANALYTICS_COLOR_PALETTE.length]}
                          fill={ANALYTICS_COLOR_PALETTE[idx % ANALYTICS_COLOR_PALETTE.length]}
                          fillOpacity={0.14}
                          strokeWidth={2}
                        />
                      ))}
                    </AreaChart>
                  ) : widget.visualStyle === 'pie' || widget.visualStyle === 'donut' ? (
                    <PieChart>
                      <Pie
                        data={chartResult.data}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={widget.visualStyle === 'donut' ? 52 : 0}
                        outerRadius={82}
                        paddingAngle={2}
                      >
                        {chartResult.data.map((entry, idx) => (
                          <Cell
                            key={`${entry.name}-${idx}`}
                            fill={ANALYTICS_COLOR_PALETTE[idx % ANALYTICS_COLOR_PALETTE.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', borderColor: '#e2e8f0', fontSize: '12px' }} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  ) : (
                    /* column or stacked_column */
                    <BarChart data={chartResult.data} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '8px', borderColor: '#e2e8f0', fontSize: '12px' }} />
                      {chartResult.seriesKeys.length > 1 && <Legend wrapperStyle={{ fontSize: '11px' }} />}
                      {chartResult.seriesKeys.map((sk, idx) => (
                        <Bar
                          key={sk}
                          dataKey={sk}
                          name={sk === 'value' ? metricDef.label : sk}
                          stackId={
                            widget.visualStyle === 'stacked_column' || chartResult.seriesKeys.length > 1
                              ? 'stack'
                              : undefined
                          }
                          fill={ANALYTICS_COLOR_PALETTE[idx % ANALYTICS_COLOR_PALETTE.length]}
                          radius={
                            widget.visualStyle === 'stacked_column' || chartResult.seriesKeys.length > 1
                              ? [0, 0, 0, 0]
                              : [4, 4, 0, 0]
                          }
                          maxBarSize={38}
                        />
                      ))}
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}

            <div className="pt-2.5 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="tabular-nums">
                {chartResult.matchedRecords.toLocaleString()} records · {chartResult.data.length} groups
              </span>
              <span className="truncate">
                Grouped by <strong className="text-slate-700">{moduleDef.groupByFields.find((f) => f.id === widget.groupBy)?.label || widget.groupBy || 'Category'}</strong>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
