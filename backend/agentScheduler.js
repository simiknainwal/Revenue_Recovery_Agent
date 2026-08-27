const cron = require("node-cron");
const { processDueCases } = require("./agentProcessor");

function startAgentScheduler() {

    // Run every 5 minutes
    cron.schedule("*/5 * * * *", async () => {

        console.log("\n[AGENT] Checking for due recovery cases...");

        try {

            const result = await processDueCases();

            console.log(
                `[AGENT] Found ${result.totalDueCases} due case(s)`
            );

            if (result.totalDueCases > 0) {

                console.log(
                    "[AGENT] Processing result:",
                    result.processedCases
                );
            }

        } catch (err) {

            console.error(
                "[AGENT] Automatic processing failed:",
                err.message
            );
        }
    });

    console.log(
        "[AGENT] Automatic recovery scheduler started (every 5 minutes)"
    );
}

module.exports = { startAgentScheduler };