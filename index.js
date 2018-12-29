var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var fs = require('fs');
var creds = '';
var redis = require('redis');
var client = '';
var port = process.env.PORT || 9000;

app.use(express.static('public'));
app.use(bodyParser.urlencoded({
    extended: true
}));


http.listen(port, function () {
    console.log('Server Started. Listening on *:' + port);
});

var chatters = [];
var chat_messages = [];

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept"
    );
    next();
  });

fs.readFile('creds.json', 'utf-8', function (err, data) {
    if (err)
        throw err;
    creds = JSON.parse(data);
    client = redis.createClient('redis://'  + creds.host + ':' + creds.port);

    client.once('ready', function () {
        client.get('chat_users', function (err, reply) {
            if (reply) {
                chatters = JSON.parse(reply);
            }
        });
        client.get('chat_app_messages', function (err, reply) {
            if (reply) {
                chat_messages = JSON.parse(reply);
            }
        });
    });
});

app.post('/join', function (req, res) {
    var username = req.body.username;
    if (chatters.indexOf(username) === -1) {
        chatters.push(username);
        client.set('chat_users', JSON.stringify(chatters));
        res.send({
            'chatters': chatters,
            'status': 'OK'
        });
    } else {
        res.send({
            'status': 'FAILED'
        });
    }
});



app.post('/leave', function(req, res) {
    var username = req.body.username;
    chatters.splice(chatters.indexOf(username), 1);
    client.set('chat_users', JSON.stringify(chatters));
    res.send({
        'status': 'OK'
    });
});


app.post('/send_message', function(req, res) {
    var username = req.body.username;
    var message = req.body.message;
    chat_messages.push({
        'sender': username,
        'message': message
    });
    client.set('chat_app_messages', JSON.stringify(chat_messages));
    res.send({
        'status': 'OK'
    });
});


app.get('/get_messages', function(req, res) {
    res.send(chat_messages);
});



io.on('connection', function(socket) {
    socket.on('message', function(data) {
        io.emit('send', data);
    });
    socket.on('update_chatter_count', function(data) {
        io.emit('count_chatters', data);
    });
});











