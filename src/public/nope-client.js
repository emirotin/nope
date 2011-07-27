/**
 * @author Eugene Mirotin
 */
var io;

(function (exports) {

function NopeClient(server, port) {
    this._socket = io.connect(server, {'port': port, 'connectTimeout': 3000});
    console.dir(this._socket);
    this._handlers = {'all': []};
    var self = this;
    this._socket.on('message', function(message) {
        self.fire(message.type, message.body);
        self.fire('all', message);
    });
}

NopeClient.prototype.on = function(event, cb) {
    if (!cb) {
        return;
    }
    if (this._handlers[event] === undefined) {
        this._handlers[event] = [];
    }
    this._handlers[event].push(cb);
};

NopeClient.prototype.fire = function(event, data) {
    var i, h, l;
    
    if (this._handlers[event] === undefined){
        return;
    }
    for (i = 0, h = this._handlers[event], l = h.length; i < l; i++) {
        h[i](data); // option: make asynch with setTimeout(0), but needs a wrapper or moving to CS with =>
    }
};

NopeClient.prototype.register = function(client_id, password, cb) {
    this.on('registration', cb);
    this._socket.json.send({
        'type': 'register',
        'body': {
            'client_id': client_id,
            'password': password
          }
    });
};

NopeClient.prototype.subscribe = function(channel, cb) {
    this.on('subscription', cb);
    this._socket.json.send({
        'type': 'subscribe',
        'body': {
            'channel': channel
        }
    });
};

NopeClient.prototype.push = function(password, client_id, channel, type, body) {
    this._socket.json.send({
        'type': 'push',
        'body': {
            'client_id': client_id,
            'password': password,
            'channel': channel,
            'type': type,
            'body': body
          }
    });
};

exports.NopeClient = NopeClient;

}(typeof module === 'object' ? module.exports : window));