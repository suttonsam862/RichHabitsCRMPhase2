import { useRef, useCallback } from 'react';

interface FocusManagementOptions {
  restoreFocus?: boolean;
  autoFocus?: boolean;
}

/**
 * Hook for general focus management including restoration and auto-focus
 */
export function useFocusManagement({ restoreFocus = true, autoFocus = true }: FocusManagementOptions = {}) {
  const elementRef = useRef<HTMLElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  const saveFocus = useCallback(() => {
    previouslyFocusedElement.current = document.activeElement as HTMLElement;
  }, []);

  const restorePreviousFocus = useCallback(() => {
    if (restoreFocus && previouslyFocusedElement.current) {
      previouslyFocusedElement.current.focus();
      previouslyFocusedElement.current = null;
    }
  }, [restoreFocus]);

  const focusElement = useCallback(() => {
    if (autoFocus && elementRef.current) {
      elementRef.current.focus();
    }
  }, [autoFocus]);

  const manageFocus = useCallback((isVisible: boolean) => {
    if (isVisible) {
      saveFocus();
      // Use setTimeout to ensure element is rendered
      setTimeout(focusElement, 10);
    } else {
      restorePreviousFocus();
    }
  }, [saveFocus, focusElement, restorePreviousFocus]);

  return {
    elementRef,
    manageFocus,
    saveFocus,
    restorePreviousFocus,
    focusElement
  };
}

/**
 * Hook for announcing content changes to screen readers
 */
export function useScreenReaderAnnouncement() {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    // Remove the announcement element after a delay
    setTimeout(() => {
      if (document.body.contains(announcement)) {
        document.body.removeChild(announcement);
      }
    }, 1000);
  }, []);

  return { announce };
}