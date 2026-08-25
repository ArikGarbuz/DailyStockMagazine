# GitHub Actions - Auto-Publish Setup 🤖

## What It Does

✅ **Fully Automatic!**
- Runs every weekday at 4:20 PM Israel time (14:20 UTC)
- Automatically publishes new magazines to GitHub
- No manual `git push` needed ever again
- Zero commands to run

---

## Setup (One Time Only)

### Step 1: Initial GitHub Setup

```bash
cd "G:\My Drive\stock Magazine"

# Initialize Git (if not already done)
git init
git config user.email "arikgarbuz@gmail.com"
git config user.name "Arik Garbuz"

# Create magazines folder
mkdir -p magazines
git add .
git commit -m "Initial commit with GitHub Actions"

# Push to GitHub
git branch -M main
git remote add origin https://github.com/ArikGarbuz/DailyStockMagazine.git
git push -u origin main
```

### Step 2: Enable Actions on GitHub

1. Go to: https://github.com/ArikGarbuz/DailyStockMagazine
2. Click **Settings** tab
3. Left sidebar → **Actions** → **General**
4. Under "Actions permissions", select:
   - ✅ "Allow all actions and reusable workflows"
5. Click **Save**

### Step 3: Allow Workflow to Push Code

1. Still in Settings
2. Left sidebar → **Actions** → **General** (scroll down)
3. Under "Workflow permissions", select:
   - ✅ "Read and write permissions"
   - ✅ "Allow GitHub Actions to create and approve pull requests"
4. Click **Save**

✅ **Done!** Workflow is now active.

---

## How It Works

### Daily Automatic Flow

```
4:20 PM Israel Time (every weekday)
    ↓
GitHub Actions workflow triggers automatically
    ↓
Checks for new magazine files in magazines/ folder
    ↓
Auto-commits any new HTML files
    ↓
Auto-pushes to main branch
    ↓
Repository updated on GitHub (visible immediately)
```

### What Gets Published

- Any new `PreMarket_*.html` files in `magazines/` folder
- Commit message: `Daily stock magazine: [Date]`
- Automatically pushed to GitHub main branch

---

## Verification

### Check if Workflow is Running

1. Go to: https://github.com/ArikGarbuz/DailyStockMagazine
2. Click **Actions** tab
3. You should see "Daily Stock Magazine Auto-Publish" workflow
4. Each successful run shows a ✅ green checkmark

### View Published Magazines

After each run, new magazines appear at:
```
https://github.com/ArikGarbuz/DailyStockMagazine/tree/main/magazines
```

---

## Manual Trigger (Optional)

To test the workflow without waiting:

1. Go to: https://github.com/ArikGarbuz/DailyStockMagazine
2. Click **Actions** tab
3. Click "Daily Stock Magazine Auto-Publish"
4. Click "Run workflow" button
5. Choose **main** branch
6. Click "Run workflow"

✅ Workflow runs immediately!

---

## Important: File Location

The workflow ONLY looks in the `magazines/` folder:

```
G:\My Drive\stock Magazine/
├── README.md
├── SKILL.md
├── .github/
│   └── workflows/
│       └── daily-publish.yml     ← THIS FILE CONTROLS IT
└── magazines/                    ← MAGAZINES MUST BE HERE
    ├── PreMarket_08252026.html
    ├── PreMarket_08262026.html
    └── ... (grows daily)
```

**Important:** Make sure new magazines are saved to `magazines/` folder, not root!

---

## Troubleshooting

### "Workflow not running"
- Check Actions tab on GitHub - any errors?
- Make sure you enabled "Read and write permissions" (Step 3 above)
- Try manual trigger to test

### "No files being committed"
- Check that magazines are in `magazines/` folder
- File names must match: `PreMarket_MMDDYYYY.html`
- Run workflow manually to debug

### "Permission denied"
- Go to repo Settings → Actions → General
- Ensure "Read and write permissions" is enabled
- Refresh and try again

### "Workflow doesn't run at scheduled time"
- GitHub Actions use UTC time
- 4:20 PM Israel = 14:20 UTC (schedules are in UTC)
- Give it a few minutes - GitHub sometimes delays scheduled jobs

---

## Summary

✅ **After setup:**
- Magazine generates daily at 4:20 PM IST
- Automatically commits to GitHub
- No manual commands ever needed
- Repository always up-to-date
- Others can view at: `github.com/ArikGarbuz/DailyStockMagazine`

🎉 **Fully automated stock magazine publication!**

---

## Next Steps

1. Complete the 3 setup steps above
2. Wait for next 4:20 PM weekday
3. Check Actions tab - you should see a ✅ checkmark
4. View published magazines in `magazines/` folder
5. Share the GitHub repo link with others!

---

**Need help?** GitHub Actions docs: https://docs.github.com/en/actions
