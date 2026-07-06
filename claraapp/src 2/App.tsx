import React, { useState, useEffect } from 'react';
import { Task, UserProfile, LOCATION_LABELS } from './types/index.js';
import {
  DailyStandup,
  SupportMeButton,
  WorkSession,
  AddTaskModal,
  WaitingForList,
  BreathingGuide,
  TaskBreakdownModal,
} from './ui/components/index.js';
import { useTasks, useAgent, useNotifications } from './ui/hooks/index.js';
import { claraClient } from './api/client.js';
import { TaskReminderScheduler } from './core/notifications.js';
import { downloadTaskCalendar } from './core/calendar.js';
import './ui/globals.css';

type AppState = 'loading' | 'standup' | 'waiting' | 'task-detail' | 'work-session' | 'error';

function App() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [supportMessage, setSupportMessage] = useState<string | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [suggestingStep, setSuggestingStep] = useState(false);
  const [showBreathing, setShowBreathing] = useState(false);
  const [breakdownSteps, setBreakdownSteps] = useState<string[] | null>(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { tasks, fetchTasks, createTask, updateTask, completeTask } = useTasks();
  const { sendMessage } = useAgent();
  const { requestPermission, isEnabled, sendNotification, startTaskSession, endTaskSession } = useNotifications();

  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const savedUserId = localStorage.getItem('claraUserId');
        if (savedUserId) {
          const userData = await claraClient.getUser(savedUserId);
          setUser(userData);
          claraClient.setUserId(savedUserId);
        } else {
          const newUser = await claraClient.createUser('aditi.luthra95@gmail.com', 'Aditi');
          setUser(newUser);
          localStorage.setItem('claraUserId', newUser.id);
        }
        await fetchTasks();
        setAppState('standup');
        await requestPermission();
      } catch (err) {
        setError((err as any).message);
        setAppState('error');
      }
    };
    initializeApp();
  }, [requestPermission, fetchTasks]);

  // Re-arm if-then reminders whenever tasks change
  useEffect(() => {
    TaskReminderScheduler.schedule(
      tasks.map((t) => ({
        title: t.title,
        status: t.status,
        scheduledAt: t.scheduledAt,
        firstStep: t.firstStep,
        locationLabel: t.location ? LOCATION_LABELS[t.location] : undefined,
      }))
    );
  }, [tasks]);

  const handleTaskSelect = (task: Task) => {
    setSelectedTask(task);
    setAppState('task-detail');
  };

  const handleStartSession = async (task: Task) => {
    await updateTask(task.id, { status: 'in-progress' });
    setSelectedTask(task);
    setAppState('work-session');
    startTaskSession(task.title);
  };

  const handleSessionEnd = async (completed: boolean, notes?: string, nextStep?: string) => {
    endTaskSession();
    if (selectedTask) {
      if (completed) {
        await completeTask(selectedTask.id, notes);
        setSupportMessage('🎉 Awesome work! You completed another task. Keep it up!');
        if (isEnabled()) {
          const remainingTasks = tasks.filter((t) => t.status !== 'completed' && t.id !== selectedTask.id).length;
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
        // Save notes + the captured next tiny step so re-entry is easy
        await updateTask(selectedTask.id, { notes, nextStep: nextStep || selectedTask.nextStep });
        setSelectedTask(null);
        setAppState('standup');
        fetchTasks();
      }
    }
  };

  const handleSupportBreakdown = async () => {
    if (!selectedTask) return;
    setBreakdownLoading(true);
    try {
      const response = await sendMessage(
        `Break this task into 3-5 small, concrete steps: "${selectedTask.title}". Reply with ONLY the steps, one per line, no numbering, no preamble.`
      );
      const steps = response.response
        .split('\n')
        .map((s) => s.replace(/^[\s\-*\d.)\]]+/, '').trim())
        .filter((s) => s.length > 1)
        .slice(0, 6);
      if (steps.length > 0) {
        setBreakdownSteps(steps);
      } else {
        setSupportMessage(response.response);
      }
    } catch (err) {
      setSupportMessage('Sorry, I had trouble breaking that down. Try again?');
    } finally {
      setBreakdownLoading(false);
    }
  };

  const handleBreakdownAdd = async (selected: string[]) => {
    if (!selectedTask || !user) return;
    for (const step of selected) {
      await createTask({
        userId: user.id,
        title: step,
        status: 'backlog',
        priority: selectedTask.priority,
        tags: [],
        location: selectedTask.location,
        parentTaskId: selectedTask.id,
      });
    }
    setBreakdownSteps(null);
    await fetchTasks();
    setSupportMessage(`Added ${selected.length} step${selected.length === 1 ? '' : 's'} to your list! 🎯`);
  };

  const handleSupportBreak = async () => {
    try {
      const response = await sendMessage(
        "Suggest a quick, healthy break I can take right now that won't derail my focus."
      );
      setSupportMessage(response.response);
    } catch (err) {
      setSupportMessage('Sorry, I had trouble suggesting a break.');
    }
  };

  const handleSupportBreathing = () => {
    setShowBreathing(true);
  };

  const handleSupportMomentum = async () => {
    if (!selectedTask) return;
    try {
      const response = await sendMessage(
        `I'm feeling stuck on "${selectedTask.title}". What's ONE tiny next action I can take right now to get unstuck?`
      );
      setSupportMessage(response.response);
    } catch (err) {
      setSupportMessage("You've got this! Just take one tiny step forward.");
    }
  };

  const handleAddTask = async (partial: Partial<Task>, addToCalendar?: boolean) => {
    try {
      const created = await createTask({
        userId: user!.id,
        title: partial.title || 'Untitled',
        description: partial.description,
        status: partial.status || 'backlog',
        priority: partial.priority || 'medium',
        tags: [],
        location: partial.location,
        scheduledAt: partial.scheduledAt,
        firstStep: partial.firstStep,
        estimatedMinutes: partial.estimatedMinutes,
        waitingOn: partial.waitingOn,
      });
      if (addToCalendar && created?.scheduledAt) {
        downloadTaskCalendar(created);
      }
      await fetchTasks();
      setShowAddTask(false);
    } catch (err) {
      setError((err as any).message);
    }
  };

  const handleSuggestFirstStep = async () => {
    if (!selectedTask) return;
    setSuggestingStep(true);
    try {
      const response = await sendMessage(
        `Give me ONE tiny, concrete 2-minute first step to start this task: "${selectedTask.title}". Reply with just the step as one short sentence, no preamble.`
      );
      const step = response.response.trim();
      await updateTask(selectedTask.id, { firstStep: step });
      setSelectedTask({ ...selectedTask, firstStep: step });
      await fetchTasks();
    } catch (err) {
      setSupportMessage("I couldn't suggest a step right now — try writing the smallest possible first action yourself.");
    } finally {
      setSuggestingStep(false);
    }
  };

  const handleResolveWaiting = async (taskId: string) => {
    await completeTask(taskId);
    await fetchTasks();
  };

  const handleActivateWaiting = async (taskId: string) => {
    await updateTask(taskId, { status: 'backlog' });
    await fetchTasks();
  };

  // Bottom navigation shown on the two main lists
  const BottomNav = () => {
    const waitingCount = tasks.filter((t) => t.status === 'waiting').length;
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-center justify-around px-4 py-2 z-40 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <button
          onClick={() => setAppState('standup')}
          className={`flex flex-col items-center text-xs px-4 py-1 ${appState === 'standup' ? 'text-clara-primary font-semibold' : 'text-gray-500'}`}
        >
          <span className="text-xl">📋</span>
          Today
        </button>
        <button
          onClick={() => setShowAddTask(true)}
          className="btn-primary rounded-full w-14 h-14 flex items-center justify-center shadow-lg text-2xl -mt-6"
          title="Add Task"
        >
          +
        </button>
        <button
          onClick={() => setAppState('waiting')}
          className={`relative flex flex-col items-center text-xs px-4 py-1 ${appState === 'waiting' ? 'text-clara-primary font-semibold' : 'text-gray-500'}`}
        >
          <span className="text-xl">⏳</span>
          Waiting
          {waitingCount > 0 && (
            <span className="absolute top-0 right-1 bg-clara-secondary text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
              {waitingCount}
            </span>
          )}
        </button>
      </div>
    );
  };

  // Global overlays reachable from the Support button (task detail + work session)
  const overlays = (
    <>
      {breakdownLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[75]">
          <div className="bg-white rounded-lg px-6 py-4 text-gray-700 font-medium">Breaking it down…</div>
        </div>
      )}
      {breakdownSteps && selectedTask && (
        <TaskBreakdownModal
          taskTitle={selectedTask.title}
          steps={breakdownSteps}
          onClose={() => setBreakdownSteps(null)}
          onAdd={handleBreakdownAdd}
        />
      )}
      {showBreathing && <BreathingGuide onClose={() => setShowBreathing(false)} />}
    </>
  );

  // ---- Render states ----
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
          <button onClick={() => window.location.reload()} className="btn-primary mt-6">
            Reload
          </button>
        </div>
      </div>
    );
  }

  if (appState === 'work-session' && selectedTask) {
    return (
      <>
        {supportMessage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-6">
            <div className="bg-white rounded-lg p-8 max-w-md w-full">
              <p className="text-gray-800 whitespace-pre-wrap mb-6">{supportMessage}</p>
              <button onClick={() => setSupportMessage(null)} className="btn-primary w-full">
                Got it! 💪
              </button>
            </div>
          </div>
        )}
        <WorkSession
          task={selectedTask}
          sessionDuration={user?.preferences.workSessionDuration || 25}
          onSessionEnd={handleSessionEnd}
          onExit={() => {
            setSelectedTask(null);
            setAppState('standup');
          }}
          onBreakdown={handleSupportBreakdown}
          onBreakSuggestion={handleSupportBreak}
          onBreathing={handleSupportBreathing}
          onMomentumReset={handleSupportMomentum}
        />
        {overlays}
      </>
    );
  }

  if (appState === 'task-detail' && selectedTask) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          {supportMessage && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-6">
              <div className="bg-white rounded-lg p-8 max-w-md w-full">
                <p className="text-gray-800 whitespace-pre-wrap mb-6">{supportMessage}</p>
                <button onClick={() => setSupportMessage(null)} className="btn-primary w-full">
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
            {selectedTask.description && <p className="text-gray-600 mb-6">{selectedTask.description}</p>}

            <div className="flex flex-wrap gap-2 mb-6">
              {selectedTask.scheduledAt && (
                <span className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded-full">
                  ⏰ {new Date(selectedTask.scheduledAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </span>
              )}
              {selectedTask.location && (
                <span className="text-sm bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">
                  {LOCATION_LABELS[selectedTask.location]}
                </span>
              )}
              <span className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full capitalize">
                {selectedTask.priority}
              </span>
              {selectedTask.estimatedMinutes && (
                <span className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                  ~{selectedTask.estimatedMinutes} min
                </span>
              )}
            </div>

            {/* First step (task-initiation helper) */}
            <div className="bg-indigo-50 rounded-lg p-4 mb-6">
              <div className="text-sm font-semibold text-clara-primary mb-1">👉 Tiny first step</div>
              {selectedTask.firstStep ? (
                <p className="text-gray-800">{selectedTask.firstStep}</p>
              ) : (
                <p className="text-gray-500 text-sm mb-2">The smallest action that gets you moving.</p>
              )}
              <button
                onClick={handleSuggestFirstStep}
                disabled={suggestingStep}
                className="text-sm text-clara-primary font-medium mt-2 disabled:opacity-50"
              >
                {suggestingStep ? 'Thinking…' : selectedTask.firstStep ? '↻ Suggest another' : '✨ Suggest a first step'}
              </button>
            </div>

            {selectedTask.nextStep && (
              <div className="bg-amber-50 rounded-lg p-4 mb-6">
                <div className="text-sm font-semibold text-amber-700 mb-1">↩ Pick up where you left off</div>
                <p className="text-gray-800">{selectedTask.nextStep}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button onClick={() => handleStartSession(selectedTask)} className="btn-primary flex-1 min-w-[45%]">
                Start Work Session
              </button>
              <button
                onClick={() =>
                  completeTask(selectedTask.id).then(() => {
                    setSelectedTask(null);
                    setAppState('standup');
                    fetchTasks();
                  })
                }
                className="btn-secondary flex-1 min-w-[45%]"
              >
                Mark Complete
              </button>
              <button
                onClick={() => downloadTaskCalendar(selectedTask)}
                className="btn-secondary flex-1 min-w-[45%]"
                title="Download a calendar event (Google, Apple, Outlook)"
              >
                📅 Add to Calendar
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
        {overlays}
      </div>
    );
  }

  if (appState === 'waiting') {
    return (
      <div className="pb-24">
        <WaitingForList tasks={tasks} onResolve={handleResolveWaiting} onActivate={handleActivateWaiting} />
        <BottomNav />
        {showAddTask && <AddTaskModal onClose={() => setShowAddTask(false)} onAdd={handleAddTask} />}
      </div>
    );
  }

  // Default: Standup view
  return (
    <div className="pb-24">
      <DailyStandup
        tasks={tasks.filter((t) => t.status !== 'waiting')}
        userName={user?.name}
        onTaskSelect={handleTaskSelect}
        onTaskComplete={(taskId) => completeTask(taskId).then(() => fetchTasks())}
        onStartSession={handleStartSession}
        onAddTask={() => setShowAddTask(true)}
      />
      <BottomNav />
      {showAddTask && <AddTaskModal onClose={() => setShowAddTask(false)} onAdd={handleAddTask} />}
    </div>
  );
}

export default App;
