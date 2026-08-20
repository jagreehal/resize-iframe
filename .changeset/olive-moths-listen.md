---
"resize-iframe": minor
---

Give the framed page a way to receive what the parent sends.

`parentIframe.onMessage = (message) => …` delivers whatever the embedder posted with `sendMessage`. Until now the channel was send-only: the parent could post into the frame, but the child script never listened, so every embedded page had to hand-roll a `message` listener and work out for itself which messages came from the embedder.

Both directions now travel in the same `resize-iframe-message` envelope, and the child checks `event.source === parent` the same way the parent checks the frame's own window. Unrelated postMessage traffic aimed at your frame no longer reaches the callback.

**Breaking for hand-rolled child listeners.** A child page reading `event.data` directly now sees `{ 'resize-iframe-message': … }` rather than the bare payload. Use `parentIframe.onMessage` instead.
