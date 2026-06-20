import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useERP } from "./store";

export interface ContextWorkOrder {
  id: string;
  name: string;
  moId: string;
  moNumber: string;
  moStatus: string;
  workCenter: string;
  plannedMinutes: number;
  status: 'pending' | 'started' | 'done';
  elapsedSeconds: number;
  startedAt: number | null;
  completedAt: number | null;
  accumulatedMs: number;
}

interface WorkOrderContextType {
  workOrders: ContextWorkOrder[];
  startWorkOrder: (moId: string, woId: string) => Promise<void>;
  completeWorkOrder: (moId: string, woId: string) => Promise<void>;
}

const WorkOrderContext = createContext<WorkOrderContextType | undefined>(undefined);

export const WorkOrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { manufacturingOrders, workCenters, setWorkOrderStatus, refreshData } = useERP();
  
  const [elapsedSeconds, setElapsedSeconds] = useState<Record<string, number>>({});
  const [resetOffsets, setResetOffsets] = useState<Record<string, number>>({});
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync elapsed seconds & run interval
  useEffect(() => {
    const updateTimers = () => {
      setElapsedSeconds(prev => {
        const next = { ...prev };
        let updated = false;

        manufacturingOrders.forEach(mo => {
          (mo.workOrders || []).forEach(wo => {
            const isStarted = wo.status === "Started";
            const isDone = wo.status === "Completed";

            if (isStarted) {
              const elapsedSinceStart = wo.startedAt ? Math.floor((Date.now() - wo.startedAt) / 1000) : 0;
              const offset = resetOffsets[wo.id] || 0;
              const currentTotal = Math.max(0, Math.floor(wo.accumulatedMs / 1000) + elapsedSinceStart - offset);
              if (next[wo.id] !== currentTotal) {
                next[wo.id] = currentTotal;
                updated = true;
              }
            } else {
              const offset = resetOffsets[wo.id] || 0;
              const currentTotal = isDone ? Math.max(0, Math.floor(wo.accumulatedMs / 1000) - offset) : 0;
              if (next[wo.id] !== currentTotal) {
                next[wo.id] = currentTotal;
                updated = true;
              }
            }
          });
        });

        return updated ? next : prev;
      });
    };

    updateTimers();

    const anyRunning = manufacturingOrders.some(mo => 
      (mo.workOrders || []).some(wo => wo.status === "Started")
    );

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (anyRunning) {
      timerIntervalRef.current = setInterval(updateTimers, 1000);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [manufacturingOrders, resetOffsets]);

  // Polling: auto-refreshes every 5 seconds while any work order is in started status
  useEffect(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    const anyRunning = manufacturingOrders.some(mo => 
      (mo.workOrders || []).some(wo => wo.status === "Started")
    );

    if (anyRunning) {
      pollIntervalRef.current = setInterval(() => {
        refreshData().catch(err => console.error("Poll refresh failed:", err));
      }, 5000);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [manufacturingOrders, refreshData]);

  const startWorkOrder = async (moId: string, woId: string) => {
    // Auto-pause other started work orders across all MOs
    for (const mo of manufacturingOrders) {
      const running = (mo.workOrders || []).find(w => w.status === "Started");
      if (running && (mo.id !== moId || running.id !== woId)) {
        await setWorkOrderStatus(mo.id, running.id, "Paused");
      }
    }

    // Reset offset if restarting from Completed (if that's ever allowed/triggered)
    const targetMo = manufacturingOrders.find(mo => mo.id === moId);
    const targetWo = targetMo?.workOrders?.find(w => w.id === woId);
    if (targetWo && targetWo.status === "Completed") {
      setResetOffsets(prev => ({
        ...prev,
        [woId]: Math.floor(targetWo.accumulatedMs / 1000)
      }));
    }

    await setWorkOrderStatus(moId, woId, "Started");
    await refreshData();
  };

  const completeWorkOrder = async (moId: string, woId: string) => {
    await setWorkOrderStatus(moId, woId, "Completed");
    await refreshData();
  };

  // Map to Context shape
  const workOrders: ContextWorkOrder[] = manufacturingOrders.flatMap(mo => {
    return (mo.workOrders || []).map(wo => {
      const wcName = workCenters.find(w => w.id === wo.workCenterId)?.name || wo.workCenterId;
      
      let status: 'pending' | 'started' | 'done' = 'pending';
      if (wo.status === "Started") status = 'started';
      else if (wo.status === "Completed") status = 'done';

      const startedAt = wo.startedAt || null;
      const completedAt = wo.completedAt || null;

      return {
        id: wo.id,
        name: wo.name,
        moId: mo.id,
        moNumber: mo.number,
        moStatus: mo.status,
        workCenter: wcName,
        plannedMinutes: wo.plannedMinutes,
        status,
        elapsedSeconds: elapsedSeconds[wo.id] || 0,
        startedAt,
        completedAt,
        accumulatedMs: wo.accumulatedMs,
      };
    });
  });

  return (
    <WorkOrderContext.Provider value={{ workOrders, startWorkOrder, completeWorkOrder }}>
      {children}
    </WorkOrderContext.Provider>
  );
};

export const useWorkOrderContext = () => {
  const context = useContext(WorkOrderContext);
  if (!context) {
    throw new Error("useWorkOrderContext must be used within a WorkOrderProvider");
  }
  return context;
};
