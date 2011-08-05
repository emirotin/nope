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

var Nope = function () {
    this.settings = _(DEFAULT_SETTINGS).extend(settings);
    
    this.clients = {};
    this.channels = {'*': []};
};

Nope.prototype = new process.EventEmitter();

Nope.prototype.onPush = function (channel, client_id, type, message_body) {
    var i, l, body, message;
    
    if (!channel) {
        channel = '*';
    }
    if (this.channels[channel] === undefined) {
        this.channels[channel] = [];
    }
    channel = this.channels[channel];
    body = _({'client_id': client_id}).extend(message_body);
    message = {
        'type': type,
        'client_id': client_id,
        'body': body
    };
    for (i = 0, l = channel.length; i < l; i++) {
        channel[i].json.send(message);
    }
    this.emit('push', arguments);
}

Nope.prototype.onRegister = function (client, body) {
    var client_id = body.id,
        client_record = this.clients[client.id];
    
    client_record.registered = true;
    client_record.id = client_id;
    this.channels['*'].push(client);
    client.json.send({
        'type': 'registration',
        'body': {
          'result': 'ok'
        }
    });
    this.emit('register', arguments);
}

Nope.prototype.onSubscribe = function (client, body) {
    if (!this.clients[client.id].registered) {
        client.json.send({
            'type': 'subscription',
            'body': {
                'result': 'fail',
                'message': 'Not registered, register first.'
            }
        });
        return;        
    }
    var password = body.password;
    if (this.settings.get_password && password !== this.settings.get_password) {
        client.json.send({
            'type': 'registration',
            'body': {
                'result': 'fail',
                'message': 'Wrong password'
            }
        });
        return;
    }    
    
    var channel = body.channel;
    if (this.channels[channel] === undefined) {
      this.channels[channel] = [];
    }
    this.channels[channel].push(client);
    client.json.send({
        'type': 'subscription',
        'body': {
          'result': 'ok'
        }
    });
    this.emit('subscribe', arguments);
}

Nope.prototype.run = function () {
    var server = express.createServer(),
        socket,
        self = this;
    //this.server = server;
    
    server.configure(function () {
        server.use(express.bodyParser());
        server.use(express.static(__dirname + '/public'));
    });

    server.post('/push', function(req, res){
        var password = req.body.password;
        if (settings.put_password && password !== settings.put_password) {
            res.writeHead(403);
            res.end('fail');
            return;
        }
        res.writeHead(200);        
        res.end('ok');
        this.onPush(req.body.channel, req.body.client_id, req.body.type, req.body.body);
    });
    
    console.log('Listening on port ' + this.settings.port);
    server.listen(this.settings.port);
    
    socket = io.listen(server);
    //this.socket = socket;
    
    socket.sockets.on('connection', function(client) {
        self.clients[client.id] = {
            'socket_client': client,
            'registered': false        
        };
        
        client.on('message', function(req) {        
            var type = req.type;
            if (type === 'push') {
                var password = req.body.password;
                if (self.settings.put_password && password !== self.settings.put_password) {
                    client.send({
                        'type': 'push',
                        'body': {
                            'result': 'fail',
                            'message': 'Wrong password'
                        }
                    });
                    return;
                }
                self.onPush(req.body.channel, req.body.client_id, req.body.type, req.body.body);
            }
            else if (type === 'register') {
                self.onRegister(client, req.body);
            }
            else if (type === 'subscribe') {
                self.onSubscribe(client, req.body);
            }
        });
    });
}

exports.Nope = Nope;

// ran as a script
if (process.argv[1] == __filename) {
    var nope = new Nope();
    nope.run();
}