# Database Setup Guide

This app uses **Supabase** (PostgreSQL) for persistent data storage. Supabase provides:
- Free tier with generous limits
- Built-in authentication
- Real-time capabilities
- Row Level Security (RLS)
- Easy-to-use JavaScript client

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Project Name**: Brain-Dump-App (or your choice)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to you
5. Click "Create new project"
6. Wait 2-3 minutes for setup to complete

## Step 2: Get Your Supabase Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (long string starting with `eyJ...`)

## Step 3: Set Up Environment Variables

1. Create a `.env.local` file in the project root (if it doesn't exist)
2. Add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GEMINI_API_KEY=your_gemini_api_key_here
```

**Important**: Replace `xxxxx` and the `eyJ...` key with your actual values from Step 2.

## Step 4: Run the Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Open `database/schema.sql` from this project
4. Copy and paste the entire contents into the SQL Editor
5. Click "Run" (or press Ctrl+Enter)
6. You should see "Success. No rows returned"

## Step 5: Set Up Authentication

The app uses Google OAuth. To enable it:

1. In Supabase dashboard, go to **Authentication** → **Providers**
2. Find **Google** and click to enable it
3. You'll need:
   - **Client ID**: Your Google OAuth Client ID (from Google Cloud Console)
   - **Client Secret**: Your Google OAuth Client Secret
4. Add authorized redirect URLs:
   - `http://localhost:3000` (for local development)
   - Your production URL (when deployed)

### Getting Google OAuth Credentials

If you don't have Google OAuth credentials yet:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Choose **Web application**
6. Add authorized redirect URIs:
   - `https://xxxxx.supabase.co/auth/v1/callback` (replace xxxxx with your Supabase project ID)
7. Copy the **Client ID** and **Client Secret**

## Step 6: Update Your App

The app will automatically use the database once:
- Environment variables are set
- Schema is created
- User is authenticated

## Migration from localStorage

If you have existing data in localStorage:
1. The app will automatically fall back to localStorage if database is not available
2. Once database is set up, new data will be saved to the database
3. Old localStorage data will remain until you manually migrate it

## Troubleshooting

### "Supabase credentials not found"
- Check that `.env.local` exists and has correct variable names
- Restart your dev server after adding environment variables
- Make sure variables start with `VITE_` prefix

### "Row Level Security policy violation"
- Make sure you've run the schema.sql file completely
- Check that RLS policies were created (they're in the schema file)

### "User not authenticated"
- Make sure Google OAuth is configured in Supabase
- Check that redirect URLs match exactly

## Database Structure

- **user_profiles**: User account information
- **user_personas**: User personality/preferences
- **memories**: Brain dump entries
- **action_items**: Tasks/actions extracted from memories
- **diary_entries**: Journal entries
- **life_synthesis**: AI-generated life insights
- **external_events**: Calendar events
- **chat_messages**: Chat history with AI

All tables have Row Level Security enabled, so users can only access their own data.
