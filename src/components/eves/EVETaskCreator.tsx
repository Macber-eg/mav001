import { useState } from 'react';
import { CalendarIcon, PlusCircle, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useEVETask } from '../../hooks/useEVETask';
import { EVE, Action } from '../../types/database.types';

interface EVETaskCreatorProps {
  eve: EVE;
  availableActions: Action[];
  onTaskCreated?: (taskId: string) => void;
}

export function EVETaskCreator({ eve, availableActions, onTaskCreated }: EVETaskCreatorProps) {
  const [description, setDescription] = useState('');
  const [selectedActionId, setSelectedActionId] = useState<string>('');
  const [parameters, setParameters] = useState<Record<string, string>>({});
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [dueDate, setDueDate] = useState<string>('');
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisText, setAnalysisText] = useState('');

  const { createTask, isLoading, error } = useEVETask({ eveId: eve.id });

  // Get the selected action details
  const selectedAction = availableActions.find(action => action.id === selectedActionId);

  // Update parameters when selected action changes
  const handleActionChange = (actionId: string) => {
    setSelectedActionId(actionId);
    
    // Reset parameters
    setParameters({});
    
    // If action has required parameters, create empty fields for them
    const action = availableActions.find(a => a.id === actionId);
    if (action && action.required_params && Array.isArray(action.required_params)) {
      const newParams: Record<string, string> = {};
      action.required_params.forEach(param => {
        if (typeof param === 'string') {
          newParams[param] = '';
        } else if (typeof param === 'object' && param.name) {
          newParams[param.name] = '';
        }
      });
      setParameters(newParams);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || isLoading) return;

    try {
      const result = await createTask({
        taskDescription: description,
        actionId: selectedActionId || undefined,
        parameters: Object.keys(parameters).length > 0 ? parameters : undefined,
        priority,
        dueDate: dueDate || undefined
      });
      
      setDescription('');
      setSelectedActionId('');
      setParameters({});
      setPriority('medium');
      setDueDate('');
      
      // Show the AI analysis
      setAnalysisText(result.analysis);
      setShowAnalysis(true);
      
      // Notify parent component
      if (onTaskCreated) {
        onTaskCreated(result.task.id);
      }
    } catch (err) {
      console.error('Error creating task:', err);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 bg-black text-white">
        <h2 className="text-lg font-semibold">Create Task for {eve.name}</h2>
      </div>
      
      {showAnalysis ? (
        <div className="p-6">
          <div className="mb-4 flex items-center">
            <CheckCircle size={20} className="text-neon-green mr-2" />
            <h3 className="text-lg font-medium">Task Created Successfully</h3>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
            <h4 className="font-medium mb-2">AI Task Analysis</h4>
            <div className="text-sm text-gray-700 whitespace-pre-line">{analysisText}</div>
          </div>
          
          <button
            onClick={() => setShowAnalysis(false)}
            className="bg-black text-neon-green py-2 px-4 rounded-md hover:bg-black/90 font-medium border border-neon-green"
          >
            Create Another Task
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-lg flex items-start">
              <AlertCircle size={18} className="mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}
          
          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Task Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-neon-green"
              placeholder="Describe what you want the EVE™ to do..."
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="action" className="block text-sm font-medium text-gray-700 mb-1">
              Action (Optional)
            </label>
            <select
              id="action"
              value={selectedActionId}
              onChange={(e) => handleActionChange(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-neon-green"
            >
              <option value="">Select an action...</option>
              {availableActions.map(action => (
                <option key={action.id} value={action.id}>{action.name}</option>
              ))}
            </select>
            {selectedAction && (
              <p className="mt-1 text-sm text-gray-500">{selectedAction.description}</p>
            )}
          </div>
          
          {/* Display parameter fields based on selected action */}
          {selectedAction && selectedAction.required_params && Object.keys(parameters).length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Action Parameters</h3>
              <div className="space-y-3 bg-gray-50 p-3 rounded-md">
                {Object.keys(parameters).map(paramName => (
                  <div key={paramName}>
                    <label className="block text-sm text-gray-700 mb-1 capitalize">
                      {paramName.replace('_', ' ')}
                    </label>
                    <input
                      type="text"
                      value={parameters[paramName]}
                      onChange={(e) => setParameters({...parameters, [paramName]: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-neon-green"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-neon-green"
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
              <div className="relative">
                <input
                  id="dueDate"
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-neon-green"
                />
                <CalendarIcon size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!description.trim() || isLoading}
              className={`flex items-center px-4 py-2 rounded-md font-medium ${
                !description.trim() || isLoading
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-black text-neon-green hover:bg-black/90 border border-neon-green'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <PlusCircle size={16} className="mr-2" />
                  Create Task
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}