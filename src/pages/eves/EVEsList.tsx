import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Activity, AlertCircle } from 'lucide-react';
import { useEVEStore } from '../../stores/eveStore';
import { EVE } from '../../types/database.types';

function EVEsList() {
  const { eves, isLoading, error, fetchEVEs } = useEVEStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  
  useEffect(() => {
    fetchEVEs();
  }, [fetchEVEs]);
  
  const filteredEVEs = eves.filter(eve => {
    const matchesSearch = eve.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (eve.description && eve.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (filter === 'all') return matchesSearch;
    return matchesSearch && eve.status === filter;
  });
  
  const getStatusBadge = (status: string) => {
    const statusClasses = {
      active: 'bg-success/20 text-success',
      inactive: 'bg-gray-500/20 text-gray-400',
      training: 'bg-info/20 text-info',
      error: 'bg-error/20 text-error'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClasses[status as keyof typeof statusClasses]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 pt-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Virtual Employees</h1>
          <p className="text-gray-400">Manage your Enterprise Virtual Employees™</p>
        </div>
        <Link 
          to="/app/eves/new" 
          className="inline-flex items-center bg-black hover:bg-black/90 text-primary font-medium py-2 px-4 rounded-md border border-primary hover:shadow-neon transition-all duration-300"
        >
          <Plus size={16} className="mr-2" />
          Create New EVE™
        </Link>
      </div>
      
      {error && (
        <div className="bg-red-900/20 border border-red-800 text-red-300 px-4 py-3 rounded mb-6 flex items-start">
          <AlertCircle size={20} className="mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Error loading EVEs™</p>
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
              placeholder="Search EVEs™..."
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
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="training">Training</option>
              <option value="error">Error</option>
            </select>
          </div>
        </div>
        
        {isLoading ? (
          <div className="py-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-3 text-gray-400">Loading virtual employees...</p>
          </div>
        ) : filteredEVEs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-dark-border">
              <thead className="bg-black/30">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {filteredEVEs.map((eve: EVE) => (
                  <tr key={eve.id} className="hover:bg-black/20">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-black flex items-center justify-center">
                          <Activity size={18} className="text-primary" />
                        </div>
                        <div className="ml-4">
                          <div className="font-medium text-white">{eve.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(eve.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-300 max-w-xs truncate">
                        {eve.description || 'No description provided'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link to={`/app/eves/${eve.id}`} className="text-primary hover:text-primary/80">
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
              <p className="text-gray-400">No virtual employees match your criteria</p>
            ) : (
              <div>
                <p className="text-gray-400 mb-2">No virtual employees found</p>
                <Link 
                  to="/app/eves/new" 
                  className="inline-flex items-center text-primary hover:underline"
                >
                  <Plus size={16} className="mr-1" />
                  Create your first EVE™
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default EVEsList;