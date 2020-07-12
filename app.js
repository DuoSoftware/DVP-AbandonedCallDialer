let mongomodels = require("dvp-mongomodels");
let mongoOp = require("./MongoDBOperations.js");
let redisHandler = require("./RedisHandler.js");
let campManagerService = require("./CampaignManagerService.js");
let dbHandler = require("./DBHandler.js");
let config = require("config");
let amqp = require("amqp");
let logger = require("dvp-common-lite/LogHandler/CommonLogHandler.js").logger;
let async = require("async");

let redialConfig = {};

let getAbandonConfig = function () {
  logger.debug(
    "[DVP-AbandonedCallDialer.GetAbandonConfig] - Getting Abandon Configuration"
  );
  mongoOp.GetAbandonCallRedialConfig(function (err, redialConf) {
    redialConfig = redialConf;
    logger.debug(
      "[DVP-AbandonedCallDialer.GetAbandonConfig] - %s",
      JSON.stringify(redialConfig)
    );
  });
};

getAbandonConfig();

let ips = [];
if (config.RabbitMQ.ip) {
  ips = config.RabbitMQ.ip.split(",");
}

let connection = amqp.createConnection(
  {
    host: ips,
    port: config.RabbitMQ.port,
    login: config.RabbitMQ.user,
    password: config.RabbitMQ.password,
    vhost: config.RabbitMQ.vhost,
    noDelay: true,
    heartbeat: 10,
  },
  {
    reconnect: true,
    reconnectBackoffStrategy: "linear",
    reconnectExponentialLimit: 120000,
    reconnectBackoffTime: 1000,
  }
);

connection.on("connect", function () {
  logger.debug(
    "[DVP-AbandonedCallDialer.AMQPConnection] - [%s] - AMQP Connection CONNECTED"
  );
});

connection.on("ready", function () {
  amqpConState = "READY";

  logger.debug(
    "[DVP-AbandonedCallDialer.AMQPConnection] - [%s] - AMQP Connection READY"
  );

  connection.queue(
    "ABANDONED_CALLS",
    { durable: true, autoDelete: false },
    function (q) {
      q.bind("#");

      // Receive messages
      q.subscribe(function (message) {
        logger.debug(
          "================ ABANDON CDR RECEIVED FROM QUEUE - UUID : " +
            message.Uuid +
            " ================"
        );

        console.log("++++" + JSON.stringify(redialConfig));

        if (
          redialConfig[message.CompanyId] &&
          redialConfig[message.CompanyId].redialTime &&
          redialConfig[message.CompanyId].redialCampaignId &&
          message.QueueSec > redialConfig[message.CompanyId].abandonThreshold
        ) {
          if (
            message.BusinessUnit &&
            redialConfig[message.CompanyId].businessUnits &&
            redialConfig[message.CompanyId].businessUnits.length > 0
          ) {
            //Check
            if (
              redialConfig[message.CompanyId].businessUnits.indexOf(
                message.BusinessUnit
              ) > -1
            ) {
              logger.debug("Business Unit found on redial config");
              let hangupTime = new Date(message.HangupTime);
              hangupTime.setMinutes(
                hangupTime.getMinutes() +
                  redialConfig[message.CompanyId].redialTime
              );
              let timestamp = hangupTime.getTime();

              let campObject = {
                CampaignId: redialConfig[message.CompanyId].redialCampaignId,
                PhoneNumber: message.SipFromUser,
                Uuid: message.Uuid,
                CompanyId: message.CompanyId,
                TenantId: message.TenantId,
                HangupTime: message.HangupTime,
                CamScheduleId: redialConfig[message.CompanyId].camScheduleId,
                CategoryId: redialConfig[message.CompanyId].categoryId,
                AgentSkill: message.AgentSkill,
                BusinessUnit: message.BusinessUnit,
              };

              logger.debug("Adding object to redis");

              redisHandler.ZAddObject(
                "abandonedcalls",
                timestamp,
                JSON.stringify(campObject)
              );
            } else {
              logger.debug("Redial Config Not Found For BU");
            }
          } else {
            //Call is an abandon call - Add to Redis
            logger.debug("Routing to default company abandon calls");
            let hangupTime = new Date(message.HangupTime);
            hangupTime.setMinutes(
              hangupTime.getMinutes() +
                redialConfig[message.CompanyId].redialTime
            );
            let timestamp = hangupTime.getTime();

            let campObject = {
              CampaignId: redialConfig[message.CompanyId].redialCampaignId,
              PhoneNumber: message.SipFromUser,
              Uuid: message.Uuid,
              CompanyId: message.CompanyId,
              TenantId: message.TenantId,
              HangupTime: message.HangupTime,
              CamScheduleId: redialConfig[message.CompanyId].camScheduleId,
              CategoryId: redialConfig[message.CompanyId].categoryId,
              AgentSkill: message.AgentSkill,
              BusinessUnit: message.BusinessUnit,
            };

            logger.debug("Adding object to redis");

            redisHandler.ZAddObject(
              "abandonedcalls",
              timestamp,
              JSON.stringify(campObject)
            );
          }
        } else {
          logger.debug("Redial Config Not Found");
        }
      });
    }
  );
});

connection.on("error", function (e) {
  logger.error(
    "[DVP-AbandonedCallDialer.MAIN] - [%s] - AMQP Connection ERROR",
    e
  );
  amqpConState = "CLOSE";
});

let CheckIsCallConnectedAndAddToCampaign = function (redialObj, callback) {
  dbHandler.CheckCustomerCall(
    redialObj.PhoneNumber,
    redialObj.CompanyId,
    redialObj.TenantId,
    redialObj.Uuid,
    redialObj.HangupTime,
    function (err, count) {
      if (err) {
        logger.error(
          "[DVP-AbandonedCallDialer.CheckIsCallConnectedAndAddToCampaign] - Error",
          err
        );

        callback(null, true);
      } else {
        if (count > 0) {
          //stop operation

          logger.debug(
            "[DVP-AbandonedCallDialer.CheckIsCallConnectedAndAddToCampaign] - Caller has contacted"
          );

          callback(null, true);
        } else {
          campManagerService.UploadNumber(
            redialObj.PhoneNumber,
            redialObj.CampaignId,
            redialObj.CamScheduleId,
            redialObj.CategoryId,
            redialObj.CompanyId,
            redialObj.TenantId,
            redialObj.AgentSkill,
            redialObj.BusinessUnit,
            (err, result) => {
              callback(null, true);
            }
          );
        }
      }
    }
  );
};

let CheckForNumbers = function () {
  let currenttimestamp = new Date().getTime();
  let asyncFuncArr = [];
  redisHandler.ZRangeByScoreWithRemove(
    "abandonedcalls",
    0,
    currenttimestamp,
    (err, result) => {
      if (result.length > 0) {
        result.forEach((obj) => {
          asyncFuncArr.push(
            CheckIsCallConnectedAndAddToCampaign.bind(this, JSON.parse(obj))
          );
        });

        async.parallel(asyncFuncArr, function (err, results) {
          setTimeout(CheckForNumbers, 20000);
        });
      } else {
        setTimeout(CheckForNumbers, 20000);
      }
    }
  );
};

CheckForNumbers();

setInterval(() => {
  getAbandonConfig();
}, 60000);
