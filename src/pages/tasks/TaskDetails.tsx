import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Clock, AlertCircle, CheckCircle, XCircle, 
  Edit, Trash2, MessageSquare, Loader2 
} from 'lucide-react';
import { useTaskStore } from '../../stores/taskStore';
import { useEVEStore } from '../../stores/eveStore';
import { useActionStore } from '../../stores/actionStore';
import { Task, EVE, Action } from '../../types/database.types';

function TaskDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { getTask, updateTask, deleteTask, isLoading: taskLoading, error: taskError } = useTaskStore();
  const { eves, fetchEVEs, isLoading: evesLoading } = useEVEStore();
  const { actions, fetchActions, isLoading: actionsLoading } = useActionStore();
  
  const [task, setTask] = useState<Task | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    description: '',
    status: '',
    priority: '',
    dueDate: '',
    parameters: '{}'
  });
  
  useEffect(() => {
    const loadData = async () => {
      if (id) {
        const taskData = await getTask(id);
        if (taskData) {
          setTask(taskData);
          setFormData({
            description: taskData.description,
            status: taskData.status,
            priority: taskData.priority,
            dueDate: taskData.due_date || '',
            parameters: JSON.stringify(taskData.parameters || {}, null, 2)
          });
        } else {
          navigate('/app/tasks');
        }
      }
      
      await Promise.all([
        fetchEVEs(),
        fetchActions()
      ]);
    };
    
    loadData();
  }, [id, getTask, fetchEVEs, fetchActions, navigate]);
  
  const handleSave = async () => {
    if (!id || !task) return;
    
    try {
      let parameters = {};
      try {
        parameters = JSON.parse(formData.parameters);
      } catch (e) {
        alert('Invalid parameters JSON');
        return;
      }
      
      const updatedTask = await updateTask(id, {
        description: formData.description,
        status: formData.status as Task['status'],
        priority: formData.priority as Task['priority'],
        due_date: formData.dueDate || null,
        parameters
      });
      
      if (updatedTask) {
        setTask(updatedTask);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };
  
  const handleDelete = async () => {
    if (!id) return;
    
    try {
      await deleteTask(id);
      navigate('/app/tasks');
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };
  
  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-warning/20 text-warning',
      in_progress: 'bg-info/20 text-info',
      completed: 'bg-success/20 text-success',
      failed: 'bg-error/20 text-error',
      cancelled: 'bg-gray-500/20 text-gray-400'
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };
  
  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-gray-500/20 text-gray-400',
      medium: 'bg-info/20 text-info',
      high: 'bg-warning/20 text-warning',
      critical: 'bg-error/20 text-error'
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  };
  
  const getEveName = (eveId: string) => {
    const eve = eves.find(eve => eve.id === eveId);
    return eve ? eve.name : 'Unknown EVE';
  };
  
  const getActionName = (actionId: string | undefined) => {
    if (!actionId) return 'No specific action';
    const action = actions.find(action => action.id === actionId);
    return action ? action.name : 'Unknown Action';
  };
  
  if (taskLoading || evesLoading || actionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-green mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading task details...</p>
        </div>
      </div>
    );
  }
  
  if (taskError) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
        <div className="flex items-start">
          <AlertCircle size={24} className="mr-3 mt-0.5" />
          <div>
            <h3 className="font-medium text-lg">Error loading task</h3>
            <p>{taskError}</p>
            <Link to="/app/tasks" className="mt-3 inline-block text-neon-green hover:underline">
              Return to tasks list
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  if (!task) return null;

  return (
    <div>
      <div className="mb-6 pt-4">
        <Link to="/app/tasks" className="inline-flex items-center text-neon-green hover:underline mb-4">
          <ArrowLeft size={16} className="mr-1" />
          Back to Tasks
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center">
            <div className="h-12 w-12 rounded-full bg-black border border-neon-green flex items-center justify-center mr-4">
              <Clock size={24} className="text-neon-green" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-secondary">Task Details</h1>
              <div className="flex items-center mt-1 space-x-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                  {task.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
                  {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button 
              onClick={() => setIsEditing(true)}
              className="bg-black hover:bg-black/90 text-neon-green font-medium py-2 px-4 rounded-md border border-neon-green"
            >
              <Edit size={16} className="inline mr-2" />
              Edit Task
            </button>
            <button 
              onClick={() => setIsDeleting(true)}
              className="border border-red-500 text-red-500 hover:bg-red-50 font-medium py-2 px-4 rounded-md"
            >
              <Trash2 size={16} className="inline mr-2" />
              Delete
            </button>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        {isEditing ? (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-secondary mb-4">Edit Task</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green"
                ></textarea>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <input
                  type="datetime-local"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parameters (JSON)
                </label>
                <textarea
                  value={formData.parameters}
                  onChange={(e) => setFormData({...formData, parameters: e.target.value})}
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green font-mono text-sm"
                ></textarea>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-black hover:bg-black/90 text-neon-green rounded-md font-medium border border-neon-green"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Task Information</h3>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-700">Description</dt>
                    <dd className="mt-1 text-sm text-gray-900">{task.description}</dd>
                  </div>
                  
                  <div>
                    <dt className="text-sm font-medium text-gray-700">Assigned EVE™</dt>
                    <dd className="mt-1">
                      <Link to={`/app/eves/${task.eve_id}`} className="text-sm text-neon-green hover:underline">
                        {getEveName(task.eve_id)}
                      </Link>
                    </dd>
                  </div>
                  
                  <div>
                    <dt className="text-sm font-medium text-gray-700">Action</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {task.action_id ? (
                        <Link to={`/app/actions/${task.action_id}`} className="text-neon-green hover:underline">
                          {getActionName(task.action_id)}
                        </Link>
                      ) : (
                        'No specific action'
                      )}
                    </dd>
                  </div>
                  
                  <div>
                    <dt className="text-sm font-medium text-gray-700">Created</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(task.created_at).toLocaleString()}
                    </dd>
                  </div>
                </dl>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Task Details</h3>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-700">Status</dt>
                    <dd className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                        {task.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      </span>
                    </dd>
                  </div>
                  
                  <div>
                    <dt className="text-sm font-medium text-gray-700">Priority</dt>
                    <dd className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                      </span>
                    </dd>
                  </div>
                  
                  <div>
                    <dt className="text-sm font-medium text-gray-700">Due Date</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {task.due_date ? new Date(task.due_date).toLocaleString() : 'No deadline set'}
                    </dd>
                  </div>
                  
                  {task.parameters && Object.keys(task.parameters).length > 0 && (
                    <div>
                      <dt className="text-sm font-medium text-gray-700">Parameters</dt>
                      <dd className="mt-1">
                        <pre className="text-sm bg-gray-50 p-3 rounded-md overflow-x-auto">
                          {JSON.stringify(task.parameters, null, 2)}
                        </pre>
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Delete confirmation modal */}
      {isDeleting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <AlertCircle className="text-red-500 mr-2" size={24} />
              <h3 className="text-lg font-medium text-gray-900">Delete Task</h3>
            </div>
            <p className="text-sm text-gray-700 mb-4">
              Are you sure you want to delete this task? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsDeleting(false)}
                className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TaskDetails;