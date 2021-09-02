const socket = io();

const setRoom = document.getElementById("setRoom");
const setRoomForm = setRoom.querySelector("form");
const innerRoom = document.getElementById("innerRoom");
const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");
const stream = document.getElementById("stream");

innerRoom.hidden = true;
stream.hidden = true;

let roomName, myStream;
let muted = false;
let cameraOff = false;
let peerConnection;

// Camera 관리

const getCameras = async() => {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter((device) => device.kind === "videoinput");
        const currentCamera = myStream.getVideoTracks()[0];
        cameras.forEach((camera) => {
            const option = document.createElement("option");
            option.value = camera.deviceId;
            option.innerText = camera.label;
            if(currentCamera.label === camera.label) {
                option.selected = true;
            }
            camerasSelect.appendChild(option);
        })
    } catch(e) {
        console.log(e);
    }
}

const getMedia = async(deviceId) => {
    const initial = {
        audio: true,
        video: {facingMode: "user"},
    };
    const cameraConstraint = {
        audio: true,
        video: { deviceId: { exact: deviceId }}
    }
    try {
        myStream = await navigator.mediaDevices.getUserMedia(deviceId? cameraConstraint : initial);
        myFace.srcObject = myStream;
        if(!deviceId) {
            await getCameras();
        } 
    } catch(e) {
        console.log(e);
    }
};

const handleCameraClick = () => {
    myStream.getVideoTracks().forEach((track) => (track.enabled = !track.enabled));
    if(cameraOff) {
        cameraBtn.innerText = "Camera Off";
        cameraOff = false;
    } else {
        cameraBtn.innerText = "Camera On";
        cameraOff = true;
    }
};

const handleMuteClick = () => {
    myStream.getAudioTracks().forEach((track) => (track.enabled = !track.enabled));
    if(muted) {
        muteBtn.innerText = "Mute";
        muted = false;
        //myFace.muted = false;
    } else {
        muteBtn.innerText = "Unmute";
        muted = true;
        //myFace.muted = true;
    }
};

const handleCameraSelect = async() => {
    await getMedia(camerasSelect.value);
};

// Message & Nickname 관리

const addMessage = (msg) => {
    const ul = innerRoom.querySelector("ul");
    const li = document.createElement("li");
    li.innerText = msg;
    ul.appendChild(li);
};

const handleMessageSubmit = (event) => {
    event.preventDefault();
    const input = innerRoom.querySelector("#msg input");
    const value = input.value; // 이렇게 미리 해놓는 이유로 addMessage를 할때 이미 input.value = "";가 실행된 상태가 되버려서 그럼.
    socket.emit("new_message", input.value, roomName, () => {
        addMessage(`You: ${value}`);
    });
    input.value = "";
};

const handleNicknameSubmit = (event) => {
    event.preventDefault();
    const input = innerRoom.querySelector("#nickName input");
    socket.emit("set_nickname", input.value)
};

const handleSetRoomSubmit = async(event) => {
    event.preventDefault();
    const input = setRoomForm.querySelector("input");
    await startMedia();
    socket.emit("enter_room", input.value, showRoom); // 2번째 인자부터 데이터를 보낼 수 있음.(함수든 object든 다 가능) 끝날때 실행되는 function을 보내고 싶으면 마지막에 넣으면 됨.
    roomName = input.value;
    input.value = "";
};

const startMedia = async() => {
    stream.hidden = false;
    await getMedia();
    makeConnection();
};

const showRoom = () => {
    setRoom.hidden = true;
    innerRoom.hidden = false;
    const h3 = innerRoom.querySelector("h3");
    h3.innerText = `Room ${roomName}`;
    const msgForm = innerRoom.querySelector("#msg");
    const nickForm = innerRoom.querySelector("#nickName");
    msgForm.addEventListener("submit", handleMessageSubmit);
    nickForm.addEventListener("submit", handleNicknameSubmit);
};

// RTC 관리

const handleIce = (data) => {
    console.log("sent candidate");
    console.log(data.candidate);
    socket.emit("ice", data.candidate, roomName); // 상대 브라우저에 candidate 전송
};

const handleAddStream = (data) => {
    const peerFace = document.getElementById("peerFace");
    peerFace.srcObject = data.streams[0];
};

const makeConnection = () => {
    peerConnection = new RTCPeerConnection();
    peerConnection.addEventListener("icecandidate", handleIce); // rtc연결이 되면 icecandidate이벤트 발생. 피어 연결 요청을 보낸다고 생각하면됨.
    peerConnection.addEventListener("track", handleAddStream);
    myStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, myStream);
    });
};

setRoomForm.addEventListener("submit", handleSetRoomSubmit);
muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);
camerasSelect.addEventListener("input", handleCameraSelect);

// socket 관리
socket.on("enter_room", async(nick, newCount) => { // 입장함과 동시에 카메라 셋팅과 rtc통신을 위한 셋팅 시작(본인의 offer제공 셋팅)
    const h3 = innerRoom.querySelector("h3");
    h3.innerText = `Room ${roomName} (${newCount})`;
    addMessage(`${nick} joined!`);

    const offer = await peerConnection.createOffer(); //rtc연결을 위한 offer 생성(자신의 브라우저)
    peerConnection.setLocalDescription(offer); // 본인의 브라우저에 등록 후(LocalDescription)
    console.log("sent offer")
    socket.emit("offer", offer, roomName);  // 상대 브라우저와 연결을 위한 offer를 보냄.
});

socket.on("offer", async(offer)=> { // 요약 : offer를 받고 answer 생성(상대방 브라우저)
    console.log("receive offer")
    peerConnection.setRemoteDescription(offer); // 받은 offer를 rtc연결을 위해 등록
    const answer = await peerConnection.createAnswer(); // 받은 offer에 대한 answer를 생성
    peerConnection.setLocalDescription(answer); // rtc연결을 위한 answer 등록(LocalDescription)
    socket.emit("answer", answer, roomName); // 생성한 answer를 다시 보내줌.
    console.log("sent answer");
});

socket.on("answer", async(answer)=> { // 다른 사람의 브라우저의 answer를 받기위한 작업.(자신의 브라우저)
    console.log("receive answer");
    peerConnection.setRemoteDescription(answer); // 받은 answer(offer)를 등록하고(RemoteDescription)
});

socket.on("logout", (nick, newCount) => {
    const h3 = innerRoom.querySelector("h3");
    h3.innerText = `Room ${roomName} (${newCount})`;
    addMessage(`${nick} logout!`);
});

socket.on("new_message", addMessage);
socket.on("room_change", (rooms) => {
    const roomList = setRoom.querySelector("ul");
    roomList.innerHTML = "";
    if(rooms.length === 0) {
        return;
    }
    rooms.forEach( (room) => {
        const li = document.createElement("li");
        li.innerText = room;
        roomList.append(li);
    })
});

socket.on("ice", (ice) => { // 받은 candidate로 peerConnection설정을 하면 그때부터 통신을 시작.
    console.log("receive candidate");
    peerConnection.addIceCandidate(ice);
});