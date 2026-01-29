import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run health checks for all active deployments every 5 minutes
crons.interval(
    "health-check-all-deployments",
    { minutes: 5 },
    internal.actions.checkAllDeploymentsHealth
);

export default crons;
