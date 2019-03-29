let AbandonRedialConfig = require('dvp-mongomodels/model/AbandonRedialConfig');
let logger = require('dvp-common/LogHandler/CommonLogHandler.js').logger;

function GetAbandonCallRedialConfig(callback){
    logger.debug("DVP-AbandonedCallDialer.GetAbandonCallRedialConfig");

    let redialConfig = {};

    AbandonRedialConfig.find(function (err, abandConfigList) {
        if (err) {
            logger.error("DVP-AbandonedCallDialer.GetAbandonCallRedialConfig - Error Loading Abandoned Call Config", err)
        }

        if(abandConfigList.length > 0)
        {
            abandConfigList.forEach(config=>{
                redialConfig[config.company] = config;
            })

        }

        callback(err, redialConfig)
    });
}

module.exports.GetAbandonCallRedialConfig = GetAbandonCallRedialConfig;