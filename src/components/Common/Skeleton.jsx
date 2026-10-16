import React from 'react';

/**
 * Intelly Soft Neo-Brutalist Skeleton Components
 * Designed to provide instant perceived performance and prevent layout shifts (CLS).
 */

export const Skeleton = ({ className = '', ...props }) => (
  <div 
    className={`animate-pulse bg-[#E5E4DE] rounded-xl ${className}`} 
    {...props} 
  />
);

export const CardSkeleton = ({ className = '' }) => (
  <div className={`p-5 sm:p-6 bg-white rounded-[22px] border border-[#EAE9E4] shadow-sm space-y-3 ${className}`}>
    <div className="flex items-center justify-between">
      <Skeleton className="w-8 h-8 rounded-lg" />
      <Skeleton className="w-16 h-5 rounded-full" />
    </div>
    <Skeleton className="w-28 h-4 rounded-md" />
    <Skeleton className="w-36 h-8 rounded-lg" />
    <div className="pt-2 border-t border-[#F0EFEA] flex justify-between">
      <Skeleton className="w-20 h-3 rounded-md" />
      <Skeleton className="w-12 h-3 rounded-md" />
    </div>
  </div>
);

export const StatRowSkeleton = ({ count = 4, className = '' }) => (
  <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full ${className}`}>
    {Array.from({ length: count }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);

export const TableSkeleton = ({ rows = 5, cols = 5, title = "Memuat Data..." }) => (
  <div className="w-full bg-white rounded-[22px] border border-[#EAE9E4] overflow-hidden shadow-sm">
    <div className="p-4 bg-[#FAF9F6] border-b border-[#EAE9E4] flex items-center justify-between gap-4">
      <Skeleton className="w-36 h-6 rounded-md" />
      <Skeleton className="w-48 h-8 rounded-full" />
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-[#EAE9E4]">
        <thead className="bg-[#FAF9F6]">
          <tr>
            {Array.from({ length: cols }).map((_, c) => (
              <th key={c} className="px-5 py-3.5 text-left">
                <Skeleton className="w-20 h-4 rounded-md" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F0EFEA] bg-white">
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} className="px-5 py-4 whitespace-nowrap">
                  {c === 0 ? (
                    <Skeleton className="w-16 h-5 rounded-full" />
                  ) : c === 1 ? (
                    <div className="space-y-1.5">
                      <Skeleton className="w-32 h-4 rounded-md" />
                      <Skeleton className="w-20 h-3 rounded-md" />
                    </div>
                  ) : c === cols - 1 ? (
                    <div className="flex justify-end gap-2">
                      <Skeleton className="w-7 h-7 rounded-lg" />
                      <Skeleton className="w-7 h-7 rounded-lg" />
                    </div>
                  ) : (
                    <Skeleton className="w-20 h-4 rounded-md" />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export const ListSkeleton = ({ items = 4 }) => (
  <div className="divide-y divide-[#F0EFEA] bg-white rounded-[22px] border border-[#EAE9E4] overflow-hidden shadow-sm">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="p-4 flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="w-1/3 h-4 rounded-md" />
          <Skeleton className="w-3/4 h-3 rounded-md" />
        </div>
        <Skeleton className="w-16 h-3 rounded-md shrink-0" />
      </div>
    ))}
  </div>
);

export const DashboardSkeleton = () => (
  <div className="space-y-6 w-full animate-in fade-in duration-200">
    {/* Top Header Bento */}
    <div className="bg-white rounded-[22px] border border-[#EAE9E4] p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="space-y-2">
        <Skeleton className="w-40 h-5 rounded-full" />
        <Skeleton className="w-64 h-8 rounded-lg" />
        <Skeleton className="w-80 h-4 rounded-md" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="w-24 h-9 rounded-full" />
        <Skeleton className="w-28 h-9 rounded-full" />
      </div>
    </div>

    {/* Stat Cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>

    {/* Main Grid Columns */}
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8 bg-white rounded-[22px] border border-[#EAE9E4] p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-[#F0EFEA]">
          <Skeleton className="w-36 h-6 rounded-md" />
          <Skeleton className="w-24 h-5 rounded-full" />
        </div>
        <Skeleton className="w-full h-72 rounded-xl" />
      </div>
      <div className="lg:col-span-4 bg-white rounded-[22px] border border-[#EAE9E4] p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-[#F0EFEA]">
          <Skeleton className="w-28 h-6 rounded-md" />
          <Skeleton className="w-16 h-5 rounded-full" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="w-full h-16 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default Skeleton;
