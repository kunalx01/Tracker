# GATE CS Mission Tracker

A static GitHub Pages tracker for GATE preparation.

## Changes in this version

- Removed Daily Log.
- Removed Error Log.
- Removed Checkpoints and checkpoint markers.
- Daily streak is maintained using `activityDates`.
  - Editing any lecture/DPP progress automatically counts today.
  - You can also click **Mark today studied**.
- Overall progress is:

  **sum of all completed lectures + completed DPPs / sum of all lecture totals + DPP totals**

  across every subject. It is not an average of subject percentages.
- Every lecture and DPP **completed** and **total** value is editable.
- Data is saved to browser `localStorage`.
- If Firebase is configured and the user signs in, the same data is synced to Firestore across devices.
- Designed to run as a static site on GitHub Pages.

## Firebase setup

1. Create a Firebase project.
2. Enable **Authentication → Sign-in method → Email/Password**.
3. Create a Web App in Firebase and copy its config.
4. Put the config into `firebase-config.js`.
5. Create/enable Firestore Database.
6. Publish the rules from `firestore.rules`.
7. Upload these files to a GitHub repository.
8. Enable **Settings → Pages → Deploy from branch**.

### Important

Do not remove the Firestore rule requiring the signed-in user's UID to match the document ID. Each user's tracker is stored at:

`gateTracker/{userId}`

If Firebase is not configured, the tracker still works locally in the browser, but that local data will not automatically appear on another device/browser.
