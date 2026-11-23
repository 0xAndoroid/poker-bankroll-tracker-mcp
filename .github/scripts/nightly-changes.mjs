import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";

const {
  GITHUB_EVENT_NAME: event,
  GITHUB_OUTPUT: output,
  GITHUB_REF: ref,
  GITHUB_REPOSITORY: repository,
  GITHUB_RUN_ID: runId,
  GITHUB_RUN_NUMBER: runNumber,
  GITHUB_SHA: sha,
} = process.env;

const mainRef = "refs/heads/main";
const shaPattern = /^[0-9a-f]{40}$/;
const positiveInteger = (value) => Number.isSafeInteger(value) && value > 0;

if (
  event !== "schedule" ||
  ref !== mainRef ||
  !output ||
  !/^[\w.-]+\/[\w.-]+$/.test(repository) ||
  !/^\d+$/.test(runId) ||
  !positiveInteger(Number(runId)) ||
  !/^\d+$/.test(runNumber) ||
  !positiveInteger(Number(runNumber)) ||
  !shaPattern.test(sha)
) {
  throw new Error("Expected a scheduled CI run on main with a repository, run number, and SHA.");
}

const actions = `repos/${repository}/actions`;
const workflow = api(`${actions}/workflows/ci.yml`);
if (!positiveInteger(workflow.id)) throw new Error("Missing CI workflow ID.");

const { workflow_runs: runs } = api(
  `${actions}/workflows/${workflow.id}/runs?branch=main&event=schedule&status=completed&per_page=100`,
);
if (!Array.isArray(runs)) throw new Error("Missing scheduled workflow runs.");

const earlier = runs
  .filter(
    (run) =>
      run.workflow_id === workflow.id &&
      run.event === "schedule" &&
      run.head_branch === "main" &&
      run.status === "completed" &&
      (run.conclusion === "success" || run.conclusion === "failure"),
  )
  .sort((left, right) => right.run_number - left.run_number);

const previous = earlier.find((run) => {
  if (!positiveInteger(run.id) || !positiveInteger(run.run_number)) {
    throw new Error("Invalid scheduled workflow run identity.");
  }
  if (run.id === Number(runId) || run.run_number >= Number(runNumber)) return false;
  if (!positiveInteger(run.run_attempt) || !shaPattern.test(run.head_sha)) {
    throw new Error("Invalid scheduled workflow run attempt or SHA.");
  }

  const { jobs } = api(`${actions}/runs/${run.id}/attempts/${run.run_attempt}/jobs?per_page=100`);
  if (!Array.isArray(jobs) || jobs.length === 0)
    throw new Error("Missing scheduled workflow jobs.");

  const suite = jobs.find((job) => job.name === "Lint, format, build, test");
  if (suite?.status !== "completed") return false;
  if (suite.conclusion === "skipped") {
    const preflight = jobs.find((job) => job.name === "Check for changes since the last nightly");
    return (
      run.conclusion === "success" &&
      preflight?.conclusion === "success" &&
      preflight.steps.some(
        (step) => step.name === "Skip unchanged SHA" && step.conclusion === "success",
      )
    );
  }

  return (
    (suite.conclusion === "success" || suite.conclusion === "failure") &&
    suite.steps.some(
      (step) =>
        step.name === "Run npm test" &&
        step.status === "completed" &&
        (step.conclusion === "success" || step.conclusion === "failure"),
    )
  );
});

appendFileSync(output, `run_suite=${previous?.head_sha !== sha}\n`);

function api(endpoint) {
  return JSON.parse(
    execFileSync("gh", ["api", endpoint], { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 }),
  );
}
