# 🚆 TransitMind

A React Native mobile application that helps users track and manage their public transit journeys in the Boston area using the MBTA API.

## Features

- 📍 Find nearby MBTA stops
- 🚌 View real-time departure information
- 🗺️ Plan transit trips
- 📊 Track your transit history
- ♿ Accessibility information for stops

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (for Mac) or Android Studio (for Android development)
- API Keys:
  - MBTA API key (get one at [MBTA Developer Portal](https://api-v3.mbta.com/))
  - OpenRouteService API key (get one at [OpenRouteService](https://openrouteservice.org/))
  - Google Maps API key (get one at [Google Cloud Console](https://console.cloud.google.com/))

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/TransitMind.git
cd TransitMind
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

4. Add your API keys to the `.env` file:
```
MBTA_API_KEY=your_mbta_api_key_here
OPENROUTE_API_KEY=your_openroute_api_key_here
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

## Environment Setup

### Required API Keys

1. **MBTA API Key**
   - Visit [MBTA Developer Portal](https://api-v3.mbta.com/)
   - Sign up for a developer account
   - Create a new API key
   - Add the key to your `.env` file as `MBTA_API_KEY`

2. **OpenRouteService API Key**
   - Visit [OpenRouteService](https://openrouteservice.org/)
   - Create a free account
   - Generate an API key
   - Add the key to your `.env` file as `OPENROUTE_API_KEY`

3. **Google Maps API Key**
   - Visit [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project
   - Enable Maps SDK for Android/iOS
   - Create credentials (API key)
   - Add the key to your `.env` file as `GOOGLE_MAPS_API_KEY`

### Environment Files

- `.env`: Contains your actual API keys (DO NOT commit this file)
- `.env.example`: Template file showing required environment variables (safe to commit)

## Running the App

### Development

```bash
npx expo start
```

This will start the Expo development server. You can then:
- Press `i` to open in iOS simulator
- Press `a` to open in Android emulator
- Scan the QR code with your phone (using Expo Go app) to run on your device

### Building for Production

```bash
npm run build
```

## Project Structure

```
TransitMind/
├── assets/           # Static assets (images, fonts)
├── components/       # React components
│   ├── TripHistory.js
│   └── TripLogger.js
├── utils/           # Utility functions
│   ├── database.js
│   └── MBTAService.js
├── App.js           # Main application component
├── app.json         # Expo configuration
└── package.json     # Project dependencies
```

## API Integration

The app uses multiple APIs for comprehensive transit data:

1. **MBTA API v3**
   - Finding nearby stops
   - Getting real-time departure information
   - Route information and trip planning
   - Accessibility information

2. **OpenRouteService API**
   - Route optimization
   - Alternative routes
   - Distance calculations

3. **Google Maps API**
   - Map visualization
   - Geocoding
   - Location services

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- MBTA for providing the transit API
- OpenRouteService for routing capabilities
- Google Maps for mapping services
- Expo team for the amazing React Native development platform
- React Native community for the excellent documentation and support 