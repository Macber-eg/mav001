import { useState, useEffect, useRef } from 'react';
import { Calendar, BarChart2, Network, Clock, Brain, AlertCircle, Loader2 } from 'lucide-react';
import { EVE, Memory } from '../../types/database.types';
import { useEVEMemory } from '../../hooks/useEVEMemory';

interface EVEMemoryVisualizerProps {
  eve: EVE;
}

export function EVEMemoryVisualizer({ eve }: EVEMemoryVisualizerProps) {
  const [activeView, setActiveView] = useState<'timeline' | 'connections' | 'importance' | 'insights'>('timeline');
  const [displayedMemories, setDisplayedMemories] = useState<Memory[]>([]);
  const [memoryStats, setMemoryStats] = useState({
    total: 0,
    byType: {} as Record<string, number>,
    byImportance: {} as Record<string, number>,
    recentlyUsed: 0,
    expiringSoon: 0
  });
  
  const { 
    memories, 
    isLoading, 
    error,
    getMemoriesByType
  } = useEVEMemory({ 
    eveId: eve.id,
    companyId: eve.company_id
  });
  
  const timelineRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const loadAllMemoryTypes = async () => {
      // Load all memory types
      const factMemories = await getMemoriesByType('fact');
      const conversationMemories = await getMemoriesByType('conversation');
      const preferenceMemories = await getMemoriesByType('preference');
      const relationshipMemories = await getMemoriesByType('relationship');
      
      // Combine all memories
      const allMemories = [
        ...factMemories,
        ...conversationMemories, 
        ...preferenceMemories,
        ...relationshipMemories
      ];
      
      // Sort by last accessed date
      allMemories.sort((a, b) => 
        new Date(b.last_accessed).getTime() - new Date(a.last_accessed).getTime()
      );
      
      setDisplayedMemories(allMemories);
      
      // Calculate stats
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      // Count memories by type
      const typeCount = allMemories.reduce((acc, memory) => {
        acc[memory.type] = (acc[memory.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Count memories by importance
      const importanceCount = allMemories.reduce((acc, memory) => {
        const importanceKey = `level-${memory.importance}`;
        acc[importanceKey] = (acc[importanceKey] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Count recently used memories
      const recentlyUsed = allMemories.filter(
        memory => new Date(memory.last_accessed) > oneWeekAgo
      ).length;
      
      // Count expiring memories
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(now.getDate() + 30);
      
      const expiringSoon = allMemories.filter(
        memory => memory.expiry && new Date(memory.expiry) < thirtyDaysFromNow && new Date(memory.expiry) > now
      ).length;
      
      setMemoryStats({
        total: allMemories.length,
        byType: typeCount,
        byImportance: importanceCount,
        recentlyUsed,
        expiringSoon
      });
    };
    
    loadAllMemoryTypes();
  }, [getMemoriesByType, memories]);

  // Format date string for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Format memory value for display
  const formatMemoryValue = (value: any): string => {
    if (typeof value === 'object') {
      if (value.user && value.assistant) {
        return `User: ${value.user.substring(0, 30)}... | EVE: ${value.assistant.substring(0, 30)}...`;
      }
      return JSON.stringify(value).substring(0, 60) + (JSON.stringify(value).length > 60 ? '...' : '');
    }
    return String(value).substring(0, 60) + (String(value).length > 60 ? '...' : '');
  };
  
  // Get color for memory type
  const getMemoryTypeColor = (type: string): string => {
    switch (type) {
      case 'fact':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'preference':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'relationship':
        return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'conversation':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  // Handle scroll for timeline
  const scrollTimeline = (direction: 'left' | 'right') => {
    if (timelineRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      timelineRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-secondary flex items-center">
          <Brain size={22} className="mr-2 text-neon-green" />
          Memory Visualization
        </h2>
        
        <div className="flex space-x-2">
          <button 
            onClick={() => setActiveView('timeline')} 
            className={`px-3 py-1.5 rounded-md text-sm ${
              activeView === 'timeline' 
                ? 'bg-black text-neon-green border border-neon-green' 
                : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Calendar size={16} className="inline mr-1" />
            Timeline
          </button>
          <button 
            onClick={() => setActiveView('connections')} 
            className={`px-3 py-1.5 rounded-md text-sm ${
              activeView === 'connections' 
                ? 'bg-black text-neon-green border border-neon-green' 
                : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Network size={16} className="inline mr-1" />
            Connections
          </button>
          <button 
            onClick={() => setActiveView('importance')} 
            className={`px-3 py-1.5 rounded-md text-sm ${
              activeView === 'importance' 
                ? 'bg-black text-neon-green border border-neon-green' 
                : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <BarChart2 size={16} className="inline mr-1" />
            Importance
          </button>
          <button 
            onClick={() => setActiveView('insights')} 
            className={`px-3 py-1.5 rounded-md text-sm ${
              activeView === 'insights' 
                ? 'bg-black text-neon-green border border-neon-green' 
                : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Brain size={16} className="inline mr-1" />
            Insights
          </button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-start">
          <AlertCircle size={20} className="mr-2 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden p-6">
        {isLoading ? (
          <div className="py-12 text-center">
            <Loader2 size={24} className="animate-spin mx-auto text-neon-green" />
            <p className="mt-3 text-gray-500">Loading memory data...</p>
          </div>
        ) : displayedMemories.length === 0 ? (
          <div className="py-12 text-center">
            <Brain size={36} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600 text-lg">No memories to visualize yet</p>
            <p className="text-gray-500 mt-2">
              Once {eve.name} begins storing memories, they will appear here.
            </p>
          </div>
        ) : (
          <>
            {/* Timeline View */}
            {activeView === 'timeline' && (
              <div>
                <h3 className="font-medium text-lg mb-4">Memory Timeline</h3>
                
                <div className="relative">
                  <button 
                    onClick={() => scrollTimeline('left')}
                    className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-md border border-gray-200 hover:bg-gray-50"
                  >
                    ←
                  </button>
                  
                  <div 
                    ref={timelineRef}
                    className="overflow-x-auto pb-4 pt-1 relative scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                    style={{ maxWidth: "100%", scrollbarWidth: "thin" }}
                  >
                    <div className="flex space-x-4 px-8" style={{ minWidth: Math.max(displayedMemories.length * 280, 800) }}>
                      {displayedMemories.map((memory) => (
                        <div 
                          key={memory.id} 
                          className="w-64 border rounded-lg shadow-sm flex-shrink-0"
                        >
                          <div className={`px-3 py-2 rounded-t-lg font-medium text-sm ${getMemoryTypeColor(memory.type)}`}>
                            {memory.type.charAt(0).toUpperCase() + memory.type.slice(1)}: {memory.key}
                          </div>
                          <div className="p-3">
                            <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                              {formatMemoryValue(memory.value)}
                            </p>
                            <div className="flex justify-between items-center text-xs text-gray-500">
                              <div className="flex items-center">
                                <Calendar size={12} className="mr-1" />
                                <span>{formatDate(memory.last_accessed)}</span>
                              </div>
                              <div className="flex items-center">
                                <span>Importance: {memory.importance}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => scrollTimeline('right')}
                    className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-md border border-gray-200 hover:bg-gray-50"
                  >
                    →
                  </button>
                </div>
                
                <div className="mt-4 text-center text-sm text-gray-500">
                  Showing {displayedMemories.length} memories ordered by most recently accessed
                </div>
              </div>
            )}
            
            {/* Connections View */}
            {activeView === 'connections' && (
              <div>
                <h3 className="font-medium text-lg mb-4">Memory Connections</h3>
                
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 h-[400px] flex items-center justify-center">
                  <div className="memory-connections-graph">
                    {/* This would be a visualization of connected memories */}
                    <svg width="600" height="300" className="mx-auto">
                      <g transform="translate(300, 150)">
                        {/* Central node - EVE */}
                        <circle cx="0" cy="0" r="40" fill="#4C1D95" />
                        <text x="0" y="5" textAnchor="middle" fill="white" fontSize="12">
                          {eve.name}
                        </text>
                        
                        {/* Memory type nodes */}
                        {Object.entries(memoryStats.byType).map(([type, count], index) => {
                          const angle = (index * Math.PI * 2) / Object.keys(memoryStats.byType).length;
                          const x = Math.cos(angle) * 120;
                          const y = Math.sin(angle) * 120;
                          
                          // Connection line
                          return (
                            <g key={type}>
                              <line 
                                x1="0" 
                                y1="0" 
                                x2={x} 
                                y2={y} 
                                stroke="#6B7280" 
                                strokeWidth="2" 
                                strokeOpacity="0.6" 
                              />
                              <circle 
                                cx={x} 
                                cy={y} 
                                r={20 + Math.sqrt(count) * 5} 
                                fill={
                                  type === 'fact' ? '#93C5FD' : 
                                  type === 'preference' ? '#C4B5FD' : 
                                  type === 'relationship' ? '#F9A8D4' : 
                                  '#86EFAC'
                                }
                                fillOpacity="0.7"
                              />
                              <text 
                                x={x} 
                                y={y} 
                                textAnchor="middle" 
                                dominantBaseline="middle" 
                                fill="#1F2937" 
                                fontSize="11" 
                                fontWeight="500"
                              >
                                {type}
                                <tspan x={x} y={y + 14} fontSize="10">
                                  ({count})
                                </tspan>
                              </text>
                            </g>
                          );
                        })}
                      </g>
                    </svg>
                  </div>
                </div>
                
                <div className="mt-4 text-center text-sm text-gray-500">
                  <p>This visualization shows how {eve.name}'s memory is distributed across different types.</p>
                  <p>Larger circles indicate more memories of that type.</p>
                </div>
              </div>
            )}
            
            {/* Importance View */}
            {activeView === 'importance' && (
              <div>
                <h3 className="font-medium text-lg mb-4">Memory Importance Distribution</h3>
                
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-8">
                  <div className="flex items-end justify-between h-64 max-w-2xl mx-auto">
                    {[1, 2, 3, 4, 5].map((level) => {
                      const count = memoryStats.byImportance[`level-${level}`] || 0;
                      const maxCount = Math.max(...Object.values(memoryStats.byImportance));
                      const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                      
                      return (
                        <div key={level} className="flex flex-col items-center flex-1">
                          <div className="flex items-end h-48 w-full justify-center">
                            <div 
                              className={`w-16 bg-gradient-to-t ${
                                level === 1 ? 'from-blue-200 to-blue-500' :
                                level === 2 ? 'from-green-200 to-green-500' :
                                level === 3 ? 'from-yellow-200 to-yellow-500' :
                                level === 4 ? 'from-orange-200 to-orange-500' :
                                'from-red-200 to-red-500'
                              } rounded-t-md`}
                              style={{ height: `${percentage}%` }}
                            ></div>
                          </div>
                          <div className="text-center mt-2">
                            <div className="font-medium">Level {level}</div>
                            <div className="text-sm text-gray-500">{count} memories</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <div className="mt-4 text-center text-sm text-gray-500">
                  <p>This chart shows how {eve.name}'s memories are distributed by importance level.</p>
                  <p>Higher importance memories are prioritized when providing context for responses.</p>
                </div>
              </div>
            )}
            
            {/* Insights View */}
            {activeView === 'insights' && (
              <div>
                <h3 className="font-medium text-lg mb-4">Memory Insights</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                    <h4 className="font-medium text-lg mb-2 flex items-center text-gray-800">
                      <Brain size={20} className="mr-2 text-purple-600" />
                      Memory Overview
                    </h4>
                    <ul className="space-y-3">
                      <li className="flex justify-between">
                        <span className="text-gray-600">Total Memories:</span>
                        <span className="font-medium">{memoryStats.total}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-gray-600">Facts:</span>
                        <span className="font-medium">{memoryStats.byType['fact'] || 0}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-gray-600">Preferences:</span>
                        <span className="font-medium">{memoryStats.byType['preference'] || 0}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-gray-600">Relationships:</span>
                        <span className="font-medium">{memoryStats.byType['relationship'] || 0}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-gray-600">Conversations:</span>
                        <span className="font-medium">{memoryStats.byType['conversation'] || 0}</span>
                      </li>
                      <li className="flex justify-between border-t pt-2">
                        <span className="text-gray-600">Recently Used (7 days):</span>
                        <span className="font-medium">{memoryStats.recentlyUsed}</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                    <h4 className="font-medium text-lg mb-2 flex items-center text-gray-800">
                      <BarChart2 size={20} className="mr-2 text-blue-600" />
                      Memory Health
                    </h4>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-gray-600">Memory Utilization</span>
                          <span className="text-sm font-medium">
                            {Math.round((memoryStats.recentlyUsed / Math.max(memoryStats.total, 1)) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${(memoryStats.recentlyUsed / Math.max(memoryStats.total, 1)) * 100}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Percentage of memories used in the last 7 days
                        </p>
                      </div>
                      
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-gray-600">Memory Distribution</span>
                          <span className="text-sm font-medium">
                            {Object.keys(memoryStats.byType).length}/4 types
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${(Object.keys(memoryStats.byType).length / 4) * 100}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Diversity of memory types (facts, preferences, relationships, conversations)
                        </p>
                      </div>
                      
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-gray-600">Expiring Soon</span>
                          <span className="text-sm font-medium">
                            {memoryStats.expiringSoon}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Memories that will expire in the next 30 days
                        </p>
                      </div>
                      
                      <div className="pt-3 border-t">
                        <h5 className="font-medium text-sm mb-2">Recommendations:</h5>
                        <ul className="text-sm text-gray-600 space-y-1 list-disc pl-5">
                          {memoryStats.byType['fact'] === 0 && (
                            <li>Add some factual memories to improve responses</li>
                          )}
                          {memoryStats.byType['preference'] === 0 && (
                            <li>Add preference memories to personalize behavior</li>
                          )}
                          {memoryStats.total > 0 && Object.keys(memoryStats.byImportance).length < 3 && (
                            <li>Use a variety of importance levels for better memory prioritization</li>
                          )}
                          {memoryStats.total > 20 && memoryStats.byType['conversation'] > memoryStats.total * 0.7 && (
                            <li>Consider cleaning up older conversation memories to improve performance</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default EVEMemoryVisualizer;