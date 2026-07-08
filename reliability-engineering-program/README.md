# Reliability Engineering Program Tracker

A lightweight browser-based reliability engineering repository for building and running a reliability program at work.

## What it does

- Track equipment at functional hierarchy levels: Site, Area, System, Asset, Component
- Add and manage Work Orders
- Track failure events, failure modes, failure mechanisms, consequence, downtime, and corrective actions
- Generate reliability trends with one-click dashboard buttons
- Produce automatic analysis summaries
- Route items through cooperative review levels
- Export/import your data as JSON

## How to use on GitHub Pages

1. Create a new GitHub repository.
2. Upload `index.html`, `styles.css`, and `app.js` to the root of the repository.
3. Go to **Settings > Pages**.
4. Under **Build and deployment**, choose **Deploy from branch**.
5. Select the `main` branch and `/root` folder.
6. Open the published GitHub Pages link.

## Storage note

This version stores data in your browser using `localStorage`. That means the data stays on the computer/browser where you enter it. Use **Export JSON** regularly to back up your reliability records.

## Suggested program workflow

1. Build your equipment hierarchy.
2. Add work orders as they occur.
3. Log every failure event separately.
4. Review trends weekly or monthly.
5. Use the summary generator before reliability meetings.
6. Advance review levels from Initial Review to Reliability Review Board.

## Review levels included

- Draft
- Supervisor Review
- Maintenance Review
- Reliability Engineer Review
- Operations Review
- Reliability Review Board
- Closed / Implemented

## Future expansion ideas

- User login and shared database
- PDF report export
- Failure mode library by equipment type
- PM optimization recommendations
- RCA / 5-Why / Fishbone templates
- Risk matrix scoring
- Power BI export
