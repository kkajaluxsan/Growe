/** Set from server.js after Socket.IO is created — optional real-time notification fan-out. */
let ioRef = null;

export function setNotificationIo(io) {
  ioRef = io;
}

export function getNotificationIo() {
  return ioRef;
}
