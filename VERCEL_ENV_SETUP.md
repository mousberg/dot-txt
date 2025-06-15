# Vercel Environment Variables Setup

## Required Environment Variables

You need to add these environment variables in your Vercel dashboard:

1. **FIRECRAWL_API_KEY** - Your Firecrawl API key
2. **OPENAI_API_KEY** - Your OpenAI API key

## How to Add Environment Variables in Vercel

1. Go to your Vercel dashboard
2. Select your project
3. Navigate to **Settings** → **Environment Variables**
4. Add the following variables:

```
FIRECRAWL_API_KEY=your_firecrawl_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

5. Select which environments to apply them to (Production, Preview, Development)
6. Click **Save**

## Important Notes

- Never commit API keys to git
- The `.env.local` file is for local development only
- Vercel will automatically use the environment variables you set in the dashboard
- Make sure to redeploy after adding/changing environment variables

## Local Development

For local development, the API keys are stored in `.env.local` (which is gitignored).