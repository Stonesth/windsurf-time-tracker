# Time Tracker Backend

Backend API for the Time Tracker application, built with Node.js, Express, and Firebase Admin SDK.

## Project Structure

```
src/
├── config/         # Configuration files (Firebase, etc.)
├── controllers/    # Route controllers
├── middleware/     # Custom middleware
├── models/         # Data models
├── routes/         # API routes
├── services/       # Business logic
└── server.ts       # Main application file
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with the following variables:
```
PORT=3001
FIREBASE_DATABASE_URL=your-database-url
GOOGLE_APPLICATION_CREDENTIALS=path/to/your/service-account-key.json
```

3. Place your Firebase service account key file in a secure location and update the path in `.env`

## Development

Start the development server:
```bash
npm run dev
```

The server will restart automatically when you make changes.

## Build

Compile TypeScript to JavaScript:
```bash
npm run build
```

## Production

Start the production server:
```bash
npm start
```

## API Endpoints

### Health Check
- GET `/health` - Check if the server is running

More endpoints coming soon:
- Authentication
- Projects
- Time Entries
- Reports

## Security

- All routes will be protected with Firebase Authentication
- Environment variables are used for sensitive information
- CORS is enabled for the frontend application
