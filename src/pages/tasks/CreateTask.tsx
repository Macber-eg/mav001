import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { useEVEStore } from '../../stores/eveStore';
import { useActionStore } from '../../stores/actionStore';
import { useTaskStore } from '../../stores/taskStore';
import { EVE, Action } from '../../types/database.types';

function CreateTask() {
  const navigate = useNavigate();
  const { eves, fetchEVEs, isLoading: evesLoading, error: evesError } = useEVEStore();
  const { actions, fetchActions, isLoading: actionsLoading, error: actionsError } = useActionStore();
  const { createTask, isLoading, error: taskError } = useTaskStore();
  
  const [selectedEveId, setSelectedEveId] = useState('');
  const [selectedActionId, setSelectedActionId] = useState('');
  const [description, setDescription] = useState('');
  const [parameters, setParameters] = useState<Record<string, string>>({});
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [dueDate, setDueDate] = useState('');
  
  useEffect(() => {
    fetchEVEs();
    fetchActions();
  }, [fetchEVEs, fetchActions]);
  
  // Reset parameters when action changes
  useEffect(() => {
    if (selectedActionId) {
      const action = actions.find(a => a.id === selectedActionId);
      if (action && action.required_params) {
        const newParams: Record<string, string> = {};
        
        if (Array.isArray(action.required_params)) {
          action.required_params.forEach(param => {
            if (typeof param === 'string') {
              newParams[param] = '';
            } else if (typeof param === 'object' && param.name) {
              newParams[param.name] = '';
            }
          });
        }
        
        setParameters(newParams);
      } else {
        setParameters({});
      }
    } else {
      setParameters({});
    }
  }, [selectedActionId, actions]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEveId || !description) {
      return;
    }
    
    try {
      await createTask({
        eve_id: selectedEveId,
        action_id: selectedActionId || undefined,
        description,
        status: 'pending',
        parameters: Object.keys(parameters).length > 0 ? parameters : undefined,
        priority,
        due_date: dueDate || undefined
      });
      
      navigate('/app/tasks');
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };
  
  const error = evesError || actionsError || taskError;
  
  return (
    <div>
      <div className="mb-6 pt-4">
        <Link to="/app/tasks" className="inline-flex items-center text-neon-green hover:underline mb-4">
          <ArrowLeft size={16} className="mr-1" />
          Back to Tasks
        </Link>
        
        <div className="flex items-center">
          <div className="h-12 w-12 rounded-full bg-black border border-neon-green flex items-center justify-center mr-4">
            <Clock size={24} className="text-neon-green" />
          </div>
          <h1 className="text-3xl font-bold text-secondary">Create New Task</h1>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6 flex items-start">
          <AlertCircle size={20} className="mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="p-6">
          {(evesLoading || actionsLoading) ? (
            <div className="py-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-green mx-auto"></div>
              <p className="mt-3 text-gray-500">Loading...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="eveId" className="block text-sm font-medium text-gray-700 mb-1">
                      Assign to EVE™ <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="eveId"
                      value={selectedEveId}
                      onChange={(e) => setSelectedEveId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green"
                      required
                    >
                      <option value="">Select EVE™...</option>
                      {eves.map((eve: EVE) => (
                        <option key={eve.id} value={eve.id}>{eve.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                      Task Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green"
                      placeholder="Describe what the EVE™ should do..."
                      required
                    ></textarea>
                  </div>
                  
                  <div>
                    <label htmlFor="actionId" className="block text-sm font-medium text-gray-700 mb-1">
                      Action (Optional)
                    </label>
                    <select
                      id="actionId"
                      value={selectedActionId}
                      onChange={(e) => setSelectedActionId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green"
                    >
                      <option value="">No specific action</option>
                      {actions.map((action: Action) => (
                        <option key={action.id} value={action.id}>{action.name}</option>
                      ))}
                    </select>
                    {selectedActionId && (
                      <p className="mt-1 text-xs text-gray-500">
                        {actions.find(a => a.id === selectedActionId)?.description}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <select
                      id="priority"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
                      Due Date (Optional)
                    </label>
                    <input
                      id="dueDate"
                      type="datetime-local"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green"
                    />
                  </div>
                  
                  {/* Action Parameters */}
                  {Object.keys(parameters).length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Action Parameters</h3>
                      <div className="bg-gray-50 p-4 rounded-md space-y-3">
                        {Object.keys(parameters).map(key => (
                          <div key={key}>
                            <label htmlFor={`param-${key}`} className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                              {key.replace(/_/g, ' ')}
                            </label>
                            <input
                              id={`param-${key}`}
                              type="text"
                              value={parameters[key]}
                              onChange={(e) => setParameters({...parameters, [key]: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-8 border-t pt-6 flex justify-end">
                <Link 
                  to="/tasks"
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md font-medium mr-2"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={isLoading || !selectedEveId || !description}
                  className={`px-4 py-2 rounded-md font-medium flex items-center ${
                    isLoading || !selectedEveId || !description
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-black hover:bg-black/90 text-neon-green border border-neon-green'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Task'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default CreateTask;