import React from 'react';

/**
 * Metric/KPI Stat Card Skeleton
 */
export function StatsSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5"
        >
          <div className="flex items-center justify-between">
            <div className="h-3 w-16 bg-slate-200 rounded"></div>
            <div className="w-6 h-6 bg-slate-200 rounded-lg"></div>
          </div>
          <div className="h-6 w-10 bg-slate-300 rounded"></div>
        </div>
      ))}
    </div>
  );
}

/**
 * Table Rows Skeleton
 */
export function TableSkeleton({ rows = 5, cols = 6 }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs animate-pulse">
      <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
        <div className="h-4 w-32 bg-slate-200 rounded"></div>
        <div className="h-4 w-20 bg-slate-200 rounded"></div>
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-4 flex items-center justify-between gap-4">
            <div className="h-4 w-24 bg-slate-200 rounded"></div>
            <div className="h-4 w-48 bg-slate-200 rounded hidden sm:block"></div>
            <div className="h-4 w-20 bg-slate-200 rounded"></div>
            <div className="h-4 w-16 bg-slate-200 rounded"></div>
            <div className="h-4 w-20 bg-slate-200 rounded hidden md:block"></div>
            <div className="h-6 w-16 bg-slate-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Card Layout Skeleton
 */
export function CardSkeleton({ count = 3 }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="h-4 w-28 bg-slate-200 rounded"></div>
            <div className="h-5 w-16 bg-slate-200 rounded-full"></div>
          </div>
          <div className="h-5 w-3/4 bg-slate-300 rounded"></div>
          <div className="flex items-center space-x-4 pt-1">
            <div className="h-3 w-20 bg-slate-200 rounded"></div>
            <div className="h-3 w-24 bg-slate-200 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Details Page Skeleton
 */
export function DetailsSkeleton() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
      <div className="h-4 w-32 bg-slate-200 rounded"></div>
      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center space-x-2">
          <div className="h-5 w-20 bg-slate-200 rounded"></div>
          <div className="h-5 w-20 bg-slate-200 rounded"></div>
        </div>
        <div className="h-7 w-2/3 bg-slate-300 rounded"></div>
        <div className="h-20 w-full bg-slate-100 rounded-lg"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 h-48"></div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 h-48"></div>
      </div>
    </div>
  );
}
