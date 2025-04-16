# Inbound Logistics Platform (ILP)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)

## 📋 Overview

The Inbound Logistics Platform (ILP) is a comprehensive web application designed to streamline and optimize inbound logistics operations. The platform enables efficient management of truck entries, dock scheduling, transporter collaboration, weigh bridge operations, and shift handovers.

### 🌟 Key Features

- **Truck Entry Management**: Efficiently record and manage incoming truck details
- **Dock Management**: Optimize dock assignments and scheduling
- **Transporter Collaboration**: Seamless communication with transport partners
- **Weigh Bridge Integration**: Automated weight recording and verification
- **Shift Handover**: Smooth transition between operational shifts
- **User Authentication**: Secure login and role-based access control
- **Dashboard Analytics**: Real-time visibility of logistics operations

## 🚀 Getting Started

### Prerequisites

- Node.js (v18.x or higher)
- npm (v9.x or higher) or Bun

### Installation

1. Clone the repository:
   ```sh
   git clone <repository-url>
   cd ilp
   ```

2. Install dependencies:
   ```sh
   npm install
   # or with Bun
   bun install
   ```

3. Set up environment variables:
   - Create a `.env` file based on the provided `.env.example`
   - Add your Firebase or other service credentials

4. Start the development server:
   ```sh
   npm run dev
   # or with Bun
   bun run dev
   ```

5. Open [http://localhost:5173](http://localhost:5173) in your browser.

## 🏗️ Project Structure

```
ilp/
├── public/           # Static assets
├── src/
│   ├── components/   # Reusable UI components
│   ├── contexts/     # React contexts for state management
│   ├── hooks/        # Custom React hooks
│   ├── lib/          # Utility functions and services
│   ├── pages/        # Application pages
│   ├── App.tsx       # Main application component
│   └── main.tsx      # Application entry point
├── .env              # Environment variables
├── package.json      # Project dependencies and scripts
└── vite.config.ts    # Vite configuration
```

## 🛠️ Tech Stack

- **Frontend Framework**: React with TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **UI Components**: shadcn/ui (Radix UI)
- **Styling**: Tailwind CSS
- **State Management**: React Context API, React Query
- **Forms**: React Hook Form with Zod validation
- **Authentication**: Firebase Authentication
- **Notifications**: Sonner, React Toast

## 📝 Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build for production
- `npm run build:dev` - Build for development/staging
- `npm run lint` - Run ESLint for code quality checks
- `npm run preview` - Preview the production build locally

## 🔐 Authentication

The application uses Firebase Authentication for user management. The `AuthProvider` context in `src/contexts/AuthContext.tsx` handles:

- User registration
- User login
- Password reset
- Authentication state persistence
- Role-based access control

## 🌐 Deployment

### Build for Production

```sh
npm run build
```

The build artifacts will be stored in the `dist/` directory.

### Deployment Options

1. **Lovable Platform**: 
   - Open [Lovable](https://lovable.dev/projects/2e9441d1-28a5-40c8-bb95-a007b58ddd75)
   - Click on Share -> Publish

2. **Manual Deployment**:
   - Deploy the `dist/` directory to your preferred hosting platform (Vercel, Netlify, Firebase Hosting, etc.)

## 🧪 Testing

The project is set up for testing with the following technologies:
- Unit testing with Vitest
- Component testing with React Testing Library
- End-to-end testing with Playwright

To run tests:
```sh
npm run test        # Run unit and component tests
npm run test:e2e    # Run end-to-end tests
```

## 📚 Documentation

Additional documentation is available in the `docs/` directory:
- API Documentation
- User Guide
- Developer Guide
- Architecture Documentation

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📧 Contact

Project Link: [https://github.com/yourusername/ilp](https://github.com/yourusername/ilp)

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) - For the amazing UI components
- [Tailwind CSS](https://tailwindcss.com/) - For the utility-first CSS framework
- [Vite](https://vitejs.dev/) - For the lightning-fast build tool
- [Firebase](https://firebase.google.com/) - For authentication and backend services
