import type { connectDb } from "$lib/connectDb";
import { dayjs, type Dayjs } from "$lib/consts";
import { calculateScreenTime, totalFromDurations } from "./screenTime";
import { likedTweets, retweets } from "../../schema";
import { and, desc, gte } from "drizzle-orm";

export function getMinDate() {
  return dayjs
    .tz(undefined, "America/Argentina/Buenos_Aires")
    .startOf("day")
    .subtract(7, "day");
}

type LikedTweetDate = {
  firstSeenAt: Date;
};
type RetweetDate = {
  retweetAt: Date;
};

export function makeMapOfDays<T>(
  days: Array<Date>,
  array: Array<T>,
  x: (arg: T) => Date,
) {
  let map = new Map<number, Array<T>>();
  for (const t of array) {
    const day = days.find((day) => {
      const y = x(t);
      return y > day && +y < +day + 24 * 60 * 60 * 1000;
    });
    if (day) {
      const key = +day;
      let oldArray = map.get(key) ?? [];
      map.set(key, [...oldArray, t]);
    }
  }
  return map;
}

export function week(
  endDate: Dayjs,
  allLiked: Array<LikedTweetDate>,
  allRetweets: Array<RetweetDate>,
) {
  const lastDay = endDate
    .tz("America/Argentina/Buenos_Aires")
    .startOf("day");

  const days = [
    // también cambiar en getMinDate
    lastDay.subtract(7, "day"),
    lastDay.subtract(6, "day"),
    lastDay.subtract(5, "day"),
    lastDay.subtract(4, "day"),
    lastDay.subtract(3, "day"),
    lastDay.subtract(2, "day"),
    lastDay.subtract(1, "day"),
    lastDay,
  ];

  const dayDates = days.map((d) => d.toDate());

  const likedMap = makeMapOfDays(dayDates, allLiked, (t) => t.firstSeenAt);
  const retweetedMap = makeMapOfDays(dayDates, allRetweets, (t) => t.retweetAt);

  const x = days.map((day) => {
    const tweets = likedMap.get(+day.toDate()) ?? [];
    const retweets = retweetedMap.get(+day.toDate()) ?? [];
    return {
      day: day.format("YYYY-MM-DD"),
      tweets,
      retweets,
      screenTime: totalFromDurations(calculateScreenTime(tweets)),
    };
  });
  return x;
}

export function lastWeek(
  allLiked: Array<LikedTweetDate>,
  allRetweets: Array<RetweetDate>,
) {
  return week(dayjs(), allLiked, allRetweets)
}

export async function getDataForLastWeek(
  db: Awaited<ReturnType<typeof connectDb>>,
  minDate: Dayjs,
): Promise<[Array<{ firstSeenAt: Date }>, Array<{ retweetAt: Date }>]> {
  return await Promise.all([
    db.query.likedTweets.findMany({
      columns: {
        firstSeenAt: true,
      },
      orderBy: desc(likedTweets.firstSeenAt),
      where: and(gte(likedTweets.firstSeenAt, minDate.toDate())),
    }),
    db.query.retweets.findMany({
      columns: {
        retweetAt: true,
      },
      orderBy: desc(retweets.retweetAt),
      where: and(gte(retweets.retweetAt, minDate.toDate())),
    }),
  ]);
}
