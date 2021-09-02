import http from "http";
// import WebSocket from "ws";
import { Server } from "socket.io";
import express from "express";
import { instrument } from "@socket.io/admin-ui";

const app = express();
const PORT = process.env.PORT || 4400;

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/userLoading", express.static(__dirname + "/userLoading"));

app.get("/", (req, res) => res.render("home"));
app.get("/*", (req, res) => res.redirect("/"));

const httpServer = http.createServer(app)
const wsServer = new Server(httpServer, {
    cors: {
        origin: ["https://admin.socket.io"],
        credentials: true
    }
});
instrument(wsServer, {
    auth: false
});

const getPublicRooms = () => {
    const {
        sids,
        rooms
    } = wsServer.sockets.adapter;
    const publicRooms = [];
    rooms.forEach((_, key) => {
        if(sids.get(key) === undefined) {
            publicRooms.push(key);
        }
    });
    return publicRooms;
}

const countRoom = (roomName) => {
    return wsServer.sockets.adapter.rooms.get(roomName)?.size; // roomName이 아닐 수도 있기 때문에
}

wsServer.on("connection", (socket) => {
    socket["nickname"] = "Unknown";
    socket.onAny((event) => { //어디에서든지 
        console.log(`Socket Event: ${event}`);
    });
    socket.on("enter_room", (roomName, done) => {
        socket.join(roomName);
        done();
        socket.to(roomName).emit("enter_room", socket.nickname, countRoom(roomName)); //roomName에 해당하는 곳에 welcome을 전체적으로 뿌려줌.
        wsServer.sockets.emit("room_change", getPublicRooms());
    });
    socket.on("offer", (offer, roomName) => {
        socket.to(roomName).emit("offer", offer);
    });
    socket.on("answer", (answer, roomName) => {
        socket.to(roomName).emit("answer", answer);
    });
    socket.on("disconnecting", () => {  //방은 나가지 않고 disconnecting됬을때
        socket.rooms.forEach((room) => {
            socket.to(room).emit("logout", socket.nickname, countRoom(room)-1);
        });
        
    });
    socket.on("disconnect", () => {
        wsServer.sockets.emit("room_change", getPublicRooms());
    });
    socket.on("new_message", (msg, room, done) => {
        socket.to(room).emit("new_message", `${socket.nickname}: ${msg}`);
        done();
    });
    socket.on("set_nickname", (nickname) => {
        socket["nickname"] = nickname;
    });
    socket.on("ice", (ice, roomName) => {
        socket.to(roomName).emit("ice", ice);
    });
});

// const wss = new WebSocket.Server({ server }); //http서버와 webSocket서버를 둘 다 돌리기 위함. 따로도 가능

// const socketClose = () => {
//     console.log("Disconnected from the Browser");
// };

// const sockets = [];
// wss.on("connection", (socket) => { // backend에 연결된 브라우저 정보 제공(socket). 즉 서버 전체를 위한것. 
//     sockets.push(socket);
//     socket["nickname"] = "Unknown";
//     console.log("Connected to Browser");
//     socket.on("close", socketClose);
//     socket.on("message", (message) => { // user가 입력한 message 이벤트
//         const parseMessage = JSON.parse(message);
//         switch(parseMessage.type) {
//             case "message":
//                 sockets.forEach((aSocket) => aSocket.send(`${socket.nickname}: ${parseMessage.value}`));
//                 break;
//             case "nickname":
//                 socket["nickname"] = parseMessage.value;
//                 break;
//         }

//     })
// });  

const handleListen = () => console.log(`Listening on: http://localhost:${PORT}`);
httpServer.listen(PORT, handleListen);
