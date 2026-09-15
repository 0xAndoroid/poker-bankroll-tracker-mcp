## Contributing flow

branch → PR → CI green (`.github/workflows/ci.yml`) → merge; no direct pushes to main.

CI runs `npm ci`, `npm run lint`, `npm run format:check`, `npm run build`, and `npm test` on Node 22.
