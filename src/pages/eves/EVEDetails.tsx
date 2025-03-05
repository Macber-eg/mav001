import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Activity, Settings, Zap, FileText, Edit, 
  AlertCircle, Plus, Trash2, Brain, Book 
} from 'lucide-react';
import { useEVEStore } from '../../stores/eveStore';
import { useActionStore } from '../../stores/actionStore';
import { useLogStore } from '../../stores/logStore';
import { EVE, Action, Log } from '../../types/database.types';
import { EVEChat } from '../../components/eves/EVEChat';
import { EVETaskCreator } from '../../components/eves/EVETaskCreator';
import { EVEVoiceSettings } from '../../components/eves/EVEVoiceSettings';
import EVEVoiceControls from '../../components/eves/EVEVoiceControls';
import EVEVoiceTest from '../../components/eves/EVEVoiceTest';
import EVEMemoryManager from '../../components/eves/EVEMemoryManager';
import { KnowledgeManager } from '../../components/knowledge/KnowledgeManager';

function EVEDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  
  const { getEVE, updateEVE, deleteEVE, isLoading: eveLoading, error: eveError } = useEVEStore();
  const { actions, fetchActions, getEVEActions, assignActionToEVE, removeActionFromEVE, isLoading: actionLoading } = useActionStore();
  const { fetchEVELogs, isLoading: logLoading, error: logError } = useLogStore();
  
  const [eve, setEve] = useState<EVE | null>(null);
  const [eveActions, setEveActions] = useState<Action[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [availableActions, setAvailableActions] = useState<Action[]>([]);
  const [selectedActionId, setSelectedActionId] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: '',
    workingHours: '',
    language: '',
    processingPriority: '',
    responseTime: ''
  });

  useEffect(() => {
    if (id) {
      const loadEVE = async () => {
        const eveData = await getEVE(id);
        if (eveData) {
          setEve(eveData);
          setFormData({
            name: eveData.name,
            description: eveData.description || '',
            status: eveData.status,
            workingHours: eveData.settings?.workingHours || '',
            language: eveData.settings?.language || '',
            processingPriority: eveData.settings?.processingPriority || '',
            responseTime: eveData.settings?.responseTime || ''
          });
        }
      };
      loadEVE();
    }
  }, [id, getEVE]);

  useEffect(() => {
    if (id) {
      const loadActions = async () => {
        await fetchActions();
        const eveActionsList = await getEVEActions(id);
        setEveActions(eveActionsList);
      };
      loadActions();
    }
  }, [id, fetchActions, getEVEActions]);

  useEffect(() => {
    if (id) {
      const loadLogs = async () => {
        const logsList = await fetchEVELogs(id);
        setLogs(logsList);
      };
      loadLogs();
    }
  }, [id, fetchEVELogs]);

  useEffect(() => {
    if (actions && eveActions) {
      const availableActionsList = actions.filter(
        action => !eveActions.some(eveAction => eveAction.id === action.id)
      );
      setAvailableActions(availableActionsList);
    }
  }, [actions, eveActions]);

  const handleAssignAction = async () => {
    if (id && selectedActionId) {
      await assignActionToEVE(id, selectedActionId);
      const updatedEVEActions = await getEVEActions(id);
      setEveActions(updatedEVEActions);
      setSelectedActionId('');
    }
  };

  const handleRemoveAction = async (actionId: string) => {
    if (id) {
      await removeActionFromEVE(id, actionId);
      const updatedEVEActions = await getEVEActions(id);
      setEveActions(updatedEVEActions);
    }
  };

  const handleUpdateEVE = async () => {
    if (id && eve) {
      const updatedEVE = {
        ...eve,
        name: formData.name,
        description: formData.description,
        status: formData.status,
        settings: {
          ...eve.settings,
          workingHours: formData.workingHours,
          language: formData.language,
          processingPriority: formData.processingPriority,
          responseTime: formData.responseTime
        }
      };
      await updateEVE(id, updatedEVE);
      setIsEditing(false);
      setEve(updatedEVE);
    }
  };

  const handleDeleteEVE = async () => {
    if (id) {
      await deleteEVE(id);
      navigate('/eves');
    }
  };

  const handleTaskCreated = () => {
    if (id) {
      fetchEVELogs(id).then(logsList => setLogs(logsList));
    }
  };

  if (eveLoading || actionLoading || logLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading EVE details...</p>
        </div>
      </div>
    );
  }

  if (eveError || logError) {
    return (
      <div className="bg-red-900/20 border border-red-800 text-red-300 px-6 py-4 rounded-lg">
        <div className="flex items-start">
          <AlertCircle size={24} className="mr-3 mt-0.5" />
          <div>
            <h3 className="font-medium text-lg">Error loading EVE</h3>
            <p>{eveError || logError}</p>
            <Link to="/eves" className="mt-3 inline-block text-primary hover:underline">
              Return to EVEs list
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!eve) return null;

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              to="/eves"
              className="text-gray-400 hover:text-primary"
            >
              <ArrowLeft size={24} />
            </Link>
            <h1 className="text-2xl font-bold text-white">
              {eve?.name || 'EVE Details'}
            </h1>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center px-3 py-2 text-sm font-medium bg-black/50 text-gray-300 border border-dark-border rounded-md hover:bg-black/30"
            >
              <Edit size={16} className="mr-1" />
              Edit
            </button>
            <button
              onClick={() => setIsDeleting(true)}
              className="flex items-center px-3 py-2 text-sm font-medium bg-red-900/20 text-red-300 border border-red-800 rounded-md hover:bg-red-900/30"
            >
              <Trash2 size={16} className="mr-1" />
              Delete
            </button>
          </div>
        </div>
      </div>
      
      <div className="bg-dark-surface rounded-lg shadow-md border border-dark-border overflow-hidden mb-6">
        <div className="border-b border-dark-border">
          <nav className="flex overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-400 hover:text-primary'
              }`}
            >
              <Activity size={16} className="inline mr-1" />
              Overview
            </button>
            
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
                activeTab === 'chat'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-400 hover:text-primary'
              }`}
            >
              <FileText size={16} className="inline mr-1" />
              Chat
            </button>
            
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
                activeTab === 'tasks'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-400 hover:text-primary'
              }`}
            >
              <Zap size={16} className="inline mr-1" />
              Tasks
            </button>
            
            <button
              onClick={() => setActiveTab('voice')}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
                activeTab === 'voice'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-400 hover:text-primary'
              }`}
            >
              <Settings size={16} className="inline mr-1" />
              Voice
            </button>
            
            <button
              onClick={() => setActiveTab('memory')}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
                activeTab === 'memory'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-400 hover:text-primary'
              }`}
            >
              <Brain size={16} className="inline mr-1" />
              Memory
            </button>

            <button
              onClick={() => setActiveTab('knowledge')}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
                activeTab === 'knowledge'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-400 hover:text-primary'
              }`}
            >
              <Book size={16} className="inline mr-1" />
              Knowledge Base
            </button>
          </nav>
        </div>
        
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1 block w-full bg-black/50 border border-dark-border text-white rounded-md focus:border-primary focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="mt-1 block w-full bg-black/50 border border-dark-border text-white rounded-md focus:border-primary focus:ring-primary"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 text-sm font-medium bg-gray-800 text-gray-300 rounded-md hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdateEVE}
                      className="px-4 py-2 text-sm font-medium bg-black text-primary rounded-md hover:bg-black/90 border border-primary"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-medium text-white">EVE Information</h3>
                  <div className="mt-4 space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-400">Name</h4>
                      <p className="mt-1 text-sm text-white">{eve?.name}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-400">Description</h4>
                      <p className="mt-1 text-sm text-white">{eve?.description || 'No description provided'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-400">Status</h4>
                      <p className="mt-1 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          eve?.status === 'active' ? 'bg-success/20 text-success' :
                          eve?.status === 'error' ? 'bg-error/20 text-error' :
                          eve?.status === 'training' ? 'bg-info/20 text-info' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {eve?.status.charAt(0).toUpperCase() + eve?.status.slice(1)}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'chat' && eve && (
            <EVEChat eve={eve} />
          )}
          
          {activeTab === 'tasks' && eve && (
            <div className="space-y-6">
              <EVETaskCreator 
                eve={eve} 
                availableActions={eveActions} 
                onTaskCreated={handleTaskCreated}
              />
              
              {logs.filter(log => log.event_type === 'TASK_CREATED').length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-medium text-white mb-4">Recent Tasks</h3>
                  <div className="space-y-4">
                    {logs
                      .filter(log => log.event_type === 'TASK_CREATED')
                      .slice(0, 5)
                      .map(log => (
                        <div key={log.id} className="bg-black/20 p-4 rounded-lg border border-dark-border">
                          <div className="flex justify-between">
                            <div>
                              <p className="font-medium text-white">{log.message}</p>
                              <p className="text-sm text-gray-400 mt-1">
                                Created: {new Date(log.created_at).toLocaleString()}
                              </p>
                            </div>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              log.status === 'success' ? 'bg-success/20 text-success' :
                              log.status === 'error' ? 'bg-error/20 text-error' :
                              'bg-warning/20 text-warning'
                            }`}>
                              {log.status}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'voice' && eve && (
            <div className="space-y-6">
              <EVEVoiceSettings eve={eve} />
              <EVEVoiceControls eve={eve} />
              <EVEVoiceTest eve={eve} />
            </div>
          )}
          
          {activeTab === 'memory' && eve && (
            <EVEMemoryManager eve={eve} />
          )}

          {activeTab === 'knowledge' && eve && (
            <div>
              <KnowledgeManager 
                eve={eve} 
                companyId={eve.company_id}
              />
            </div>
          )}
        </div>
      </div>
      
      {isDeleting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-surface p-6 rounded-lg max-w-sm w-full border border-dark-border">
            <div className="flex items-center mb-4">
              <AlertCircle className="text-error mr-2" size={24} />
              <h3 className="text-lg font-medium text-white">Delete EVE</h3>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Are you sure you want to delete this EVE? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsDeleting(false)}
                className="px-4 py-2 text-sm font-medium bg-gray-800 text-gray-300 rounded-md hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEVE}
                className="px-4 py-2 text-sm font-medium bg-red-900/20 text-red-300 rounded-md hover:bg-red-900/30 border border-red-800"
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

export default EVEDetails;