# Security Setup - Environment Variables 🔐

## Before You Start

⚠️ **IMPORTANT:** This document explains how to securely configure credentials for GitHub automation.

---

## What You Need

You need to provide 3 things securely:

1. **GitHub Personal Access Token** (required)
2. **GitHub Repository URL** (required)
3. **Git Configuration** (required)
4. **Telegram Bot Token** (optional - for notifications)

---

## Step 1: Create .env File

### 1a. Copy the template:
```bash
cd "G:\My Drive\stock Magazine"
copy .env.example .env
```

### 1b. Open `.env` in any text editor (Notepad, VS Code, etc.)

---

## Step 2: GitHub Personal Access Token

### Get your token:
1. Go to: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a name: `DailyStockMagazine`
4. Select scopes:
   - ✅ `repo` (Full control of private repositories)
5. Click "Generate token"
6. **COPY THE TOKEN** (shown only once!)

### Add to .env:
```
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**⚠️ WARNING:** This token acts like your GitHub password. Keep it SECRET!

---

## Step 3: GitHub Repository URL

### You already have this:
```
GITHUB_REPO_URL=https://github.com/ArikGarbuz/DailyStockMagazine.git
```

**No changes needed** - just verify in .env

---

## Step 4: Git Configuration

### Fill in:
```
GIT_USER_EMAIL=arikgarbuz@gmail.com
GIT_USER_NAME=Arik Garbuz
```

These are used for commit messages. Can be your real name or username.

---

## Step 5 (Optional): Telegram Notifications

### If you want daily magazine notifications:

#### Get Telegram Bot Token:
1. Open Telegram
2. Search for: `@BotFather`
3. Send: `/start`
4. Send: `/newbot`
5. Follow prompts to create a bot
6. Copy the **API Token** (looks like: `123456789:ABCdefGHIjklmnoPQRstUVWxyz`)

#### Get Your Chat ID:
1. Open Telegram
2. Search for: `@userinfobot`
3. Send: `/start`
4. It shows your Chat ID (a number like: `123456789`)

#### Add to .env:
```
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
```

**Note:** This is optional. Magazine will still auto-publish to GitHub without it.

---

## Step 6: Security Confirmation

### Confirm you understand:
```
SECURITY_CONFIRMED=true
```

This means you understand:
- ✅ Keep .env SECRET
- ✅ Never share GITHUB_TOKEN
- ✅ Add .env to .gitignore
- ✅ Don't commit .env to GitHub

---

## Step 7: Add to .gitignore

Make sure `.env` is never committed:

Create file: `G:\My Drive\stock Magazine\.gitignore`

```
# Environment variables
.env
.env.local
.env.*.local

# OS files
.DS_Store
Thumbs.db

# IDE files
.vscode/
.idea/

# Logs
*.log
```

Then:
```bash
git add .gitignore
git commit -m "Add .gitignore to protect sensitive files"
git push
```

---

## Your .env File Should Look Like:

```
# GITHUB CONFIGURATION (Required)
GITHUB_TOKEN=ghp_1234567890abcdefghijklmnopqrstuvwxyz
GITHUB_REPO_URL=https://github.com/ArikGarbuz/DailyStockMagazine.git
GIT_USER_EMAIL=arikgarbuz@gmail.com
GIT_USER_NAME=Arik Garbuz

# TELEGRAM CONFIGURATION (Optional)
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklmnoPQRstUVWxyz
TELEGRAM_CHAT_ID=987654321

# SCHEDULER CONFIGURATION
SCHEDULE_TIME=16:20
SCHEDULE_DAYS=1-5

# SAFETY CHECKLIST
SECURITY_CONFIRMED=true
```

---

## ✅ Verification Checklist

Before you proceed:

- [ ] `.env` file created (from `.env.example`)
- [ ] `GITHUB_TOKEN` filled in (ghp_...)
- [ ] `GITHUB_REPO_URL` set correctly
- [ ] `GIT_USER_EMAIL` and `GIT_USER_NAME` filled
- [ ] `SECURITY_CONFIRMED=true`
- [ ] `.gitignore` created with `.env` listed
- [ ] `.env` is NOT committed to Git (only .env.example)

---

## Security Best Practices

🔒 **DO:**
- ✅ Keep .env in .gitignore
- ✅ Regenerate token if exposed
- ✅ Use separate tokens per project
- ✅ Rotate tokens every 6 months
- ✅ Use HTTPS for git clone/push

🚫 **DON'T:**
- ❌ Share .env file
- ❌ Commit .env to GitHub
- ❌ Post token in issues/comments
- ❌ Use same token for multiple projects
- ❌ Leave tokens in script files

---

## Next Steps

Once .env is ready:

1. Run Git setup commands (from GITHUB_SETUP.md)
2. Enable GitHub Actions (from GITHUB_ACTIONS_SETUP.md)
3. Test the workflow
4. Magazine starts auto-publishing!

---

## Need Help?

- GitHub Tokens: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
- Telegram Bot: https://core.telegram.org/bots
- Git Security: https://git-scm.com/book/en/v2/Git-Tools-Credential-Storage

---

**🎯 TL;DR:**
1. Copy `.env.example` → `.env`
2. Fill in your GitHub token + repo URL
3. Add `.env` to `.gitignore`
4. Never commit `.env`
5. Ready to go! 🚀
