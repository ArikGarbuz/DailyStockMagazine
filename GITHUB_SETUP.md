# GitHub Setup Guide 🚀

## Quick Start - 5 Minutes

### Step 1: One-Time Setup

Open **PowerShell** or **Git Bash** in `G:\My Drive\stock Magazine`:

```bash
# Initialize Git repo
git init

# Set your git identity
git config user.email "arikgarbuz@gmail.com"
git config user.name "Arik Garbuz"

# Add all files
git add .

# First commit
git commit -m "Initial commit: Daily Stock Magazine setup"

# Set main branch
git branch -M main

# Connect to your GitHub repo
git remote add origin https://github.com/ArikGarbuz/DailyStockMagazine.git

# Push to GitHub
git push -u origin main
```

✅ Done! Your repo is now on GitHub.

---

### Step 2: Daily Auto-Commit (Optional)

After magazine is generated each day, run this in PowerShell:

```bash
cd "G:\My Drive\stock Magazine"
git add magazines/PreMarket_*.html
git commit -m "Daily magazine: $(Get-Date -Format 'MMMM dd, yyyy')"
git push origin main
```

**Better option:** Use **GitHub Desktop** (visual app - easier!)
1. Download from https://desktop.github.com
2. Add your local folder
3. Publish to GitHub
4. Auto-commit daily from your schedule

---

### Step 3: View on GitHub

After pushing, your magazines appear at:
`https://github.com/ArikGarbuz/DailyStockMagazine/tree/main/magazines`

Share the link with others! 📊

---

## Folder Structure

```
G:\My Drive\stock Magazine\
├── README.md                      # Main documentation
├── SKILL.md                       # Automation instructions
├── GITHUB_SETUP.md               # This file
├── PreMarket_Aug25_2026_Hebrew.html  # Sample
└── magazines/                     # Daily archives (create this folder)
    ├── PreMarket_08252026.html
    ├── PreMarket_08262026.html
    └── ... (grows daily)
```

**Create `magazines/` folder manually:**
```bash
mkdir magazines
git add magazines
git commit -m "Create magazines folder"
git push
```

---

## Troubleshooting

### "fatal: not a git repository"
- Run `git init` first in the folder

### "remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/ArikGarbuz/DailyStockMagazine.git
```

### "Authentication failed"
- Use GitHub token instead of password
- Or use SSH key setup
- Or use GitHub Desktop (handles auth automatically)

### "File too large"
- GitHub has 100MB file limit
- HTML magazines are <200KB, so no issue

---

## Recommended Workflow

1. **First time:** Run all setup commands above
2. **Daily:** Let Claude create the magazine automatically
3. **Weekly:** Run `git push` to send new magazines to GitHub
4. **Optional:** Set up GitHub Actions for full automation (no CLI needed)

---

## Next: GitHub Actions (Advanced)

If you want ZERO manual commands, set up a GitHub Action to auto-commit daily.
Contact me if you want help with that! 🤖

---

**Questions?** Check GitHub docs: https://docs.github.com
