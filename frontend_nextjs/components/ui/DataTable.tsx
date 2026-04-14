/* eslint-disable */
'use client';

import React, { useState, useMemo, ReactNode } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, Filter, Download } from 'lucide-react';

interface Column<T> {
  key: keyof T | string;
  title?: string;
  label?: string;        /* alias for title used in management components */
  sortable?: boolean;
  searchable?: boolean;
  width?: string;
  style?: React.CSSProperties;
  render?: (value: any, row: T, index: number) => ReactNode;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  loading?: boolean;     /* alias for isLoading */
  emptyMessage?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  onRowClick?: (row: T, index: number) => void;
  onSearch?: (query: string) => void;
  actions?: ReactNode | ((row: T, index: number) => ReactNode);
  rowKey?: keyof T | ((row: T) => string);
  stickyHeader?: boolean;
  compact?: boolean;
  striped?: boolean;
  hoverable?: boolean;
  className?: string;
  title?: string;
  subtitle?: string;
}


export default function DataTable<T extends Record<string, any>>({
  data,
  columns,
  isLoading = false,
  loading,
  emptyMessage = 'Aucune donnée disponible',
  searchable = false,
  searchPlaceholder = 'Rechercher...',
  onRowClick,
  onSearch,
  actions,
  rowKey = 'id',
  stickyHeader = true,
  compact = false,
  striped = false,
  hoverable = true,
  className = '',
  title,
  subtitle,
}: DataTableProps<T>) {
  const isLoadingResolved = loading ?? isLoading;

  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});

  // Traitement des données
  const processedData = useMemo(() => {
    let result = [...data];

    // Filtrage par recherche
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(row =>
        columns
          .filter(col => col.searchable !== false)
          .some(col => {
            const value = row[col.key as keyof T];
            return String(value).toLowerCase().includes(searchLower);
          })
      );
    }

    // Tri
    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key as keyof T];
        const bValue = b[sortConfig.key as keyof T];

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchTerm, sortConfig, columns]);

  // Gestion du tri
  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return current.direction === 'asc'
          ? { key, direction: 'desc' }
          : null;
      }
      return { key, direction: 'asc' };
    });
  };

  // Get row key
  const getRowKey = (row: T, index: number) => {
    if (typeof rowKey === 'function') return rowKey(row);
    return String(row[rowKey as keyof T] ?? index);
  };

  // Render cell value
  const renderCell = (column: Column<T>, row: T, index: number) => {
    const value = row[column.key as keyof T];
    if (column.render) return column.render(value, row, index);
    return value;
  };

  // Get sort icon
  const getSortIcon = (column: Column<T>) => {
    if (!column.sortable) return null;
    if (sortConfig?.key === column.key) {
      return sortConfig.direction === 'asc' ? (
        <ChevronUp size={14} />
      ) : (
        <ChevronDown size={14} />
      );
    }
    return <ChevronsUpDown size={14} className="opacity-30" />;
  };

  return (
    <div className={`data-table-container ${className}`}>
      {/* Toolbar */}
      {(searchable || actions) && (
        <div className="data-table-toolbar" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--space-4)',
          gap: 'var(--space-3)',
          flexWrap: 'wrap',
        }}>
          {searchable && (
            <div className="data-table-search" style={{
              position: 'relative',
              flex: 1,
              maxWidth: '400px',
            }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: 'var(--space-3)',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: 'var(--space-2) var(--space-3) var(--space-2) var(--space-9)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: 'var(--text-sm)',
                  outline: 'none',
                }}
              />
            </div>
          )}
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {actions && typeof actions !== 'function' ? actions : null}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="table-wrapper" style={{
        overflow: 'auto',
        maxHeight: stickyHeader ? 'calc(100vh - 300px)' : 'none',
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 'var(--text-sm)',
        }}>
          <thead style={{
            position: stickyHeader ? 'sticky' : 'static',
            top: 0,
            zIndex: 10,
            background: 'var(--bg-subtle)',
          }}>
            <tr>
              {columns.map((column, index) => (
                <th
                  key={String(column.key)}
                  onClick={() => column.sortable && handleSort(String(column.key))}
                  style={{
                    padding: compact ? 'var(--space-2) var(--space-3)' : 'var(--space-3) var(--space-4)',
                    textAlign: column.align || 'left',
                    cursor: column.sortable ? 'pointer' : 'default',
                    userSelect: column.sortable ? 'none' : 'auto',
                    whiteSpace: 'nowrap',
                    width: column.width,
                    borderBottom: '1px solid var(--border)',
                    fontWeight: 600,
                    fontSize: 'var(--text-xs)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--text-muted)',
                    transition: 'background 0.2s',
                  }}
                  onMouseOver={e => {
                    if (column.sortable) {
                      e.currentTarget.style.background = 'var(--border)';
                    }
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.background = 'var(--bg-subtle)';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    justifyContent: column.align === 'right' ? 'flex-end' : column.align === 'center' ? 'center' : 'flex-start',
                  }}>
                    {column.title}
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                      {getSortIcon(column)}
                    </span>
                  </div>
                </th>
              ))}
              {actions && (
                <th style={{
                  padding: compact ? 'var(--space-2) var(--space-3)' : 'var(--space-3) var(--space-4)',
                  textAlign: 'right',
                  width: 'auto',
                }}>
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 1 : 0)}
                  style={{
                    padding: 'var(--space-10)',
                    textAlign: 'center',
                  }}
                >
                  <div className="spinner" style={{ margin: '0 auto' }} />
                  <p style={{
                    marginTop: 'var(--space-3)',
                    color: 'var(--text-muted)',
                    fontSize: 'var(--text-sm)',
                  }}>
                    Chargement...
                  </p>
                </td>
              </tr>
            ) : processedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 1 : 0)}
                  style={{
                    padding: 'var(--space-10)',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                  }}
                >
                  <div style={{
                    width: '64px',
                    height: '64px',
                    margin: '0 auto var(--space-4)',
                    background: 'var(--bg-subtle)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Search size={32} style={{ opacity: 0.3 }} />
                  </div>
                  <p style={{ fontSize: 'var(--text-base)', fontWeight: 500 }}>
                    {emptyMessage}
                  </p>
                </td>
              </tr>
            ) : (
              processedData.map((row, index) => (
                <tr
                  key={getRowKey(row, index)}
                  onClick={() => onRowClick?.(row, index)}
                  className={striped && index % 2 === 1 ? 'table-striped-row' : ''}
                  style={{
                    cursor: onRowClick ? 'pointer' : 'default',
                    transition: 'background 0.15s',
                  }}
                  onMouseOver={e => {
                    if (hoverable) {
                      e.currentTarget.style.background = 'var(--primary-50)';
                    }
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.background = '';
                  }}
                >
                  {columns.map((column, colIndex) => (
                    <td
                      key={`${getRowKey(row, index)}-${String(column.key)}`}
                      style={{
                        padding: compact ? 'var(--space-2) var(--space-3)' : 'var(--space-4)',
                        textAlign: column.align || 'left',
                        borderBottom: '1px solid var(--border)',
                        color: 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {renderCell(column, row, index)}
                    </td>
                  ))}
                  {actions && (
                    <td style={{
                      padding: compact ? 'var(--space-2) var(--space-3)' : 'var(--space-4)',
                      textAlign: 'right',
                      borderBottom: '1px solid var(--border)',
                    }}>
                      <div style={{
                        display: 'flex',
                        gap: 'var(--space-2)',
                        justifyContent: 'flex-end',
                      }}>
                        {typeof actions === 'function' ? actions(row, index) : null}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer / Info */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 'var(--space-4)',
        fontSize: 'var(--text-xs)',
        color: 'var(--text-muted)',
      }}>
        <span>
          {processedData.length} sur {data.length} résultat{processedData.length > 1 ? 's' : ''}
          {searchTerm && ` pour "${searchTerm}"`}
        </span>
        {sortConfig && (
          <span>
            Tri: {columns.find(c => c.key === sortConfig.key)?.title}{' '}
            {sortConfig.direction === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </div>
  );
}
