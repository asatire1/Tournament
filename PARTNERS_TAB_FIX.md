# Partners Tab Always Visible - Quick Fix

## What Changed
The **Partners** tab now stays visible even when the Fairness tabs are hidden.

## Before
When you toggled "Hide Fairness Tabs" in Settings:
- ❌ Fairness tab disappeared
- ❌ Fairness 2 tab disappeared  
- ❌ **Partners tab also disappeared** (this was wrong!)

## After
When you toggle "Hide Fairness Tabs" in Settings:
- ✅ Fairness tab disappears
- ✅ Fairness 2 tab disappears
- ✅ **Partners tab stays visible** (correct!)

## Tab Order

### With Fairness Tabs Shown
```
Fixtures | Settings | Results | Results Matrix | Fairness | Fairness 2 | Partners | Knockout
```

### With Fairness Tabs Hidden
```
Fixtures | Settings | Results | Results Matrix | Partners | Knockout
```

## Technical Change
**File**: `js/main.js`

Moved the Partners tab button outside the conditional block:
```javascript
// Before: Partners was inside the conditional
${state.showFairnessTabs ? `
    <button>Fairness</button>
    <button>Fairness 2</button>
    <button>Partners</button>  ← Inside!
` : ''}

// After: Partners is outside the conditional
${state.showFairnessTabs ? `
    <button>Fairness</button>
    <button>Fairness 2</button>
` : ''}
<button>Partners</button>  ← Outside!
```

## Why This Makes Sense
The **Partners** tab shows the partnership matrix and opponent matrix - useful information that players want to see regardless of whether they care about the detailed fairness calculations.

The **Fairness** tabs (1 and 2) show advanced statistical analysis of fixture quality, which some organizers may not need.

## Status
✅ Fixed  
✅ Partners tab always visible  
✅ Fairness toggle works correctly  

## Download
[View updated file](computer:///mnt/user-data/outputs/padel-tournament/js/main.js)  
[Download complete package](computer:///mnt/user-data/outputs/padel-tournament.tar.gz)

---

**Partners tab now stays visible! 👥**

*File Changed: js/main.js*
