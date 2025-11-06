# Ghana Election Platform

A secure, mobile-first digital voting platform designed for Ghana's unique needs. The system features SMS-based OTP authentication and a multi-step voting process.

## Features

### Authentication System

- **Phone Number Verification**: Users enter their Ghana phone number
- **OTP Verification**: 6-digit SMS verification code
- **Session Management**: Persistent authentication with cookies and localStorage
- **Mobile-First Design**: Optimized for mobile devices

### Voting Process

- **Multi-Step Voting**: Step-by-step voting for different positions
- **Position Management**:
  - Required positions (President, Vice President)
  - Optional positions (Secretary, Treasurer, Organizing Secretary, PRO)
- **Skip Functionality**: Users can skip optional positions
- **Navigation**: Move forward/backward between positions
- **Vote Review**: Final review before submission
- **Progress Tracking**: Visual progress indicator

### Security Features

- **OTP Authentication**: SMS-based verification
- **Session Protection**: Middleware-based route protection
- **Vote Validation**: Required vs. optional position handling

## System Structure

```
web/
├── app/
│   ├── login/           # Authentication page
│   ├── vote/            # Multi-step voting process
│   ├── admin/           # Admin portal (future)
│   ├── layout.tsx       # Root layout with providers
│   └── page.tsx         # Protected home page
├── components/          # UI components
├── lib/
│   └── auth-context.tsx # Authentication context
├── middleware.ts        # Route protection
└── package.json
```

## Authentication Flow

1. **Home Page Access**: Requires authentication
2. **Login Redirect**: Unauthenticated users → `/login`
3. **Phone Input**: User enters Ghana phone number
4. **OTP Request**: System sends 6-digit code via SMS
5. **OTP Verification**: User enters received code
6. **Authentication**: Verified users → `/vote`

## Voting Flow

1. **Position Selection**: Step-by-step voting for each position
2. **Candidate Choice**: Radio button selection for each candidate
3. **Skip Option**: Optional positions can be skipped
4. **Navigation**: Previous/Next buttons with validation
5. **Vote Review**: Summary of all selections
6. **Submission**: Final vote submission and logout

## Technical Implementation

### Authentication Context

- React Context for state management
- localStorage for persistence
- Cookies for middleware authentication
- Session validation and logout functionality

### Route Protection

- Next.js middleware for server-side protection
- Client-side authentication checks
- Automatic redirects for unauthenticated users

### Mobile-First Design

- Responsive UI components
- Touch-friendly interactions
- Optimized for small screens

## Getting Started

1. **Install Dependencies**:

   ```bash
   npm install
   ```

2. **Run Development Server**:

   ```bash
   npm run dev
   ```

3. **Access the Application**:
   - Open `http://localhost:3000`
   - You'll be redirected to `/login`
   - Enter any Ghana phone number format
   - Enter any 6-digit OTP code
   - Access the voting system

## Demo Credentials

For testing purposes:

- **Phone Number**: Any valid Ghana format (e.g., +233 XX XXX XXXX)
- **OTP**: Any 6-digit number (e.g., 123456)

## Future Enhancements

- **Admin Portal**: Election management and results
- **Real SMS Integration**: Actual OTP delivery
- **Backend API**: Database and server-side logic
- **Real-time Updates**: Live election results
- **Audit Trail**: Comprehensive voting logs

## Security Notes

This is a demonstration system. In production:

- Implement real SMS OTP services
- Add rate limiting and brute force protection
- Use secure session management
- Implement proper database security
- Add audit logging and monitoring

# Voting Web App

## API Client Setup

This project uses [Orval](https://orval.dev/) to automatically generate TypeScript types and React Query hooks from your OpenAPI/Swagger specification.

### Configuration

- **Orval Config**: `orval.config.js` - Points to `../api/openapi.yaml`
- **Output**: Generated files are placed in `lib/api/` with tag-based splitting
- **Custom Axios**: Uses a custom axios instance with auth interceptors and environment-based base URL

### Environment Variables

Create a `.env.local` file in your project root:

```bash
# Development
NEXT_PUBLIC_API_URL=http://localhost:4000

# Production
NEXT_PUBLIC_API_URL=https://your-api-domain.com
```

### Available Scripts

```bash
# Generate API client once
npm run orval

# Watch for changes and regenerate automatically
npm run orval:watch
```

### Usage Example

```tsx
import { usePostAuthLogin } from '@/lib/api/auth/auth';

function LoginForm() {
  const loginMutation = usePostAuthLogin();

  const handleSubmit = (data: LoginFormData) => {
    loginMutation.mutate({ data });
  };

  return (
    <form onSubmit={handleSubmit}>{/* Your form fields */}</form>
  );
}
```

### Features

- ✅ Automatic TypeScript types from OpenAPI spec
- ✅ React Query hooks for all API endpoints
- ✅ Environment-based API URLs
- ✅ Automatic auth token handling
- ✅ Token refresh on 401 responses
- ✅ Tag-based API organization

### File Structure

```
lib/
├── api-client.ts          # Custom axios instance with interceptors
├── auth.ts               # Auth utilities and interceptors
└── api/                  # Generated API client
    ├── auth/             # Authentication endpoints
    ├── elections/        # Election management
    ├── voting/           # Voting operations
    └── ...               # Other API tags
```
