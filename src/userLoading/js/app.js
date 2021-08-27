const socket = io();

const setNick = document.getElementById("setNick");
const form = setNick.querySelector("form");

const handleNickSubmit = (event) => {
    event.preventDefault();
    const input = form.querySelector("input");
    socket.emit("setNick", { value: input.value }, () => { console.log("server is done!") }); // 3번째 인자는 프론트에서 백으로 보낸 뒤 프론트에서 실행시키는 함수임.
    input.value = "";
}

form.addEventListener("submit", handleNickSubmit);