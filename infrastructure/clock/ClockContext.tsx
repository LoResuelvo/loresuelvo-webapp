"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { setApiClockAction, clearApiClockAction } from "@/app/test-clock/actions";

export interface ClockContextValue {
  now: () => Date;
  simulatedDate: Date | null;
  isSimulated: boolean;
  setTime: (date: Date | string | number, syncApi?: boolean) => Promise<void>;
  resetTime: (syncApi?: boolean) => Promise<void>;
}

const ClockContext = createContext<ClockContextValue | null>(null);

export interface ClockProviderProps {
  children: React.ReactNode;
  initialDate?: Date | string | number | null;
}

export function ClockProvider({ children, initialDate }: ClockProviderProps) {
  const [simulatedDate, setSimulatedDate] = useState<Date | null>(
    initialDate ? new Date(initialDate) : null
  );

  const now = useCallback((): Date => {
    if (simulatedDate) {
      return new Date(simulatedDate.getTime());
    }
    return new Date();
  }, [simulatedDate]);

  const isSimulated = simulatedDate !== null;

  const setTime = useCallback(
    async (dateInput: Date | string | number, syncApi: boolean = true) => {
      const date = new Date(dateInput);
      setSimulatedDate(date);
      if (syncApi) {
        try {
          await setApiClockAction(date.toISOString());
        } catch {
          // If the API is unavailable or fails, the frontend retains its simulated time
        }
      }
    },
    []
  );

  const resetTime = useCallback(async (syncApi: boolean = true) => {
    setSimulatedDate(null);
    if (syncApi) {
      try {
        await clearApiClockAction();
      } catch {
        // Silent fallback if API call fails
      }
    }
  }, []);

  const value = useMemo(
    () => ({
      now,
      simulatedDate,
      isSimulated,
      setTime,
      resetTime,
    }),
    [now, simulatedDate, isSimulated, setTime, resetTime]
  );

  return <ClockContext.Provider value={value}>{children}</ClockContext.Provider>;
}

export function useClock(): ClockContextValue {
  const context = useContext(ClockContext);
  if (!context) {
    // Fallback to SystemClock when used outside ClockProvider
    return {
      now: () => new Date(),
      simulatedDate: null,
      isSimulated: false,
      setTime: async () => {},
      resetTime: async () => {},
    };
  }
  return context;
}
