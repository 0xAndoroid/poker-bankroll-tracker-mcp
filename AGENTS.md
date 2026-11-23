## Contributing flow

branch → PR → CI green (`.github/workflows/ci.yml`) → merge; no direct pushes to main.

On Node 22, CI installs locked dependencies, checks lint and formatting, and builds. Pull requests that change more than Markdown or `LICENSE` also smoke-test the built CLI against a synthetic API response. The full `npm test` suite runs at 07:47 UTC daily and on manual dispatch, not on pull requests or pushes.
