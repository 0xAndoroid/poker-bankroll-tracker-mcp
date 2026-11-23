## Contributing flow

branch → PR → CI green (`.github/workflows/ci.yml`) → merge; no direct pushes to main.

On Node 22, CI installs locked dependencies, checks lint and formatting, and builds. Pull requests that change more than Markdown or `LICENSE` also smoke-test the built CLI against a synthetic API response. The 07:47 UTC nightly skips the build and `npm test` when the commit SHA matches the latest earlier completed nightly on `main`, including a failure but not a cancellation. Manual dispatch always runs the full suite. Pull requests and pushes never run it.
