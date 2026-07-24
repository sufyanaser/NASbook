# No async beforeunload save

Electron does not await asynchronous persistence inside `beforeunload`. NASbook therefore uses a Main/Renderer close handshake and must keep that architecture.
