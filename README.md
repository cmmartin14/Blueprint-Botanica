# 🌼 Blueprint Botanica 🌼 [![Main](https://github.com/cmmartin14/Blueprint-Botanica/actions/workflows/main.yml/badge.svg)](https://github.com/cmmartin14/Blueprint-Botanica/actions/workflows/main.yml)

<div align="center">

# 🌱 Blueprint Botanica

**Design your dream garden with confidence**

Blueprint Botanica is a digital garden planning tool that helps gardeners experiment with and plan their gardens using an intuitive visual interface.

[Try it Live](https://blueprint-botanica.vercel.app/) · [Report Bug](../../issues) · [Request Feature](../../issues)

![Blueprint Botanica Screenshot](./app-screenshot.png)

</div>

---

## Features

### Visual Garden Designer
- **Custom Garden Beds**: Draw and arrange garden beds in any shape you need
- **Drag & Drop Interface**: Easily place and move plants within your garden layout
- **Interactive Canvas**: Zoom, pan, and design your perfect garden space

### Smart Plant Library
- **Comprehensive Database**: Access detailed information about thousands of plants
- **Plant Details**: View hardiness zones, watering needs, sun requirements, and more
- **Live API Integration**: Real-time plant data from trusted horticultural sources

### Additional Tools
- **Garden Calendar**: Plan and track your planting schedule
- **Plant Search**: Quickly find plants that match your needs
- **Weather Integration**: Location-based weather information for your garden
- **User Accounts**: Save and manage multiple garden projects

---

## Getting Started

### Try It Out

Visit [blueprint-botanica.vercel.app](https://blueprint-botanica.vercel.app/) to start planning your garden right away!

### Run Locally

#### Prerequisites

- Node.js 18 or higher
- PostgreSQL database (we recommend [Neon](https://neon.tech) for serverless)
- npm or yarn

#### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/[your-username]/Blueprint-Botanica.git
   cd Blueprint-Botanica/client
   ```

2. **Install dependencies**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the `client` directory:
   ```bash
   # Authentication (Stack Auth)
   NEXT_PUBLIC_STACK_PROJECT_ID=your_project_id
   NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=your_publishable_key
   STACK_SECRET_SERVER_KEY=your_secret_key

   # Database
   DATABASE_URL=postgresql://user:password@host:5432/database

   # APIs
   PERENUAL_KEY=your_perenual_api_key
   OPENWEATHER_API_KEY=your_openweather_key

   # Cache (Upstash Redis)
   UPSTASH_REDIS_REST_URL=your_redis_url
   UPSTASH_REDIS_REST_TOKEN=your_redis_token
   ```

4. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

---

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) with App Router
- **Language**: TypeScript
- **Database**: PostgreSQL with [Prisma ORM](https://www.prisma.io/)
- **Hosting**: [Vercel](https://vercel.com/)
- **Authentication**: [Stack Auth](https://stack-auth.com/)
- **Styling**: Tailwind CSS
- **Caching**: Upstash Redis
- **APIs**: 
  - [Perenual](https://perenual.com/) - Plant database
  - [OpenWeather](https://openweathermap.org/) - Weather data

---

## Project Structure

```
Blueprint-Botanica/
├── client/                    # Main application
│   ├── src/
│   │   ├── app/              # Next.js app router pages
│   │   ├── components/       # React components
│   │   ├── actions/          # Server actions
│   │   ├── lib/              # Utilities and helpers
│   │   └── tests/            # Test files
│   ├── prisma/
│   │   └── schema.prisma     # Database schema
│   ├── public/               # Static assets
│   └── package.json
└── .github/
    └── workflows/            # CI/CD workflows
```

---

## Running Tests

### Unit Tests (Vitest)
```bash
npm run test
```

### Type Checking
```bash
npm run type-check
```

### Linting
```bash
npm run lint
```

### End-to-End Tests (Playwright)
```bash
npx playwright test
```

---

## 🤝 Contributing

Contributions are welcome! This is a learning project, and we appreciate any help or suggestions.

### Development Workflow

- Follow the existing code style
- Write tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR

---

## API Keys & Setup

### Required API Keys

1. **Perenual API** (Plant Database)
   - Sign up at [perenual.com](https://perenual.com/)
   - Free tier available

2. **OpenWeather API** (Weather Data)
   - Sign up at [openweathermap.org](https://openweathermap.org/)
   - Free tier available

3. **Stack Auth** (Authentication)
   - Sign up at [stack-auth.com](https://stack-auth.com/)
   - Configure your project

4. **Neon Database** (PostgreSQL)
   - Sign up at [neon.tech](https://neon.tech/)
   - Create a new project
   - Copy your connection string

5. **Upstash Redis** (Caching)
   - Sign up at [upstash.com](https://upstash.com/)
   - Create a Redis database
   - Copy REST URL and token

---

## 📄 License

This project is currently unlicensed. All rights reserved pending license selection.

---

## Acknowledgments

- **Plant Data**: [Perenual API](https://perenual.com/)
- **Weather Data**: [OpenWeather](https://openweathermap.org/)
- **USDA Hardiness Zones**: United States Department of Agriculture
- **Authentication**: [Stack Auth](https://stack-auth.com/)
- **Database Hosting**: [Neon](https://neon.tech/)
- **Deployment**: [Vercel](https://vercel.com/)

---

<div align="center">

**Built with 💚 for gardeners everywhere**

[⬆ Back to Top](#-blueprint-botanica)

</div>
