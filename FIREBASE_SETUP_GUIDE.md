# 🔧 Firebase Setup Verification Guide

## Your Firebase Project Details

- **Project ID**: motionguarddb
- **RTDB URL**: https://motionguarddb-default-rtdb.firebaseio.com/
- **Device ID**: MG001

---

## ✅ STEP 1: Verify Firebase RTDB Rules

### Current Issue

Your Firebase likely has default rules that block all access:

```json
{
  "rules": {
    ".read": false,
    ".write": false
  }
}
```

### How to Fix

1. **Go to Firebase Console**
   - URL: https://console.firebase.google.com/?project=motionguarddb

2. **Navigate to Realtime Database**
   - Click "Realtime Database" in left sidebar
   - Select "motionguarddb" database

3. **Click the "Rules" Tab**

4. **Replace ALL content** with this:

```json
{
  "rules": {
    "devices": {
      "$deviceId": {
        ".read": true,
        ".write": "auth != null"
      }
    },
    "motionLogs": {
      ".read": true,
      ".write": "auth != null"
    }
  }
}
```

5. **Click "Publish"**

**What these rules do:**

- ✅ Anyone can READ device data (for motion detection to work)
- ✅ Only authenticated users can WRITE (for security)
- ✅ Allows nested collections like `motionLogs/MG001/logs`

---

## ✅ STEP 2: Create/Verify RTDB Data Structure

### Expected Structure

```
motionguarddb
└── devices
    └── MG001
        ├── motion_detected: boolean (true/false)
        ├── wifi_status: string ("online" or "offline")
        ├── location: string ("Main Door", etc.)
        ├── confidence: number (optional, 0-1)
        └── volume_level: number (optional, 0-100)
```

### How to Create

1. **In Firebase Console** → Realtime Database

2. **Click the "+" button** next to "motionguarddb" (or use the pencil icon on root)

3. **Create this structure manually:**

   a. Click "+" to add new key → Enter `devices` → Value: `null` or leave blank

   b. Under `devices`, click "+" → Enter `MG001` → Value: `null`

   c. Under `MG001`, add these fields:

| Key               | Type    | Value         | Description                         |
| ----------------- | ------- | ------------- | ----------------------------------- |
| `motion_detected` | boolean | `false`       | Must be `true` or `false` (boolean) |
| `wifi_status`     | string  | `"online"`    | Can be "online" or "offline"        |
| `location`        | string  | `"Main Door"` | Any location name                   |
| `confidence`      | number  | `0.95`        | Optional: 0 to 1                    |
| `volume_level`    | number  | `50`          | Optional: 0 to 100                  |

### Or use JSON import

**Copy this JSON:**

```json
{
  "devices": {
    "MG001": {
      "motion_detected": false,
      "wifi_status": "online",
      "location": "Main Door",
      "confidence": 0.95,
      "volume_level": 50
    }
  }
}
```

Then:

1. Click the three-dot menu in Realtime Database
2. Select "Import JSON"
3. Paste the JSON above
4. Click "Import"

---

## ✅ STEP 3: Verify Firestore Rules

Your app also writes to Firestore. Go to **Firestore Database** section and click **Rules** tab.

Replace with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /motionLogs/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**Publish** the rules.

---

## ✅ STEP 4: Test the Connection

### From App Console

1. Run the app: `npm start`
2. Log in with your account
3. Navigate to Dashboard
4. Open console (press `j` in terminal)
5. Look for this line:

   ```
   ✅ RTDB connection successful, data: { motion_detected: false, ... }
   ```

   - **If you see it**: Connection works! ✅
   - **If you see error**: Check steps 1-3 above

### From Firebase Console

1. Go to Realtime Database
2. Click on `devices/MG001`
3. You should see your device data
4. Check the three sections below for real-time updates

---

## ✅ STEP 5: Test Motion Detection

### Manual Test

1. **In Firebase Console** → Realtime Database
2. Click the pencil icon on `MG001/motion_detected`
3. Change value from `false` to `true`
4. Click "Save"
5. **In App**, you should see:
   - ✅ Card turns RED with "🚨 MOTION DETECTED"
   - ✅ Notification appears
   - ✅ Console shows: `🚨 MOTION DETECTED! Sending notification...`

### What Happens on False Positive

If motion detection doesn't show after changing RTDB value to `true`:

1. **Check console logs** for errors like:
   - `❌ Snapshot does not exist` → No data at that path
   - `❌ Firebase RTDB Error` → Rules blocking access
   - `❌ No user ID` → Not logged in
   - `⚠️ Device not found at path` → Wrong device ID

2. **Check Firebase Rules** (Step 1 above)

3. **Check RTDB Structure** (Step 2 above)

4. **Check Authentication** - Are you logged in?

---

## 🔍 Debugging Console Logs

When app starts, look for these key logs:

| Log                                                             | Meaning                               |
| --------------------------------------------------------------- | ------------------------------------- |
| `🔐 Auth Status: { isAuthenticated: true, userId: "xxx" }`      | ✅ Logged in                          |
| `🔐 Auth Status: { isAuthenticated: false, userId: undefined }` | ❌ Not logged in - log in first       |
| `✅ RTDB connection successful, data: {...}`                    | ✅ RTDB data exists                   |
| `⚠️ RTDB path exists but no data`                               | ⚠️ Path exists but empty              |
| `❌ Snapshot does not exist`                                    | ❌ Path `devices/MG001` doesn't exist |
| `🔥 RTDB Listener triggered`                                    | ✅ Listener is working                |
| `🎯 Motion detected value: true`                                | ✅ Motion data received               |
| `🚨 MOTION DETECTED! Sending notification...`                   | ✅ Everything works!                  |

---

## 📋 Quick Checklist

Before testing, verify:

- [ ] Firebase Rules updated (Step 1)
- [ ] RTDB structure created at `devices/MG001` (Step 2)
- [ ] Firestore Rules updated (Step 3)
- [ ] User is logged in
- [ ] App shows "✅ RTDB connection successful" in console
- [ ] No red error card showing

---

## 🚨 If Motion Detection Still Doesn't Work

### Diagnostic Steps

1. **Check if user is logged in:**

   ```
   console: "🔐 Auth Status: { isAuthenticated: true ..."
   ```

   If false, go to Login screen and sign in.

2. **Check if RTDB is accessible:**

   ```
   console: "✅ RTDB connection successful..."
   ```

   If not, check Firebase Rules (Step 1).

3. **Check if data structure is correct:**
   In Firebase Console, go to Realtime Database and verify:
   - `devices/MG001/motion_detected` exists
   - `devices/MG001/wifi_status` exists
   - `devices/MG001/location` exists

4. **Check if Firebase Rules allow read:**
   - `devices` → `.read` should be `true` or `"auth != null"`
   - `motionLogs` → `.read` should be `true` or `"auth != null"`

5. **Check error message on screen:**
   If you see an error card, it will tell you exactly what's wrong.

---

## ✅ Firebase Configuration Verified

Your app is configured to connect to:

```javascript
databaseURL: "https://motionguarddb-default-rtdb.firebaseio.com/";
```

This matches your Firebase project **motionguarddb**.

If you see connection errors, it could be:

1. ❌ RTDB Rules blocking access
2. ❌ Data structure doesn't exist at `devices/MG001`
3. ❌ User not authenticated
4. ❌ Network connectivity issues

---

## 📞 Need Help?

If motion detection still doesn't work after following these steps:

1. Take a **screenshot of console logs**
2. Take a **screenshot of Firebase RTDB** showing `devices/MG001`
3. Check:
   - Are you logged in?
   - Does the console show "✅ RTDB connection successful"?
   - Does the error card show a specific error message?
