What's that?
============

Nope is NOde.js Push Engine - a bit of glue building APE-Project-like experience on top of Node.js and Socket.IO

What for?
===========

Well, for Ajax Push aka Comet. It makes it possible for some data / events source (say, you weather informer service) to push the data to your clients (say, widgets instaled to various sites which you don't want polling from your site).

Terminology and abstraction overview
====================================

There are 3 actors in this model:

- Nope server - the node.js-driven microsite serving its JS (client library and requirements)
- Data source - any service / server / application pushing the data to Nope server
- Client - JS application (normally a web page) subscribed to the data broadcasted by the Nope server. The client can also be a data source (example - trivial chat application shown in test/plain_html) 

There are 2 parts of the software:

- Nope server itself
- Client library served by the Nope server and used by the client

There protocol can be explained in the following steps

- Nope server is ran
- Client web page is opened, this loads (see How?) the client library and initiates the NopeCLient object
- NopeClient connects to the NopeServer
- you call `register` method on the client object passing the chosen client_id (arbitrary character string). If Nope server is get_password-protected, you have to pass the password as well
- you call `subscribe` on the client object passing the channel name. The channel is a named entity you subscribe to. All the messages are sent (pushed) to a specific channel (or a wildcard '*' channel)
- you subscribe your callback function to message arrival event - either a specific event type, or 'all' wildcard  
- Data source pushes the data to the Nope server. When pushing, the message type and channel are passed, as well as an arbitrary message body. If server is put_password-protected, the password is required as well
- Nope server send these data to all the clients subscribed to the given channel
- on the client-side, the event matching the message type is fired

How?
====

Technically - Socket.IO makes all the magic by picking the best possible technique (starting with Websockets in Chrome and ending with... well, polling in some old browsers).

Programmatically - you have to do the following

1) Install the server

1.1. Install node.js, npm, express, underscore and socket.io

1.2. Copy sources from src folder to any place you like

1.3. Edit the nope.conf.js file - pick the port (defaults to 6868), put and get passwords (both optional - set to null) 

2) Run the server

    sudo node nope.js

3) Prepare the data soure

It can be a separate service pushing data to Nope server over HTTP (or probably with socket.io-node-client).

In case of HTTP push your service has to POST to http://NOPE_HOST:NOPE_PORT/push with the Content-Type application/json and request body of the following form:

    params = {'password': push_password, // ignored if put_password is null in nope conf file
              'type': type,              // your own message type code, like 'weather_update' or 'timestamp'
              'channel': channel,        // the cannel to push the message to. channel is used by clients to subscribe to your data
              'client_id': client_id,    // can be set to empty string; if filled, indicates client_id ('user name') of the client that sent the message (useful in applications like chat)
              'body': body}              // arbitrary JSON object (primitive types only, of course) to be passed to the client as the message contents
    
4) Prepare the client

4.1. In your web page (the client) add 3 lines

    <script>WEB_SOCKET_SWF_LOCATION='http://NOPE_HOST:NOPE_PORT/socket.io/lib/vendor/web-socket-js/WebSocketMain.swf'</script>
    <script src="http://NOPE_HOST:NOPE_PORT/socket.io/socket.io.js"></script>
    <script src="http://NOPE_HOST:NOPE_PORT/nope-client.js"></script>

(this will be probably narrowed to a single tag in the future)

4.2. Instantiate the NopeClient object

    var client = new NopeClient(NOPE_HOST, NOPE_PORT);               // this connects to the Nope server through the Socket.IO
    
    var client_id = 'user' + parseInt(Math.random() * 1000000, 10);  // create the random user name
    client.register(client_id, GET_PASSWORD, function(data){         // try registering with the chosen client_id and the GET_PASSWORD (set to empty string if it's not set on the server side)
      if (data.result == 'ok')           
          client.subscribe(CHANNEL_NAME, function(data){})           // now subscribe so the channel 
    });
    
4.3. Subscribe to some event

    client.on('msg', function(data){
        var msg = data.client_id + ': ' + data.text;                 // client_id is provided by the Nope server. It makes sense if the data push is client-related, like in chat apps
            $('#messages ul').append('<li>' + msg + '</li>')         // data.text is the the custom field specified by the Data source
    })
    
4.4. Set your data source

See example in test/django_project/nope_connect.py for Python example of pushing data over HTTP

Nope Client Methods
===================

`client.register(client_id, password, cb)`
-------------

Register with the Nope server.

client_id - arbitrary string identifying the current client instance. No checks are done at the moment

password - if get_password is set on the Nope server side, this password should match it, otherwise the registration will fail

cb - callback, the function called when the registration response comes from the server (technically this function is simply subscribed to "registration" event)

`client.subscribe(channel, cb)`
-------------

Subscribe to the specific channel. The client can subscribe to multiple channels. The client must be registered before it can subscribe.

channel - arbitrary string identifying the channel.

cb - callback, the function called when the subscription response comes from the server (technically this function is simply subscribed to "subscription" event)

`client.on(event, cb)`
-------------

Register event listenet.

event - arbitrary string identifying the event name (see Client Events).

cb - callback, the function called when the event is fired. The function is always given the single `data` argument which is a normal object containing all the original message attributes plus `client_id`.

Nope Client Events
==================

1) Predefined events

1.1. `registration` event is fired when the server reaction to your `.register` call arrives.

`data` has the following attributes

- `result` - 'ok'|'fail'
- `message` - set when `result == 'fail'`, contains the error explanation

1.2. `subsription` event is fired when the server reaction to your `.subscribe` call arrives.

`data` has the following attributes

- `result` - 'ok'|'fail'
- `message` - set when `result == 'fail'`, contains the error explanation

1.3. `all` event is fired on any normal event

2) Custom events

Custom event X is fired when the message with `type == X` arrives from the Nope server.

