import fs from "fs-extra";
import path from "node:path";
import { orderBy } from "lodash";
import { Category, Project } from "./types";

const filterProjects = require("./filter-projects");
// import { Category } from "./types";

const root = "/Users/michaelrambeau/dev/bestofjs/javascript-risingstars";

async function main() {
  const year = parseInt(process.argv[2]);

  const categories = await fetchCategories(year);
  const { projects } = await fetchProjectData(year);
  console.log(
    `Cleanup Rising Stars ${year}`,
    projects.length,
    "projects",
    categories.length,
    "categories"
  );

  const sortedProjects = orderBy(projects, "delta", "desc");

  const selectedProjects = filterProjects(sortedProjects, categories);

  console.log("Done", projects.length, "=>", selectedProjects.length);
  await generateJson(year, selectedProjects);
}

main();

async function fetchCategories(year: number) {
  const filepath = path.resolve(
    root,
    "data",
    year.toString(),
    "categories.json"
  );
  return await fs.readJSON(filepath);
}

async function fetchProjectData(year: number) {
  const filepath = path.resolve(root, "data", year.toString(), "projects.json");
  return await fs.readJSON(filepath);
}

async function generateJson(year: number, projects: Project[]) {
  try {
    const data = {
      date: new Date(),
      count: projects.length,
      projects
    };
    const filepath = path.resolve(
      process.cwd(),
      "build",
      // "rising-stars",
      `projects-${year}.json`
    );
    console.log("Output:", filepath);
    await fs.writeJson(filepath, data);
    console.log("OK!");
  } catch (err) {
    console.error(err);
  }
}
