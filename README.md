# maverika eve™ platform

![maverika eve platform](https://res.cloudinary.com/dkb6nc8tk/image/upload/v1740656617/vv9njdtgliwdbufvqcq9.png)

## Enterprise Virtual Employees™

maverika eve™ platform is a multi-tenant system for managing intelligent virtual employees powered by AI. The platform enables companies to automate repetitive tasks through configurable virtual employees that can interact with external systems, make decisions, and collaborate with each other.

## Key Features

- **Virtual Employee Management**: Create, configure, and monitor intelligent EVEs™
- **Actions Repository**: Centralized library of actions that EVEs can perform
- **AI-Powered Intelligence**: Natural language understanding and autonomous decision making
- **Multi-Agent Collaboration**: EVEs can delegate tasks and collaborate on complex workflows
- **Activity Monitoring**: Comprehensive logging and tracking of all EVE activities
- **Multi-Tenancy**: Secure isolation between different company accounts

## Technology Stack

- **Frontend**: React, TailwindCSS
- **Backend**: Netlify Functions (Serverless)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI**: OpenAI API

## Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn
- Supabase account
- OpenAI API key

### Installation

1. Clone the repository
```
git clone https://github.com/maverika/eve-platform.git
cd eve-platform
```

2. Install dependencies
```
npm install
```

3. Create a `.env` file based on `.env.example`
```
cp .env.example .env
```

4. Update the `.env` file with your Supabase and OpenAI credentials

5. Start the development server
```
npm run dev
```

The app will be available at `http://localhost:5173`

## Deployment

The application is configured for deployment on Netlify:

1. Connect your GitHub repository to Netlify
2. Configure the environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `VITE_OPENAI_API_KEY`
   - `OPENAI_API_KEY`
3. Deploy!

## Architecture

The maverika EVE™ Platform uses a modern architecture built around serverless functions and a cloud database:

- **React Frontend**: Single-page application with client-side routing
- **Netlify Functions**: Serverless functions for backend logic, including OpenAI API integration
- **Supabase Database**: PostgreSQL database with row-level security for multi-tenancy
- **Authentication**: Supabase Auth for user management and authentication

## License

Copyright © 2025 maverika, Inc. All rights reserved.