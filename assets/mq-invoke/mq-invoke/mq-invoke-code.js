
/*
      Licensed Materials - Property of IBM
      © IBM Corp. 2019
      V1.0.0.1
*/
var urlopen = require('urlopen');


var counter = 0;

function APICMQErrorHelper(name, message, code) {

    if (!code) {
        code = 400;
    }
    context.set("message.status.code",code)
    context.set("message.status.reason",name)
    context.set("message.body",message)
}

function NoQueueFoundException(responseCode, queue) {
    return APICMQErrorHelper("NoQueueFoundException", "APICMQ001 : Response code '" + responseCode + "' was received when connecting to a either a request or response queue . Please check the Queue name is correct.", 404);
}

function NoQueueManagerFoundException(queueManagerObjectName) {
    return APICMQErrorHelper("NoQueueManagerFoundException", "APICMQ002 : API Connect was unable to find a QueueManager Object with the name '" + queueManagerObjectName + "'", 404);
}


function process(options) {
    console.error(options);

    try {

        urlopen.open(options, function(connectError, res) {
            if (res) {
                console.error('Received MQ ' + res.statusCode + ' for target ' + options.target);
            }
            if (connectError) {
                NoQueueManagerFoundException(qmgr);
            } else if (res.statusCode === 0) {
                console.error("Message on Queue");
                console.error(options);
                var mqmd = res.get({type: 'mq'},'MQMD');
                console.debug(mqmd);
                context.set(varResponse,mqmd);
            } else if (res.statusCode === 2085) {
                NoQueueFoundException(2085, reqq);
            } else if (res.statusCode === 2059) {
                NoQueueManagerFoundException(qmgr);
            } else {
                console.error('Failed to put message. Reason: ' + res.statusCode);
                return APICMQErrorHelper("MQ Error", "APICMQ002 : API Connect was unable to put message on queue. Reason: '" + res.statusCode + "'", 404);
            }

        });
    } catch (error) {
        var errorMessage = 'Thrown error on urlopen.open for target ' + options.target + ': ' + error.message + ', error object errorCode=' + error.errorCode.toString();
        APICMQErrorHelper("Unknown Error", errorMessage, 400);
    }
}



var qmgr = context.get('local.parameter.qmgrObj');
var varResponse = context.get('local.parameter.varOutputName');
var varMqMsgData = context.get('local.parameter.variableName');
var reqq = context.get('local.parameter.queue');

var mqURL = "unset";
var MsgType = 8;
var ReplyToQ = "";
mqURL = 'dpmq://' + qmgr + '/?RequestQueue=' + reqq ;

var MQMD = {
    MQMD: {
        MsgType: {
            "$": MsgType
        },
        ReplyToQ: {
            "$": ReplyToQ
        },
        Format: {
            "$": context.get('local.parameter.format') || "MQSTR"
        }
    }
};


var outputObject = {};

//Read the payload as XML

process({
    target: mqURL,
    transactional: true,
    sync: true,
    data: context.get(varMqMsgData),
    headers: {
        MQMD: MQMD

    }
});