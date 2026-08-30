"use client";

import { useState, useCallback } from "react";

export interface CarouselNavigation {
  currentIndex: number;
  handlePrev: () => void;
  handleNext: () => void;
  goToIndex: (index: number) => void;
  hasNavigation: boolean;
}

export function useCarouselNavigation(total: number, initialIndex = 0): CarouselNavigation {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : (total > 0 ? total - 1 : 0)));
  }, [total]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < total - 1 ? prev + 1 : 0));
  }, [total]);

  const goToIndex = useCallback((index: number) => {
    if (index >= 0 && index < total) {
      setCurrentIndex(index);
    }
  }, [total]);

  return {
    currentIndex,
    handlePrev,
    handleNext,
    goToIndex,
    hasNavigation: total > 1,
  };
}
