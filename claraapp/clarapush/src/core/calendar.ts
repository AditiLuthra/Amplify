import { Task, LOCATION_LABELS } from '../types/index.js';

/**
 * Generate and download an .ics calendar event for a task.
 * Works with Google Calendar, Apple Calendar, and Outlook — no login required.
 */

function toICSDate(iso: string): string {
  // 2026-07-05T14:00 -> 20260705T140000
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  );
}

function escapeICS(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export function taskToICS(task: Task): string {
  const start = task.scheduledAt ? new Date(task.scheduledAt) : new Date();
  const durationMin = task.estimatedMinutes || 25;
  const end = new Date(start.getTime() + durationMin * 60 * 1000);

  const descParts: string[] = [];
  if (task.firstStep) descParts.push(`First step: ${task.firstStep}`);
  if (task.location) descParts.push(`Where: ${LOCATION_LABELS[task.location]}`);
  descParts.push('Planned with Clara ✨');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Clara//Productivity//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${task.id}@clara`,
    `DTSTAMP:${toICSDate(new Date().toISOString())}`,
    `DTSTART:${toICSDate(start.toISOString())}`,
    `DTEND:${toICSDate(end.toISOString())}`,
    `SUMMARY:${escapeICS(task.title)}`,
    `DESCRIPTION:${escapeICS(descParts.join('\n'))}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT10M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeICS(task.title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.join('\r\n');
}

export function downloadTaskCalendar(task: Task): void {
  const ics = taskToICS(task);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${task.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 40) || 'task'}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
