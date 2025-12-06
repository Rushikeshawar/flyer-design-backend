// In-memory session storage
const sessionData = new Map();

exports.set = (sessionId, key, value) => {
  if (!sessionData.has(sessionId)) {
    sessionData.set(sessionId, {});
  }
  const session = sessionData.get(sessionId);
  session[key] = value;
};

exports.get = (sessionId, key) => {
  if (!sessionData.has(sessionId)) {
    return null;
  }
  const session = sessionData.get(sessionId);
  return session[key] || null;
};

exports.delete = (sessionId, key) => {
  if (!sessionData.has(sessionId)) {
    return;
  }
  const session = sessionData.get(sessionId);
  delete session[key];
};

exports.clearSession = (sessionId) => {
  sessionData.delete(sessionId);
};

exports.getAllSessions = () => {
  return Array.from(sessionData.keys());
};