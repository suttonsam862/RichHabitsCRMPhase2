import { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';

/**
 * Enhanced Form Validation Hook
 * Provides real-time validation, error handling, and form state management
 */

interface UseFormValidationOptions<T> {
  schema: z.ZodSchema<T>;
  initialValues?: Partial<T>;
  mode?: 'onChange' | 'onBlur' | 'onSubmit';
  reValidateMode?: 'onChange' | 'onBlur';
  shouldFocusError?: boolean;
  onSubmit?: (data: T) => Promise<void> | void;
  onError?: (errors: Record<string, string>) => void;
}

interface FormState<T> {
  values: Partial<T>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
  submitCount: number;
}

export function useFormValidation<T>({
  schema,
  initialValues = {},
  mode = 'onSubmit',
  reValidateMode = 'onChange',
  shouldFocusError = true,
  onSubmit,
  onError,
}: UseFormValidationOptions<T>) {
  const [formState, setFormState] = useState<FormState<T>>({
    values: initialValues,
    errors: {},
    touched: {},
    isSubmitting: false,
    isValid: false,
    isDirty: false,
    submitCount: 0,
  });

  // Validate form values
  const validateForm = useCallback((values: Partial<T>): Record<string, string> => {
    const result = schema.safeParse(values);
    
    if (result.success) {
      return {};
    }
    
    const errors: Record<string, string> = {};
    result.error.errors.forEach((error) => {
      const path = error.path.join('.');
      errors[path] = error.message;
    });
    
    return errors;
  }, [schema]);

  // Validate single field
  const validateField = useCallback((name: string, value: any): string | null => {
    try {
      // For complex schemas, use full form validation
      const errors = validateForm({ ...formState.values, [name]: value });
      return errors[name] || null;
    } catch {
      return 'Invalid value';
    }
  }, [schema, formState.values, validateForm]);

  // Update form state
  const updateFormState = useCallback((updates: Partial<FormState<T>>) => {
    setFormState(prev => ({ ...prev, ...updates }));
  }, []);

  // Set field value
  const setValue = useCallback((name: string, value: any, shouldValidate: boolean = false) => {
    const newValues = { ...formState.values, [name]: value };
    const isDirty = JSON.stringify(newValues) !== JSON.stringify(initialValues);
    
    let newErrors = formState.errors;
    
    if (shouldValidate || (mode === 'onChange' || (formState.submitCount > 0 && reValidateMode === 'onChange'))) {
      if (formState.touched[name] || mode === 'onChange') {
        const fieldError = validateField(name, value);
        newErrors = { ...formState.errors };
        
        if (fieldError) {
          newErrors[name] = fieldError;
        } else {
          delete newErrors[name];
        }
      }
    }
    
    updateFormState({
      values: newValues,
      errors: newErrors,
      isDirty,
      isValid: Object.keys(newErrors).length === 0,
    });
  }, [formState, initialValues, mode, reValidateMode, validateField, updateFormState]);

  // Set field touched
  const setTouched = useCallback((name: string, isTouched: boolean = true) => {
    const newTouched = { ...formState.touched, [name]: isTouched };
    let newErrors = formState.errors;
    
    if (isTouched && (mode === 'onBlur' || (formState.submitCount > 0 && reValidateMode === 'onBlur'))) {
      const currentValue = (formState.values as any)[name];
      const fieldError = validateField(name, currentValue);
      newErrors = { ...formState.errors };
      
      if (fieldError) {
        newErrors[name] = fieldError;
      } else {
        delete newErrors[name];
      }
    }
    
    updateFormState({
      touched: newTouched,
      errors: newErrors,
      isValid: Object.keys(newErrors).length === 0,
    });
  }, [formState, mode, reValidateMode, validateField, updateFormState]);

  // Set multiple values
  const setValues = useCallback((values: Partial<T>, shouldValidate: boolean = false) => {
    const newValues = { ...formState.values, ...values };
    const isDirty = JSON.stringify(newValues) !== JSON.stringify(initialValues);
    
    let newErrors = formState.errors;
    
    if (shouldValidate) {
      newErrors = validateForm(newValues);
    }
    
    updateFormState({
      values: newValues,
      errors: newErrors,
      isDirty,
      isValid: Object.keys(newErrors).length === 0,
    });
  }, [formState, initialValues, validateForm, updateFormState]);

  // Set errors
  const setErrors = useCallback((errors: Record<string, string>) => {
    updateFormState({
      errors,
      isValid: Object.keys(errors).length === 0,
    });
  }, [updateFormState]);

  // Clear errors
  const clearErrors = useCallback((fieldNames?: string[]) => {
    if (fieldNames) {
      const newErrors = { ...formState.errors };
      fieldNames.forEach(field => {
        delete newErrors[field];
      });
      updateFormState({
        errors: newErrors,
        isValid: Object.keys(newErrors).length === 0,
      });
    } else {
      updateFormState({
        errors: {},
        isValid: true,
      });
    }
  }, [formState.errors, updateFormState]);

  // Reset form
  const reset = useCallback((values: Partial<T> = initialValues) => {
    setFormState({
      values,
      errors: {},
      touched: {},
      isSubmitting: false,
      isValid: false,
      isDirty: false,
      submitCount: 0,
    });
  }, [initialValues]);

  // Handle form submission
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    updateFormState({
      isSubmitting: true,
      submitCount: formState.submitCount + 1,
    });
    
    try {
      const errors = validateForm(formState.values);
      
      if (Object.keys(errors).length > 0) {
        updateFormState({
          errors,
          isSubmitting: false,
          isValid: false,
        });
        
        if (onError) {
          onError(errors);
        }
        
        // Focus first error field
        if (shouldFocusError) {
          const firstErrorField = Object.keys(errors)[0];
          const element = document.querySelector(`[data-testid*="${firstErrorField}"]`) as HTMLElement;
          if (element) {
            element.focus();
          }
        }
        
        return;
      }
      
      const validData = schema.parse(formState.values);
      
      if (onSubmit) {
        await onSubmit(validData);
      }
      
      updateFormState({
        isSubmitting: false,
        isValid: true,
        errors: {},
      });
      
    } catch (error) {
      console.error('Form submission error:', error);
      
      updateFormState({
        isSubmitting: false,
      });
      
      if (onError) {
        onError({ submit: 'Form submission failed' });
      }
    }
  }, [formState, validateForm, schema, onSubmit, onError, shouldFocusError, updateFormState]);

  // Get field props for form libraries
  const getFieldProps = useCallback((name: string) => {
    return {
      name,
      value: (formState.values as any)[name] || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> | any) => {
        const value = e?.target ? e.target.value : e;
        setValue(name, value);
      },
      onBlur: () => setTouched(name, true),
      error: formState.errors[name],
      touched: formState.touched[name],
    };
  }, [formState, setValue, setTouched]);

  // Watch field value
  const watch = useCallback((name?: string) => {
    if (name) {
      return (formState.values as any)[name];
    }
    return formState.values;
  }, [formState.values]);

  // Form validation with specific fields
  const trigger = useCallback((fieldNames?: string | string[]) => {
    const fields = fieldNames 
      ? (Array.isArray(fieldNames) ? fieldNames : [fieldNames])
      : Object.keys(formState.values);
    
    let hasErrors = false;
    const newErrors = { ...formState.errors };
    
    fields.forEach(field => {
      const currentValue = (formState.values as any)[field];
      const error = validateField(field, currentValue);
      if (error) {
        newErrors[field] = error;
        hasErrors = true;
      } else {
        delete newErrors[field];
      }
    });
    
    updateFormState({
      errors: newErrors,
      isValid: !hasErrors,
    });
    
    return !hasErrors;
  }, [formState, validateField, updateFormState]);

  // Update form state when schema or initial values change
  useEffect(() => {
    const errors = validateForm(formState.values);
    updateFormState({
      errors,
      isValid: Object.keys(errors).length === 0,
    });
  }, [schema]);

  return {
    // Form state
    ...formState,
    
    // Form actions
    setValue,
    setValues,
    setTouched,
    setErrors,
    clearErrors,
    reset,
    handleSubmit,
    getFieldProps,
    watch,
    trigger,
    
    // Validation utilities
    validateField,
    validateForm: () => validateForm(formState.values),
    
    // Computed properties
    hasErrors: Object.keys(formState.errors).length > 0,
    touchedFields: Object.keys(formState.touched),
    errorFields: Object.keys(formState.errors),
  };
}

// Utility hook for field-specific validation
export function useFieldValidation<T>(
  schema: z.ZodSchema<T>,
  value: any,
  options: {
    validateOnChange?: boolean;
    validateOnBlur?: boolean;
    debounceMs?: number;
  } = {}
) {
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [touched, setTouched] = useState(false);
  
  const { validateOnChange = true, validateOnBlur = true, debounceMs = 300 } = options;
  
  const validate = useCallback(async (val: any) => {
    setIsValidating(true);
    
    try {
      schema.parse(val);
      setError(null);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0]?.message || 'Invalid value');
      }
    } finally {
      setIsValidating(false);
    }
  }, [schema]);
  
  // Debounced validation
  useEffect(() => {
    if (!validateOnChange || !touched) return;
    
    const timer = setTimeout(() => {
      validate(value);
    }, debounceMs);
    
    return () => clearTimeout(timer);
  }, [value, validate, validateOnChange, touched, debounceMs]);
  
  const onBlur = useCallback(() => {
    setTouched(true);
    if (validateOnBlur) {
      validate(value);
    }
  }, [validate, validateOnBlur, value]);
  
  const onChange = useCallback((newValue: any) => {
    if (!touched) setTouched(true);
    if (validateOnChange) {
      validate(newValue);
    }
  }, [validate, validateOnChange, touched]);
  
  return {
    error,
    isValidating,
    touched,
    onBlur,
    onChange,
    setTouched,
    validate: () => validate(value),
  };
}