import * as React from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/atoms/Label';

export interface FormFieldProps {
  label:     string;
  htmlFor?:  string;
  error?:    string;
  hint?:     string;
  required?: boolean;
  children:  React.ReactNode;
  className?: string;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}) => {
  return (
    <div className={cn('field', className)}>
      <Label htmlFor={htmlFor} required={required}>
        {label}
      </Label>

      {children}

      {/* Show hint only when no error */}
      {hint && !error && (
        <p className="text-xs text-ink-3 mt-0.5">{hint}</p>
      )}

      {/* Error message */}
      {error && (
        <p className="text-xs text-danger mt-0.5" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

FormField.displayName = 'FormField';

export { FormField };
