import React from 'react';

export type ButtonVariant = 'default' | 'primary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  pill?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
}

const variantClass: Record<ButtonVariant, string> = {
  default: 'btn',
  primary: 'btn btn-primary',
  ghost: 'btn btn-ghost',
  danger: 'btn btn-danger',
};

const sizeClass: Record<ButtonSize, string> = {
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'default',
  size = 'md',
  pill = false,
  leftIcon,
  rightIcon,
  loading = false,
  className = '',
  children,
  disabled,
  ...rest
}) => {
  const classes = [
    variantClass[variant],
    sizeClass[size],
    pill ? 'btn-pill' : '',
    loading ? 'opacity-60 pointer-events-none' : '',
    disabled ? 'opacity-40 cursor-not-allowed' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} disabled={disabled || loading} {...rest}>
      {loading && (
        <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
      )}
      {leftIcon && <span className="flex items-center mr-1">{leftIcon}</span>}
      <span>{children}</span>
      {rightIcon && <span className="flex items-center ml-1">{rightIcon}</span>}
    </button>
  );
};

export default Button;
