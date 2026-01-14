import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DerivedTask, Metrics, Task } from '@/types';
import {
  computeAverageROI,
  computePerformanceGrade,
  computeRevenuePerHour,
  computeTimeEfficiency,
  computeTotalRevenue,
  withDerived,
  sortTasks as sortDerived,
} from '@/utils/logic';
import { generateSalesTasks } from '@/utils/seed';

interface UseTasksState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  derivedSorted: DerivedTask[];
  metrics: Metrics;
  lastDeleted: Task | null;
  addTask: (task: Omit<Task, 'id'> & { id?: string }) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  undoDelete: () => void;
}

const INITIAL_METRICS: Metrics = {
  totalRevenue: 0,
  totalTimeTaken: 0,
  timeEfficiencyPct: 0,
  revenuePerHour: 0,
  averageROI: 0,
  performanceGrade: 'Needs Improvement',
};

export function useTasks(): UseTasksState {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastDeleted, setLastDeleted] = useState<Task | null>(null);

  // ✅ BUG 1: prevent double fetch
  const fetchedRef = useRef(false);

  // ✅ BUG 5: safe normalization
  function normalizeTasks(input: any[]): Task[] {
    const now = Date.now();

    return (Array.isArray(input) ? input : []).map((t, idx) => {
      const revenue = Number.isFinite(Number(t.revenue)) ? Number(t.revenue) : 0;
      const timeTaken =
        Number.isFinite(Number(t.timeTaken)) && Number(t.timeTaken) > 0
          ? Number(t.timeTaken)
          : 1;

      const created =
        t.createdAt
          ? new Date(t.createdAt)
          : new Date(now - (idx + 1) * 86400000);

      const completedAt =
        t.completedAt ||
        (t.status === 'Done'
          ? new Date(created.getTime() + 86400000).toISOString()
          : undefined);

      return {
        id: t.id ?? crypto.randomUUID(),
        title: t.title || 'Untitled Task',
        revenue,
        timeTaken,
        priority: t.priority ?? 'Medium',
        status: t.status ?? 'Todo',
        notes: t.notes ?? '',
        createdAt: created.toISOString(),
        completedAt,
      };
    });
  }

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    let mounted = true;

    async function loadTasks() {
      try {
        const res = await fetch('/tasks.json');
        if (!res.ok) throw new Error('Failed to load tasks');

        const data = await res.json();
        const normalized = normalizeTasks(data);

        setTasks(normalized.length ? normalized : generateSalesTasks(50));
      } catch (e: any) {
        if (mounted) setError(e.message ?? 'Load failed');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadTasks();
    return () => {
      mounted = false;
    };
  }, []);

  const derivedSorted = useMemo(() => {
    return sortDerived(tasks.map(withDerived));
  }, [tasks]);

  const metrics = useMemo<Metrics>(() => {
    if (!tasks.length) return INITIAL_METRICS;

    const totalRevenue = computeTotalRevenue(tasks);
    const totalTimeTaken = tasks.reduce((s, t) => s + t.timeTaken, 0);
    const timeEfficiencyPct = computeTimeEfficiency(tasks);
    const revenuePerHour = computeRevenuePerHour(tasks);
    const averageROI = computeAverageROI(tasks);
    const performanceGrade = computePerformanceGrade(averageROI);

    return {
      totalRevenue,
      totalTimeTaken,
      timeEfficiencyPct,
      revenuePerHour,
      averageROI,
      performanceGrade,
    };
  }, [tasks]);

  const addTask = useCallback((task: Omit<Task, 'id'> & { id?: string }) => {
    setTasks(prev => [
      ...prev,
      {
        ...task,
        id: task.id ?? crypto.randomUUID(),
        timeTaken: task.timeTaken > 0 ? task.timeTaken : 1,
        createdAt: new Date().toISOString(),
        completedAt: task.status === 'Done' ? new Date().toISOString() : undefined,
      },
    ]);
  }, []);

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    setTasks(prev =>
      prev.map(t => {
        if (t.id !== id) return t;
        const next = { ...t, ...patch };
        if (!next.timeTaken || next.timeTaken <= 0) next.timeTaken = 1;
        if (t.status !== 'Done' && next.status === 'Done' && !next.completedAt) {
          next.completedAt = new Date().toISOString();
        }
        return next;
      })
    );
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => {
      const target = prev.find(t => t.id === id) ?? null;
      setLastDeleted(target);
      return prev.filter(t => t.id !== id);
    });
  }, []);

  const undoDelete = useCallback(() => {
    if (!lastDeleted) return;
    setTasks(prev => [...prev, lastDeleted]);
    setLastDeleted(null);
  }, [lastDeleted]);

  return {
    tasks,
    loading,
    error,
    derivedSorted,
    metrics,
    lastDeleted,
    addTask,
    updateTask,
    deleteTask,
    undoDelete,
  };
}
