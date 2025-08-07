# InsightUBC Frontend

This is the frontend application for InsightUBC, built with React, TypeScript, and Vite.

## Environment Setup

### Google Maps API Key

The application uses Google Maps for displaying campus buildings and rooms. To set up the Google Maps API key:

1. Create a `.env` file in the frontend directory
2. Add your Google Maps API key:

```bash
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

**Note:** The Google Maps API key is loaded from environment variables to avoid hardcoding sensitive credentials in the source code. This follows security best practices.

### Getting a Google Maps API Key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Maps JavaScript API
4. Create credentials (API key)
5. Restrict the API key to your domain for security

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## Building for Production

```bash
# Build the application
npm run build

# Preview the build
npm run preview
``` 