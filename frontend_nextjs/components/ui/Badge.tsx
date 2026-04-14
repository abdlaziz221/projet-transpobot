/* eslint-disable */
'use client';

import React, { ReactNode, HTMLAttributes } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'primary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  children: ReactNode;
}

export default function Badge({
  variant = 'default',
  size = 'md',
  dot = false,
  children,
  className = '',
  ...props
}: BadgeProps) {
  const variantClasses = {
    default: 'badge-gray',
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    info: 'badge-info',
    purple: 'badge-purple',
    primary: 'badge-primary',
    ghost: 'badge-ghost',
  };

  const sizeClasses = {
    sm: 'badge-sm',
    md: '',
    lg: 'badge-lg',
  };

  return (
    <span
      className={`badge ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {dot && <span className="badge-dot" />}
      {children}
    </span>
  );
}

interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'pending' | 'error' | 'success' | 'warning';
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = {
    active: { variant: 'success' as const, label: 'Actif' },
    inactive: { variant: 'default' as const, label: 'Inactif' },
    pending: { variant: 'warning' as const, label: 'En attente' },
    error: { variant: 'danger' as const, label: 'Erreur' },
    success: { variant: 'success' as const, label: 'Succès' },
    warning: { variant: 'warning' as const, label: 'Attention' },
  };

  const { variant, label: defaultLabel } = config[status];

  return (
    <Badge variant={variant} dot>
      {label || defaultLabel}
    </Badge>
  );
}
