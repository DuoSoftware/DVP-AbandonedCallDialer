let mongomodels = require('dvp-mongomodels');
let mongoOp = require('./MongoDBOperations.js');
let config = require('config');
let amqp = require('amqp');
let logger = require('dvp-common/LogHandler/CommonLogHandler.js').logger;

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
                    Uuid: message.Uuid
                };

                ZAddObject("abandonedcalls", timestamp, campObject)
            }


        });

    });
});

connection.on('error', function(e)
{
    logger.error('[DVP-EventMonitor.handler] - [%s] - AMQP Connection ERROR', e);
    amqpConState = 'CLOSE';
});


setInterval(() => {
    console.log('Infinite Loop Test interval');
}, 2000);