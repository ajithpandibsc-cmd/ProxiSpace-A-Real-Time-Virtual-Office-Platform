import { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { AppHeader } from "./components/AppHeader";
import { JoinForm } from "./components/JoinForm";
import { ParticipantList } from "./components/ParticipantList";
import { AudioControls } from "./components/AudioControls";
import { StatusBadge } from "./components/StatusBadge";
import { VirtualOffice } from "./world/VirtualOffice";
import { useMicrophone } from "./hooks/useMicrophone";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";

export default function App() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const [inOffice, setInOffice] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [selfId, setSelfId] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [worldWidth, setWorldWidth] = useState(1200);
  const [worldHeight, setWorldHeight] = useState(800);
  const [officeName, setOfficeName] = useState("");
  const [officeData, setOfficeData] = useState({});
  const [volume, setVolume] = useState(0.85);
  const [serverError, setServerError] = useState("");

  const {
    micState,
    muted,
    audioLevel,
    streamRef: micStreamRef,
    requestMic,
    toggleMute,
    stopMic,
  } = useMicrophone();

  // Create socket once
  useEffect(() => {
    const socket = io(SERVER_URL, { autoConnect: false });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      setConnectionError("");
      setConnecting(false);
    });

    socket.on("disconnect", () => {
      setConnected(false);
      setInOffice(false);
      setParticipants([]);
    });

    socket.on("connect_error", (err) => {
      setConnectionError("Cannot connect to server: " + err.message);
      setConnecting(false);
    });

    socket.on("server:error", ({ message }) => setServerError(message));

    // Participant events
    socket.on("participant:joined", (p) => {
      setParticipants((prev) => {
        if (prev.some((x) => x.socketId === p.socketId)) return prev;
        return [...prev, p];
      });
    });

    socket.on("participant:left", ({ socketId }) => {
      setParticipants((prev) => prev.filter((p) => p.socketId !== socketId));
    });

    socket.on("participant:muted", ({ socketId, muted: m }) => {
      setParticipants((prev) =>
        prev.map((p) => (p.socketId === socketId ? { ...p, muted: m } : p))
      );
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleJoin = useCallback(({ displayName, officeId, color }) => {
    setConnecting(true);
    setServerError("");
    const socket = socketRef.current;
    if (!socket) return;

    socket.connect();

    const doJoin = () => {
      socket.emit("office:join", { displayName, officeId, color });
    };

    socket.once(
      "office:joined",
      ({ selfId: id, participants: ps, worldWidth: ww, worldHeight: wh, office }) => {
        setSelfId(id);
        setParticipants(ps);
        setWorldWidth(ww || 1200);
        setWorldHeight(wh || 800);
        setOfficeData(office || {});
        setOfficeName(office?.name || officeId);
        setInOffice(true);
        setConnecting(false);
      }
    );

    if (socket.connected) {
      doJoin();
    } else {
      socket.once("connect", doJoin);
    }
  }, []);

  const handleLeave = useCallback(() => {
    setInOffice(false);
    setSelfId(null);
    setParticipants([]);
    setOfficeData({});
    stopMic();
  }, [stopMic]);

  const handleToggleMute = useCallback(() => {
    const newMuted = toggleMute();
    socketRef.current?.emit("participant:mute", { muted: newMuted });
  }, [toggleMute]);

  return (
    <div className="app">
      <AppHeader inOffice={inOffice} officeName={officeName} />

      {!inOffice ? (
        <div className="app-body centered">
          <JoinForm onJoin={handleJoin} connecting={connecting} />
          {connectionError && <p className="global-error">{connectionError}</p>}
        </div>
      ) : (
        <div className="app-body office-layout">
          {/* Spatial Sidebar */}
          <aside className="sidebar">
            <StatusBadge connected={connected} error={serverError || undefined} />

            <ParticipantList participants={participants} selfId={selfId} />

            <AudioControls
              micState={micState}
              muted={muted}
              audioLevel={audioLevel}
              onRequestMic={requestMic}
              onToggleMute={handleToggleMute}
              volume={volume}
              onVolumeChange={setVolume}
            />
          </aside>

          {/* Main Virtual World Canvas */}
          <main className="office-main">
            <VirtualOffice
              socket={socketRef.current}
              selfId={selfId}
              participants={participants}
              worldWidth={worldWidth}
              worldHeight={worldHeight}
              officeData={officeData}
              micStreamRef={micStreamRef}
              volume={volume}
              onLeave={handleLeave}
            />
          </main>
        </div>
      )}
    </div>
  );
}
