// Higgsfield Seedance 2.5 text-to-video example. Makes a billable request.
// Run: node index.ts (credentials come from HF_CREDENTIALS, optionally via .env.local)
import { existsSync } from "node:fs";
import { createHiggsfieldClient } from "@higgsfield/client/v2";

const MODEL = "bytedance/seedance-2.5/text-to-video";

// Values already present in the environment take precedence over the file.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const credentials = process.env["HF_CREDENTIALS"];
if (credentials === undefined || credentials.trim() === "") {
  console.error("HF_CREDENTIALS is not set. Add it to .env.local as key-id:key-secret.");
  process.exit(1);
}

const client = createHiggsfieldClient({
  credentials: credentials.trim(),
  // Video generation can outlast the SDK's 5-minute default polling window.
  maxPollTime: 20 * 60 * 1000,
});

try {
  const response = await client.subscribe(MODEL, {
    input: {
      prompt: "A cinematic scene at sunset",
      duration: 5,
      resolution: "720p",
      aspect_ratio: "16:9",
    },
    withPolling: true,
  });

  // subscribe() resolves with the final request status payload, not a JobSet.
  const status: string = response.status;
  const videoUrl = response.video?.url;
  if (status === "completed" && videoUrl !== undefined && videoUrl !== "") {
    console.log(`Request ${response.request_id} completed.`);
    console.log(`Video URL: ${videoUrl}`);
  } else {
    const outcome =
      status === "nsfw"
        ? "was rejected by content moderation"
        : status === "failed"
          ? "failed"
          : status === "canceled" || status === "cancelled"
            ? "was canceled"
            : status === "completed"
              ? "completed without a video URL"
              : `ended with status "${status}"`;
    console.error(`Request ${response.request_id} ${outcome}; no video was generated.`);
    process.exitCode = 1;
  }
} catch (error) {
  // Report only the error type and message; never the request configuration.
  const name = error instanceof Error ? error.name : "Error";
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Generation request failed: ${name}: ${message}`);
  process.exitCode = 1;
}
