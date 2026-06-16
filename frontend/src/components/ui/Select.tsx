import { ChevronDown, type LucideIcon } from 'lucide-react';
import { forwardRef } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: LucideIcon;
  disabled?: boolean;
  error?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { options, value, onChange, placeholder, icon: Icon, disabled, error },
    ref,
  ) => {
    return (
      <div className="relative w-full">
        {Icon && (
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
            <Icon size={18} />
          </div>
        )}
        <div className="relative">
          <select
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={error ? 'select-error' : undefined}
            className={[
              'w-full h-11 rounded-md border bg-white cursor-pointer',
              'appearance-none transition-colors duration-150',
              'focus:outline-2 focus:outline-primary focus:outline-offset-2',
              'disabled:bg-gray-100 disabled:text-muted disabled:cursor-not-allowed',
              error ? 'border-error' : 'border-border hover:border-primary/40',
              Icon ? 'pl-10 pr-10' : 'px-3 pr-10',
              'text-body text-text',
            ].join(' ')}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary">
            <ChevronDown size={18} />
          </div>
        </div>
        {error && (
          <p id="select-error" className="mt-1 text-body-sm text-error">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Select.displayName = 'Select';
export default Select;
