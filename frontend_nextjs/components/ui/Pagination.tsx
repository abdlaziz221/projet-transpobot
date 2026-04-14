/* eslint-disable */
'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  itemsPerPage?: number;
  onPageChange: (page: number) => void;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  showTotal?: boolean;
  className?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage = 10,
  onPageChange,
  pageSizeOptions = [10, 20, 50, 100],
  onPageSizeChange,
  showSizeChanger = true,
  showQuickJumper = false,
  showTotal = true,
  className = '',
}: PaginationProps) {
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems || 0);

  return (
    <div className={`pagination-container ${className}`} style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 'var(--space-4)',
      paddingTop: 'var(--space-4)',
      borderTop: '1px solid var(--border)',
      fontSize: 'var(--text-sm)',
      color: 'var(--text-muted)',
      flexWrap: 'wrap',
      gap: 'var(--space-3)',
    }}>
      {/* Total Info */}
      {showTotal && totalItems && (
        <div style={{ fontSize: 'var(--text-xs)' }}>
          Affichage de <strong>{startItem}-{endItem}</strong> sur{' '}
          <strong>{totalItems}</strong> résultats
        </div>
      )}

      {/* Size Changer */}
      {showSizeChanger && onPageSizeChange && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: 'var(--text-xs)' }}>Par page:</span>
          <select
            value={itemsPerPage}
            onChange={e => onPageSizeChange(Number(e.target.value))}
            style={{
              padding: 'var(--space-1) var(--space-2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-xs)',
              cursor: 'pointer',
            }}
          >
            {pageSizeOptions.map(size => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Pagination Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
        {/* First Page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="icon-btn icon-btn-sm"
          style={{
            opacity: currentPage === 1 ? 0.5 : 1,
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
          }}
          title="Première page"
        >
          <ChevronsLeft size={16} />
        </button>

        {/* Previous Page */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="icon-btn icon-btn-sm"
          style={{
            opacity: currentPage === 1 ? 0.5 : 1,
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
          }}
          title="Page précédente"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Page Numbers */}
        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
          {getPageNumbers().map((page, index) =>
            typeof page === 'number' ? (
              <button
                key={index}
                onClick={() => onPageChange(page)}
                style={{
                  minWidth: '32px',
                  height: '32px',
                  padding: 'var(--space-1)',
                  border: '1px solid',
                  borderRadius: 'var(--radius-md)',
                  background: page === currentPage ? 'var(--primary)' : 'var(--surface)',
                  color: page === currentPage ? 'white' : 'var(--text-secondary)',
                  borderColor: page === currentPage ? 'var(--primary)' : 'var(--border)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: page === currentPage ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseOver={e => {
                  if (page !== currentPage) {
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.color = 'var(--primary)';
                  }
                }}
                onMouseOut={e => {
                  if (page !== currentPage) {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }
                }}
              >
                {page}
              </button>
            ) : (
              <span
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 var(--space-1)',
                  color: 'var(--text-muted)',
                }}
              >
                ...
              </span>
            )
          )}
        </div>

        {/* Next Page */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="icon-btn icon-btn-sm"
          style={{
            opacity: currentPage === totalPages ? 0.5 : 1,
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
          }}
          title="Page suivante"
        >
          <ChevronRight size={16} />
        </button>

        {/* Last Page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="icon-btn icon-btn-sm"
          style={{
            opacity: currentPage === totalPages ? 0.5 : 1,
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
          }}
          title="Dernière page"
        >
          <ChevronsRight size={16} />
        </button>
      </div>

      {/* Quick Jumper */}
      {showQuickJumper && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: 'var(--text-xs)' }}>Aller à:</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            defaultValue={currentPage}
            onBlur={e => {
              const page = parseInt(e.target.value);
              if (page >= 1 && page <= totalPages) {
                onPageChange(page);
              }
            }}
            onKeyPress={e => {
              if (e.key === 'Enter') {
                const page = parseInt((e.target as HTMLInputElement).value);
                if (page >= 1 && page <= totalPages) {
                  onPageChange(page);
                }
              }
            }}
            style={{
              width: '60px',
              padding: 'var(--space-1) var(--space-2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)',
              textAlign: 'center',
            }}
          />
        </div>
      )}
    </div>
  );
}
