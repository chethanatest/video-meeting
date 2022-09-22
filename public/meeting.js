const videoGrid = document.querySelector("#container");
var MyStream;
var myPeerID;
var myPeer;
var ws;
const peers = {}
var isVideo=true;
var isAudio=false;

if (navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: isVideo, audio: isAudio })
        .then(function (stream) {
            MyStream=stream;
            ws = new WebSocket("ws://192.168.1.18:3000/ws?roomId=" + roomId)
            myPeer = new Peer(undefined, {
                host: '192.168.1.18',
                port: '3001', 
                debug: 2,
                config: {
                    iceServers: [
                      { urls: "stun:stun.l.google.com:19302" },
                      { urls: "turn:0.peerjs.com:3478", username: "peerjs", credential: "peerjsp" }
                    ],
                    sdpSemantics: "unified-plan",
                    iceTransportPolicy: "relay"
                  }
            })

            const MyVideo = document.createElement('video')
            drawMediaInput(MyVideo, stream);
            ws.onmessage = function (event) {
                wsReceivedData(JSON.parse(event.data));
            }

            myPeer.on('call', call => {
                console.log('This peer is being called...');
                call.answer(stream)
                const video = document.createElement('video')
                call.on('stream', function(userVideoStream) {
                    drawMediaInput(video, userVideoStream)
                })
            })



            ws.onopen = () => {
            }

            myPeer.on('open', id => {
                console.log("id " + id)
                myPeerID=id;
                wsSendData(ws, "new-user-connected", { "user_id": id,'user_name':'dummy_name' })
            })

        })
        .catch(function (error) {
            // console.error(error)
            console.log("Something went wrong!");
        });
}



function newUserConnected(id,userName) {
    if(myPeerID!=id){
        console.log("new user joined to room : "+ id);
        const video = document.createElement('video')
        options = {metadata: {"name":userName}};
        const call = myPeer.call(id, MyStream,options)
        call.on('stream', function(userVideoStream) {
            drawMediaInput(video, userVideoStream)
        })
        call.on('close', () => {
            video.pause()
            video.style.display = "none"
        })

        peers[id] = {'call':call,'element':video}
    }

}


function drawMediaInput(element, stream) {
    element.srcObject = stream
    element.addEventListener('loadedmetadata', () => {
        element.play()
    })
    videoGrid.append(element)
}

function wsSendData(ws, event, payload = []) {
    var data = {
        "event": event,
        "payload": payload
    }
    ws.send(JSON.stringify(data));
}
function wsReceivedData(data) {
    switch (data.type) {
        case "new-user-connected":
            newUserConnected(data.payload.id,data.payload.name);
            break

        default:
            console.error("unexpected payload received");
            break;
    }
}