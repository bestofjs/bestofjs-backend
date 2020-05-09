const got = require("got");
const fs = require("fs-extra");
const path = require("path");
const debug = require("debug")("notify");

const { createTask } = require("../task-runner");

module.exports = createTask("notify-hot-projects", async (context, options) => {
  const { logger } = context;
  const { channel, dryRun } = options;

  logger.debug("Send the daily notification...", options);
  const data = await readFile();
  const { projects } = data;
  logger.debug(`${projects.length} projects to scan`);
  await notify({ projects, channel, dryRun });
  logger.info("Notification sent to Slack");
});

function readFile() {
  const filePath = path.join(process.cwd(), "build", "projects.json");
  return fs.readJson(filePath);
}

function notify({ projects, channel, dryRun }) {
  const url = process.env.SLACK_DAILY_WEBHOOK;
  if (!url) throw new Error('No "SLACK_WEBHOOK" env. variable defined');
  const score = project =>
    project.trends.daily > 0 ? project.trends.daily : 0;
  const topProjects = projects
    .sort((a, b) => (score(a) > score(b) ? -1 : 1))
    .slice(0, 5);
  const options = { url, projects: topProjects, channel, dryRun };
  // In local, override the default Slack channel to avoid sending messages to the real channel
  if (!channel) channel = process.env.SLACK_CHANNEL_TEST;
  if (channel) options.channel = channel;
  return notifySuccess(options);
}

// Convert a `project` object (from bestofjs API)
// into an "attachment" included in the Slack message
// See: https://api.slack.com/docs/message-attachments
function projectToAttachment(project, pretext) {
  const url = project.url || `https://github.com/${project.full_name}`;
  const owner = project.full_name.split("/")[0];
  const author_name = owner;
  // `thumb_url` does not accept .svg files so we don't use project `icon` property
  const thumb_url = `https://avatars.githubusercontent.com/u/${project.owner_id}?v=3&s=75`;
  const attachment = {
    color: "#e65100",
    pretext,
    author_name,
    author_link: `https://github.com/${owner}`,
    title: project.name,
    title_link: url,
    text: project.description,
    thumb_url
  };
  return attachment;
}

// Send a message to a Slack channel
async function sendSlackMessage(text, { url, channel, attachments }) {
  const body = {
    text,
    mrkdwn: true,
    attachments
  };
  if (channel) {
    body.channel = `#${channel}`; // Override the default webhook channel, if specified (for tests)
  }

  debug("Request", body);
  try {
    const { body: bodyResponse } = await got(url, {
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" }
    });

    debug("Response", bodyResponse);
    return true;
  } catch (error) {
    throw new Error(`Invalid response from Slack ${error.message}`);
  }
}

function notifySuccess({ projects, url, channel, dryRun }) {
  const attachments = projects.map((project, i) => {
    const stars = project.trends.daily;
    const text = `Number ${i + 1} +${stars} stars since today:`;
    return projectToAttachment(project, text);
  });
  const text = "TOP 5 Hottest Projects Today";

  return dryRun
    ? console.info("[DRY RUN]", text, attachments) //eslint-disable-line no-console
    : sendSlackMessage(text, { url, channel, attachments });
}
