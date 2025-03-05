import { useState } from 'react';
import { Collaboration } from '../types/database.types';

type UseCollaborationProps = {
  eveId: string;
};

type CollaborationParams = {
  targetEveId: string;
  taskId: string;
  requestType: 'delegate' | 'assist' | 'review';
  message: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  dueDate?: string;
  metadata?: Record<string, any>;
};

type UseCollaborationReturn = {
  requestCollaboration: (params: CollaborationParams) => Promise<Collaboration>;
  isLoading: boolean;
  error: string | null;
};

/**
 * Hook for managing collaborations between EVEs
 */
export function useCollaboration({ eveId }: UseCollaborationProps): UseCollaborationReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestCollaboration = async (params: CollaborationParams): Promise<Collaboration> => {
    setIsLoading(true);
    setError(null);

    try {
      // Validate required parameters
      if (!params.targetEveId || !params.taskId || !params.message) {
        throw new Error('Missing required parameters');
      }

      const response = await fetch('/.netlify/functions/eve-collaboration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceEveId: eveId,
          targetEveId: params.targetEveId,
          taskId: params.taskId,
          requestType: params.requestType,
          message: params.message,
          priority: params.priority || 'medium',
          dueDate: params.dueDate,
          metadata: params.metadata
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to create collaboration');
      }

      if (!responseData.success || !responseData.collaboration) {
        throw new Error('Invalid server response');
      }

      return responseData.collaboration as Collaboration;
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred while creating the collaboration';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    requestCollaboration,
    isLoading,
    error,
  };
}