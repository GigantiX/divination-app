# Divination App

A modern, mobile-first dashboard application for managing advertising events, tracking leads, and analyzing campaign performance.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.3-38bdf8?logo=tailwindcss)
![License](https://img.shields.io/badge/License-Private-red)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Available Scripts](#available-scripts)
- [Branch Strategy](#branch-strategy)
- [Contributing](#contributing)

## Overview

Divination is an admin dashboard designed for managing advertising campaigns and events. It provides role-based access control, real-time analytics visualization, and comprehensive event management capabilities.

### Key Highlights

- 📱 **Mobile-First Design** - Optimized for mobile devices with responsive desktop support
- 🎨 **Modern UI/UX** - Clean, intuitive interface with smooth animations
- 📊 **Interactive Charts** - Chart.js integration for data visualization
- 🔐 **Role-Based Access** - Support for Admin, PIC, and Advertiser roles

## Features

### Authentication
- Login & Registration pages
- Password visibility toggle
- Form validation ready

### Dashboard
- Role-based event display (Active/Inactive)
- Event status toggle with confirmation modal
- Color-coded status indicators (Green: Active, Red: Inactive)
- Bottom navigation bar

### Event Management
- **Event Detail Page** with Overview and Reports tabs
- **Overview Tab:**
  - Stats Grid (Spend, Leads, Sales, CPL)
  - Dual-line Chart (Leads & Sales trends)
  - Advertiser performance cards
  - PIC list
- **Reports Tab:**
  - Daily report cards
  - Edit functionality
- Batch selector dropdown
- Create New Event form with image upload

## Tech Stack

| Technology | Purpose |
|------------|---------|
| [Next.js 16](https://nextjs.org/) | React framework with App Router |
| [TypeScript](https://www.typescriptlang.org/) | Type-safe JavaScript |
| [Tailwind CSS](https://tailwindcss.com/) | Utility-first CSS framework |
| [Chart.js](https://www.chartjs.org/) | Data visualization |
| [Lucide React](https://lucide.dev/) | Icon library |
| [Auth.js](https://authjs.dev/) | Authentication (planned) |

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm, yarn, or pnpm

### Installation

1. **Clone the repository**
   ```bash
   git clone git@github.com:GigantiX/divination-app.git
   cd divination-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:3000
   ```

### Environment Variables

Create a `.env.local` file in the root directory:

```env
# Auth.js (when implementing authentication)
AUTH_SECRET=your-secret-key

# Database (when integrating Supabase)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── dashboard/          # Main dashboard
│   ├── events/
│   │   ├── [id]/           # Event detail (dynamic route)
│   │   └── new/            # Create new event
│   ├── login/              # Authentication
│   ├── register/
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Root redirect
├── components/
│   └── ui/                 # Reusable UI components
│       ├── avatar.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── tabs.tsx
│       └── textarea.tsx
└── lib/
    └── utils.ts            # Utility functions (cn)
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Stable, production-ready code |
| `staging` | Development and testing |

### Workflow

1. **Development** → Push to `staging`
2. **Testing** → Test on staging branch
3. **Release** → Merge `staging` into `main`

```bash
# During development
git checkout staging
git add .
git commit -m "feat: add new feature"
git push

# When ready for release
git checkout main
git merge staging
git push
git checkout staging
```

## Contributing

1. Create a feature branch from `staging`
   ```bash
   git checkout staging
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit
   ```bash
   git add .
   git commit -m "feat: description of changes"
   ```

3. Push and create a Pull Request
   ```bash
   git push origin feature/your-feature-name
   ```

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

---

## Roadmap

- [ ] Backend integration with Supabase
- [ ] Authentication implementation
- [ ] New Report Modal
- [ ] People Management page
- [ ] Settings page
- [ ] Real-time data sync

---

Built with ❤️ using Next.js and Tailwind CSS
