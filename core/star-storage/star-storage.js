const { groupBy, flattenDeep, orderBy, takeRight } = require("lodash");
const mongoose = require("mongoose");
const { DateTime } = require("luxon");
const ObjectId = mongoose.Types.ObjectId;
const { produce } = require("immer");
const debug = require("debug")("star-storage");

function createStarStorage(collection) {
  async function getDocuments(projectId) {
    debug("Finding all snapshot documents...");
    const docs = await collection
      .find({ project: ObjectId(projectId) })
      .sort({ year: 1 })
      .toArray();
    debug(docs.length ? `${docs.length} docs found` : "No docs found");
    return docs;
  }

  async function getDocumentByYear(projectId, year) {
    debug("Finding snapshot document for year", year);
    const doc = await collection.findOne({
      project: ObjectId(projectId),
      year
    });
    return doc;
  }

  async function update(projectId, year, months) {
    if (!Array.isArray(months))
      throw new Error(
        'Unable to update the snapshots, "months" should not an array'
      );
    const query = { project: ObjectId(projectId), year };
    debug("Updating...", months[months.length - 1]);
    const { result } = await collection.updateOne(
      query,
      {
        $set: { months, updatedAt: new Date() },
        $setOnInsert: { createdAt: new Date() }
      },

      { upsert: true }
    );
    const { ok, nModified, upserted } = result;
    if (upserted) {
      debug("Snapshot document created");
    }
    if (nModified === 1) {
      debug("Snapshot document updated");
    }
    return ok === 1;
  }

  async function addSnapshot(
    projectId,
    stars,
    { year, month, day } = normalizeDate(new Date())
  ) {
    const doc = await getDocumentByYear(projectId, year);

    const currentMonths = doc ? doc.months : [];
    const updatedMonths = produce(currentMonths, months => {
      const monthItem = months.find(findByMonth(month));
      if (!monthItem) {
        months.push({ month, snapshots: [{ day, stars }] });
      } else {
        const existingSnapshot = monthItem.snapshots.find(findByDay(day));
        if (existingSnapshot) return false;
        monthItem.snapshots.push({ day, stars });
      }
    });

    if (updatedMonths === false) {
      debug(
        `No snapshot to add, a snapshot already exists for this day (${day})`
      );
      return false;
    }
    await update(projectId, year, updatedMonths);
    return true;
  }

  const findByMonth = month => item => item.month === month;
  const findByDay = day => item => item.day === day;

  async function getAllSnapshots(projectId) {
    const docs = await getDocuments(projectId);
    if (!docs) return [];
    return flattenDeep(
      docs.map(({ year, months }) =>
        months.map(({ month, snapshots }) =>
          snapshots.map(({ day, stars }) => ({ year, month, day, stars }))
        )
      )
    );
  }

  return {
    addSnapshot,

    getAllSnapshots,

    async computeAllTrends(projectId, { referenceDate = new Date() } = {}) {
      const snapshots = await getAllSnapshots(projectId);
      const trends = computeTrends(snapshots, referenceDate);
      const daily = computeDailyTrends(snapshots);
      const currentDate = normalizeDate(referenceDate);
      const monthly = computeMonthlyTrends(snapshots, { currentDate });
      return {
        trends,
        timeSeries: { daily, monthly }
      };
    },

    async getTrends(projectId, { referenceDate } = {}) {
      const snapshots = await getAllSnapshots(projectId);
      const trends = computeTrends(snapshots, referenceDate);
      return trends;
    },

    async getTimeSeries(projectId) {
      const currentDate = normalizeDate(new Date());
      const snapshots = await getAllSnapshots(projectId);
      const daily = computeDailyTrends(snapshots);
      const monthly = computeMonthlyTrends(snapshots, { currentDate });
      return {
        daily,
        monthly
      };
    }
  };
}

function diffDay(snapshot1, snapshot2) {
  const d1 = toDate(snapshot1);
  const d2 = toDate(snapshot2);

  return (d1 - d2) / 1000 / 3600 / 24;
}

function toDate({ year, month, day }) {
  return new Date(year, month - 1, day);
}

function normalizeDate(date) {
  const dt = DateTime.fromJSDate(date).setZone("Asia/Tokyo");
  const year = dt.year;
  const month = dt.month;
  const day = dt.day;
  return { year, month, day };
}

function computeTrends(snapshots, referenceDate = new Date()) {
  snapshots.reverse();
  const referenceSnapshot = snapshots.find(
    snapshot => toDate(snapshot) < referenceDate
  );

  const findSnapshotDaysAgo = days =>
    snapshots.find(snapshot => diffDay(referenceSnapshot, snapshot) >= days);

  const getDelta = days => {
    const snapshot = findSnapshotDaysAgo(days);
    if (!snapshot) return undefined;
    return referenceSnapshot.stars - snapshot.stars;
  };

  return {
    daily: getDelta(1),
    weekly: getDelta(7),
    monthly: getDelta(30),
    quarterly: getDelta(90),
    yearly: getDelta(365)
  };
}

function computeDailyTrends(snapshots, { count = 366 } = {}) {
  if (snapshots.length === 0) return [];
  snapshots = takeRight(orderBy(snapshots, toDate, "asc"), count);

  const value0 = snapshots[0].stars;
  return snapshots.slice(1).reduce(
    (acc, snapshot) => {
      return {
        deltas: acc.deltas.concat(snapshot.stars - acc.previous),
        previous: snapshot.stars
      };
    },
    { deltas: [], previous: value0 }
  ).deltas;
}

function computeMonthlyTrends(snapshots, { count = 12, currentDate } = {}) {
  if (snapshots.length === 0) return [];
  const total = (count + 1) * 31;
  snapshots = takeRight(orderBy(snapshots, toDate, "asc"), total);

  const grouped = groupBy(snapshots, ({ year, month }) => `${year}/${month}`);

  return Object.values(grouped)
    .map(group => {
      const firstSnapshot = group[0];
      const lastSnapshot = group[group.length - 1];
      const { year, month, stars, day } = firstSnapshot;
      return {
        year,
        month,
        firstDay: day,
        lastDay: lastSnapshot.day,
        delta: lastSnapshot.stars - stars
      };
    })
    .filter(({ firstDay }) => firstDay === 1)
    .filter(
      ({ year, month }) =>
        !(month === currentDate.month && year === currentDate.year)
    );
}

module.exports = {
  createStarStorage,
  normalizeDate,
  computeTrends,
  computeDailyTrends,
  computeMonthlyTrends
};
