/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Trash2, Calendar as CalendarIcon, Clock, CheckCircle2, Circle, AlertCircle, Filter, Trash, Search, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, isToday, isFuture, parseISO, isPast, isSameDay } from 'date-fns';
import { toast, Toaster } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Task, FilterType } from './types';

const STORAGE_KEY = 'taskflow_tasks';

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<FilterType>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '',
    description: '',
    dueDate: new Date().toISOString(),
    completed: false,
  });

  // Load tasks from local storage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setTasks(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse tasks', e);
      }
    }
  }, []);

  // Save tasks to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  // Reminder System: Check every minute
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      tasks.forEach(task => {
        if (!task.completed && task.reminderTime) {
          const reminder = parseISO(task.reminderTime);
          // Check if reminder is in the last minute and hasn't been notified (we could add a notified flag)
          // For simplicity in this demo, we'll just check if it's very close
          const diff = now.getTime() - reminder.getTime();
          if (diff >= 0 && diff < 60000) {
            toast.info(`Reminder: ${task.title}`, {
              description: task.description || 'Task is due now!',
              duration: 10000,
            });
          }
        }
      });
    }, 60000);

    return () => clearInterval(interval);
  }, [tasks]);

  const addTask = () => {
    if (!newTask.title) {
      toast.error('Task title is required');
      return;
    }

    const task: Task = {
      id: crypto.randomUUID(),
      title: newTask.title,
      description: newTask.description,
      completed: false,
      dueDate: newTask.dueDate || new Date().toISOString(),
      reminderTime: newTask.reminderTime,
      createdAt: new Date().toISOString(),
    };

    setTasks(prev => [task, ...prev]);
    setNewTask({ title: '', description: '', dueDate: new Date().toISOString() });
    setIsAddingTask(false);
    toast.success('Task added successfully');
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    toast.success('Task deleted');
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           task.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;

      const date = parseISO(task.dueDate);
      
      switch (filter) {
        case 'today':
          return isToday(date);
        case 'upcoming':
          return isFuture(date) && !isToday(date);
        case 'completed':
          return task.completed;
        default:
          return true;
      }
    }).sort((a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime());
  }, [tasks, filter, searchQuery]);

  const stats = useMemo(() => {
    const today = tasks.filter(t => isToday(parseISO(t.dueDate)));
    return {
      todayCount: today.length,
      todayCompleted: today.filter(t => t.completed).length,
      totalPending: tasks.filter(t => !t.completed).length
    };
  }, [tasks]);

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#1a1a1a] font-sans selection:bg-primary selection:text-primary-foreground">
      <Toaster position="top-center" richColors />
      
      <div className="max-w-2xl mx-auto px-4 py-12 md:py-20">
        {/* Header */}
        <header className="mb-12 space-y-4">
          <div className="flex items-center justify-between">
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-1"
            >
              <h1 className="text-4xl font-bold tracking-tight">TaskFlow</h1>
              <p className="text-muted-foreground">{format(new Date(), 'EEEE, MMMM do')}</p>
            </motion.div>
            <Button variant="outline" size="icon" className="rounded-full">
              <Settings className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4">
            <Card className="bg-white/50 backdrop-blur-sm border-none shadow-sm">
              <CardContent className="p-4 text-center">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Today</p>
                <p className="text-2xl font-bold">{stats.todayCount}</p>
              </CardContent>
            </Card>
            <Card className="bg-white/50 backdrop-blur-sm border-none shadow-sm">
              <CardContent className="p-4 text-center">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Done</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.todayCount > 0 ? Math.round((stats.todayCompleted / stats.todayCount) * 100) : 0}%
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white/50 backdrop-blur-sm border-none shadow-sm">
              <CardContent className="p-4 text-center">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Pending</p>
                <p className="text-2xl font-bold text-orange-600">{stats.totalPending}</p>
              </CardContent>
            </Card>
          </div>
          
          {stats.todayCount > 0 && (
            <div className="w-full bg-black/5 h-1 rounded-full mt-6 overflow-hidden">
              <motion.div 
                className="bg-primary h-full"
                initial={{ width: 0 }}
                animate={{ width: `${(stats.todayCompleted / stats.todayCount) * 100}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          )}
        </header>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search tasks..." 
              className="pl-10 h-11 bg-white border-none shadow-sm rounded-xl focus-visible:ring-1"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Dialog open={isAddingTask} onOpenChange={setIsAddingTask}>
            <DialogTrigger asChild>
              <Button className="h-11 px-6 rounded-xl shadow-md gap-2 font-medium bg-primary hover:bg-primary/90 transition-all active:scale-95">
                <Plus className="w-5 h-5" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-2xl">
              <DialogHeader>
                <DialogTitle>New Task</DialogTitle>
                <DialogDescription>
                  What needs to be done?
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Title</Label>
                  <Input 
                    id="title" 
                    placeholder="E.g., Morning workout" 
                    value={newTask.title}
                    onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Input 
                    id="description" 
                    placeholder="Details..." 
                    value={newTask.description}
                    onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Due Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {newTask.dueDate ? format(parseISO(newTask.dueDate), 'PPP') : <span>Pick date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={newTask.dueDate ? parseISO(newTask.dueDate) : undefined}
                          onSelect={(date) => setNewTask(prev => ({ ...prev, dueDate: date?.toISOString() }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="grid gap-2">
                    <Label>Reminder Time</Label>
                    <Input 
                      type="time" 
                      onChange={(e) => {
                        const time = e.target.value;
                        if (time && newTask.dueDate) {
                          const date = parseISO(newTask.dueDate);
                          const [hours, minutes] = time.split(':');
                          date.setHours(parseInt(hours), parseInt(minutes));
                          setNewTask(prev => ({ ...prev, reminderTime: date.toISOString() }));
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={addTask} className="w-full">Create Task</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tabs / Filters */}
        <div className="flex items-center justify-between gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none">
          <div className="flex items-center gap-2">
            {(['today', 'upcoming', 'all', 'completed'] as FilterType[]).map((f) => (
              <Button
                key={f}
                variant={filter === f ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  "rounded-full px-4 capitalize transition-all",
                  filter === f && "shadow-sm"
                )}
                onClick={() => setFilter(f)}
              >
                {f}
              </Button>
            ))}
          </div>
          {tasks.some(t => t.completed) && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs text-muted-foreground hover:text-destructive shrink-0"
              onClick={() => {
                setTasks(prev => prev.filter(t => !t.completed));
                toast.success('Completed tasks cleared');
              }}
            >
              Clear Completed
            </Button>
          )}
        </div>

        {/* Task List */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout" initial={false}>
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task) => (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className={cn(
                    "group overflow-hidden border-none shadow-sm transition-all hover:shadow-md bg-white",
                    task.completed && "opacity-60"
                  )}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <Checkbox 
                          checked={task.completed} 
                          onCheckedChange={() => toggleTask(task.id)}
                          className="h-6 w-6 rounded-full border-2"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={cn(
                          "font-semibold text-lg truncate",
                          task.completed && "line-through text-muted-foreground"
                        )}>
                          {task.title}
                        </h3>
                        {task.description && (
                          <p className="text-sm text-muted-foreground truncate">{task.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1">
                          <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70">
                            <CalendarIcon className="w-3 h-3" />
                            {isToday(parseISO(task.dueDate)) ? 'Today' : format(parseISO(task.dueDate), 'MMM d')}
                          </span>
                          {task.reminderTime && (
                            <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-primary/70">
                              <Clock className="w-3 h-3" />
                              {format(parseISO(task.reminderTime), 'p')}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => deleteTask(task.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20 flex flex-col items-center justify-center space-y-4"
              >
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-medium">All caught up!</p>
                  <p className="text-sm text-muted-foreground">No tasks found for this view.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
