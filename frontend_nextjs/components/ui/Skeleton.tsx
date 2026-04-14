/* eslint-disable */
'use client';

import React, { HTMLAttributes } from 'react';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'title' | 'circle' | 'rect' | 'card';
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  count?: number;
}

export default function Skeleton({
  variant = 'text',
  width,
  height,
  borderRadius,
  count = 1,
  className = '',
  ...props
}: SkeletonProps) {
  const variantClasses = {
    text: 'skeleton-text',
    title: 'skeleton-title',
    circle: 'skeleton-circle',
    rect: '',
    card: 'skeleton-card',
  };

  const style: React.CSSProperties = {
    width,
    height,
    borderRadius: borderRadius || (variant === 'circle' ? '50%' : undefined),
  };

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`skeleton ${variantClasses[variant]} ${className}`}
          style={style}
          {...props}
        />
      ))}
    </>
  );
}

interface SkeletonCardProps {
  showImage?: boolean;
  showTitle?: boolean;
  showText?: boolean;
  lines?: number;
}

export function SkeletonCard({
  showImage = true,
  showTitle = true,
  showText = true,
  lines = 3,
}: SkeletonCardProps) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {showImage && (
        <Skeleton
          variant="rect"
          height="160px"
          width="100%"
          style={{ borderRadius: 0 }}
        />
      )}
      <div style={{ padding: 'var(--space-4)' }}>
        {showTitle && (
          <Skeleton variant="title" height="24px" width="70%" style={{ marginBottom: 'var(--space-3)' }} />
        )}
        {showText && (
          <div>
            {Array.from({ length: lines }).map((_, i) => (
              <Skeleton
                key={i}
                variant="text"
                height="16px"
                width={`${100 - i * 10}%`}
                style={{ marginBottom: i === lines - 1 ? 0 : 'var(--space-2)' }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i}>
                <Skeleton height="16px" width="60px" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex}>
                  <Skeleton height="20px" width="100%" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SkeletonKPICard() {
  return (
    <div className="card" style={{ padding: 'var(--space-5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
        <div style={{ flex: 1 }}>
          <Skeleton height="12px" width="80px" style={{ marginBottom: 'var(--space-2)' }} />
          <Skeleton height="32px" width="120px" />
        </div>
        <Skeleton
          variant="circle"
          width="44px"
          height="44px"
        />
      </div>
      <Skeleton height="12px" width="100px" />
    </div>
  );
}
