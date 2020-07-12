let config = require("config");
let httpReq = require("request");
let util = require("util");
let validator = require("validator");
let logger = require("dvp-common-lite/LogHandler/CommonLogHandler.js").logger;

let token = config.Token;

let UploadNumber = function (
  phnNumber,
  campaignId,
  scheduleId,
  categoryId,
  companyId,
  tenantId,
  agentSkill,
  businessUnit,
  callback
) {
  try {
    logger.debug(
      "[DVP-AbandonedCallDialer.UploadNumber] -  Creating PUT Message"
    );

    let campIp = config.Campaign.ip;
    let campPort = config.Campaign.port;
    let campVersion = config.Campaign.version;

    if (campIp && campPort && campVersion) {
      let securityToken = "bearer " + token;

      let companyInfoHeader = tenantId + ":" + companyId;

      let httpUrl = util.format(
        "http://%s/DVP/API/%s/CampaignManager/AbandonedCampaign/%s/Schedule/%s",
        campIp,
        campVersion,
        campaignId,
        scheduleId
      );

      if (config.Campaign.dynamicPort || validator.isIP(campIp)) {
        httpUrl = util.format(
          "http://%s:%d/DVP/API/%s/CampaignManager/AbandonedCampaign/%s/Schedule/%s",
          campIp,
          campPort,
          campVersion,
          campaignId,
          scheduleId
        );
      }

      let jsonObj = {
        contact_no: phnNumber,
        CampaignId: campaignId,
        CamScheduleId: scheduleId,
        BusinessUnit: businessUnit,
        CategoryID: categoryId,
        ExtraData:
          '{"Skill":"' + agentSkill + '", "Type": "ABANDONED CALL CAMPAIGN"}',
      };

      let jsonStr = JSON.stringify(jsonObj);

      let options = {
        url: httpUrl,
        method: "POST",
        headers: {
          authorization: securityToken,
          companyinfo: companyInfoHeader,
          "content-type": "application/json",
        },
        body: jsonStr,
      };

      logger.debug(
        "[DVP-AbandonedCallDialer.UploadNumber] - Creating Api Url : %s, Body : %s",
        httpUrl,
        jsonStr
      );

      httpReq.post(options, function (error, response, body) {
        if (
          !error &&
          response.statusCode >= 200 &&
          response.statusCode <= 299
        ) {
          logger.debug(
            "[DVP-AbandonedCallDialer.UploadNumber] - Upload Number Success : %s",
            body
          );
          callback(null, true);
        } else {
          logger.error(
            "[DVP-AbandonedCallDialer.UploadNumber] - Upload Number Fail - Response : [%s]",
            JSON.stringify(response),
            error
          );
          callback(error, false);
        }
      });
    } else {
      logger.error(
        "[DVP-AbandonedCallDialer.UploadNumber] - Campaign Endpoints not defined",
        new Error("Campaign Endpoints not defined")
      );
      callback(new Error("Campaign Endpoints not defined"), false);
    }
  } catch (ex) {
    logger.error(
      "[DVP-AbandonedCallDialer.UploadNumber] - Exception Occurred",
      ex
    );
    callback(ex, false);
  }
};

module.exports.UploadNumber = UploadNumber;
