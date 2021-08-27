const messageList = document.querySelector("ul");
const nickForm = document.querySelector("#nick");
const messageForm = document.querySelector("#message");
const socket = new WebSocket(`ws://${window.location.host}`);  // 서버로의 연결을 보여줌.

const convertMessage = (type, value) => { //send할때 string형태여야 하기 때문에 object같은 경우 이런식으로 보내줘야함.
    const obj = { type, value };
    return JSON.stringify(obj);
}

const handleOpen = () => {
    console.log("Connected to Server");
};

const handleSendMessage = (message) => {
    const li = document.createElement("li");
    li.innerText = message.data;
    messageList.append(li);
};

const handleClose = () => {
    console.log("Disconnected");
};

socket.addEventListener("open", handleOpen);
socket.addEventListener("message", handleSendMessage);
socket.addEventListener("close", handleClose);

const handleSubmit = (event) => {
    event.preventDefault();
    const input = messageForm.querySelector("input");
    socket.send(convertMessage("message", input.value));
    const li = document.createElement("li");
    li.innerText = `You: ${input.value}`;
    messageList.append(li);
    input.value = "";
};

const handleNick = (event) => {
    event.preventDefault();
    const input = nickForm.querySelector("input");
    socket.send(convertMessage("nickname", input.value)); //백엔드로 전달.
    input.value = "";
}

messageForm.addEventListener("submit", handleSubmit);
nickForm.addEventListener("submit", handleNick);