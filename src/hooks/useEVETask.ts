import { useState } from 'react';

type Priority = 'low' | 'medium' | 'high' | 'critical';

type UseEVETaskProps = {
  eveId: string;
};

type TaskParams = {
  taskDescription: string;
  actionId?: string;
  parameters?: Record<string, any>;
  priority?: Priority;
  dueDate?: string;
};

type Task = {
  id: string;
  eveId: string;
  eveName: string;
  description: string;
  status: string;
  actionId: string | null;
  parameters: Record<string, any> | null;
  priority: Priority;
  dueDate: string | null;
  createdAt: string;
};

type UseEVETaskReturn = {
  createTask: (params: TaskParams) => Promise<{ task: Task; analysis: string }>;
  isLoading: boolean;
  error: string | null;
};

/**
 * Hook for creating and managing EVE tasks
 */
export function useEVETask({ eveId }: UseEVETaskProps): UseEVETaskReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTask = async (params: TaskParams): Promise<{ task: Task; analysis: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/eve-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eveId,
          ...params,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create task');
      }

      const data = await response.json();
      return {
        task: data.task,
        analysis: data.analysis
      };
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createTask,
    isLoading,
    error,
  };
}