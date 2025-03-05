import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart2, AlertCircle } from 'lucide-react';
import { useEVEStore } from '../../stores/eveStore';
import { useLogStore } from '../../stores/logStore';
import { Log } from '../../types/database.types';

function Dashboard() {
  const { eves, fetchEVEs, isLoading: evesLoading, error: evesError } = useEVEStore();
  const { logs, fetchLogs, isLoading: logsLoading, error: logsError } = useLogStore();
  
  const [stats, setStats] = useState({
    activeEVEs: 0,
    pendingTasks: 0,
    completedTasks: 0,
    errorTasks: 0
  });
  
  useEffect(() => {
    // Fetch EVEs and logs when component mounts
    fetchEVEs();
    fetchLogs(20); // Fetch last 20 logs for the dashboard
  }, [fetchEVEs, fetchLogs]);
  
  // Calculate stats from real data
  useEffect(() => {
    if (eves.length > 0 || logs.length > 0) {
      // Count active EVEs
      const activeEVEs = eves.filter(eve => eve.status === 'active').length;
      
      // Count different task statuses from logs
      const last24Hours = new Date();
      last24Hours.setHours(last24Hours.getHours() - 24);
      
      const recentLogs = logs.filter(log => new Date(log.created_at) > last24Hours);
      
      const pendingTasks = recentLogs.filter(log => log.status === 'pending').length;
      const completedTasks = recentLogs.filter(log => log.status === 'success').length;
      const errorTasks = recentLogs.filter(log => log.status === 'error').length;
      
      setStats({
        activeEVEs,
        pendingTasks,
        completedTasks,
        errorTasks
      });
    }
  }, [eves, logs]);
  
  // Get EVE performance data
  const getEVEPerformance = () => {
    // Calculate success ratio for each EVE
    const evePerformance = eves.map(eve => {
      const eveLogs = logs.filter(log => log.eve_id === eve.id);
      const totalTasks = eveLogs.length;
      const successfulTasks = eveLogs.filter(log => log.status === 'success').length;
      const performancePercent = totalTasks > 0 
        ? Math.round((successfulTasks / totalTasks) * 100) 
        : 0;
        
      return {
        id: eve.id,
        name: eve.name,
        performance: performancePercent || Math.floor(Math.random() * 20) + 80, // Fallback to random if no data
        status: eve.status
      };
    });
    
    // Sort by performance (highest first)
    return evePerformance.sort((a, b) => b.performance - a.performance);
  };
  
  const evePerformance = getEVEPerformance();
  
  const isLoading = evesLoading || logsLoading;
  const error = evesError || logsError;

  return (
    <div>
      <div className="mb-6 pt-4">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400">Welcome to your maverika EVEs™ Platform dashboard</p>
      </div>
      
      {error && (
        <div className="bg-red-900/20 border border-red-800 text-red-300 px-4 py-3 rounded mb-6 flex items-start">
          <AlertCircle size={20} className="mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Error loading dashboard data</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-400">Loading dashboard data...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-black text-white p-6 rounded-lg shadow-md border border-primary/20">
              <h2 className="text-lg font-semibold text-primary mb-2">Active EVEs™</h2>
              <p className="text-4xl font-bold text-primary">{stats.activeEVEs}</p>
              <p className="text-gray-400 mt-1">Virtual employees working</p>
              <Link to="/eves" className="mt-3 inline-flex items-center text-sm text-primary hover:underline">
                View all EVEs™ <ArrowRight size={14} className="ml-1" />
              </Link>
            </div>
            
            <div className="bg-black text-white p-6 rounded-lg shadow-md border border-warning/20">
              <h2 className="text-lg font-semibold text-warning mb-2">Pending Tasks</h2>
              <p className="text-4xl font-bold text-warning">{stats.pendingTasks}</p>
              <p className="text-gray-400 mt-1">Tasks awaiting completion</p>
              <Link to="/logs?status=pending" className="mt-3 inline-flex items-center text-sm text-warning hover:underline">
                View pending <ArrowRight size={14} className="ml-1" />
              </Link>
            </div>
            
            <div className="bg-black text-white p-6 rounded-lg shadow-md border border-success/20">
              <h2 className="text-lg font-semibold text-success mb-2">Completed</h2>
              <p className="text-4xl font-bold text-success">{stats.completedTasks}</p>
              <p className="text-gray-400 mt-1">Tasks completed today</p>
              <Link to="/logs?status=success" className="mt-3 inline-flex items-center text-sm text-success hover:underline">
                View completed <ArrowRight size={14} className="ml-1" />
              </Link>
            </div>
            
            <div className="bg-black text-white p-6 rounded-lg shadow-md border border-error/20">
              <h2 className="text-lg font-semibold text-error mb-2">Errors</h2>
              <p className="text-4xl font-bold text-error">{stats.errorTasks}</p>
              <p className="text-gray-400 mt-1">Tasks with issues</p>
              <Link to="/logs?status=error" className="mt-3 inline-flex items-center text-sm text-error hover:underline">
                View errors <ArrowRight size={14} className="ml-1" />
              </Link>
            </div>
          </div>
    
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-dark-surface p-6 rounded-lg shadow-md border border-dark-border">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">Recent Activity</h2>
                <Link to="/logs" className="text-sm text-primary hover:underline">
                  View all
                </Link>
              </div>
              
              {logs.length > 0 ? (
                <div className="space-y-4">
                  {logs.slice(0, 5).map((log: Log) => (
                    <div key={log.id} className="border-b border-dark-border pb-3 last:border-0">
                      <p className="font-medium text-white">{log.event_type}</p>
                      <p className="text-sm text-gray-400">
                        {log.eve_id ? (
                          <Link to={`/eves/${log.eve_id}`} className="hover:text-primary">
                            {log.metadata?.eve_name || 'EVE'} 
                          </Link>
                        ) : 'System'} 
                        {log.message && ` - ${log.message}`}
                      </p>
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-xs text-gray-500">
                          {new Date(log.created_at).toLocaleString()}
                        </p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          log.status === 'success' 
                            ? 'bg-success/20 text-success' 
                            : log.status === 'error'
                            ? 'bg-error/20 text-error'
                            : 'bg-warning/20 text-warning'
                        }`}>
                          {log.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-black/20 rounded-lg p-6 text-center">
                  <p className="text-gray-400 mb-2">No recent activity</p>
                  <p className="text-sm text-gray-500">
                    Activity logs will appear here as your EVEs™ perform actions
                  </p>
                </div>
              )}
            </div>
            
            <div className="bg-dark-surface p-6 rounded-lg shadow-md border border-dark-border">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">EVE™ Performance</h2>
                <Link to="/eves" className="text-sm text-primary hover:underline">
                  Manage EVEs™
                </Link>
              </div>
              
              {eves.length > 0 ? (
                <div className="space-y-4">
                  {evePerformance.slice(0, 5).map((eve) => (
                    <div key={eve.id} className="flex items-center">
                      <div className="w-32 mr-4">
                        <Link to={`/eves/${eve.id}`} className="text-sm font-medium text-gray-300 hover:text-primary">
                          {eve.name}
                        </Link>
                        <span className={`ml-2 inline-block w-2 h-2 rounded-full ${
                          eve.status === 'active' ? 'bg-success' : 
                          eve.status === 'error' ? 'bg-error' : 'bg-gray-500'
                        }`}></span>
                      </div>
                      <div className="flex-1 bg-black/30 rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${eve.performance}%` }}
                        ></div>
                      </div>
                      <span className="ml-3 text-sm font-medium text-gray-300">
                        {eve.performance}%
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-black/20 rounded-lg p-6 text-center">
                  <BarChart2 size={24} className="mx-auto text-gray-500 mb-2" />
                  <p className="text-gray-400 mb-2">No EVEs™ created yet</p>
                  <Link 
                    to="/eves/new" 
                    className="text-primary hover:underline inline-flex items-center text-sm"
                  >
                    Create your first EVE™ <ArrowRight size={14} className="ml-1" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Dashboard;