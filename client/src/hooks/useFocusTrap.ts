import { useEffect, useRef, useCallback } from 'react';

interface FocusTrapOptions {
  isActive: boolean;
  restoreOnDeactivate?: boolean;
}

/**
 * Custom hook for implementing focus trap functionality
 * Used for modal dialogs and other overlay components
 */
export function useFocusTrap({ isActive, restoreOnDeactivate = true }: FocusTrapOptions) {
  const containerRef = useRef<HTMLElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  const getFocusableElements = useCallback((container: HTMLElement): HTMLElement[] => {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'textarea:not([disabled])',
      'select:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ');

    return Array.from(container.querySelectorAll(focusableSelectors))
      .filter(el => {
        // Check if element is visible
        const element = el as HTMLElement;
        return element.offsetWidth > 0 || element.offsetHeight > 0 || element === document.activeElement;
      })
      .map(el => el as HTMLElement);
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isActive || !containerRef.current) return;

    const focusableElements = getFocusableElements(containerRef.current);
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.key === 'Tab') {
      if (event.shiftKey) {
        // Shift + Tab - move to previous element or wrap to last
        if (document.activeElement === firstElement || !focusableElements.includes(document.activeElement as HTMLElement)) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab - move to next element or wrap to first
        if (document.activeElement === lastElement || !focusableElements.includes(document.activeElement as HTMLElement)) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    } else if (event.key === 'Escape') {
      // Allow escape key handling to be managed by parent component
      // This doesn't prevent the event, just ensures focus trap logic doesn't interfere
      return;
    }
  }, [isActive, getFocusableElements]);

  const activateTrap = useCallback(() => {
    if (!containerRef.current) return;

    // Store the currently focused element
    previouslyFocusedElement.current = document.activeElement as HTMLElement;

    // Focus the first focusable element in the container
    const focusableElements = getFocusableElements(containerRef.current);
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    } else if (containerRef.current.tabIndex >= 0) {
      containerRef.current.focus();
    }
  }, [getFocusableElements]);

  const deactivateTrap = useCallback(() => {
    if (restoreOnDeactivate && previouslyFocusedElement.current) {
      // Restore focus to previously focused element
      previouslyFocusedElement.current.focus();
      previouslyFocusedElement.current = null;
    }
  }, [restoreOnDeactivate]);

  useEffect(() => {
    if (isActive) {
      document.addEventListener('keydown', handleKeyDown);
      // Small delay to ensure the modal is rendered before focusing
      const timeoutId = setTimeout(activateTrap, 10);
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      deactivateTrap();
      document.removeEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, handleKeyDown, activateTrap, deactivateTrap]);

  return containerRef;
}