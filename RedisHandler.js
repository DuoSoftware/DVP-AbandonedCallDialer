let redis = require("ioredis");
let Config = require("config");
let logger = require("dvp-common-lite/LogHandler/CommonLogHandler.js").logger;

let redisip = Config.Redis.ip;
let redisport = Config.Redis.port;
let redispass = Config.Redis.password;
let redismode = Config.Redis.mode;
let redisdb = Config.Redis.db;

let redisSetting = {
  port: redisport,
  host: redisip,
  family: 4,
  password: redispass,
  db: 10,
  retryStrategy: function (times) {
    var delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError: function (err) {
    return true;
  },
};

if (redismode == "sentinel") {
  if (
    Config.Redis.sentinels &&
    Config.Redis.sentinels.hosts &&
    Config.Redis.sentinels.port &&
    Config.Redis.sentinels.name
  ) {
    let sentinelHosts = Config.Redis.sentinels.hosts.split(",");
    if (Array.isArray(sentinelHosts) && sentinelHosts.length > 2) {
      let sentinelConnections = [];

      sentinelHosts.forEach(function (item) {
        sentinelConnections.push({
          host: item,
          port: Config.Redis.sentinels.port,
        });
      });

      redisSetting = {
        sentinels: sentinelConnections,
        name: Config.Redis.sentinels.name,
        password: redispass,
        db: 10,
      };
    } else {
      console.log("No enough sentinel servers found .........");
    }
  }
}

let client = undefined;

if (redismode != "cluster") {
  client = new redis(redisSetting);
} else {
  var redisHosts = redisip.split(",");
  if (Array.isArray(redisHosts)) {
    redisSetting = [];
    redisHosts.forEach(function (item) {
      redisSetting.push({
        host: item,
        port: redisport,
        family: 4,
        password: redispass,
      });
    });

    let client = new redis.Cluster([redisSetting]);
  } else {
    client = new redis(redisSetting);
  }
}

let ZAddObject = function (setname, key, value) {
  try {
    client.zadd(setname, key, value, function (err, response) {
      if (err) {
        logger.error("[DVP-AbandonedCallDialer.ZAddObject] - REDIS ERROR", err);
      }
    });
  } catch (ex) {
    logger.error("[DVP-AbandonedCallDialer.ZAddObject] - REDIS ERROR", ex);
  }
};

let ZRangeByScoreWithRemove = function (setname, minval, maxval, callback) {
  let emptyArr = [];
  try {
    client.zrangebyscore(setname, minval, maxval, function (err, response) {
      if (err) {
        logger.error(
          "[DVP-AbandonedCallDialer.ZRangeByScoreGet] - REDIS ERROR",
          err
        );
      }

      client.zremrangebyscore(setname, minval, maxval, function (
        errRem,
        responseRem
      ) {
        if (err) {
          logger.error(
            "[DVP-AbandonedCallDialer.ZRangeByScoreRemove] - REDIS ERROR",
            errRem
          );
        }

        callback(err, response);
      });
    });
  } catch (ex) {
    logger.error("[DVP-AbandonedCallDialer.ZRangeByScore] - REDIS ERROR", ex);
    callback(ex, emptyArr);
  }
};

client.on("error", function (msg) {});

module.exports.ZAddObject = ZAddObject;
module.exports.ZRangeByScoreWithRemove = ZRangeByScoreWithRemove;
