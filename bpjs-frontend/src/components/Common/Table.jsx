// src/components/Common/Table.jsx
import React from 'react';

export const Table = ({ columns = [], data = [], keyField = 'id', emptyMessage = 'Tidak ada data tersedia', className = '' }) => {
  return (
    <div className={`overflow-x-auto rounded-xl border border-gray-100 ${className}`}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col, idx) => (
              <th
                key={col.key || idx}
                scope="col"
                className={`px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-8 text-center text-sm text-gray-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rIdx) => (
              <tr key={row[keyField] || rIdx} className="hover:bg-gray-50/80 transition-colors">
                {columns.map((col, cIdx) => (
                  <td key={col.key || cIdx} className={`px-6 py-4 whitespace-nowrap text-sm text-gray-700 ${col.cellClassName || ''}`}>
                    {col.render ? col.render(row[col.key], row, rIdx) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
