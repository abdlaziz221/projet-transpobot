/* eslint-disable */
'use client';

import React, { InputHTMLAttributes, ReactNode, forwardRef } from 'react';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  icon?: ReactNode;      /* alias for leftIcon */
  size?: 'sm' | 'md' | 'lg';
  containerClassName?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      icon,
      size = 'md',
      containerClassName = '',
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const resolvedLeftIcon = leftIcon || icon;

    const sizeClasses = {
      sm: 'input-sm',
      md: '',
      lg: 'input-lg',
    };

    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className={`input-group-container ${containerClassName}`}>
        {label && (
          <label htmlFor={inputId}>
            {label}
          </label>
        )}
        <div className="input-group" style={{ position: 'relative' }}>
          {resolvedLeftIcon && (
            <span className="input-icon" style={{
              position: 'absolute',
              left: 'var(--space-3)',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
              zIndex: 10
            }}>
              {resolvedLeftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`
              ${sizeClasses[size]}
              ${error ? 'input-error' : ''}
              ${resolvedLeftIcon ? 'pl-10' : ''}
              ${className}
            `.trim()}
            style={resolvedLeftIcon ? { paddingLeft: 'var(--space-10)' } : {}}
            {...props}
          />
          {rightIcon && (
            <span className="input-icon" style={{
              position: 'absolute',
              right: 'var(--space-3)',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
              zIndex: 10
            }}>
              {rightIcon}
            </span>
          )}
        </div>
        {error && (
          <p className="error-text" style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--danger-600)',
            marginTop: 'var(--space-1)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-1)'
          }}>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="helper-text" style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--text-muted)',
            marginTop: 'var(--space-1)'
          }}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
