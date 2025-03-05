import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, AlertCircle, Loader2 } from 'lucide-react';
import { useEVEStore } from '../../stores/eveStore';
import { useTaskStore } from '../../stores/taskStore';
import { useCollaboration } from '../../hooks/useCollaboration';
import { EVE, Task } from '../../types/database.types';

function CreateCollaboration() {
  const navigate = useNavigate();
  const { eves, fetchEVEs, isLoading: evesLoading, error: evesError } = useEVEStore();
  const { fetchTasks, isLoading: tasksLoading, error: tasksError } = useTaskStore();
  
  const [sourceEveId, setSourceEveId] = useState('');
  const [targetEveId, setTargetEveId] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [requestType, setRequestType] = useState<'delegate' | 'assist' | 'review'>('delegate');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [dueDate, setDueDate] = useState('');
  
  const { requestCollaboration, isLoading, error } = useCollaboration({ eveId: sourceEveId });
  
  useEffect(() => {
    fetchEVEs();
  }, [fetchEVEs]);
  
  // Fetch tasks for the selected source EVE
  useEffect(() => {
    async function loadTasks() {
      if (sourceEveId) {
        const eveTasks = await fetchTasks(sourceEveId);
        setTasks(eveTasks || []);
      } else {
        setTasks([]);
      }
    }
    
    loadTasks();
  }, [sourceEveId, fetchTasks]);
  
  const handleSourceEveChange = (id: string) => {
    setSourceEveId(id);
    setSelectedTaskId(''); // Reset selected task when source EVE changes
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sourceEveId || !targetEveId || !selectedTaskId || !message) {
      return;
    }
    
    try {
      await requestCollaboration({
        targetEveId,
        taskId: selectedTaskId,
        requestType,
        message,
        priority,
        dueDate: dueDate || undefined
      });
      
      navigate('/app/collaborations');
    } catch (error) {
      console.error('Error creating collaboration:', error);
    }
  };
  
  const isLoaded = !evesLoading && !tasksLoading;
  const hasError = evesError || tasksError || error;

  return (
    <div>
      <div className="mb-6 pt-4">
        <Link to="/app/collaborations" className="inline-flex items-center text-neon-green hover:underline mb-4">
          <ArrowLeft size={16} className="mr-1" />
          Back to Collaborations
        </Link>
        
        <div className="flex items-center">
          <div className="h-12 w-12 rounded-full bg-black border border-neon-green flex items-center justify-center mr-4">
            <MessageSquare size={24} className="text-neon-green" />
          </div>
          <h1 className="text-3xl font-bold text-secondary">Create New Collaboration</h1>
        </div>
      </div>
      
      {hasError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6 flex items-start">
          <AlertCircle size={20} className="mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Error</p>
            <p className="text-sm">{error || evesError || tasksError}</p>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="p-6">
          {!isLoaded ? (
            <div className="py-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-green mx-auto"></div>
              <p className="mt-3 text-gray-500">Loading...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="sourceEve" className="block text-sm font-medium text-gray-700 mb-1">
                      Source EVE™ <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="sourceEve"
                      value={sourceEveId}
                      onChange={(e) => handleSourceEveChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green"
                      required
                    >
                      <option value="">Select source EVE™...</option>
                      {eves.map((eve: EVE) => (
                        <option key={eve.id} value={eve.id}>{eve.name}</option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">EVE™ that is initiating the collaboration request</p>
                  </div>
                  
                  <div>
                    <label htmlFor="targetEve" className="block text-sm font-medium text-gray-700 mb-1">
                      Target EVE™ <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="targetEve"
                      value={targetEveId}
                      onChange={(e) => setTargetEveId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green"
                      required
                      disabled={!sourceEveId}
                    >
                      <option value="">Select target EVE™...</option>
                      {eves
                        .filter(eve => eve.id !== sourceEveId)
                        .map((eve: EVE) => (
                          <option key={eve.id} value={eve.id}>{eve.name}</option>
                        ))
                      }
                    </select>
                    <p className="mt-1 text-xs text-gray-500">EVE™ that will assist or take over the task</p>
                  </div>
                  
                  <div>
                    <label htmlFor="task" className="block text-sm font-medium text-gray-700 mb-1">
                      Task <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="task"
                      value={selectedTaskId}
                      onChange={(e) => setSelectedTaskId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green"
                      required
                      disabled={!sourceEveId}
                    >
                      <option value="">Select a task...</option>
                      {tasks.map((task: Task) => (
                        <option key={task.id} value={task.id}>{task.description}</option>
                      ))}
                    </select>
                    {tasks.length === 0 && sourceEveId && (
                      <p className="mt-1 text-xs text-red-500">No tasks available for this EVE™. Create a task first.</p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="requestType" className="block text-sm font-medium text-gray-700 mb-1">
                      Request Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="requestType"
                      value={requestType}
                      onChange={(e) => setRequestType(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green"
                      required
                    >
                      <option value="delegate">Delegate (Transfer Task)</option>
                      <option value="assist">Request Assistance</option>
                      <option value="review">Request Review</option>
                    </select>
                  </div>
                  
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
                </div>
              </div>
              
              <div className="mt-6">
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green"
                  placeholder="Explain why you're requesting this collaboration..."
                  required
                ></textarea>
              </div>
              
              <div className="mt-8 border-t pt-6 flex justify-end">
                <Link 
                  to="/app/collaborations"
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md font-medium mr-2"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={isLoading || !sourceEveId || !targetEveId || !selectedTaskId || !message}
                  className={`px-4 py-2 rounded-md font-medium flex items-center ${
                    isLoading || !sourceEveId || !targetEveId || !selectedTaskId || !message
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
                    'Create Collaboration'
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

export default CreateCollaboration;