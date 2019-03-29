let mongomodels = require('dvp-mongomodels');
let mongoOp = require('./MongoDBOperations.js');
let redisHandler = require('./RedisHandler.js');
let campManagerService = require('./CampaignManagerService.js');
let dbHandler = require('./DBHandler.js');
let config = require('config');
let amqp = require('amqp');
let logger = require('dvp-common/LogHandler/CommonLogHandler.js').logger;
let async = require('async');

let redialConfig = {};

mongoOp.GetAbandonCallRedialConfig(function(err, redialConf)
{
    redialConfig = redialConf
});


let ips = [];
if(config.RabbitMQ.ip) {
    ips = config.RabbitMQ.ip.split(",");
}


let connection = amqp.createConnection({
    host: ips,
    port: config.RabbitMQ.port,
    login: config.RabbitMQ.user,
    password: config.RabbitMQ.password,
    vhost: config.RabbitMQ.vhost,
    noDelay: true,
    heartbeat:10
}, {
    reconnect: true,
    reconnectBackoffStrategy: 'linear',
    reconnectExponentialLimit: 120000,
    reconnectBackoffTime: 1000
});

connection.on('connect', function()
{
    logger.debug('[DVP-AbandonedCallDialer.AMQPConnection] - [%s] - AMQP Connection CONNECTED');
});

connection.on('ready', function()
{
    amqpConState = 'READY';

    logger.debug('[DVP-AbandonedCallDialer.AMQPConnection] - [%s] - AMQP Connection READY');

    connection.queue('ABANDONED_CALLS', {durable: true, autoDelete: false}, function (q) {
        q.bind('#');

        // Receive messages
        q.subscribe(function (message) {

            logger.debug('================ ABANDON CDR RECEIVED FROM QUEUE - UUID : ' + message.Uuid + ' ================');

            if(redialConfig[message.CompanyId] && redialConfig[message.CompanyId].redialTime && redialConfig[message.CompanyId].redialCampaignId && (message.QueueSec > redialConfig[message.CompanyId].abandonThreshold))
            {
                //Call is an abandon call - Add to Redis
                let hangupTime = new Date(message.HangupTime);
                hangupTime.setMinutes(hangupTime.getMinutes() + redialConfig[message.CompanyId].redialTime);
                let timestamp = hangupTime.getTime();

                let campObject = {
                    CampaignId: redialConfig[message.CompanyId].redialCampaignId,
                    PhoneNumber: message.SipFromUser,
                    Uuid: message.Uuid,
                    CompanyId: message.CompanyId,
                    TenantId: message.TenantId,
                    HangupTime: message.HangupTime,
                    CamScheduleId: redialConfig[message.CompanyId].camScheduleId,
                    CategoryId: redialConfig[message.CompanyId].categoryId
                };

                logger.debug('Adding object to redis');

                redisHandler.ZAddObject("abandonedcalls", timestamp, JSON.stringify(campObject))
            }
            else {
                logger.debug('Redial Config Not Found');
            }


        });

    });
});

connection.on('error', function(e)
{
    logger.error('[DVP-AbandonedCallDialer.MAIN] - [%s] - AMQP Connection ERROR', e);
    amqpConState = 'CLOSE';
});

let CheckIsCallConnectedAndAddToCampaign = function(redialObj, callback)
{
    dbHandler.CheckCustomerCall(redialObj.PhoneNumber, redialObj.CompanyId, redialObj.TenantId, redialObj.Uuid, redialObj.HangupTime, function(err, count)
    {
        if(err) {
            logger.error('[DVP-AbandonedCallDialer.CheckIsCallConnectedAndAddToCampaign] - Error', err);

            callback(null, true);
        }
        else {
            if(count > 0){
                //stop operation

                logger.debug('[DVP-AbandonedCallDialer.CheckIsCallConnectedAndAddToCampaign] - Caller has contacted');

                callback(null, true);
            }
            else{
                campManagerService.UploadNumber(redialObj.PhoneNumber, redialObj.CampaignId, redialObj.CamScheduleId, redialObj.CategoryId, redialObj.CompanyId, redialObj.TenantId, (err, result)=>{

                    callback(null, true);
                });
            }


        }

    })
};

let CheckForNumbers = function(){

    let currenttimestamp = new Date().getTime();
    let asyncFuncArr = [];
    redisHandler.ZRangeByScoreWithRemove("abandonedcalls", 0, currenttimestamp, (err, result)=>{
        if(result.length > 0)
        {
            result.forEach(obj => {
                asyncFuncArr.push(CheckIsCallConnectedAndAddToCampaign.bind(this, JSON.parse(obj)))
            });

            async.parallel(asyncFuncArr, function(err, results) {

                setTimeout(CheckForNumbers, 20000);

            });


        }else{
            setTimeout(CheckForNumbers, 20000);
        }

    })
};

CheckForNumbers();


/*
setInterval(() => {
    console.log('Infinite Loop Test interval');
    let currenttimestamp = new Date().getTime();
    redisHandler.ZRangeByScoreWithRemove("abandonedcalls", 0, currenttimestamp, (err, result)=>{
        console.log(result);

    })
}, 10000);*/
