# FreeText 🌐

FreeText is a mobile-friendly social network built with React, TypeScript, Vite, and Supabase.

## Features

- Email sign-up, verification, login, and logout
- Home feed with text and image posts
- Like and unlike posts
- Comment on posts, with live comment counts
- Share post links and save posts in the current browser
- Create 24-hour photo or video stories
- Explore and search community members
- Follow and unfollow users
- View and edit your profile, bio, username, profile photo, and cover photo
- Direct messages with live updates between conversation members
- In-app notifications for likes and new followers
- Light and dark themes, remembered in the browser
- Responsive layout for mobile and desktop
- Super Admin tools for moderation (available only to authorized administrators)

## Built With

- React 18 and TypeScript
- Vite
- Supabase Auth, PostgreSQL, Storage, Row Level Security, and Realtime
- Lucide React
- CSS

## Supabase Setup

1. Create or open the FreeText project in Supabase.
2. In **Project Settings → API**, copy the Project URL and publishable/anon key.
3. Add these environment variables to your local `.env` file or Vercel project settings:

   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
   ```

4. In the Supabase **SQL Editor**, run these files in order:
   - `supabase/schema.sql`
   - `supabase/social_features_fix.sql`
   - `supabase/super_admin.sql`

   The schema creates the application tables, media storage bucket, and access policies. The compatibility migration adds the profile cover field and fixes direct-message membership access.

5. Confirm the Supabase Auth email settings and site/redirect URLs include your deployed FreeText domain.

**Important:** Never put a Supabase service-role key in frontend environment variables. The browser app must use only the publishable/anon key and rely on Row Level Security.

## Run Locally

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Deploy

The project is configured for Vercel. Connect the GitHub repository, set the two Supabase environment variables in Vercel for the appropriate environments, and deploy the `main` branch.

## Project Structure

```text
FreeText/
├── README.md
├── package.json
├── vite.config.ts
├── vercel.json
├── supabase/
│   ├── schema.sql
│   ├── social_features_fix.sql
│   └── super_admin.sql
└── src/
    ├── App.tsx
    ├── index.css
    ├── main.tsx
    ├── components/
    └── lib/
        └── supabase.ts
```

## Notes

- Posts, likes, comments, follows, stories, messages, and notifications use Supabase.
- Saved posts and the theme preference are stored in the current browser, so they do not automatically sync between devices.
- Audio/video call buttons require a WebRTC signaling and media service before calls can work end to end.

Built with ❤️ for the FreeText community.
