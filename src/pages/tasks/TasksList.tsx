import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Clock, Check, X, AlertCircle } from 'lucide-react';
import { useTaskStore } from '../../stores/taskStore';
import { useEVEStore } from '../../stores/eveStore';
import { Task, EVE } from '../../types/database.types';

function TasksList() {
  const { tasks, fetchTasks, isLoading, error } = useTaskStore();
  const { eves, fetchEVEs } = useEVEStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  
  useEffect(() => {
    fetchTasks();
    fetchEVEs();
  }, [fetchTasks, fetchEVEs]);
  
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = 
      task.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filter === 'all') return matchesSearch;
    return matchesSearch && task.status === filter;
  });
  
  const getStatusBadge = (status: string) => {
    const statusClasses = {
      pending: 'bg-warning/20 text-warning',
      in_progress: 'bg-info/20 text-info',
      completed: 'bg-success/20 text-success',
      failed: 'bg-error/20 text-error',
      cancelled: 'bg-gray-500/20 text-gray-400'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClasses[status as keyof typeof statusClasses]}`}>
        {status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
      </span>
    );
  };
  
  const getPriorityBadge = (priority: string) => {
    const priorityClasses = {
      low: 'bg-gray-500/20 text-gray-400',
      medium: 'bg-info/20 text-info',
      high: 'bg-warning/20 text-warning',
      critical: 'bg-error/20 text-error'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityClasses[priority as keyof typeof priorityClasses]}`}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </span>
    );
  };
  
  const getEveName = (eveId: string) => {
    const eve = eves.find(eve => eve.id === eveId);
    return eve ? eve.name : 'Unknown EVE';
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 pt-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Tasks & Workflows</h1>
          <p className="text-gray-400">Manage tasks assigned to your Virtual Employees™</p>
        </div>
        <Link 
          to="/app/tasks/new" 
          className="inline-flex items-center bg-black hover:bg-black/90 text-primary font-medium py-2 px-4 rounded-md border border-primary hover:shadow-neon transition-all duration-300"
        >
          <Plus size={16} className="mr-2" />
          Create New Task
        </Link>
      </div>
      
      {error && (
        <div className="bg-red-900/20 border border-red-800 text-red-300 px-4 py-3 rounded mb-6 flex items-start">
          <AlertCircle size={20} className="mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Error loading tasks</p>
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
              placeholder="Search tasks..."
              className="pl-10 pr-4 py-2 bg-black/50 border border-dark-border text-white rounded-md w-full focus:ring-primary focus:border-primary"
            />
          </div>
          
          <div className="flex space-x-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 bg-black/50 border border-dark-border text-white rounded-md focus:ring-primary focus:border-primary"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
        
        {isLoading ? (
          <div className="py-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-3 text-gray-400">Loading tasks...</p>
          </div>
        ) : filteredTasks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-dark-border">
              <thead className="bg-black/30">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Task Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Assigned EVE
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {filteredTasks.map((task: Task) => (
                  <tr key={task.id} className="hover:bg-black/20">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-black flex items-center justify-center">
                          <Clock size={18} className="text-primary" />
                        </div>
                        <div className="ml-4">
                          <div className="font-medium text-white truncate max-w-xs">{task.description}</div>
                          <div className="text-sm text-gray-400">Created: {new Date(task.created_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link to={`/app/eves/${task.eve_id}`} className="text-primary hover:text-primary/80">
                        {getEveName(task.eve_id)}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(task.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPriorityBadge(task.priority)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-400">
                        {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No deadline'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link to={`/app/tasks/${task.id}`} className="text-primary hover:text-primary/80">
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center">
            {searchQuery || filter !== 'all' ? (
              <p className="text-gray-400">No tasks match your criteria</p>
            ) : (
              <div>
                <p className="text-gray-400 mb-2">No tasks found</p>
                <Link 
                  to="/app/tasks/new" 
                  className="inline-flex items-center text-primary hover:underline"
                >
                  <Plus size={16} className="mr-1" />
                  Create your first task
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default TasksList;