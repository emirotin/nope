/**
 * @author Eugene Mirotin
 */

function NopeClient(server, port) {
	this._socket = new io.Socket(server, {'port': port, 'connectTimeout': 3000});
	this._socket.connect();
	this._handlers = {'all': []};
	var self = this;
	this._socket.on('message', function(message) {
		self.fire(message.type, message.body);
	});
};

NopeClient.prototype.on = function(event, cb) {
	if (!(event in this._handlers)) {
		this._handlers[event] = [];
	}
	this._handlers[event].push(cb);
}

NopeClient.prototype.fire = function(event, data) {
  if (!(event in this._handlers)){
    return;
  }
	for (var i = 0, h = this._handlers[event], l = h.length; i < l; i++) {
		h[i](data);
	}
}

NopeClient.prototype.register = function(client_id, password, cb) {
	this.on('registration', cb);
	this._socket.send({
  	'type': 'register',
  	'body': {
  		'client_id': client_id,
  		'password': password
  	}
  });
}

NopeClient.prototype.subscribe = function(channel, cb) {
  this.on('subscription', cb);
  this._socket.send({
    'type': 'subscribe',
    'body': {
      'channel': channel,
    }
  });
}

NopeClient.prototype.push = function(password, client_id, channel, type, body) {
	console.log('push');
	this._socket.send({
		'type': 'push',
		'body': {
			'client_id': client_id,
			'password': password,
			'channel': channel,
			'type': type,
			'body': body,
	  }
  });
}
