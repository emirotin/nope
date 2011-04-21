/**
 * @author Eugene Mirotin
 */

var DEFAULT_SETTINGS = {
    'port': 6868,
    'get_password': null,
    'put_password': null
};

var settings = require('./nope.conf.js').settings,
    express = require('express'),
    io = require('socket.io'),
    _ = require('underscore')._;
        
settings = _(DEFAULT_SETTINGS).extend(settings);

var clients = {},
    channels = {'*': []};

var server = express.createServer();
server.use(express.bodyParser());
server.use(express.static(__dirname + '/public'));


function onPush(channel, client_id, type, message_body) {
    var i, l, body, message;
    
    if (!channel) {
        channel = '*';
    }
    if (channels[channel] !== undefined) {
        channel = channels[channel];
    }
    else {
        channels[channel] = [];
        return;
    }
    body = _({'client_id': client_id}).extend(message_body);
    message = {
        'type': type,
        'client_id': client_id,
        'body': body
    };
    for (i = 0, l = channel.length; i < l; i++) {
        channel[i].send(message);
    }    
}

function onRegister(client, body) {
    var client_id = body.id,
        password = body.password;
    if (settings.get_password && password !== settings.get_password) {
        client.send({
            'type': 'registration',
            'body': {
                'result': 'fail',
                'message': 'Wrong password'
            }
        });
        return;
    }
    var client_record = clients[client.sessionId];
    client_record.registered = true;
    client_record.id = client_id;
    channels['*'].push(client);
    client.send({
        'type': 'registration',
        'body': {
          'result': 'ok'
        }
    });
}

function onSubscribe(client, body){
    if (! clients[client.sessionId].registered) {
        client.send({
            'type': 'subscription',
            'body': {
                'result': 'fail',
                'message': 'Not registered, register first.'
            }
        });
        return;        
    }
    var channel = body.channel;
    if (channels[channel] === undefined) {
      channels[channel] = [];
    }
    channels[channel].push(client);
    client.send({
        'type': 'subscription',
        'body': {
          'result': 'ok'
        }
    });
}


server.post('/push', function(req, res){
    var password = req.body.password;
    if (settings.put_password && password !== settings.put_password) {
        res.writeHead(403);
        res.end('fail');
        return;
    }
    res.writeHead(200);        
    res.end('ok');
    onPush(req.body.channel, req.body.client_id, req.body.type, req.body.body);
});

console.log('Listening on port ' + settings.port);
server.listen(settings.port);

var socket = io.listen(server);

socket.on('connection', function(client) {
    clients[client.sessionId] = {
        'socket_client': client,
        'registered': false        
    };
    
    client.on('message', function(req) {
        var type = req.type;
        if (type === 'push') {
            var password = req.body.password;
            if (settings.put_password && password !== settings.put_password) {
                client.send({
                    'type': 'push',
                    'body': {
                        'result': 'fail',
                        'message': 'Wrong password'
                    }
                });
                return;
            }
            onPush(req.body.channel, req.body.client_id, req.body.type, req.body.body);
        }
        else if (type === 'register') {
            onRegister(client, req.body);
        }
        else if (type === 'subscribe') {
            onSubscribe(client, req.body);
        }
    });
});

