import React from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  tooltip?: string;
  size?: 'sm' | 'md';
  variant?: 'default' | 'primary' | 'ghost' | 'danger';
}

const sizeMap = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-8 h-8',
};

const variantMap = {
  default: 'icon-btn',
  primary: 'icon-btn bg-primary text-white border border-primary-dim hover:bg-primary-dim',
  ghost: 'icon-btn bg-transparent hover:bg-surface border border-border-soft',
  danger: 'icon-btn bg-danger text-white hover:bg-danger/80 border border-danger',
};

export const IconButton: React.FC<IconButtonProps> = ({
  active = false,
  tooltip,
  size = 'md',
  variant = 'default',
  className = '',
  children,
  ...rest
}) => {
  const classes = [
    variantMap[variant],
    sizeMap[size],
    active ? 'ring-2 ring-primary/50 ring-offset-0' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} aria-pressed={active} title={tooltip} {...rest}>
      {children}
    </button>
  );
};

export default IconButton;
