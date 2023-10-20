# How Best of JS works

At its core, Best of JS is made of a MongoDB database with the following collections:

- `projects`: the 2800 projects we track, linked to one GitHub repo and optionally one NPM package
- `tags`: the 230 tags assigned to projects (made of a label and a `code` used in URLs)
- `heroes`: the 160 Hall of Fame members, linked to N projects
- `snapshots`: where we store the number of stars for each project. We create one record by project and by year.

The projects, tags and heroes are created and updated manually.
The snapshots are created and updated by a daily CRON job running every day.
The daily CRON also updates the `github` section of the projects record (which is useful as repositories often move from one org to another, or have their description updated)

To display the trends ("Hottest projects today"), the web application does not query directly the database, it queries aggregated data we prepare every day.
After the snapshots are taken, we compute the trends (daily, weekly, monthly) and generate a JSON file that include data to be consumed by the web application.

JSON data is made available at https://bestofjs-static-api.vercel.app, it's what we call the "static API" built by `static-api` project on Vercel.
It used to be loaded entirely by the browser in the original SPA when the application loads. Now it's the Next.js server-side code that fetches it and returns back to the client only sub parts of the JSON,


## MongoDB sample data

### Projects

What we store for React projects

```js
{
  _id: ObjectId("55***75c"),
  name: 'React',
  description: 'A declarative, efficient, and flexible JavaScript library for building user interfaces.\r\n',
  url: '',
  repository: 'https://github.com/facebook/react',
  createdAt: ISODate("2015-04-25T00:00:00.000Z"),
  updatedAt: ISODate("2018-01-02T12:44:13.900Z"),
  tags: [
    ObjectId("5568e47e355ea6282ecae9b9"),
    ObjectId("565a8ec63e403f0300e42da0"),
    ObjectId("5568e488355ea6282ecae9e4")
  ],
  github: {
    name: 'react',
    full_name: 'facebook/react',
    description: 'The library for web and native user interfaces.',
    homepage: 'https://react.dev',
    stargazers_count: 214319,
    pushed_at: ISODate("2023-10-19T19:02:14.000Z"),
    last_commit: ISODate("2023-10-19T17:41:16.000Z"),
    branch: 'main',
    owner_id: 69631,
    topics: [
      'javascript',
      'react',
      'frontend',
      'declarative',
      'ui',
      'library'
    ],
    commit_count: 16030,
    contributor_count: 1633,
    created_at: ISODate("2013-05-24T16:15:54.000Z"),
    archived: false,
    updatedAt: ISODate("2023-10-19T21:20:22.224Z")
  },
  __v: 216,
  npm: {
    name: 'react',
    version: '18.2.0',
    dependencies: [ 'loose-envify' ],
    deprecated: false
  },
  twitter: 'reactjs',
  packageSize: { installSize: 337013, publishSize: 316108, version: '18.2.0' },
  override_url: false,
  downloads: { monthly: 93536160 },
  aliases: [],
  logo: 'react.svg',
  deprecated: false,
  disabled: false,
  bundle: {
    name: 'react',
    version: '18.2.0',
    gzip: 2998,
    size: 7478,
    updatedAt: ISODate("2023-04-16T03:47:33.204Z"),
    duration: 426
  },
  status: 'featured'
}
```



### Snapshots

A document in the `snapshots`` collection stores the number of stars of a given project for every day of given yeae year.
It's made of an array of 12 months that contain a `snapshots` for every day, every snapshot has the day number (from 0 to 31) and the number of stars this day.

```js
{
  _id: ObjectId("63b0a78edd05691d8a101bcf"),
  project: ObjectId("558dc98489fc680300dfa5aa"),
  year: 2023,
  createdAt: ISODate("2022-12-31T21:20:14.565Z"),
  months: [
    {
      month: 1,
      // data for January 2023
      snapshots: [
        { day: 1, stars: 59053 },
        { day: 2, stars: 59052 },
        { day: 3, stars: 59059 },
        { day: 4, stars: 59060 },
        { day: 5, stars: 59064 },
        { day: 6, stars: 59071 },
        { day: 7, stars: 59074 },
        { day: 8, stars: 59077 },
        { day: 9, stars: 59082 }
        // ...
        // until day: 31
      ]
    },
    {
      month: 2,
      // same thing for February
      snapshots: [
        // data from day 1 to day 28
      ]
    }
  ]
}        
```

## Aggregated JSON data

JSON aggregated data contains all the projects available in the UI, with an object `trends` that is computed everyday from the snapshots.

```json
{
  "date": "2023-10-20T03:38:07.893Z",
  "tags": [
    {
      "name": "Flux",
      "description": "Implementation of `Flux` event and state management system",
      "code": "flux"
    },
    {
      "name": "Redux",
      "code": "redux",
      "description": "Ecosystem related to `Redux` library"
    },
    { "name": "State management", "code": "state" }
  ],
  "projects": [
    {
      "name": "Redux",
      "full_name": "reduxjs/redux",
      "description": "Predictable state container for JavaScript apps",
      "stars": 60015,
      "trends": { "daily": 8, "weekly": 37, "monthly": 90, "yearly": 1239 },
      "tags": ["state", "flux", "redux"],
      "contributor_count": 960,
      "pushed_at": "2023-09-10",
      "owner_id": 13142323,
      "created_at": "2015-05-29",
      "url": "https://redux.js.org",
      "npm": "redux",
      "downloads": 38488076,
      "icon": "redux.svg",
      "isFeatured": true
    },
    { "//comment": "and many more projects!" }
  ]
}
```