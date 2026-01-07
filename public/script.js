const socket = io();

const roomInput = document.getElementById("room");
const joinBtn = document.getElementById("join");
const callBtn = document.getElementById("call");
const endBtn = document.getElementById("end");
const statusText = document.getElementById("status");
const remoteAudio = document.getElementById("remoteAudio");

let localStream = null;
let peerConnection = null;
let roomId = null;

const config = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

/* ---------- JOIN ROOM ---------- */
joinBtn.onclick = () => {
  roomId = roomInput.value.trim();

  if (!roomId) {
    alert("Please enter a room code");
    return;
  }

  socket.emit("join-room", roomId);
  statusText.innerText = "Status: Joined room " + roomId;
};

/* ---------- START CALL ---------- */
callBtn.onclick = async () => {
  if (!roomId) {
    alert("Join a room first!");
    return;
  }

  statusText.innerText = "Status: Calling...";

  localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  peerConnection = new RTCPeerConnection(config);

  localStream.getTracks().forEach(track =>
    peerConnection.addTrack(track, localStream)
  );

  peerConnection.ontrack = event => {
    remoteAudio.srcObject = event.streams[0];
  };

  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      socket.emit("ice-candidate", {
        room: roomId,
        candidate: event.candidate
      });
    }
  };

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  socket.emit("offer", { room: roomId, offer });
};

/* ---------- RECEIVE OFFER ---------- */
socket.on("offer", async offer => {
  statusText.innerText = "Status: Incoming call...";

  localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  peerConnection = new RTCPeerConnection(config);

  localStream.getTracks().forEach(track =>
    peerConnection.addTrack(track, localStream)
  );

  peerConnection.ontrack = event => {
    remoteAudio.srcObject = event.streams[0];
  };

  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      socket.emit("ice-candidate", {
        room: roomId,
        candidate: event.candidate
      });
    }
  };

  await peerConnection.setRemoteDescription(offer);

  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  socket.emit("answer", { room: roomId, answer });

  statusText.innerText = "Status: Call connected";
});

/* ---------- RECEIVE ANSWER ---------- */
socket.on("answer", answer => {
  peerConnection.setRemoteDescription(answer);
  statusText.innerText = "Status: Call connected";
});

/* ---------- ICE CANDIDATE ---------- */
socket.on("ice-candidate", candidate => {
  peerConnection.addIceCandidate(candidate);
});

/* ---------- END CALL ---------- */
endBtn.onclick = () => {
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }

  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }

  remoteAudio.srcObject = null;
  statusText.innerText = "Status: Call ended";
};
