import { useEffect, useMemo, useState } from "react";

/**
 * Device breakpoints (enterprise‑friendly, simple)
 * Mobile  : <= 768px
 * Tablet  : 769px – 1024px
 * Desktop : >= 1025px
 */
export function useScreen() {
  const [width, setWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return useMemo(() => {
    const isMobile = width <= 768;
    const isTablet = width > 768 && width <= 1024;
    const isDesktop = width > 1024;

    return {
      width,
      isMobile,
      isTablet,
      isDesktop,
      device: isMobile ? "mobile" : isTablet ? "tablet" : "desktop",
    };
  }, [width]);
}