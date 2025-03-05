import { create } from 'zustand';
import supabase from '../lib/supabase';
import { Workflow, WorkflowStep, WorkflowExecution } from '../types/database.types';

interface WorkflowState {
  workflows: Workflow[];
  activeWorkflow: Workflow | null;
  executions: WorkflowExecution[];
  isLoading: boolean;
  error: string | null;
  
  // Workflow management
  fetchWorkflows: () => Promise<void>;
  getWorkflow: (id: string) => Promise<Workflow | null>;
  createWorkflow: (workflowData: Partial<Workflow>) => Promise<Workflow | null>;
  updateWorkflow: (id: string, workflowData: Partial<Workflow>) => Promise<Workflow | null>;
  deleteWorkflow: (id: string) => Promise<void>;
  
  // Step management
  addStep: (workflowId: string, stepData: Partial<WorkflowStep>) => Promise<WorkflowStep | null>;
  updateStep: (workflowId: string, stepId: string, stepData: Partial<WorkflowStep>) => Promise<WorkflowStep | null>;
  deleteStep: (workflowId: string, stepId: string) => Promise<void>;
  
  // Workflow execution
  executeWorkflow: (workflowId: string, initialData?: Record<string, any>) => Promise<WorkflowExecution | null>;
  getExecutions: (workflowId: string) => Promise<WorkflowExecution[]>;
  cancelExecution: (executionId: string) => Promise<void>;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflows: [],
  activeWorkflow: null,
  executions: [],
  isLoading: false,
  error: null,
  
  fetchWorkflows: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();
      
      if (!userData) throw new Error('User data not found');
      
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('company_id', userData.company_id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      set({ workflows: data as Workflow[] });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },
  
  getWorkflow: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('workflows')
        .select(`
          *,
          steps:workflow_steps(*)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      set({ activeWorkflow: data as Workflow });
      return data as Workflow;
    } catch (error: any) {
      set({ error: error.message });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
  
  createWorkflow: async (workflowData: Partial<Workflow>) => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();
      
      if (!userData) throw new Error('User data not found');
      
      const { data, error } = await supabase
        .from('workflows')
        .insert([{
          ...workflowData,
          company_id: userData.company_id,
          status: workflowData.status || 'draft'
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      const newWorkflow = data as Workflow;
      set(state => ({ workflows: [newWorkflow, ...state.workflows] }));
      return newWorkflow;
    } catch (error: any) {
      set({ error: error.message });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
  
  updateWorkflow: async (id: string, workflowData: Partial<Workflow>) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('workflows')
        .update(workflowData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      const updatedWorkflow = data as Workflow;
      set(state => ({
        workflows: state.workflows.map(w => 
          w.id === id ? updatedWorkflow : w
        ),
        activeWorkflow: updatedWorkflow
      }));
      return updatedWorkflow;
    } catch (error: any) {
      set({ error: error.message });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
  
  deleteWorkflow: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('workflows')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      set(state => ({
        workflows: state.workflows.filter(w => w.id !== id),
        activeWorkflow: state.activeWorkflow?.id === id ? null : state.activeWorkflow
      }));
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },
  
  addStep: async (workflowId: string, stepData: Partial<WorkflowStep>) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('workflow_steps')
        .insert([{
          ...stepData,
          workflow_id: workflowId
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      const newStep = data as WorkflowStep;
      
      // Update active workflow if loaded
      const { activeWorkflow } = get();
      if (activeWorkflow && activeWorkflow.id === workflowId) {
        set({
          activeWorkflow: {
            ...activeWorkflow,
            steps: [...activeWorkflow.steps, newStep]
          }
        });
      }
      
      return newStep;
    } catch (error: any) {
      set({ error: error.message });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
  
  updateStep: async (workflowId: string, stepId: string, stepData: Partial<WorkflowStep>) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('workflow_steps')
        .update(stepData)
        .eq('id', stepId)
        .eq('workflow_id', workflowId)
        .select()
        .single();
      
      if (error) throw error;
      
      const updatedStep = data as WorkflowStep;
      
      // Update active workflow if loaded
      const { activeWorkflow } = get();
      if (activeWorkflow && activeWorkflow.id === workflowId) {
        set({
          activeWorkflow: {
            ...activeWorkflow,
            steps: activeWorkflow.steps.map(s => 
              s.id === stepId ? updatedStep : s
            )
          }
        });
      }
      
      return updatedStep;
    } catch (error: any) {
      set({ error: error.message });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
  
  deleteStep: async (workflowId: string, stepId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('workflow_steps')
        .delete()
        .eq('id', stepId)
        .eq('workflow_id', workflowId);
      
      if (error) throw error;
      
      // Update active workflow if loaded
      const { activeWorkflow } = get();
      if (activeWorkflow && activeWorkflow.id === workflowId) {
        set({
          activeWorkflow: {
            ...activeWorkflow,
            steps: activeWorkflow.steps.filter(s => s.id !== stepId)
          }
        });
      }
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },
  
  executeWorkflow: async (workflowId: string, initialData?: Record<string, any>) => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();
      
      if (!userData) throw new Error('User data not found');
      
      // Create execution record
      const { data, error } = await supabase
        .from('workflow_executions')
        .insert([{
          workflow_id: workflowId,
          company_id: userData.company_id,
          status: 'running',
          results: initialData || {},
          started_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      const execution = data as WorkflowExecution;
      set(state => ({ executions: [execution, ...state.executions] }));
      
      // Start workflow execution in the background
      fetch('/api/workflow-execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          executionId: execution.id,
          workflowId,
          initialData
        })
      }).catch(console.error); // Non-blocking
      
      return execution;
    } catch (error: any) {
      set({ error: error.message });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
  
  getExecutions: async (workflowId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('workflow_executions')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('started_at', { ascending: false });
      
      if (error) throw error;
      
      const executions = data as WorkflowExecution[];
      set({ executions });
      return executions;
    } catch (error: any) {
      set({ error: error.message });
      return [];
    } finally {
      set({ isLoading: false });
    }
  },
  
  cancelExecution: async (executionId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('workflow_executions')
        .update({ 
          status: 'cancelled',
          completed_at: new Date().toISOString()
        })
        .eq('id', executionId);
      
      if (error) throw error;
      
      set(state => ({
        executions: state.executions.map(e =>
          e.id === executionId 
            ? { ...e, status: 'cancelled', completed_at: new Date().toISOString() }
            : e
        )
      }));
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  }
}));