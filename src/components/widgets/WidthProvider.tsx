import React, { useState, useRef, useEffect, ComponentType } from "react";

export interface WidthProviderProps {
  /** If true, will not render children until mounted */
  measureBeforeMount?: boolean;
  /** Additional class name */
  className?: string;
  /** Additional styles */
  style?: React.CSSProperties;
}

// Basic class joiner to avoid clsx dependency if not installed, or use template literals
const joinClasses = (...args: (string | undefined | null | false)[]) => args.filter(Boolean).join(' ');

/**
 * WidthProvider HOC
 *
 * Re-implemented locally because react-grid-layout v2.0.0 does not export it correctly
 * from the main entry point, causing production build failures.
 */
export function WidthProvider<P extends { width: number }>(
  ComposedComponent: ComponentType<P>
): ComponentType<any> {

  function WidthProviderWrapper(props: Omit<P, "width"> & WidthProviderProps) {
    const { measureBeforeMount = false, className, style, ...rest } = props;

    const [width, setWidth] = useState(1280);
    const [mounted, setMounted] = useState(false);
    const elementRef = useRef<HTMLDivElement>(null);
    const resizeObserverRef = useRef<ResizeObserver | null>(null);

    useEffect(() => {
      setMounted(true);

      const node = elementRef.current;
      if (node instanceof HTMLElement) {
          // Initial measure
          setWidth(node.offsetWidth);
      }

      // Set up ResizeObserver
      resizeObserverRef.current = new ResizeObserver((entries) => {
        const node = elementRef.current;
        if (node instanceof HTMLElement && entries[0]) {
          const newWidth = entries[0].contentRect.width;
          setWidth(newWidth);
        }
      });

      if (node instanceof HTMLElement) {
        resizeObserverRef.current.observe(node);
      }

      return () => {
        if (node instanceof HTMLElement && resizeObserverRef.current) {
          resizeObserverRef.current.unobserve(node);
        }
        resizeObserverRef.current?.disconnect();
      };
    }, []);

    // If measureBeforeMount is true and not yet mounted, render placeholder
    if (measureBeforeMount && !mounted) {
      return (
        <div
          className={joinClasses(className, "react-grid-layout")}
          style={style}
          ref={elementRef}
        />
      );
    }

    return (
      <div
        ref={elementRef}
        className={className}
        style={style}
      >
        <ComposedComponent
            {...(rest as unknown as P)}
            width={width}
        />
      </div>
    );
  }

  WidthProviderWrapper.displayName = `WidthProvider(${ComposedComponent.displayName || ComposedComponent.name || "Component"})`;

  return WidthProviderWrapper;
}
