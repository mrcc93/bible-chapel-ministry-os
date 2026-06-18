# Bible Chapel Ministry Planner

React/Vite prototype for Bible Chapel's ministry planning dashboard.

## Latest visual update

This version has been rethemed to match the Bible Chapel logo:

- White app surfaces
- Dark Bible Chapel blue primary navigation
- Lighter blue cards, states, and chart accents
- Yellow highlight/CTA accents from the cross/logo
- Bible Chapel logo added to the sidebar
- Bulletin PDF and PowerPoint exports updated to use the blue/yellow theme

## Run locally

```bash
npm install
npm run dev
```

Open the local URL Vite prints, usually `http://localhost:5173`.

## Build

```bash
npm run build
npm run preview
```

## Important production note

This prototype stores data in the browser with localStorage. Before using it for real prayer requests, visitor details, attendance records, or pastoral contacts, add authentication, Cloudflare D1 storage, backups, and user permissions.
