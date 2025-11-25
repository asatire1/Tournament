# Reset from JSON Feature Guide

## Overview
The "Reset from JSON Files" button allows you to reload all tournament data from your JSON files after making edits. This is useful when you want to:
- Update player names and ratings
- Modify fixture arrangements
- Change court/match names
- Start fresh with updated base data

## Location
The button is located in:
**Settings Tab → Data Subtab → "Reset from JSON Files" section**

## How to Use

### Step 1: Edit Your JSON Files
Edit the JSON files in the `data/` folder:

- **players.json** - Player names and skill ratings
- **fixtures.json** - Match fixtures for all 13 rounds
- **match-names.json** - Court names and knockout match labels

### Step 2: Upload Updated Files
Replace the JSON files on your web server with your edited versions.

### Step 3: Click the Reset Button
1. Navigate to **Settings → Data**
2. Scroll to the "🔄 Reset from JSON Files" section
3. Click the purple **"Reset from JSON Files"** button
4. Enter your passcode when prompted (if locked)
5. Confirm the reset action

### Step 4: Automatic Backup
The system will automatically:
- Create a backup of your current state (named "Auto-backup before JSON reset")
- Load the new data from JSON files
- Clear all existing match scores
- Save the new configuration to Firebase
- Refresh the interface

## What Gets Reset

✅ **Reset (loaded from JSON):**
- Player names
- Skill ratings
- Fixture arrangements
- Court/match names

❌ **Not Reset:**
- Previous backups/versions (preserved)
- Your saved versions list

## Important Notes

1. **Requires Web Server**: This feature only works when running from a web server (http:// or https://), not from local files (file://)

2. **Passcode Protected**: You must unlock the app first (default passcode: 1234)

3. **Automatic Backup**: Your current state is automatically backed up before reset, so you can restore it later if needed

4. **Scores Cleared**: All match scores (both fixture rounds and knockout) are cleared during reset

5. **JSON Validation**: Make sure your JSON files are valid - the app will show an error if they're malformed

## Example Workflow

```
1. Current state: Tournament in progress with scores
2. Edit players.json locally (change player names/ratings)
3. Upload new players.json to server
4. Click "Reset from JSON Files"
5. Confirm the action
6. System creates backup + loads new data
7. Continue tournament with updated player info
```

## Recovery

If you need to restore your previous state:
1. Go to **Settings → Data**
2. Scroll to "Saved Versions"
3. Find the "Auto-backup before JSON reset" entry
4. Click **"Load"** to restore

## Troubleshooting

### Error: "You are running from file://"
- You must run the app from a web server
- Use a local server (Python: `python -m http.server 8000`)
- Or deploy to a web hosting service

### Error: "JSON files not found"
- Check that files exist in `data/` folder relative to index.html
- Verify folder structure:
  ```
  index.html
  js/
  css/
  data/
    ├── players.json
    ├── fixtures.json
    └── match-names.json
  ```

### Error: "JSON files are invalid"
- Validate your JSON syntax using jsonlint.com
- Check for missing commas, brackets, or quotes
- Ensure proper formatting

## JSON File Formats

### players.json
```json
{
  "players": [
    { "id": 1, "name": "Player Name", "rating": 3.75 },
    ...
  ]
}
```

### fixtures.json
```json
{
  "1": [
    { "team1": [1, 4], "team2": [2, 3] },
    ...
  ],
  ...
}
```

### match-names.json
```json
{
  "fixtureMatches": {
    "1": "Court 3",
    ...
  },
  "knockoutMatches": {
    "qf1": "QF1",
    ...
  }
}
```

---

**Button Color**: Purple (`bg-purple-500`)  
**Security**: Requires passcode unlock  
**Backup**: Automatic before reset  
**Location**: Settings → Data → Reset from JSON Files
