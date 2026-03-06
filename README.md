# Party Room Playground

A pixel-style party hall game with:
- Join by name and room ID
- Host-only reveal time and answer settings
- Realtime multiplayer sync (Firebase Realtime Database)
- Live chat
- NPC cats, KTV stage, Ferris wheel, food/drink stalls, blessing card effects

## Tech Stack

- HTML / CSS / JavaScript (no framework)
- Firebase Realtime Database
- Firebase Hosting

## Project Structure

- `index.html` - UI structure
- `style.css` - all visual styles and animations
- `app.js` - game logic, multiplayer sync, interactions
- `public/` - image assets (cats, stalls, mic, balloons, etc.)
- `database.rules.json` - Realtime Database rules
- `firebase.json` - Firebase Hosting + Database config
- `.firebaserc` - Firebase project alias

## Local Run

This is a static app, so run any static server in the project folder.

Example:

```bash
python3 -m http.server 5173
```

Open:

`http://localhost:5173`

## Firebase Setup

1. Create a Firebase project.
2. Enable Realtime Database.
3. Add your Firebase web config in `index.html`:
   - `window.__FIREBASE_CONFIG__`
4. Use room query or input field to join the same room:
   - `?room=party-1`

## Deploy (Firebase Hosting)

```bash
firebase deploy --only hosting --project party-room-playground
```

## Database Rules Deploy

```bash
firebase deploy --only database --project party-room-playground
```

## Notes

- Realtime sync depends on valid Realtime Database instance and rules.
- If multiplayer data seems stale, hard refresh browser on all devices.
