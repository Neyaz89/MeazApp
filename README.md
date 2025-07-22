# Meaz

A real-time social media + chat mobile app built with React Native (TypeScript), Supabase (Auth, Realtime DB, Storage), and Agora (voice/video calling).

## 🌈 Design System
- **App Name**: Meaz
- **Logo**: Stylish "NM" letters (modern, bold)
- **Theme Colors**:
  - Primary: White `#FFFFFF`
  - Secondary: Gold `#FFD700`
  - Accent: Royal Blue `#4169E1`
- **Design Principles**: Modern squaric layouts, stylish SVG icons, rounded cards, gradient backgrounds, soft shadows, glassmorphism, responsive, minimal UI, animated transitions.

## ✅ Core Features
- Account management (Supabase Auth)
- Friends system (requests, streaks, online status)
- Real-time chat (text, images, voice, video, emojis, reactions, unsend, seen, typing, etc.)
- Snaps system (timed, screenshot alert, streaks, archive, expiry)
- Stories (square layout, image/video/text, reactions, highlights, drafts)
- Voice/video calling (Agora)
- Media upload (Supabase Storage, compression, progress)
- Stories Feed (Explore replacement, trending, filters)
- Profile page (bio, status, stories, streaks, archive)
- Notifications (Supabase Edge Functions)
- Search (friends, stories, usernames)
- Security & moderation (block, report, NSFW scan, RLS)
- Extra mini features (auto logout, intro, suggestions, dark/light mode, offline, last seen, read receipts, privacy, pin chats, group creation)

## 🧱 Tech Stack
- React Native (TypeScript), Expo
- Supabase (Auth, DB, Realtime, Storage)
- Agora SDK (Voice/Video)
- Zustand
- ShadCN + Custom SVGs + TailwindCSS (NativeWind)
- Formik + Yup, react-native-gesture-handler, react-native-reanimated, react-native-svg, react-native-fast-image, react-query

## Setup
1. Copy `.env.example` to `.env` and fill in your Supabase and Agora keys.
2. Install dependencies: `npm install`
3. Start: `npx expo start`

## Contribution
All features must be fully functional, modular, and well-documented. See `/docs` for architecture and feature guides.
