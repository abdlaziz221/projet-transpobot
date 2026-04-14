/* eslint-disable */
'use client';

import React, { ReactNode, HTMLAttributes } from 'react';

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  children?: ReactNode;
  variant?: 'default' | 'elevated' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  header?: ReactNode;
  footer?: ReactNode;
  /* Convenience props used across management components */
  title?: ReactNode;
  subtitle?: ReactNode;
  extra?: ReactNode;
  interactive?: boolean;
}

export default function Card({
  children,
  variant = 'default',
  padding = 'md',
  header,
  footer,
  title,
  subtitle,
  extra,
  interactive,
  className = '',
  ...props
}: CardProps) {
  const variantClasses = {
    default: '',
    elevated: 'card-elevated',
    interactive: 'card-interactive',
  };

  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-6',
    lg: 'p-8',
  };

  const hasBuiltInHeader = title || subtitle || extra;

  return (
    <div
      className={`card ${variantClasses[variant]} ${interactive ? 'card-interactive' : ''} ${className}`}
      {...props}
    >
      {header && (
        <div className="card-header">
          {header}
        </div>
      )}
      {hasBuiltInHeader && (
        <div className="card-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            {title && <h3 className="card-title" style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>{title}</h3>}
            {subtitle && <p className="card-subtitle" style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{subtitle}</p>}
          </div>
          {extra && <div>{extra}</div>}
        </div>
      )}
      <div className={paddingClasses[padding]}>
        {children}
      </div>
      {footer && (
        <div className="card-footer">
          {footer}
        </div>
      )}
    </div>
  );
}

interface CardHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function CardHeader({ title, subtitle, action, className = '' }: CardHeaderProps) {
  return (
    <div className={`card-header ${className}`}>
      <div>
        <h3 className="card-title">{title}</h3>
        {subtitle && <p className="card-subtitle">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div className={`card-footer ${className}`}>
      {children}
    </div>
  );
}
