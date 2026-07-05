# Clara - Your Personal AI Productivity Agent

Clara is an intelligent productivity agent designed to help you manage tasks, avoid overwhelm, stay motivated, and resist distractions. V1 focuses on smart task management, anti-overwhelm strategies, and motivational support.

## Features

### V1 (Current)
- **Smart Task Management** - Create, organize, and prioritize your tasks
- **Anti-Overwhelm** - Clara shows you only 3-5 most important tasks daily
- **Motivation & Guidance** - Get encouragement and task scaffolding when you need it
- **Distraction Detection** - Gentle redirection when you're tempted by social media
- **Support Me Button** - Get help when demotivated:
  - Task breakdown into smaller steps
  - Break suggestions that keep you on track
  - Breathing guides for calm focus
  - Momentum reset to get back on track

### V2 (Planned)
- Reminders and notifications
- Calendar & email integration
- Gamification and streaks
- Life purpose reflection
- Stress management tools
- Analytics and insights

## Tech Stack

- **Frontend:** React + TypeScript + Tailwind CSS + Vite
- **Backend:** Node.js/Express
- **Database:** SQLite (local-first)
- **AI Agent:** Claude API via Anthropic SDK
- **Mobile:** Responsive web design (native mobile coming later)

## Quick Start

### Setup

1. Clone and enter the repository:
```bash
cd /home/user/Amplify
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```
Then add your Anthropic API key to `.env.local`:
```
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

4. Initialize the database:
```bash
npm run db:migrate
```

5. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Project Structure

```
clara/
├── src/
│   ├── types/           # TypeScript type definitions
│   ├── db/              # Database schema, repositories
│   ├── agent/           # Claude agent integration
│   ├── core/            # Business logic (prioritization, distraction, etc.)
│   ├── ui/              # React components
│   ├── App.tsx          # Main app component
│   └── main.tsx         # React entry point
├── public/              # Static assets
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Key Concepts

### Task Prioritization
Clara uses a smart algorithm that ranks tasks based on:
- **Priority level** (critical > high > medium > low)
- **Due date** (overdue tasks get highest score)
- **Effort estimate** (quick wins get boosted)

### Smart Presentation
Instead of showing all tasks, Clara follows progressive disclosure:
1. Show only your top 3-5 tasks for the day
2. Let users request more when they're ready
3. Filter by status to reduce cognitive load

### Support Me Button
When you're struggling, the Support Me button offers:
- **Breakdown** - Agent breaks your current task into 2-3 micro-steps
- **Break** - Suggests a 2-5 min healthy break (not social media)
- **Breathing** - Guided box breathing to calm your mind
- **Momentum** - Identifies one tiny next action to restart

### Distraction Detection
Clara detects social media URLs (configurable) and offers supportive redirection:
- Acknowledges the impulse
- Reminds you of your current task
- Suggests a structured break later

## Database

The database uses SQLite with the following main tables:
- `users` - User profiles
- `tasks` - Task records
- `subtasks` - Breakdown of larger tasks
- `work_sessions` - Track focused work periods
- `support_sessions` - Track when users use Support Me
- `user_stats` - Aggregate statistics

## Testing

Run the test suite:
```bash
npm test
```

Run tests with UI:
```bash
npm run test:ui
```

## Building

Build for production:
```bash
npm run build
npm run preview
```

## Contributing

This is a personal project by Aditi Luthra. For questions or suggestions, reach out!

## License

MIT
