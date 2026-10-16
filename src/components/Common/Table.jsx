// src/components/Common/Table.jsx
import React from 'react';

export const Table = ({ 
  columns = [], 
  data = [], 
  keyField = 'id', 
  emptyMessage = 'Tidak ada data tersedia', 
  className = '',
  onRowClick = null,
  activeRowKey = null
}) => {
  return (
    <div className={`overflow-hidden rounded-[22px] bg-white border border-[#EAE9E4] ${className}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[#EAE9E4]">
          <thead className="bg-[#FAF9F6]">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={col.key || idx}
                  scope="col"
                  className={`px-5 py-3.5 text-left text-[11px] font-bold text-[#6E6D6A] uppercase tracking-wider ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0EFEA] bg-white">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-sm text-[#6E6D6A]">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rIdx) => {
                const rowKey = row[keyField] || rIdx;
                const isActive = activeRowKey !== null && activeRowKey === rowKey;

                return (
                  <tr 
                    key={rowKey} 
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`transition-colors duration-150 ${
                      isActive 
                        ? 'bg-[#F5C6EC]/40 font-semibold text-[#121214]' 
                        : 'hover:bg-[#F5F4F0]/70 text-[#121214]'
                    } ${onRowClick ? 'cursor-pointer' : ''}`}
                  >
                    {columns.map((col, cIdx) => (
                      <td 
                        key={col.key || cIdx} 
                        className={`px-5 py-4 whitespace-nowrap text-xs sm:text-sm ${col.cellClassName || ''}`}
                      >
                        {col.render ? col.render(row[col.key], row, rIdx) : (row[col.key] ?? '-')}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Table;
