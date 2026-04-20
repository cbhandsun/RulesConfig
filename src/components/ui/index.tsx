import * as React from 'react';

export function Card({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`bg-theme-card rounded-[10px] border border-theme-border shadow-[0_4px_12px_rgba(0,0,0,0.05)] ${className}`} {...props}>
      {children}
    </div>
  );
}

export function Button({ variant = 'primary', className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'accent' }) {
  const baseStyle = "inline-flex items-center justify-center rounded-[6px] text-[13px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary/50 disabled:opacity-50 disabled:pointer-events-none ring-offset-theme-card h-8 px-4 py-2";
  const variants = {
    primary: "bg-theme-primary text-white hover:bg-theme-primary-hover",
    secondary: "bg-white/10 text-white hover:bg-white/20",
    outline: "border border-theme-border hover:bg-theme-pill text-theme-ink",
    ghost: "hover:bg-theme-pill text-theme-ink",
    danger: "bg-red-600 text-white hover:bg-red-700",
    accent: "bg-theme-accent text-white hover:bg-theme-accent-hover",
  };
  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props} />
  );
}

export function Badge({ children, variant = 'default', className = '' }: { children: React.ReactNode, variant?: 'default' | 'success' | 'warning' | 'neutral', className?: string }) {
  const variants = {
    default: 'bg-theme-primary/10 text-theme-primary font-mono',
    success: 'bg-theme-success text-white font-mono',
    warning: 'bg-theme-accent/10 text-theme-accent font-mono',
    neutral: 'bg-theme-pill text-theme-ink font-mono'
  };
  return (
    <span className={`inline-flex items-center px-[6px] py-[2px] rounded-[4px] text-[10px] font-semibold tracking-wider uppercase ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

export function Input({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`flex h-8 w-full rounded-[6px] border border-theme-border bg-theme-card px-3 py-1 text-[13px] shadow-sm transition-colors file:border-0 file:bg-transparent file:text-[13px] file:font-medium placeholder:text-theme-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-theme-primary disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}

export function Select({ className = '', children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`flex h-8 w-full items-center justify-between rounded-[6px] border border-theme-border bg-theme-card px-3 py-1 text-[13px] shadow-sm ring-offset-theme-card placeholder:text-theme-muted focus:outline-none focus:ring-1 focus:ring-theme-primary disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}
