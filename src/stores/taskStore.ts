import { create } from 'zustand';
import supabase from '../lib/supabase';
import { Task } from '../types/database.types';

interface TaskState {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  fetchTasks: (eveId?: string) => Promise<Task[]>;
  getTask: (id: string) => Promise<Task | null>;
  createTask: (taskData: Partial<Task>) => Promise<Task | null>;
  updateTask: (id: string, taskData: Partial<Task>) => Promise<Task | null>;
  deleteTask: (id: string) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  isLoading: false,
  error: null,
  
  fetchTasks: async (eveId) => {
    set({ isLoading: true, error: null });
    try {
      let query = supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (eveId) {
        query = query.eq('eve_id', eveId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        set({ error: `Failed to fetch tasks: ${error.message}` });
        throw error;
      }
      
      const tasks = data as Task[];
      set({ tasks: eveId ? tasks : tasks });
      return tasks;
    } catch (error: any) {
      set({ error: error.message });
      return [];
    } finally {
      set({ isLoading: false });
    }
  },
  
  getTask: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) {
        set({ error: `Failed to fetch task: ${error.message}` });
        throw error;
      }
      
      if (!data) {
        set({ error: 'Task not found' });
        return null;
      }
      
      return data as Task;
    } catch (error: any) {
      set({ error: error.message });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
  
  createTask: async (taskData: Partial<Task>) => {
    set({ isLoading: true, error: null });
    try {
      // Get the user's company_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();
      
      if (userError) {
        set({ error: `Failed to fetch user data: ${userError.message}` });
        throw userError;
      }
      
      if (!userData) {
        throw new Error('User record not found');
      }
      
      // Create the task
      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          ...taskData,
          company_id: userData.company_id,
          status: taskData.status || 'pending'
        }])
        .select()
        .single();
      
      if (error) {
        set({ error: `Failed to create task: ${error.message}` });
        throw error;
      }
      
      // Update the store
      const { tasks } = get();
      set({ tasks: [data as Task, ...tasks] });
      
      return data as Task;
    } catch (error: any) {
      set({ error: error.message });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
  
  updateTask: async (id: string, taskData: Partial<Task>) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update(taskData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        set({ error: `Failed to update task: ${error.message}` });
        throw error;
      }
      
      // Update the store
      const { tasks } = get();
      set({ 
        tasks: tasks.map(task => 
          task.id === id ? { ...task, ...data } as Task : task
        ) 
      });
      
      return data as Task;
    } catch (error: any) {
      set({ error: error.message });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
  
  deleteTask: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);
      
      if (error) {
        set({ error: `Failed to delete task: ${error.message}` });
        throw error;
      }
      
      // Update the store
      const { tasks } = get();
      set({ tasks: tasks.filter(task => task.id !== id) });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  }
}));