const WebSocket = require("ws");
const querystring = require("querystring");
const express = require('express')
const app = express()
const server = require('http').Server(app)

app.set('view engine', 'ejs')
app.use(express.static('public'))

const { PeerServer } = require('peer');
const { v4: uuidV4 } = require('uuid');

const port = process.env.YOUR_PORT || process.env.PORT || 80;
var host = process.env.HOST || '0.0.0.0';

const peerServer = PeerServer({ port: 3001, path: '/' });

var connectionList = [];

server.listen(host,port, () => {
    console.log("Server Started..")
})

const wss = new WebSocket.Server({
    server,
    path: "/ws"
});


app.get('/', (req, res) => {
    res.redirect(`/${uuidV4()}`)
  })
  
  app.get('/:room', (req, res) => {
    res.render('room', { roomId: req.params.room })
  })


wss.on("connection", function (ws, req) {
    console.log("new Connection is coming..")

    var roomId = querystring.parse(req.url.split("?")[1]).roomId;

    if (connectionList[roomId] == undefined) {
        connectionList[roomId] = [];
    }

    connectionList[roomId].push(ws);

    console.log("room (" + roomId + ") has - " + connectionList[roomId].length + " connections")


    ws.on("message", function (msg) {
        var message = msg.toString("utf8");
        newMessageReceived(roomId,message)
    })

    ws.on("close", function () {
        console.log("close connection")
        disconnectConnections(roomId, ws)
        console.log("room (" + roomId + ") has - " + connectionList[roomId].length + " connections")

    })
})

function newMessageReceived(roomId,msg){
    msg=JSON.parse(msg)
    switch (msg.event) {
        case "new-user-connected":
            var userId=msg.payload.user_id ;
            var userName=msg.payload.user_name
            console.log("new-user-connected : "+userId);
            broadCast(roomId, JSON.stringify({"type":"new-user-connected","payload":{"id":userId,"name":userName}}))
        break;
    
        default:
            break;
    }
}

function sendConnectionStatus(roomId) {
    var initMsg = {
        "type": "info",
        "count": connectionList[roomId].length
    }
    broadCast(roomId, JSON.stringify(initMsg));
}

function broadCast(roomId, message) {
    if (connectionList[roomId] != undefined) {
        try {
            connectionList[roomId].forEach(function (conn, i) {
                conn.send(message);
            })
        } catch (error) {
            console.log(error);
        }
    }
}


function disconnectConnections(roomId, ws) {
    connectionList[roomId].forEach(function (conn, i) {
        if (conn === ws) {
            connectionList[roomId].splice(i, 1);
        }
    });
}
