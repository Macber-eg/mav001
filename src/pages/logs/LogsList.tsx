import { useState, useEffect } from 'react';
import { Activity, Search, AlertCircle, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useLogStore } from '../../stores/logStore';
import { Log } from '../../types/database.types';

//home
function LogsList() {
  const { logs, fetchLogs, isLoading, error } = useLogStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  //dfvdfvdf
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);
  
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.event_type.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filter === 'all') return matchesSearch;
    return matchesSearch && log.status === filter;
  });
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle size={16} className="text-success" />;
      case 'error':
        return <XCircle size={16} className="text-error" />;
      case 'pending':
        return <Clock size={16} className="text-warning" />;
      default:
        return <Activity size={16} className="text-gray-400" />;
    }
  };
  
  const getStatusClass = (status: string) => {
    const statusClasses = {
      success: 'bg-success/20 text-success',
      error: 'bg-error/20 text-error',
      pending: 'bg-warning/20 text-warning',
      cancelled: 'bg-gray-500/20 text-gray-400'
    };
    return statusClasses[status as keyof typeof statusClasses] || statusClasses.pending;
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 pt-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Activity Logs</h1>
          <p className="text-gray-400">Monitor system events and activities</p>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-900/20 border border-red-800 text-red-300 px-4 py-3 rounded mb-6 flex items-start">
          <AlertCircle size={20} className="mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Error loading logs</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}
      
      <div className="bg-dark-surface rounded-lg shadow-md border border-dark-border overflow-hidden mb-6">
        <div className="p-4 border-b border-dark-border flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search logs..."
              className="pl-10 pr-4 py-2 bg-black/50 border border-dark-border text-white rounded-md w-full focus:ring-primary focus:border-primary"
            />
          </div>
          
          <div className="flex space-x-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 bg-black/50 border border-dark-border text-white rounded-md focus:ring-primary focus:border-primary"
            >
              <option value="all">All Events</option>
              <option value="success">Success</option>
              <option value="error">Error</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
        
        {isLoading ? (
          <div className="py-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-3 text-gray-400">Loading logs...</p>
          </div>
        ) : filteredLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-dark-border">
              <thead className="bg-black/30">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Event Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Message
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {filteredLogs.map((log: Log) => (
                  <tr key={log.id} className="hover:bg-black/20">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Activity size={16} className="text-primary mr-2" />
                        <span className="text-white">{log.event_type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-300">{log.message}</div>
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <details className="mt-1">
                          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                            View Details
                          </summary>
                          <pre className="mt-2 text-xs bg-black/30 p-2 rounded overflow-x-auto text-gray-400">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(log.status)}`}>
                        {getStatusIcon(log.status)}
                        <span className="ml-1">
                          {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                        </span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center">
            <Activity size={24} className="mx-auto text-gray-500 mb-3" />
            <p className="text-gray-400 mb-2">No logs found</p>
            {searchQuery || filter !== 'all' ? (
              <p className="text-sm text-gray-500">Try adjusting your search filters</p>
            ) : (
              <p className="text-sm text-gray-500">Activity logs will appear here as events occur</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default LogsList;
