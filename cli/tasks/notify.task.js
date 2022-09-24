const got = require("got");
const fs = require("fs-extra");
const path = require("path");
const { DateTime } = require("luxon");
const debug = require("debug")("notify");

const { createTask } = require("../task-runner");

module.exports = createTask("notify-hot-projects", async (context, options) => {
  const { logger } = context;
  const { channel, dryRun } = options;

  const slackURL = process.env.SLACK_DAILY_WEBHOOK;
  if (!slackURL) throw new Error('No "SLACK_WEBHOOK" env. variable defined');
  const discordURL = process.env.DISCORD_DAILY_WEBHOOK;
  if (!discordURL)
    throw new Error('No "DISCORD_WEBHOOK" env. variable defined');

  const projects = await fetchHottestProjects();

  logger.debug("Send the daily notification...", options);

  if (await notifySlack({ projects, url: slackURL, channel, dryRun })) {
    logger.info("Notification sent to Slack");
  }

  if (await notifyDiscord({ projects, url: discordURL, dryRun })) {
    logger.info("Notification sent to Discord");
  }
});

async function fetchHottestProjects() {
  const data = await readRankingsFile();
  const { projects } = data;

  const score = project =>
    project.trends.daily > 0 ? project.trends.daily : 0;

  const topProjects = projects
    .filter(isIncludedInHotProjects)
    .sort((a, b) => (score(a) > score(b) ? -1 : 1))
    .slice(0, 5);
  return topProjects;
}

const isIncludedInHotProjects = project => {
  const hotProjectsExcludedTags = ["meta", "learning"];

  const hasExcludedTag = hotProjectsExcludedTags.some(tag =>
    project.tags.includes(tag)
  );
  return !hasExcludedTag;
};

function readRankingsFile() {
  const filePath = path.join(process.cwd(), "build", "projects.json");
  return fs.readJson(filePath);
}

async function notifySlack({ projects, url, channel, dryRun }) {
  const text = `TOP 5 Hottest Projects Today (${formatTodayDate()})`;

  const attachments = projects.map((project, i) => {
    const stars = project.trends.daily;
    const text = `Number ${i + 1} +${stars} stars since yesterday:`;
    return projectToSlackAttachment(project, text);
  });

  if (dryRun) {
    console.info("[DRY RUN] No message sent to Slack", { text, attachments }); //eslint-disable-line no-console
    return;
  }

  await sendMessageToSlack(text, { url, channel, attachments });
  return true;
}

async function notifyDiscord({ projects, url, dryRun }) {
  const text = `TOP 5 Hottest Projects Today (${formatTodayDate()})`;
  const colors = ["9c0042", "d63c4a", "f76d42", "ffae63", "ffe38c"]; // hex colors without the `#`

  const embeds = projects.map((project, index) => {
    const stars = project.trends.daily;
    const text = `+${stars} stars since yesterday [number ${index + 1}]`;
    const color = colors[index];
    return projectToDiscordEmbed(project, text, color);
  });

  if (dryRun) {
    console.info("[DRY RUN] No message sent to Discord", { text, embeds }); //eslint-disable-line no-console
    return;
  }

  await sendMessageToDiscord(text, { url, embeds });
  return true;
}

// Convert a `project` object (from bestofjs API)
// into an "attachment" included in the Slack message
// See: https://api.slack.com/docs/message-attachments
function projectToSlackAttachment(project, pretext) {
  const url = project.url || `https://github.com/${project.full_name}`;
  const owner = project.full_name.split("/")[0];
  const author_name = owner;
  // `thumb_url` does not accept .svg files so we don't use project `logo` property
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

function projectToDiscordEmbed(project, text, color) {
  const url = project.url || `https://github.com/${project.full_name}`;
  const thumbnailSize = 50;
  return {
    type: "article",
    title: project.name,
    url,
    description: project.description,
    thumbnail: {
      url: `https://avatars.githubusercontent.com/u/${project.owner_id}?v=3&s=${thumbnailSize}`,
      width: thumbnailSize,
      height: thumbnailSize
    },
    color: parseInt(color, 16), // has to be a decimal number
    footer: { text } // a header would be better to introduce the project
  };
}

// Send a message to a Slack channel
async function sendMessageToSlack(text, { url, channel, attachments }) {
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

async function sendMessageToDiscord(text, { url, embeds }) {
  const body = {
    content: text,
    embeds
  };
  try {
    debug(`Sending webhook to ${url}`, body);
    const { body: bodyResponse, statusCode } = await got(url, {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" }
    });

    debug("Response", bodyResponse || "(No content)", statusCode);
    return true;
  } catch (error) {
    throw new Error(`Invalid response from Discord ${error.message}`);
  }
}

function formatTodayDate() {
  return DateTime.fromJSDate(new Date()).toLocaleString({
    month: "long",
    day: "numeric",
    weekday: "long"
  });
}
