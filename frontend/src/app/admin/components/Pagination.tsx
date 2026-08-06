import React from 'react';

interface PaginationProps {
  limit: number;
  offset: number;
  total: number;
  onPageChange: (newOffset: number) => void;
}

export default function Pagination({ limit, offset, total, onPageChange }: PaginationProps) {
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex items-center justify-between mt-6 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
      <div className="text-sm text-slate-500">
        Showing <span className="font-medium">{total === 0 ? 0 : offset + 1}</span> to <span className="font-medium">{Math.min(offset + limit, total)}</span> of <span className="font-medium">{total}</span> results
      </div>
      <div className="space-x-2">
        <button 
          onClick={() => onPageChange(Math.max(0, offset - limit))}
          disabled={offset === 0}
          className="px-4 py-2 border border-slate-300 rounded text-sm font-medium disabled:opacity-50 hover:bg-slate-50 transition-colors"
        >
          Previous
        </button>
        <button 
          onClick={() => onPageChange(offset + limit)}
          disabled={offset + limit >= total}
          className="px-4 py-2 border border-slate-300 rounded text-sm font-medium disabled:opacity-50 hover:bg-slate-50 transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}
