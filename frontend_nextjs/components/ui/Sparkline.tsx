/* eslint-disable */
'use client';

import React, { useMemo } from 'react';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  gradient?: boolean;
  showArea?: boolean;
  strokeWidth?: number;
  className?: string;
}

export default function Sparkline({
  data,
  width = 120,
  height = 40,
  color = 'var(--primary)',
  gradient = true,
  showArea = true,
  strokeWidth = 2,
  className = '',
}: SparklineProps) {
  const points = useMemo(() => {
    if (data.length === 0) return '';

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const xStep = width / (data.length - 1 || 1);

    return data
      .map((value, index) => {
        const x = index * xStep;
        const y = height - ((value - min) / range) * height;
        return `${x},${y}`;
      })
      .join(' ');
  }, [data, width, height]);

  const areaPoints = useMemo(() => {
    if (!showArea || !points) return '';
    return `0,${height} ${points} ${width},${height}`;
  }, [points, showArea, width, height]);

  const gradientId = `sparkline-gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <svg
      width={width}
      height={height}
      className={className}
      style={{ display: 'block' }}
    >
      <defs>
        {gradient && (
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        )}
      </defs>

      {showArea && areaPoints && (
        <polygon
          points={areaPoints}
          fill={gradient ? `url(#${gradientId})` : `${color}20`}
        />
      )}

      {points && (
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

interface TrendIndicatorProps {
  value: number;
  prefix?: string;
  suffix?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  inverted?: boolean;
}

export function TrendIndicator({
  value,
  prefix = '',
  suffix = '%',
  showIcon = true,
  size = 'md',
  inverted = false,
}: TrendIndicatorProps) {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const isNeutral = value === 0;

  const getColor = () => {
    if (isNeutral) return 'var(--text-muted)';
    const effective = inverted ? !isPositive : isPositive;
    return effective ? 'var(--success)' : 'var(--danger)';
  };

  const getIcon = () => {
    if (!showIcon) return null;
    if (isNeutral) return '−';
    if (inverted ? !isPositive : isPositive) return '↑';
    return '↓';
  };

  const sizes = {
    sm: { fontSize: '10px', padding: '2px 4px' },
    md: { fontSize: '12px', padding: '4px 8px' },
    lg: { fontSize: '14px', padding: '6px 12px' },
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: sizes[size].padding,
        borderRadius: 'var(--radius-full)',
        fontSize: sizes[size].fontSize,
        fontWeight: 600,
        color: getColor(),
        background: `${getColor()}15`,
        whiteSpace: 'nowrap',
      }}
    >
      {showIcon && <span>{getIcon()}</span>}
      <span>
        {prefix}
        {Math.abs(value).toFixed(1)}
        {suffix}
      </span>
    </span>
  );
}
