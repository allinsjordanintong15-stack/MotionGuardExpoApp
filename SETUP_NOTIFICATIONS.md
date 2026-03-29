# Motion Guard Dashboard Setup Guide

## Installation Steps

### 1. Install `expo-notifications` Package

If you encounter PowerShell execution policy issues, run one of these commands:

**Option A: Using npm directly via Command Prompt (CMD)**

```bash
npm install expo-notifications
```

**Option B: Using yarn**

```bash
yarn add expo-notifications
```

**Option C: Bypass PowerShell with Invoke-Expression**

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "npm install expo-notifications"
```

**Option D: Temporarily allow scripts in PowerShell**

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
npm install expo-notifications
```

### 2. Update package.json (Manual Alternative)

If npm install isn't working, add this to your `package.json` dependencies:

```json
"expo-notifications": "~0.27.0"
```

Then run `npm install` or `yarn install`

---

## Dashboard Features

### ✨ Key Features Implemented

1. **Real-time Motion Detection**
   - Connects to Firebase RTDB at `devices/MG001`
   - Shows live motion status with large visual indicator
   - Red card when motion detected, green when clear

2. **Motion Alerts & Notifications**
   - Sends local push notifications when motion detected
   - Prevents duplicate notifications by tracking previous state
   - Sound, vibration, and badge updates on notification

3. **Today's Analytics**
   - Counts motion events detected today
   - Displays as an analytics card with icon

4. **WiFi Status Monitoring**
   - Shows ONLINE (green) or OFFLINE (red)
   - Left-border color indicator

5. **Recent Motion Events**
   - Displays last 5 motion events with timestamps
   - Shows location and device ID
   - Empty state when no events

6. **Modern UI**
   - Cards with rounded corners (16-20px)
   - Shadow effects for depth
   - Icons from @expo/vector-icons
   - Theme-aware styling
   - Responsive layout

7. **Best Practices**
   - Proper Firebase listener cleanup
   - Loading state while data fetches
   - Safe null-checking throughout
   - useRef for tracking state changes

---

## Code Architecture

### State Management

```typescript
// Main status from RTDB
status: {
  motionDetected: boolean,
  wifiStatus: string,
  location: string,
  timestamp: number,
  confidence?: number,
  volumeLevel?: number
}

// Logs from Firestore
logs: MotionLog[]

// Today's motion count
todayDetections: number

// Prevent duplicate notifications
previousMotionStateRef: useRef<boolean>
```

### Firebase Listeners

1. **RTDB Listener** - Subscribes to `devices/MG001`
   - Gets real-time motion, wifi, location, confidence data
   - Triggers notification on motion change
   - Auto-resets motion_detected flag after logging

2. **Firestore Listener** - Subscribes to motion logs
   - Gets last 5 motion events
   - Counts today's events
   - Sorted by timestamp (desc)

### Notification Logic

- Only triggers when motion goes from `false` → `true`
- Uses `useRef` to track previous state and prevent duplicates
- Sends immediately (no delay)
- Includes device location in notification

---

## Usage

### Running the App

```bash
# Start Expo development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run on web
npm run web
```

### Testing Motion Detection

1. Update your Firebase RTDB at `devices/MG001`:

```json
{
  "confidence": 0.95,
  "device_id": "MG001",
  "location": "Front Door",
  "motion_detected": true,
  "status": "active",
  "timestamp": "2024-03-29T10:30:00Z",
  "volume_level": 75,
  "wifi_status": "online",
  "zone": "entry"
}
```

2. The app will:
   - Display the red "MOTION DETECTED" card
   - Show a push notification
   - Log the event to Firestore
   - Reset `motion_detected` to `false`

---

## Customization

### Change Device ID

Edit line in `HomeScreen.tsx`:

```typescript
const DEVICE_ID = "MG001"; // Change to your device ID
```

### Modify Notification Settings

In the notification handler:

```typescript
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
```

### Add Multiple Devices

Modify `useEffect` to listen to multiple devices:

```typescript
const devices = ["MG001", "MG002", "MG003"];
// Subscribe to all devices
```

---

## Colors & Styling

### Motion Status

- Motion Detected: `#ff3b30` (Red)
- No Motion: `#28a745` (Green)

### Cards

- Border radius: 16-20px
- Shadow: elevation 3-5
- Padding: 16-28px

### Icon Colors

- Primary: `theme.primary` (Blue)
- Success: `#28a745`
- Error: `#ff3b30`

---

## Troubleshooting

### Notifications Not Showing

1. Check Android notification permissions
2. Verify notification handler is set
3. Ensure device isn't in Do Not Disturb mode
4. Check console for errors in `Notifications.scheduleNotificationAsync()`

### Firebase Connection Issues

1. Verify Firebase config is correct in `app/config/firebase.ts`
2. Check Firebase Realtime Database rules allow read access
3. Ensure `DEVICE_ID` matches actual device in RTDB

### Duplicate Notifications

- Should not occur due to `previousMotionStateRef` tracking
- Check that listeners are properly cleaning up on unmount

### Loading Never Completes

1. Check Firestore rules allow reading `/motionLogs/MG001/logs`
2. Verify collection exists in Firestore
3. Check internet connection

---

## Performance Optimization

### Already Implemented

- Listener cleanup on component unmount
- Only storing last 5 logs in memory
- Efficient useRef for state comparison
- Theme lazy loading from Firestore

### Further Improvements (Optional)

1. Pagination for logs
2. Time-range filtering
3. Device grouping
4. Data caching with AsyncStorage
5. Offline mode support

---

## Next Steps

1. **Multi-device Support**: Scale to multiple motion sensors
2. **Geofencing**: Add location-based alerts
3. **Custom Rules**: Time-based alert settings
4. **Video Playback**: Link to security camera feeds
5. **Analytics Dashboard**: Weekly/monthly reports

---

## API References

- [expo-notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Firebase Realtime Database](https://firebase.google.com/docs/database)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [@expo/vector-icons](https://icons.expo.fyi/)
