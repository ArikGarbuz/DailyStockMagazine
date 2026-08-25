# 🚀 Vercel + Next.js Setup Guide

## What You'll Get

- 🌐 Live website: `dailystockmagazine.vercel.app`
- 📊 Auto-updates every day at 4:20 PM IST
- 💻 Modern React UI (not static HTML)
- 📱 Perfect on mobile & desktop
- 🔐 Secure (credentials in `.env.local` only)

---

## Step-by-Step Instructions

### Step 1: Get Your Tokens & IDs

#### GitHub Token (you already have)
- Already generated: `ghp_***`
- Used for: Pushing data to repo

#### Vercel Token (NEW - you need this)
1. Go to: https://vercel.com/account/tokens
2. Click "Create Token"
3. Name: `DailyStockMagazine`
4. Scope: Select "Full Access"
5. Expiration: 90 days (or No Expiration)
6. **COPY THE TOKEN** (shown only once!)
   - Looks like: `xxx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

#### Vercel Org ID
1. Go to: https://vercel.com/account/settings
2. Find "Team ID" or "Organization ID"
3. Copy it (looks like: `team_xxxxxxxxxxxxx`)

#### Telegram (Optional)
- **Bot Token**: Already have: `8549366244:AAFQ4vNY6xCEf9RisA2RSb5muGAmwDntrWE`
- **Chat ID**: Already have: `-3619065876`

---

### Step 2: Fill in `.env.vercel.example`

**Create `.env.local` from the template:**
```bash
cd "G:\My Drive\stock Magazine"
copy .env.vercel.example .env.local
```

**Edit `.env.local` with your values:**

```
# GitHub (already have)
GITHUB_TOKEN=ghp_***
GITHUB_REPO_URL=https://github.com/ArikGarbuz/DailyStockMagazine.git
GIT_USER_EMAIL=arikgarbuz@gmail.com
GIT_USER_NAME=Arik Garbuz

# Vercel (NEW - copy from above)
VERCEL_TOKEN=***
VERCEL_ORG_ID=team_***
VERCEL_PROJECT_ID=(leave empty - we'll fill later)

# Next.js
NEXT_PUBLIC_SITE_URL=https://dailystockmagazine.vercel.app
NEXT_PUBLIC_SITE_NAME=Daily Stock Magazine

# Telegram (optional)
TELEGRAM_BOT_TOKEN=***
TELEGRAM_CHAT_ID=***

# Scheduler
SCHEDULE_TIME=16:20
SCHEDULE_DAYS=1-5

# Data
STOCKS_COUNT=8
MIN_MARKET_CAP=0.5
MAX_STOCK_PRICE=30

# Features
ENABLE_BILINGUAL=true
ENABLE_DARK_THEME=true
ENABLE_RESPONSIVE=true

# Security
SECURITY_CONFIRMED=true
```

---

### Step 3: Setup .gitignore

Make sure `.env.local` is protected:

**Check `.gitignore` includes:**
```
.env.local
.env.*.local
node_modules/
.next/
build/
dist/
```

---

### Step 4: Commit to GitHub

```bash
cd "G:\My Drive\stock Magazine"

# Stage files
git add .
git reset .env.local   # Don't add .env.local!

# Commit
git commit -m "Vercel setup: add Next.js configuration"

# Push
git push origin main
```

---

### Step 5: Connect Vercel

#### Method 1: Via Vercel Website (Easy)

1. Go to: https://vercel.com/new
2. Select "Import Git Repository"
3. Connect GitHub
4. Choose: `ArikGarbuz/DailyStockMagazine`
5. Click "Import"
6. **Environment Variables** → Add from `.env.local`:
   ```
   VERCEL_TOKEN = your_token
   VERCEL_ORG_ID = your_org_id
   GITHUB_TOKEN = your_github_token
   TELEGRAM_BOT_TOKEN = your_telegram_token
   TELEGRAM_CHAT_ID = your_chat_id
   ```
7. Click "Deploy"
8. Wait for deployment to complete ✅

#### Method 2: Via CLI (Advanced)

```bash
npm install -g vercel
vercel login
vercel link
vercel env pull
vercel deploy
```

---

### Step 6: Get Your Project ID

After deployment:
1. Go to: https://vercel.com/dashboard
2. Click your "DailyStockMagazine" project
3. Settings → General
4. Find "Project ID"
5. Update `.env.local`:
   ```
   VERCEL_PROJECT_ID=prj_xxxxxxxxxxxxx
   ```

---

### Step 7: Setup GitHub Actions

GitHub Actions will:
- Generate magazine data daily at 4:20 PM IST
- Commit data to GitHub
- Trigger Vercel auto-deploy
- Site updates automatically ✨

**No action needed** - it's already configured in `.github/workflows/daily-publish.yml`

---

### Step 8: Test

1. Go to your Vercel project dashboard
2. Click "Deployments"
3. Should see "dailystockmagazine.vercel.app" ✅
4. Click the URL to view your live site!

**Next day at 4:20 PM IST:**
- Magazine generates automatically
- GitHub Actions commits the data
- Vercel auto-deploys
- Site updates live 🚀

---

## ✅ Verification Checklist

- [ ] Vercel token created & copied
- [ ] Vercel Org ID found & copied
- [ ] `.env.local` created with all values
- [ ] `.env.local` added to `.gitignore`
- [ ] GitHub pushed (without `.env.local`)
- [ ] Vercel project created & deployed
- [ ] Site accessible at: `yoursite.vercel.app` ✅
- [ ] GitHub Actions workflow enabled
- [ ] Tomorrow: Check site updates at 4:20 PM IST

---

## 🔐 Security Best Practices

```
DO:
✅ Keep .env.local secret
✅ Add to .gitignore
✅ Never share .env.local
✅ Rotate tokens every 6 months
✅ Use different tokens per project

DON'T:
❌ Commit .env.local to GitHub
❌ Share tokens in chat/email
❌ Post tokens in issues
❌ Use same token for multiple projects
```

---

## 🚨 If Something Goes Wrong

### "Deployment failed"
- Check Vercel logs: https://vercel.com/dashboard → Deployments
- Common issues:
  - Missing environment variables
  - Syntax errors in code
  - Missing dependencies

### "Site not updating daily"
- Check GitHub Actions: Repo → Actions → "Daily Stock Magazine Auto-Publish"
- Common issues:
  - Workflow disabled
  - Token expired
  - No GITHUB_TOKEN in Actions secrets

### "Data not showing"
- Check if daily data was generated
- GitHub → `data/` folder → latest date
- If missing: Manually trigger GitHub Actions workflow

---

## 📞 Support

**GitHub Actions Issues:**
- https://docs.github.com/en/actions

**Vercel Issues:**
- https://vercel.com/docs

**Next.js Issues:**
- https://nextjs.org/docs

---

## 🎯 TL;DR

1. Get Vercel Token from https://vercel.com/account/tokens
2. Get Vercel Org ID from https://vercel.com/account/settings
3. Fill `.env.local` with tokens
4. Connect Vercel to GitHub
5. Deploy
6. Done! Site auto-updates daily 🚀

---

**Ready?** 
1. Get your Vercel Token & Org ID
2. Tell me the values
3. I'll build the Next.js site
4. You deploy to Vercel
5. Live in 5 minutes! ⚡
