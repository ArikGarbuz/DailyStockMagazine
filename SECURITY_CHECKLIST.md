# 🔐 Security Checklist - Before Launch

## Pre-Launch Security Review

Complete this checklist before running any automation:

---

## ✅ Phase 1: Credentials Setup

- [ ] **Read** `ENV_SETUP.md` completely
- [ ] **Created** `.env` file (from `.env.example`)
- [ ] **GitHub Token**: Generated from https://github.com/settings/tokens
  - [ ] Token starts with `ghp_`
  - [ ] Only `repo` scope selected
  - [ ] Token copied (shown only once)
- [ ] **GITHUB_REPO_URL**: Set to your repo
  - [ ] Format: `https://github.com/USERNAME/REPO.git`
  - [ ] URL is correct
- [ ] **Git User**: Filled in
  - [ ] Email: valid
  - [ ] Name: filled in
- [ ] **SECURITY_CONFIRMED**: Set to `true`

---

## ✅ Phase 2: Git Security

- [ ] **`.gitignore` created** in repo root
- [ ] **`.env` listed in `.gitignore`** (prevents accidental commit)
- [ ] **`.env.example` created** (template without secrets)
- [ ] **`.env` NOT tracked** by Git
  ```bash
  git status  # Should NOT show .env
  ```
- [ ] **`.gitignore` committed**
  ```bash
  git add .gitignore
  git commit -m "Add .gitignore to protect .env"
  git push
  ```

---

## ✅ Phase 3: GitHub Repository Setup

- [ ] **Repository created** on GitHub
  - [ ] Name: `DailyStockMagazine`
  - [ ] Public or Private (your choice)
  - [ ] Has README.md
- [ ] **Initial commit pushed**
  ```bash
  git push -u origin main
  ```
- [ ] **Verify on GitHub**: All files visible except `.env`

---

## ✅ Phase 4: GitHub Actions Permissions

- [ ] **Go to**: https://github.com/USERNAME/REPO/settings/actions
- [ ] **Workflow Permissions**:
  - [ ] "Allow all actions and reusable workflows" ✅
  - [ ] "Read and write permissions" ✅
  - [ ] "Allow GitHub Actions to create and approve pull requests" ✅
- [ ] **Saved** changes

---

## ✅ Phase 5: Token Verification

- [ ] **Token is working**:
  ```bash
  curl -H "Authorization: token YOUR_TOKEN" \
    https://api.github.com/user
  # Should return your GitHub user data
  ```
- [ ] **Token has correct scopes**:
  ```bash
  curl -H "Authorization: token YOUR_TOKEN" \
    https://api.github.com/user/repos
  # Should list your repositories
  ```

---

## ✅ Phase 6: Workflow Configuration

- [ ] **GitHub Actions Workflow** (`.github/workflows/daily-publish.yml`)
  - [ ] File exists and is valid YAML
  - [ ] `cron: '20 14 * * 1-5'` is set (4:20 PM IST)
  - [ ] Commit message is configured
- [ ] **Workflow visible** in GitHub Actions tab
- [ ] **Manual trigger works**: Click "Run workflow" → succeeds

---

## ✅ Phase 7: Final Safety Checks

### Before going live:

- [ ] **.env is secret**: Only you should have it
- [ ] **Token is NOT in code**: Grep for `ghp_` in all files
  ```bash
  grep -r "ghp_" . --exclude-dir=.git
  # Should return NOTHING
  ```
- [ ] **Commit history is clean**: No tokens exposed
  ```bash
  git log --all --full-history
  # Review recent commits
  ```
- [ ] **`.gitignore` is committed**: Prevents future leaks
- [ ] **Everyone on team knows**: `.env` is SECRET

---

## 🚨 If Token is Exposed

**Immediately:**
1. Go to: https://github.com/settings/tokens
2. Click "Delete" on the exposed token
3. Generate a NEW token
4. Update `.env` with new token
5. Push `.gitignore` update

The old token is now useless.

---

## 📋 Access Levels - What Can Happen

| Credential | Risk Level | If Exposed |
|---|---|---|
| `.env` file | 🔴 CRITICAL | Someone can: push code, modify repo, access private data |
| GITHUB_TOKEN | 🔴 CRITICAL | Same as above - full repo access |
| GITHUB_REPO_URL | 🟡 MEDIUM | Someone knows your repo location (public anyway) |
| GIT_USER_EMAIL | 🟡 MEDIUM | Someone knows your email (public in commits) |
| TELEGRAM_TOKEN | 🟡 MEDIUM | Someone can send messages to your bot |

---

## ✅ Daily Monitoring

Once live, monitor:

- [ ] **Check GitHub Actions tab** weekly
- [ ] **Look for failed runs** (red X)
- [ ] **Review recent commits** (should be auto-generated magazines)
- [ ] **Scan commit history** for any `.env` leaks

---

## 🎯 The Rule

**NEVER:**
```
❌ Put .env in code
❌ Commit .env to GitHub
❌ Share .env file
❌ Post token anywhere public
❌ Use same token for multiple projects
```

**ALWAYS:**
```
✅ Keep .env in .gitignore
✅ Use different tokens per project
✅ Rotate tokens every 6 months
✅ Review GitHub Actions logs
✅ Monitor your repository for unauthorized access
```

---

## ✨ Once Everything is Checked

You can confidently:
1. ✅ Push repo to GitHub
2. ✅ Enable GitHub Actions
3. ✅ Set up scheduled tasks
4. ✅ Magazine auto-publishes daily
5. ✅ Share GitHub link with others (no credentials exposed)

---

## 📞 Questions?

- **GitHub Security**: https://docs.github.com/en/code-security
- **Token Best Practices**: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure
- **Git Security**: https://git-scm.com/book/en/v2/Git-Tools-Credential-Storage

---

**✅ Ready? Start with Phase 1 above!**

Once all items are checked, you can safely proceed to launch. 🚀
