let config = require('config');
let httpReq = require('request');
let util = require('util');
let validator = require('validator');
let logger = require('dvp-common/LogHandler/CommonLogHandler.js').logger;

let token = config.Token;

let UploadNumber = function(phnNumber, campaignId, scheduleId, categoryId, companyId, tenantId, callback)
{
    try
    {
        logger.debug('[DVP-AbandonedCallDialer.UploadNumber] -  Creating PUT Message');

        let phnNumArr = [];
        phnNumArr.push(phnNumber);

        let campIp = config.Campaign.ip;
        let campPort = config.Campaign.port;
        let campVersion = config.Campaign.version;

        if(campIp && campPort && campVersion)
        {
            let securityToken = 'bearer ' + token;

            let companyInfoHeader = tenantId + ':' + companyId;

            let httpUrl = util.format('http://%s/DVP/API/%s/CampaignManager/CampaignNumbers', campIp, campVersion);

            if(validator.isIP(campIp))
            {
                httpUrl = util.format('http://%s:%d/DVP/API/%s/CampaignManager/CampaignNumbers', campIp, campVersion);
            }

            let jsonObj = { Contacts: phnNumArr, CampaignId: campaignId, CamScheduleId: scheduleId, CategoryID: categoryId };

            let jsonStr = JSON.stringify(jsonObj);

            let options = {
                url: httpUrl,
                method: 'POST',
                headers: {
                    'authorization': securityToken,
                    'companyinfo': companyInfoHeader,
                    'content-type': 'application/json'
                },
                body: jsonStr
            };

            logger.debug('[DVP-AbandonedCallDialer.UploadNumber] - Creating Api Url : %s, Body : %s', httpUrl, jsonStr);


            httpReq.post(options, function (error, response, body)
            {
                if (!error && response.statusCode >= 200 && response.statusCode <= 299)
                {
                    logger.debug('[DVP-AbandonedCallDialer.UploadNumber] - Upload Number Success : %s', body);
                    callback(null, true);
                }
                else
                {
                    logger.error('[DVP-AbandonedCallDialer.UploadNumber] - Upload Number Fail - Response : [%s]', JSON.stringify(response), error);
                    callback(error, false);
                }
            })
        }
        else
        {
            logger.error('[DVP-AbandonedCallDialer.UploadNumber] - Campaign Endpoints not defined', new Error('Campaign Endpoints not defined'));
            callback(new Error('Campaign Endpoints not defined'), false);
        }

    }
    catch(ex)
    {
        logger.error('[DVP-AbandonedCallDialer.UploadNumber] - Exception Occurred', ex);
        callback(ex, false);
    }
};

module.exports.UploadNumber = UploadNumber;