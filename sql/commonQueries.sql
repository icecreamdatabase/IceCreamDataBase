-- DB size on disk
SELECT table_name AS `Table`, round(((data_length + index_length) / 1024 / 1024), 2) `Size (MB)`
FROM information_schema.TABLES
WHERE table_schema = 'IceCreamDataBase'
ORDER BY `Size (MB)` desc;

-- How long been loggin
SELECT DATEDIFF(NOW(), MIN(TIMESTAMP))
FROM IceCreamDataBase.ttsLog;

-- amount in past 1 X
SELECT (SELECT COUNT(*) FROM ttsLog WHERE TIMESTAMP >= now() - INTERVAL 1 MINUTE) AS 'minute',
       (SELECT COUNT(*) FROM ttsLog WHERE TIMESTAMP >= now() - INTERVAL 1 HOUR)   AS 'hour',
       (SELECT COUNT(*) FROM ttsLog WHERE TIMESTAMP >= now() - INTERVAL 1 DAY)    AS 'day',
       (SELECT COUNT(*) FROM ttsLog WHERE TIMESTAMP >= now() - INTERVAL 1 WEEK)   AS 'week',
       (SELECT COUNT(*) FROM ttsLog WHERE TIMESTAMP >= now() - INTERVAL 1 MONTH)  AS 'month',
       (SELECT COUNT(*) FROM ttsLog)                                              AS 'total';

-- message stats for one channel
SELECT roomId,
       COUNT(*)                                         AS 'totalMsgs',
       ROUND(AVG(LENGTH(rawMessage)))                   AS 'avgChars',
       SUM(LENGTH(rawMessage))                          AS 'totalChars',
       ROUND(SUM(LENGTH(rawMessage)) / 1000000 * 4, 2)  AS 'standard$cost',
       ROUND(SUM(LENGTH(rawMessage)) / 1000000 * 6, 2)  AS 'standard$price',
       ROUND(SUM(LENGTH(rawMessage)) / 1000000 * 16, 2) AS 'neural$cost',
       ROUND(SUM(LENGTH(rawMessage)) / 1000000 * 25, 2) AS 'neural$price'
FROM ttsLog
WHERE TIMESTAMP >= '2020-07-17 16:24:27' - INTERVAL 1 MONTH
AND roomId = ?;

-- message stats per channel
SELECT ch.channelName,
       COUNT(tl.id)                                     as 'totalMsgs',
       ROUND(AVG(LENGTH(rawMessage)))                   AS 'avgChars',
       SUM(LENGTH(rawMessage))                          AS 'totalChars',
       ROUND(SUM(LENGTH(rawMessage)) / 1000000 * 4, 2)  AS 'standard$cost',
       ROUND(SUM(LENGTH(rawMessage)) / 1000000 * 6, 2)  AS 'standard$price',
       ROUND(SUM(LENGTH(rawMessage)) / 1000000 * 16, 2) AS 'neural$cost',
       ROUND(SUM(LENGTH(rawMessage)) / 1000000 * 25, 2) AS 'neural$price'
FROM ttsLog tl
         INNER JOIN channels ch ON ch.ID = tl.roomId
WHERE TIMESTAMP >= '2020-07-17 16:24:27' - INTERVAL 1 MONTH
GROUP BY ch.channelName
ORDER BY totalChars DESC;

SELECT COUNT(*)
FROM (
         SELECT channelName, totalChars
         FROM (
                  SELECT ch.channelName,
                         SUM(LENGTH(rawMessage)) AS 'totalChars'
                  FROM ttsLog tl
                           INNER JOIN channels ch ON ch.ID = tl.roomId
                  WHERE TIMESTAMP >= '2020-07-17 16:24:27' - INTERVAL 1 MONTH
                  GROUP BY ch.channelName
                  ORDER BY totalChars DESC
              ) AS dataInner
         WHERE totalChars < 5000
     ) AS dataOuter;


-- Average message length
SELECT ROUND(AVG(LENGTH(rawMessage))) AS `avgMsgLength`
FROM ttsLog;

-- Total messages per hour of day
SELECT COUNT(*), HOUR(TIMESTAMP) as 'hourOfTheDay'
FROM ttsLog
GROUP BY HOUR(TIMESTAMP);

-- Total messages per hour of day in the past 24 hours
SELECT HOUR(TIMESTAMP) as `hourOfTheDay`, COUNT(*) as `count`
FROM ttsLog
WHERE TIMESTAMP >= now() - INTERVAL 1440 MINUTE -- written like this to prevent weird bugs with the current hour
GROUP BY HOUR(TIMESTAMP);

-- Average messages per hour of day in the past week
SELECT `hour`, ROUND(AVG(`count`)) as `avg`
FROM (
         SELECT date(TIMESTAMP) as `day`,
                hour(TIMESTAMP) as `hour`,
                count(*)        as `count`
         FROM IceCreamDataBase.ttsLog
         WHERE TIMESTAMP >= now() - INTERVAL 10080 MINUTE -- 7 days
         GROUP BY `day`, `hour`
     ) s
GROUP BY `hour`;

-- Messages per day
SELECT DATE(TIMESTAMP) as 'date', COUNT(*)
FROM ttsLog
GROUP BY year(TIMESTAMP), month(TIMESTAMP), day(TIMESTAMP);

-- Top voice
SELECT voice, COUNT(voice) as 'MessageCount'
FROM ttsLog
-- WHERE TIMESTAMP >= now() - INTERVAL 1 WEEK
GROUP BY voice
ORDER BY MessageCount DESC;

-- Top channel
SELECT ch.channelName, COUNT(tl.id) as 'MessageCount'
FROM ttsLog tl
         INNER JOIN channels ch ON ch.ID = tl.roomId
GROUP BY ch.channelName
ORDER BY MessageCount DESC;

-- Amount of first ever messages per day
SELECT DATE(tl.TIMESTAMP) as 'date', COUNT(tl.roomId) as 'countFirstTtsUsed'
FROM ttsLog tl
         LEFT JOIN channels ch
                   ON tl.roomId = ch.ID
WHERE tl.TIMESTAMP = (
    SELECT MIN(tli.TIMESTAMP) as 'firstMsg'
    FROM ttsLog tli
    WHERE tli.roomId = tl.roomId
)
GROUP BY year(TIMESTAMP), month(TIMESTAMP), day(TIMESTAMP);

-- Amount of links in the past day
SELECT COUNT(tl.roomId) as 'linksInPastHour'
FROM ttsLog tl
         LEFT JOIN channels ch
                   ON tl.roomId = ch.ID
WHERE tl.TIMESTAMP = (
    SELECT MIN(tli.TIMESTAMP) as 'firstMsg'
    FROM ttsLog tli
    WHERE tli.roomId = tl.roomId
)
  AND tl.TIMESTAMP >= now() - INTERVAL 1 DAY;

-- TTS Connections without channelPointsSetting
SELECT *
FROM connections
WHERE (botID, channelID) IN (
    SELECT co2.botID, co2.channelID
    FROM channels ch
             LEFT JOIN connections co2
                       on ch.ID = co2.channelID
             LEFT JOIN channelPointsSettings cps
                       on co2.botID = cps.botID
                           and co2.channelID = cps.channelID
    WHERE co2.botID = 478777352
      AND cps.ttsCustomRewardId IS NULL
      AND co2.ttsRegisterEnabled = b'0'
);

-- channels without connections
SELECT *
FROM channels
WHERE ID IN (
    SELECT ch.ID
    FROM channels ch
             LEFT JOIN connections c
                       on ch.ID = c.channelID
    WHERE c.channelID IS NULL
      AND ch.ID NOT IN (
        SELECT auth.ID
        FROM auth
    )
      AND ch.enabled = b'1'
);
