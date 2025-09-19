import React from 'react';
import { FormField as BaseFormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

/**
 * Enhanced Form Field Components with Validation Integration
 * Provides consistent form fields with built-in validation display
 */

interface FormFieldProps {
  control: any;
  name: string;
  label?: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

// Enhanced Text Input Field
export function FormTextField({
  control,
  name,
  label,
  placeholder,
  description,
  required = false,
  disabled = false,
  className,
  type = 'text',
  maxLength,
  ...props
}: FormFieldProps & {
  type?: 'text' | 'email' | 'tel' | 'url' | 'password';
  maxLength?: number;
}) {
  return (
    <BaseFormField
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem className={className}>
          {label && (
            <FormLabel className={cn(required && "after:content-['*'] after:ml-0.5 after:text-red-500")}>
              {label}
            </FormLabel>
          )}
          <FormControl>
            <Input
              {...field}
              {...props}
              type={type}
              placeholder={placeholder}
              disabled={disabled}
              maxLength={maxLength}
              className={cn(
                fieldState.error && "border-red-500 focus:border-red-500",
                "transition-colors duration-200"
              )}
              data-testid={`input-${name}`}
            />
          </FormControl>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
          <FormMessage />
          {maxLength && field.value && (
            <p className="text-xs text-muted-foreground text-right">
              {field.value.length}/{maxLength}
            </p>
          )}
        </FormItem>
      )}
    />
  );
}

// Enhanced Textarea Field
export function FormTextareaField({
  control,
  name,
  label,
  placeholder,
  description,
  required = false,
  disabled = false,
  className,
  rows = 3,
  maxLength,
  ...props
}: FormFieldProps & {
  rows?: number;
  maxLength?: number;
}) {
  return (
    <BaseFormField
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem className={className}>
          {label && (
            <FormLabel className={cn(required && "after:content-['*'] after:ml-0.5 after:text-red-500")}>
              {label}
            </FormLabel>
          )}
          <FormControl>
            <Textarea
              {...field}
              {...props}
              placeholder={placeholder}
              disabled={disabled}
              rows={rows}
              maxLength={maxLength}
              className={cn(
                fieldState.error && "border-red-500 focus:border-red-500",
                "transition-colors duration-200"
              )}
              data-testid={`textarea-${name}`}
            />
          </FormControl>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
          <FormMessage />
          {maxLength && field.value && (
            <p className="text-xs text-muted-foreground text-right">
              {field.value.length}/{maxLength}
            </p>
          )}
        </FormItem>
      )}
    />
  );
}

// Enhanced Select Field
export function FormSelectField({
  control,
  name,
  label,
  placeholder = "Select an option",
  description,
  required = false,
  disabled = false,
  className,
  options,
  ...props
}: FormFieldProps & {
  options: Array<{ value: string; label: string; disabled?: boolean }>;
}) {
  return (
    <BaseFormField
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem className={className}>
          {label && (
            <FormLabel className={cn(required && "after:content-['*'] after:ml-0.5 after:text-red-500")}>
              {label}
            </FormLabel>
          )}
          <Select 
            onValueChange={field.onChange} 
            defaultValue={field.value}
            disabled={disabled}
            {...props}
          >
            <FormControl>
              <SelectTrigger 
                className={cn(
                  fieldState.error && "border-red-500 focus:border-red-500",
                  "transition-colors duration-200"
                )}
                data-testid={`select-${name}`}
              >
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((option) => (
                <SelectItem 
                  key={option.value} 
                  value={option.value}
                  disabled={option.disabled}
                  data-testid={`select-option-${option.value}`}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// Enhanced Checkbox Field
export function FormCheckboxField({
  control,
  name,
  label,
  description,
  disabled = false,
  className,
  ...props
}: FormFieldProps) {
  return (
    <BaseFormField
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem className={cn("flex flex-row items-start space-x-3 space-y-0", className)}>
          <FormControl>
            <Checkbox
              checked={field.value}
              onCheckedChange={field.onChange}
              disabled={disabled}
              className={cn(
                fieldState.error && "border-red-500",
                "transition-colors duration-200"
              )}
              data-testid={`checkbox-${name}`}
              {...props}
            />
          </FormControl>
          <div className="space-y-1 leading-none">
            {label && (
              <FormLabel className="cursor-pointer">
                {label}
              </FormLabel>
            )}
            {description && (
              <p className="text-sm text-muted-foreground">
                {description}
              </p>
            )}
            <FormMessage />
          </div>
        </FormItem>
      )}
    />
  );
}

// Enhanced Number Field
export function FormNumberField({
  control,
  name,
  label,
  placeholder,
  description,
  required = false,
  disabled = false,
  className,
  min,
  max,
  step = 1,
  currency = false,
  ...props
}: FormFieldProps & {
  min?: number;
  max?: number;
  step?: number;
  currency?: boolean;
}) {
  return (
    <BaseFormField
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem className={className}>
          {label && (
            <FormLabel className={cn(required && "after:content-['*'] after:ml-0.5 after:text-red-500")}>
              {label}
            </FormLabel>
          )}
          <FormControl>
            <div className="relative">
              {currency && (
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                  $
                </span>
              )}
              <Input
                {...field}
                {...props}
                type="number"
                placeholder={placeholder}
                disabled={disabled}
                min={min}
                max={max}
                step={step}
                className={cn(
                  fieldState.error && "border-red-500 focus:border-red-500",
                  currency && "pl-8",
                  "transition-colors duration-200"
                )}
                onChange={(e) => {
                  const value = e.target.value;
                  field.onChange(value === '' ? undefined : Number(value));
                }}
                value={field.value ?? ''}
                data-testid={`input-number-${name}`}
              />
            </div>
          </FormControl>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// Enhanced Date Field
export function FormDateField({
  control,
  name,
  label,
  placeholder = "Select date",
  description,
  required = false,
  disabled = false,
  className,
  showTime = false,
  minDate,
  maxDate,
  ...props
}: FormFieldProps & {
  showTime?: boolean;
  minDate?: Date;
  maxDate?: Date;
}) {
  return (
    <BaseFormField
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem className={className}>
          {label && (
            <FormLabel className={cn(required && "after:content-['*'] after:ml-0.5 after:text-red-500")}>
              {label}
            </FormLabel>
          )}
          <FormControl>
            <Input
              {...field}
              {...props}
              type={showTime ? "datetime-local" : "date"}
              placeholder={placeholder}
              disabled={disabled}
              min={minDate?.toISOString().split('T')[0]}
              max={maxDate?.toISOString().split('T')[0]}
              className={cn(
                fieldState.error && "border-red-500 focus:border-red-500",
                "transition-colors duration-200"
              )}
              data-testid={`input-date-${name}`}
            />
          </FormControl>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// Enhanced File Upload Field
export function FormFileField({
  control,
  name,
  label,
  description,
  required = false,
  disabled = false,
  className,
  accept,
  multiple = false,
  maxSize,
  ...props
}: FormFieldProps & {
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
}) {
  return (
    <BaseFormField
      control={control}
      name={name}
      render={({ field: { value, onChange, ...field }, fieldState }) => (
        <FormItem className={className}>
          {label && (
            <FormLabel className={cn(required && "after:content-['*'] after:ml-0.5 after:text-red-500")}>
              {label}
            </FormLabel>
          )}
          <FormControl>
            <div className="space-y-2">
              <Input
                {...field}
                {...props}
                type="file"
                accept={accept}
                multiple={multiple}
                disabled={disabled}
                className={cn(
                  fieldState.error && "border-red-500 focus:border-red-500",
                  "transition-colors duration-200"
                )}
                onChange={(e) => {
                  const files = e.target.files;
                  if (multiple) {
                    onChange(files ? Array.from(files) : []);
                  } else {
                    onChange(files?.[0] || null);
                  }
                }}
                data-testid={`input-file-${name}`}
              />
              {maxSize && (
                <p className="text-xs text-muted-foreground">
                  Maximum file size: {Math.round(maxSize / 1024 / 1024)}MB
                </p>
              )}
            </div>
          </FormControl>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// Form Section with Validation Summary
export function FormSection({
  title,
  description,
  children,
  errors,
  className,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  errors?: Record<string, string>;
  className?: string;
}) {
  const sectionErrors = errors ? Object.keys(errors).length : 0;

  return (
    <div className={cn("space-y-4", className)}>
      {(title || description) && (
        <div className="space-y-2">
          {title && (
            <h3 className={cn(
              "text-lg font-medium",
              sectionErrors > 0 && "text-red-700"
            )}>
              {title}
              {sectionErrors > 0 && (
                <span className="ml-2 text-sm text-red-600">
                  ({sectionErrors} error{sectionErrors === 1 ? '' : 's'})
                </span>
              )}
            </h3>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

// Validation Error Summary Component
export function ValidationErrorSummary({
  errors,
  className,
}: {
  errors: Record<string, string>;
  className?: string;
}) {
  const errorCount = Object.keys(errors).length;

  if (errorCount === 0) return null;

  return (
    <div className={cn(
      "rounded-md border border-red-200 bg-red-50 p-4",
      className
    )}>
      <div className="flex">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-red-400"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">
            Please fix the following {errorCount} error{errorCount === 1 ? '' : 's'}:
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <ul className="list-disc space-y-1 pl-5">
              {Object.entries(errors).map(([field, message]) => (
                <li key={field}>
                  <strong>{field}:</strong> {message}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}