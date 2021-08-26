const socket = new WebSocket(`ws://${window.location.host}`);  // 서버로의 연결을 보여줌.

socket.addEventListener("open", () => {
    console.log("Connected to Server");
});

socket.addEventListener("message", (message) => {
    console.log("just got this ", message.data, " from the server");
});

socket.addEventListener("close", () => {
    console.log("Disconnected");
});

setTimeout(() => {
    socket.send("hello lkajdflkjasd");
}, 10000);