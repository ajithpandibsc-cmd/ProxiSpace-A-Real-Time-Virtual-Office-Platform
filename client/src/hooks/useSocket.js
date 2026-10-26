import { useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";

let sharedSocket = null;

export function useSocket() {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!sharedSocket || sharedSocket.disconnected) {
      sharedSocket = io(SERVER_URL, { autoConnect: false });
    }
    socketRef.current = sharedSocket;

    return () => {
      // Don't disconnect on unmount — App manages lifecycle
    };
  }, []);

  const connect = useCallback(() => {
    if (socketRef.current && !socketRef.current.connected) {
      socketRef.current.connect();
    }
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  }, []);

  const emit = useCallback((event, data) => {
    socketRef.current?.emit(event, data);
  }, []);

  const on = useCallback((event, handler) => {
    socketRef.current?.on(event, handler);
    return () => socketRef.current?.off(event, handler);
  }, []);

  const off = useCallback((event, handler) => {
    socketRef.current?.off(event, handler);
  }, []);

  return { socketRef, connect, disconnect, emit, on, off };
}
