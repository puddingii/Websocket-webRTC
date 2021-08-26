import http from "http";
import WebSocket from "ws";
import express from "express";

const app = express();
const PORT = process.env.PORT || 4400;

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/userLoading", express.static(__dirname + "/userLoading"));

app.get("/", (req, res) => res.render("home"));
app.get("/*", (req, res) => res.redirect("/"));

const handleListen = () => console.log(`Listening on: http://localhost:${PORT}`);

const server = http.createServer(app)
const wss = new WebSocket.Server({ server }); //http서버와 webSocket서버를 둘 다 돌리기 위함. 따로도 가능

wss.on("connection", (socket) => { // backend에 연결된 브라우저 정보 제공(socket). 즉 서버 전체를 위한것.
    console.log("Connected to Browser");
    socket.on("close", () => console.log("Disconnected from the Browser"));
    socket.on("message", (message) => { // user가 입력한 message 이벤트
        console.log(message.toString("utf8"));
    })
    socket.send("hello!!");
});  

server.listen(PORT, handleListen);
