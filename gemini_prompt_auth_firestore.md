# Prompt para pedirle a Gemini en AI Studio

Copia y pega esto directamente en el chat de AI Studio, dentro del proyecto de este dashboard:

---

Add persistent cloud storage and authentication to this dashboard app. Right now all data lives in React `useState` (see `App.tsx` — `dataWeeks`, `goals`, `audienceData`) and resets to the hardcoded `INITIAL_DATA` in `data.ts` on every page reload. I need this fixed properly, not with localStorage — with a real backend.

**What to build:**

1. **Firestore as the data store.**
   - Store the full `DashboardData` object (see `src/types.ts` for the shape: `generated`, `goals`, `weeks[]`, `audience`) in a single Firestore document, e.g. `dashboards/akwl-social`.
   - On app load, fetch this document from Firestore instead of using `INITIAL_DATA` directly (keep `INITIAL_DATA` only as a fallback/seed if the document doesn't exist yet).
   - When a user imports a JSON file (`handleFileUpload` in `App.tsx`) or the mock generator adds a week (`handleAddWeek`), merge it into state AND write the updated document back to Firestore, so it's saved permanently and every user sees the same data.
   - Use the existing Express server (already in `package.json` dependencies, deployed via Cloud Run) as the backend that talks to Firestore — don't call Firestore directly from the client. Expose two endpoints: `GET /api/dashboard` (returns the current DashboardData) and `POST /api/dashboard` (merges and saves new weeks/audience/goals, same merge logic currently in `handleFileUpload`).

2. **Auth — Google Sign-In restricted to specific people.**
   - Add Firebase Authentication with Google Sign-In as the only provider.
   - Restrict access to a fixed allow-list of email addresses (I'll provide the list — start with just `info@alaskawildlights.com` as the only allowed account, structured so I can easily add more emails later).
   - Show a simple sign-in screen before the dashboard loads if the user isn't authenticated or isn't on the allow-list.
   - Protect the `/api/dashboard` POST endpoint so only authenticated, allow-listed users can write data (reads can also require auth — no public access).

3. **Keep everything else exactly as is** — don't change the UI, the chart components, the CSV/PDF export, or the existing data schema in `types.ts`. This is purely a data-layer and auth change underneath the existing app.

4. Walk me through what Firebase config values I need to set (project setup, env vars) and where to add them, since this is a Cloud Run deployment through AI Studio.

---

**Nota:** si más adelante quieres agregar a más personas del equipo a la lista de acceso, se hace editando el allow-list de emails en el backend — dile a Gemini exactamente qué correos agregar cuando llegue el momento.
