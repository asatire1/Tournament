# Quick Start: Using the Reset from JSON Feature

## What Changed?
Added a new button that lets you reload tournament data from your JSON files after editing them.

## Where Is It?
**Settings → Data → "Reset from JSON Files"** (Purple button)

## Quick Usage

### 1️⃣ Edit Your JSON Files
Edit any of these files on your local machine:
- `data/players.json` - Player names and ratings
- `data/fixtures.json` - Match fixtures
- `data/match-names.json` - Court/match names

### 2️⃣ Upload to Server
Replace the files on your web server with your edited versions.

### 3️⃣ Click the Button
1. Open your tournament website
2. Go to **Settings tab**
3. Click **Data subtab**
4. Scroll to **"🔄 Reset from JSON Files"**
5. Click the **purple button**
6. Enter passcode (default: 1234)
7. Confirm the reset

### 4️⃣ Done!
Your tournament now uses the new data from the JSON files.

## What Happens?
✅ Creates automatic backup of current state  
✅ Loads new data from JSON files  
✅ Clears all match scores  
✅ Updates Firebase  
✅ Refreshes the interface  

## Important Notes
⚠️ **All match scores will be cleared** (but a backup is created first)  
⚠️ **Requires web server** (not file://)  
⚠️ **Requires passcode** if app is locked  

## Recovery
If you need to undo:
1. Go to **Settings → Data → Saved Versions**
2. Find **"Auto-backup before JSON reset"**
3. Click **Load** to restore

## Example: Updating Player Names

**Before:**
```json
{ "id": 1, "name": "Abdul", "rating": 3.75 }
```

**After:**
```json
{ "id": 1, "name": "Abdul S.", "rating": 3.80 }
```

**Steps:**
1. Edit `data/players.json` with new name/rating
2. Upload to server
3. Click "Reset from JSON Files"
4. Player 1 now shows as "Abdul S." with rating 3.80

## Files Modified
Only **1 file** was changed to add this feature:
- ✅ `js/main.js` - Added the button to UI

All other files work as-is with no changes needed.

## Need Help?
- See `RESET_JSON_GUIDE.md` for detailed instructions
- See `BUTTON_LOCATION_GUIDE.md` for visual guide
- See `CHANGELOG.md` for technical details

---

**That's it!** The feature is ready to use. Just edit your JSON files and click the purple button to reload them! 🚀
