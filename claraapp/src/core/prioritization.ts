import { Task } from '../types/index.js';

export interface PrioritizationScore {
  taskId: string;
  title: string;
  score: number;
  reasons: string[];
}

export class TaskPrioritizer {
  /**
   * Score tasks based on priority level, due date, and effort estimate
   * Returns tasks ranked by importance
   */
  prioritizeTasks(tasks: Task[], dailyLimit: number = 5): Task[] {
    const scoredTasks = tasks
      .filter(t => t.status !== 'completed' && t.status !== 'archived')
      .map(task => ({
        task,
        score: this.calculateScore(task),
      }))
      .sort((a, b) => b.score - a.score);

    return scoredTasks.slice(0, dailyLimit).map(st => st.task);
  }

  /**
   * Get detailed scoring breakdown for debugging
   */
  getScoreBreakdown(tasks: Task[]): PrioritizationScore[] {
    return tasks
      .filter(t => t.status !== 'completed' && t.status !== 'archived')
      .map(task => {
        const reasons: string[] = [];
        let score = 0;

        // Priority weight (0-40 points)
        const priorityWeights = { critical: 40, high: 30, medium: 15, low: 5 };
        const priorityScore = priorityWeights[task.priority] || 0;
        score += priorityScore;
        reasons.push(`Priority: ${task.priority} (+${priorityScore})`);

        // Due date urgency (0-40 points)
        if (task.dueDate) {
          const daysUntilDue = this.daysUntilDue(task.dueDate);
          let dueDateScore = 0;

          if (daysUntilDue < 0) {
            dueDateScore = 40; // Overdue
            reasons.push(`Overdue (+${dueDateScore})`);
          } else if (daysUntilDue === 0) {
            dueDateScore = 40; // Due today
            reasons.push(`Due today (+${dueDateScore})`);
          } else if (daysUntilDue === 1) {
            dueDateScore = 35; // Due tomorrow
            reasons.push(`Due tomorrow (+${dueDateScore})`);
          } else if (daysUntilDue <= 3) {
            dueDateScore = 25; // Due this week
            reasons.push(`Due soon (+${dueDateScore})`);
          } else if (daysUntilDue <= 7) {
            dueDateScore = 15; // Due next week
            reasons.push(`Due next week (+${dueDateScore})`);
          } else {
            dueDateScore = 5; // Due later
            reasons.push(`Due later (+${dueDateScore})`);
          }
          score += dueDateScore;
        }

        // Effort estimate (0-20 points) - small tasks get slight boost
        if (task.estimatedMinutes) {
          let effortScore = 0;
          if (task.estimatedMinutes <= 15) {
            effortScore = 15; // Quick wins
            reasons.push(`Quick win: ~${task.estimatedMinutes} min (+${effortScore})`);
          } else if (task.estimatedMinutes <= 30) {
            effortScore = 10;
            reasons.push(`Manageable: ~${task.estimatedMinutes} min (+${effortScore})`);
          } else {
            effortScore = 5;
            reasons.push(`Larger task: ~${task.estimatedMinutes} min (+${effortScore})`);
          }
          score += effortScore;
        }

        return {
          taskId: task.id,
          title: task.title,
          score: Math.round(score),
          reasons,
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  private calculateScore(task: Task): number {
    let score = 0;

    // Priority weight
    const priorityWeights = { critical: 40, high: 30, medium: 15, low: 5 };
    score += priorityWeights[task.priority] || 0;

    // Due date urgency
    if (task.dueDate) {
      const daysUntilDue = this.daysUntilDue(task.dueDate);
      if (daysUntilDue < 0) score += 40;
      else if (daysUntilDue === 0) score += 40;
      else if (daysUntilDue === 1) score += 35;
      else if (daysUntilDue <= 3) score += 25;
      else if (daysUntilDue <= 7) score += 15;
      else score += 5;
    }

    // Effort estimate - quick wins get a boost
    if (task.estimatedMinutes) {
      if (task.estimatedMinutes <= 15) score += 15;
      else if (task.estimatedMinutes <= 30) score += 10;
      else score += 5;
    }

    return score;
  }

  private daysUntilDue(dueDate: string): number {
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    return Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }
}
