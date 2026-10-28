# FreeText 🌐

FreeText is a mobile-first social network built with React, TypeScript, Vite, and Supabase. The project is being expanded into a next-generation social platform combining feeds, stories, short video, messaging, communities, creator features, and a protected super-admin center.

## Current platform foundation

- Email sign-up, verification, login, and logout
- Home feed with text/image posts
- Likes, comments, saves, shares, views, follows
- 24-hour photo/video stories
- Search and member discovery
- Profiles with bio, username, avatar and cover photo
- Real-time direct messaging and group conversation infrastructure
- Voice/video call signaling infrastructure
- In-app notifications
- Light/dark themes and responsive Android-friendly UI
- Reels component connected to production Supabase Reel data
- Communities backend with public/private communities, members, roles and community posts
- Super Admin tools for moderation, verification, bans, roles, reports and audit logs

## Built With

- React 18 and TypeScript
- Vite
- Supabase Auth, PostgreSQL, Storage, Row Level Security, and Realtime
- Lucide React
- CSS

## Supabase Setup

1. Create or open the FreeText project in Supabase.
2. In **Project Settings → API**, use the project URL and publishable/anon key.
3. Configure these environment variables in local development and Vercel:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

4. Run the existing schema/feature SQL and then the new next-generation foundation:
   - `supabase/schema.sql`
   - `supabase/social_features_fix.sql`
   - `supabase/super_admin.sql`
   - `supabase/next_gen_social_foundation.sql`

The new foundation adds Reel metadata/engagement, Communities, community membership and posts, and hardened access for privileged RPC functions.

**Important:** Never put a Supabase service-role key in frontend environment variables. The browser must use only a publishable/anon key and rely on Row Level Security.

## Security

All new social tables have RLS enabled. Administrative RPC functions are restricted away from anonymous execution and remain available to authenticated sessions for their existing internal administrator checks. Review Supabase Security Advisors regularly; leaked-password protection should also be enabled in Supabase Auth settings before production launch.

## Run locally

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Deploy

The GitHub repository is connected to Vercel. Production deployments are generated from `main`.

## Roadmap

1. Integrate the Communities hub into the main navigation and mobile tab bar.
2. Add first-class Reel creation/upload, category selection, comments, shares, views and personalized ranking.
3. Expand the feed ranking system using follows, engagement and safety signals.
4. Finish creator profiles, verification workflow, live streaming and creator analytics.
5. Expand admin analytics, moderation queues, platform settings and audit tooling.
6. Add production-grade media processing, rate limiting, abuse detection and account recovery.

Built with ❤️ for the FreeText community.
