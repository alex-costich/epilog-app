# epilog 🌙

An epilepsy logger and real-time alert app connected to an IoT mouthpiece that detects seizure episodes. Built with Expo (React Native) and Firebase, with support for hardware-triggered alerts via ESP32 over WiFi.

---

## Features

- **Authentication** — Email/password login and registration via Firebase Auth
- **Groups** — Create or join a group using a 6-character invite code or shared deep link
- **Real-time alerts** — The host (or an ESP32 hardware device) sends an alert that instantly appears on all group members' phones
- **IoT integration** — A XIAO-ESP32-C6 microcontroller can trigger alerts directly to Firebase over WiFi, without any phone interaction

---

## Stack

| Layer          | Technology                       |
| -------------- | -------------------------------- |
| App framework  | Expo (managed workflow)          |
| Navigation     | Expo Router (file-based)         |
| Backend / DB   | Firebase Firestore               |
| Authentication | Firebase Auth                    |
| Hardware       | XIAO-ESP32-C6 (Arduino)          |
| Real-time sync | Firestore `onSnapshot` listeners |

---

## Project structure

```
epilog/
├── app/
│   ├── _layout.tsx             # Root layout, auth state management
│   └── screens/
│       ├── Authscreen.js       # Login & registration
│       ├── Homescreen.js       # Create or join a group
│       └── Groupscreen.js      # Group view, alert sending & receiving
├── assets/
│   └── images/                 # App icons, splash screen, favicon
├── components/
│   └── ui/                     # Shared UI components
├── constants/
│   └── theme.ts                # App-wide theme/color constants
├── firebase/
│   └── firebaseConfig.js       # Firebase initialization
├── hooks/                      # Custom React hooks
├── scripts/
│   └── reset-project.js        # Project reset utility
├── .expo/                      # Expo config (auto-generated)
├── app.json                    # Expo app configuration
├── package.json
├── tsconfig.json
└── README.md
```

---

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org) v18 or later
- [Expo Go](https://expo.dev/go) on your phone
- A Firebase project with **Authentication** (Email/Password) and **Firestore** enabled

### Install dependencies

```bash
npm install
```

### Configure Firebase

Create `firebase/firebaseConfig.js` with your project credentials:

```js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

### Start the app

```bash
npx expo start
```

Scan the QR code with Expo Go on your phone. For testing with multiple devices, make sure all phones are on the same WiFi network.

---

## Firestore data structure

```
/groups/{groupId}
  hostId: string
  hostName: string
  inviteCode: string
  createdAt: timestamp
  members: { uid: displayName }
  activeAlert: {
    triggeredBy: string
    timestamp: timestamp
  } | null

/users/{uid}
  displayName: string
  email: string
  groupId: string | null
  isHost: boolean
```

---

## Firestore security rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }

    match /groups/{groupId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null ||
        request.resource.data.diff(resource.data).affectedKeys()
          .hasOnly(['activeAlert']);
    }
  }
}
```

The `activeAlert`-only update rule allows the ESP32 to write alerts without a Firebase Auth session.

---

## ESP32 hardware integration

The XIAO-ESP32-C6 connects to WiFi and writes directly to Firestore via the REST API. The app reacts instantly through its existing `onSnapshot` listener — no app changes are needed.

### Required libraries (Arduino IDE)

- `WiFi` (built in)
- `HTTPClient` (built in)
- `ArduinoJson` (install via Library Manager)

### Config

```cpp
const char* WIFI_SSID  = "YOUR_WIFI";
const char* WIFI_PASSWORD = "YOUR_PASSWORD";
const char* PROJECT_ID = "YOUR_FIREBASE_PROJECT_ID";
const char* GROUP_ID   = "YOUR_FIRESTORE_GROUP_ID";
```

### Serial commands

Once flashed, open Serial Monitor at **115200 baud** and type:

| Command | Action                           |
| ------- | -------------------------------- |
| `alert` | Sends alert to all group members |
| `clear` | Dismisses the active alert       |

### Alert flow

```
ESP32 serial input → HTTP PATCH to Firestore
  → activeAlert field updates
    → onSnapshot fires on all member devices
      → Alert banner appears on screen
```

---

## How alerts work

| Trigger                           | Result                              |
| --------------------------------- | ----------------------------------- |
| Host taps "Send Alert" in app     | Banner appears on all member phones |
| ESP32 receives `alert` via serial | Banner appears on all member phones |
| Host taps "Clear Alert"           | Banner dismissed on all phones      |
| Member dismisses locally          | Dismissed on their phone only       |

---

## Building for Android

Using EAS Build:

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build -p android --profile preview
```

Make sure `app.json` includes:

```json
"android": {
  "package": "com.yourname.epilog",
  "versionCode": 1
},
"scheme": "epilog"
```

---

## Learn more

- [Expo documentation](https://docs.expo.dev)
- [Firebase documentation](https://firebase.google.com/docs)
- [Expo Router](https://docs.expo.dev/router/introduction)
- [react-native-ble-plx](https://github.com/dotintent/react-native-ble-plx) — for future BLE integration
