import React, { type PropsWithChildren, useEffect, useRef } from 'react';

export type ResizeProps = {
  width: number;
  height: number;
  dom: HTMLElement;
  visible: boolean; // 监听的元素在视口内是否处于可见状态
};

interface ResizeObserverProps {
  onResize?: (data: ResizeProps) => void;
}

/**
 * 监听 children dom 元素的尺寸变化
 * 注意：
 * children 必须只有一个父节点
 */
const ResizeObserver: React.FC<PropsWithChildren<ResizeObserverProps>> = ({ children, onResize }) => {
  const resizeObserverRef = useRef<globalThis.ResizeObserver>();
  const domRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    createResizeObserver();
    return () => {
      destroyResizeObserver();
    };
  }, []);

  const createResizeObserver = () => {
    if (!domRef.current) return;

    resizeObserverRef.current = new window.ResizeObserver(() => {
      if (domRef.current) {
        const { width, height } = domRef.current.getBoundingClientRect();
        onResize && onResize({ width, height, dom: domRef.current, visible: width !== 0 });
      }
    });

    resizeObserverRef.current?.observe(domRef.current as Element);
  };

  const destroyResizeObserver = () => {
    resizeObserverRef.current?.disconnect();
  };

  // 确保 children 是一个 React 元素
  if (!React.isValidElement(children)) {
    return <>{children}</>;
  }

  return React.cloneElement(children as React.ReactElement, {
    ref: domRef,
  });
};

export default ResizeObserver;
