import React, { useState, useEffect } from 'react';
import { Task, UserProfile } from './types/index.js';
import { DailyStandup, SupportMeButton, WorkSession, DistractionModal } from './ui/components/index.js';
import { useTasks, useAgent, useNotifications } from './ui/hooks/index.js';
import { claraClient } from './api/client.js';
import './ui/globals.css';

type AppState = 'loading' | 'standup' | 'task-detail' | 'work-session' | 'error';

function App() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [distraction, setDistraction] = useState<{ appName: string; message: string } | null>(null);
  const [supportMessage, setSupportMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { tasks, fetchTasks, createTask, updateTask, completeTask } = useTasks();
  const { messages, loading: agentLoading, sendMessage } = useAgent();
  const { requestPermission, isEnabled, sendNotification, startTaskSession, endTaskSession } = useNotifications();

  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check if user exists in localStorage
        const savedUserId = localStorage.getItem('claraUserId');

        if (savedUserId) {
          const userData = await claraClient.getUser(savedUserId);
          setUser(userData);
          claraClient.setUserId(savedUserId);
        } else {
          // Create new user
          const newUser = await claraClient.createUser(
            'aditi.luthra95@gmail.com',
            'Aditi'
          );
          setUser(newUser);
          localStorage.setItem('claraUserId', newUser.id);
        }

        // Fetch tasks
        await fetchTasks();
        setAppState('standup');

        // Request notification permission
        await requestPermission();
      } catch (err) {
        setError((err as any).message);
        setAppState('error');
      }
    };

    initializeApp();
  }, [requestPermission, fetchTasks]);

  const handleTaskSelect = (task: Task) => {
    setSelectedTask(task);
    setAppState('task-detail');
  };

  const handleStartSession = async (task: Task) => {
    // Update task status to in-progress
    await updateTask(task.id, { status: 'in-progress' });
    setSelectedTask(task);
    setAppState('work-session');
    // Start activity tracking for this task
    startTaskSession(task.title);
  };

  const handleSessionEnd = async (completed: boolean, notes?: string) => {
    // Stop activity tracking
    endTaskSession();

    if (selectedTask) {
      if (completed) {
        await completeTask(selectedTask.id, notes);
        setSupportMessage('🎉 Awesome work! You completed another task. Keep it up!');
        // Send success notification with task info
        if (isEnabled()) {
          const remainingTasks = tasks.filter(t => t.status !== 'completed' && t.id !== selectedTask.id).length;
          await sendNotification('success', {
            taskTitle: selectedTask.title,
            tasksCompleted: 1,
            tasksRemaining: remainingTasks,
          });
        }
        setTimeout(() => {
          setSupportMessage(null);
          setSelectedTask(null);
          setAppState('standup');
          fetchTasks();
        }, 2000);
      } else {
        // Just update notes and go back
        await updateTask(selectedTask.id, { notes });
        setSelectedTask(null);
        setAppState('standup');
      }
    }
  };

  const handleSupportBreakdown = async () => {
    if (!selectedTask) return;

    try {
      const response = await sendMessage(
        `Please break down this task into smaller steps: "${selectedTask.title}". Just give me 2-3 concrete steps.`
      );
      setSupportMessage(response.response);
    } catch (err) {
      setSupportMessage('Sorry, I had trouble breaking that down. Try again?');
    }
  };

  const handleSupportBreak = async () => {
    try {
      const response = await sendMessage('Suggest a quick, healthy break I can take right now that won\'t derail my focus.');
      setSupportMessage(response.response);
    } catch (err) {
      setSupportMessage('Sorry, I had trouble suggesting a break.');
    }
  };

  const handleSupportBreathing = () => {
    setSupportMessage(
      'Box Breathing Guide:\n\n1. Breathe IN for 4 seconds\n2. HOLD for 4 seconds\n3. Breathe OUT for 4 seconds\n4. HOLD for 4 seconds\n\nRepeat 5 times. You\'ve got this! 🧘'
    );
  };

  const handleSupportMomentum = async () => {
    if (!selectedTask) return;

    try {
      const response = await sendMessage(
        `I'm feeling stuck on "${selectedTask.title}". What's ONE tiny next action I can take right now to get unstuck?`
      );
      setSupportMessage(response.response);
    } catch (err) {
      setSupportMessage('You\'ve got this! Just take one tiny step forward.');
    }
  };

  const handleAddTask = async (title: string, description?: string) => {
    try {
      await createTask({
        userId: user!.id,
        title,
        description,
        status: 'backlog',
        priority: 'medium',
        tags: [],
      });
      await fetchTasks();
    } catch (err) {
      setError((err as any).message);
    }
  };

  // Render states
  if (appState === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-primary text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🚀</div>
          <h1 className="text-3xl font-bold">Loading Clara...</h1>
          <p className="text-white/80 mt-2">Getting everything ready for you</p>
        </div>
      </div>
    );
  }

  if (appState === 'error') {
    return (
      <div className="min-h-screen bg-gradient-primary text-white flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-3xl font-bold">Oops!</h1>
          <p className="text-white/80 mt-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary mt-6"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  if (appState === 'work-session' && selectedTask) {
    return (
      <WorkSession
        task={selectedTask}
        sessionDuration={user?.preferences.workSessionDuration || 25}
        onSessionEnd={handleSessionEnd}
        onExit={() => {
          setSelectedTask(null);
          setAppState('standup');
        }}
      />
    );
  }

  if (appState === 'task-detail' && selectedTask) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          {/* Support Message Overlay */}
          {supportMessage && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-6">
              <div className="bg-white rounded-lg p-8 max-w-md w-full">
                <p className="text-gray-800 whitespace-pre-wrap mb-6">{supportMessage}</p>
                <button
                  onClick={() => setSupportMessage(null)}
                  className="btn-primary w-full"
                >
                  Got it! 💪
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => {
              setSelectedTask(null);
              setAppState('standup');
            }}
            className="mb-6 text-indigo-600 hover:text-indigo-700 font-medium"
          >
            ← Back
          </button>

          <div className="card">
            <h1 className="text-3xl font-bold mb-4">{selectedTask.title}</h1>
            {selectedTask.description && (
              <p className="text-gray-600 mb-6">{selectedTask.description}</p>
            )}

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Priority</div>
                <div className="text-lg font-semibold capitalize">{selectedTask.priority}</div>
              </div>
              {selectedTask.estimatedMinutes && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Est. Time</div>
                  <div className="text-lg font-semibold">~{selectedTask.estimatedMinutes} min</div>
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => handleStartSession(selectedTask)}
                className="btn-primary flex-1"
              >
                Start Work Session
              </button>
              <button
                onClick={() => completeTask(selectedTask.id).then(() => {
                  setSelectedTask(null);
                  setAppState('standup');
                  fetchTasks();
                })}
                className="btn-secondary flex-1"
              >
                Mark Complete
              </button>
            </div>
          </div>
        </div>

        <SupportMeButton
          currentTask={selectedTask}
          onBreakdown={handleSupportBreakdown}
          onBreakSuggestion={handleSupportBreak}
          onBreathing={handleSupportBreathing}
          onMomentumReset={handleSupportMomentum}
        />
      </div>
    );
  }

  // Default: Standup view
  return (
    <div>
      <DailyStandup
        tasks={tasks}
        userName={user?.name}
        onTaskSelect={handleTaskSelect}
        onTaskComplete={(taskId) => completeTask(taskId).then(() => fetchTasks())}
        onStartSession={handleStartSession}
      />

      {/* Quick Add Task */}
      <div className="fixed bottom-6 left-6 z-40">
        <button
          onClick={() => {
            const title = prompt('Task title:');
            if (title) {
              handleAddTask(title);
            }
          }}
          className="btn-primary rounded-full w-14 h-14 flex items-center justify-center shadow-lg text-xl"
          title="Add Task"
        >
          +
        </button>
      </div>
    </div>
  );
}

export default App;
