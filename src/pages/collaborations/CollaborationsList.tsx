import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, MessageSquare, Users, Clock, AlertCircle } from 'lucide-react';
import { useCollaborationStore } from '../../stores/collaborationStore';
import { useEVEStore } from '../../stores/eveStore';
import { Collaboration, EVE } from '../../types/database.types';

function CollaborationsList() {
  const { collaborations, fetchCollaborations, isLoading, error } = useCollaborationStore();
  const { eves, fetchEVEs } = useEVEStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  
  useEffect(() => {
    fetchCollaborations();
    fetchEVEs();
  }, [fetchCollaborations, fetchEVEs]);
  
  const filteredCollaborations = collaborations.filter(collab => {
    const sourceEve = eves.find(eve => eve.id === collab.source_eve_id);
    const targetEve = eves.find(eve => eve.id === collab.target_eve_id);
    
    const matchesSearch = 
      (sourceEve && sourceEve.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (targetEve && targetEve.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      collab.message.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filter === 'all') return matchesSearch;
    return matchesSearch && collab.status === filter;
  });
  
  const getStatusBadge = (status: string) => {
    const statusClasses = {
      pending: 'bg-warning/20 text-warning',
      accepted: 'bg-info/20 text-info',
      rejected: 'bg-gray-500/20 text-gray-400',
      completed: 'bg-success/20 text-success'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClasses[status as keyof typeof statusClasses]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
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
          <h1 className="text-3xl font-bold text-white">Collaborations</h1>
          <p className="text-gray-400">Manage EVE™ collaboration requests and delegations</p>
        </div>
        <Link 
          to="/app/collaborations/new" 
          className="inline-flex items-center bg-black hover:bg-black/90 text-primary font-medium py-2 px-4 rounded-md border border-primary hover:shadow-neon transition-all duration-300"
        >
          <Plus size={16} className="mr-2" />
          New Collaboration
        </Link>
      </div>
      
      {error && (
        <div className="bg-red-900/20 border border-red-800 text-red-300 px-4 py-3 rounded mb-6 flex items-start">
          <AlertCircle size={20} className="mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Error loading collaborations</p>
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
              placeholder="Search collaborations..."
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
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
        
        {isLoading ? (
          <div className="py-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-3 text-gray-400">Loading collaborations...</p>
          </div>
        ) : filteredCollaborations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-dark-border">
              <thead className="bg-black/30">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Collaboration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    EVEs Involved
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
                {filteredCollaborations.map((collab: Collaboration) => (
                  <tr key={collab.id} className="hover:bg-black/20">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-black flex items-center justify-center">
                          <MessageSquare size={18} className="text-primary" />
                        </div>
                        <div className="ml-4">
                          <div className="font-medium text-white truncate max-w-xs">
                            {collab.request_type.charAt(0).toUpperCase() + collab.request_type.slice(1)} Request
                          </div>
                          <div className="text-sm text-gray-400 truncate max-w-xs">{collab.message}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1">
                        <div className="flex flex-col">
                          <div className="text-sm font-medium">
                            From: <Link to={`/eves/${collab.source_eve_id}`} className="text-primary hover:text-primary/80">
                              {getEveName(collab.source_eve_id)}
                            </Link>
                          </div>
                          <div className="text-sm font-medium">
                            To: <Link to={`/eves/${collab.target_eve_id}`} className="text-primary hover:text-primary/80">
                              {getEveName(collab.target_eve_id)}
                            </Link>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(collab.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPriorityBadge(collab.priority)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-400">
                        {collab.due_date ? new Date(collab.due_date).toLocaleDateString() : 'No deadline'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link to={`/collaborations/${collab.id}`} className="text-primary hover:text-primary/80">
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
              <p className="text-gray-400">No collaborations match your criteria</p>
            ) : (
              <div>
                <p className="text-gray-400 mb-2">No collaborations found</p>
                <Link 
                  to="/app/collaborations/new" 
                  className="inline-flex items-center text-primary hover:underline"
                >
                  <Plus size={16} className="mr-1" />
                  Create your first collaboration
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default CollaborationsList;