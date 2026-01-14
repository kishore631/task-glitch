import { DerivedTask, Task } from '@/types';

/* ---------- ROI (BUG 5 FIX) ---------- */
export function computeROI(revenue: number, timeTaken: number): number {
  if (!Number.isFinite(revenue)) return 0;
  if (!Number.isFinite(timeTaken) || timeTaken <= 0) return 0;
  return Number((revenue / timeTaken).toFixed(2));
}

export function computePriorityWeight(priority: Task['priority']): 3 | 2 | 1 {
  return priority === 'High' ? 3 : priority === 'Medium' ? 2 : 1;
}

export function withDerived(task: Task): DerivedTask {
  return {
    ...task,
    roi: computeROI(task.revenue, task.timeTaken),
    priorityWeight: computePriorityWeight(task.priority),
  };
}

/* ---------- SORTING (BUG 3 FIX) ---------- */
export function sortTasks(tasks: ReadonlyArray<DerivedTask>): DerivedTask[] {
  return [...tasks].sort((a, b) => {
    if (b.roi !== a.roi) return b.roi - a.roi;
    if (b.priorityWeight !== a.priorityWeight)
      return b.priorityWeight - a.priorityWeight;
    return a.title.localeCompare(b.title);
  });
}

/* ---------- METRICS ---------- */
export function computeTotalRevenue(tasks: ReadonlyArray<Task>): number {
  return tasks.filter(t => t.status === 'Done').reduce((s, t) => s + t.revenue, 0);
}

export function computeTotalTimeTaken(tasks: ReadonlyArray<Task>): number {
  return tasks.reduce((s, t) => s + t.timeTaken, 0);
}

export function computeTimeEfficiency(tasks: ReadonlyArray<Task>): number {
  if (!tasks.length) return 0;
  return (tasks.filter(t => t.status === 'Done').length / tasks.length) * 100;
}

export function computeRevenuePerHour(tasks: ReadonlyArray<Task>): number {
  const time = computeTotalTimeTaken(tasks);
  return time > 0 ? computeTotalRevenue(tasks) / time : 0;
}

export function computeAverageROI(tasks: ReadonlyArray<Task>): number {
  const rois = tasks.map(t => computeROI(t.revenue, t.timeTaken));
  return rois.length ? rois.reduce((s, r) => s + r, 0) / rois.length : 0;
}

export function computePerformanceGrade(avgROI: number) {
  if (avgROI > 500) return 'Excellent';
  if (avgROI >= 200) return 'Good';
  return 'Needs Improvement';
}
