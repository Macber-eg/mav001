import { useState, useEffect } from 'react';
import { useEVEMemory } from './useEVEMemory';
import { Memory } from '../types/database.types';

type MemoryAnalytics = {
  totalCount: number;
  byType: Record<string, number>;
  byImportance: Record<number, number>;
  byAccessDate: {
    last24h: number;
    last7d: number;
    last30d: number;
    older: number;
  };
  recommendations: string[];
  memoryQuality: number; // 0-100 score
  topMemories: Memory[];
  memoryGrowth: {
    last7d: number;
    last30d: number;
    trend: 'increasing' | 'stable' | 'decreasing';
  };
};

type UseMemoryAnalyticsProps = {
  eveId: string;
};

type UseMemoryAnalyticsReturn = {
  analytics: MemoryAnalytics | null;
  isLoading: boolean;
  error: string | null;
  refreshAnalytics: () => Promise<void>;
};

/**
 * Hook for analyzing EVE memory usage and providing insights
 */
export function useMemoryAnalytics({ eveId }: UseMemoryAnalyticsProps): UseMemoryAnalyticsReturn {
  const [analytics, setAnalytics] = useState<MemoryAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { 
    memories, 
    fetchMemories,
    isLoading: memoryLoading,
    error: memoryError
  } = useEVEMemory({ eveId });
  
  // Analyze memory data to generate insights
  const analyzeMemories = (memories: Memory[]): MemoryAnalytics => {
    // Count by type
    const byType = memories.reduce((acc, memory) => {
      acc[memory.type] = (acc[memory.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Count by importance
    const byImportance = memories.reduce((acc, memory) => {
      acc[memory.importance] = (acc[memory.importance] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    
    // Analyze by access date
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const byAccessDate = {
      last24h: memories.filter(m => new Date(m.last_accessed) >= oneDayAgo).length,
      last7d: memories.filter(m => new Date(m.last_accessed) >= sevenDaysAgo).length,
      last30d: memories.filter(m => new Date(m.last_accessed) >= thirtyDaysAgo).length,
      older: memories.filter(m => new Date(m.last_accessed) < thirtyDaysAgo).length,
    };
    
    // Find memory creation trend
    const createdLast7Days = memories.filter(m => new Date(m.created_at) >= sevenDaysAgo).length;
    const createdLast30Days = memories.filter(m => new Date(m.created_at) >= thirtyDaysAgo).length;
    
    // Calculate trend
    let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    const weeklyRate = createdLast7Days;
    const monthlyRate = createdLast30Days / 4; // Average weekly rate for the month
    
    if (weeklyRate > monthlyRate * 1.2) {
      trend = 'increasing';
    } else if (weeklyRate < monthlyRate * 0.8) {
      trend = 'decreasing';
    }
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (memories.length < 10) {
      recommendations.push('Add more memories to improve EVE intelligence and context awareness');
    }
    
    if (!byType['fact'] || byType['fact'] < 3) {
      recommendations.push('Add more factual memories to improve EVE\'s knowledge base');
    }
    
    if (!byType['preference'] || byType['preference'] < 2) {
      recommendations.push('Define user preferences to make EVE responses more personalized');
    }
    
    if (Object.keys(byImportance).length < 3) {
      recommendations.push('Use different importance levels (1-5) to prioritize critical memories');
    }
    
    if (byAccessDate.older > memories.length * 0.7) {
      recommendations.push('Many memories haven\'t been accessed recently. Consider cleaning up unused memories');
    }
    
    // Calculate memory quality score (0-100)
    let memoryQuality = 50; // Start with a baseline
    
    // Factors that improve score
    if (memories.length > 20) memoryQuality += 10;
    if (Object.keys(byType).length >= 3) memoryQuality += 10;
    if (Object.keys(byImportance).length >= 3) memoryQuality += 10;
    if (byAccessDate.last7d > memories.length * 0.3) memoryQuality += 10;
    if (trend === 'increasing') memoryQuality += 10;
    
    // Factors that reduce score
    if (memories.length < 5) memoryQuality -= 20;
    if (Object.keys(byType).length < 2) memoryQuality -= 10;
    if (byAccessDate.older > memories.length * 0.8) memoryQuality -= 10;
    if (trend === 'decreasing') memoryQuality -= 5;
    
    // Ensure score is within 0-100 range
    memoryQuality = Math.max(0, Math.min(100, memoryQuality));
    
    // Get top memories by importance and recent access
    const topMemories = [...memories]
      .sort((a, b) => {
        // Sort by importance first, then by last accessed date
        if (a.importance !== b.importance) {
          return b.importance - a.importance;
        }
        return new Date(b.last_accessed).getTime() - new Date(a.last_accessed).getTime();
      })
      .slice(0, 5);
    
    return {
      totalCount: memories.length,
      byType,
      byImportance,
      byAccessDate,
      recommendations,
      memoryQuality,
      topMemories,
      memoryGrowth: {
        last7d: createdLast7Days,
        last30d: createdLast30Days,
        trend
      }
    };
  };
  
  // Fetch and analyze memories
  const refreshAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const memoryData = await fetchMemories(eveId);
      const analyticsData = analyzeMemories(memoryData);
      setAnalytics(analyticsData);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze memories');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load analytics on mount
  useEffect(() => {
    refreshAnalytics();
  }, [eveId]);
  
  return {
    analytics,
    isLoading: isLoading || memoryLoading,
    error: error || memoryError,
    refreshAnalytics
  };
}