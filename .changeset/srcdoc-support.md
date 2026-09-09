---
'resize-iframe': minor
---

`srcdoc` support, for inline HTML the host owns.

`withResizeChild(html)` from `resize-iframe/inject` inlines the child script into
HTML you generate — report embeds, quizzes, model output — so the document you hand
to `srcdoc` stays self-contained: no CDN, no relative path back to the package. It
is idempotent, and wraps a fragment in a minimal document with a measurable box, so
anything from a bare string of text upwards sizes correctly. `childScriptTag()` and
`childScriptSource` are exported too, for hosts that place the script themselves.

The `<resize-iframe>` element now accepts `srcdoc` alongside `src`, applies
`sandbox` and `allow` before either so the first load carries them, and takes a
`warning-timeout` attribute (`0` silences the missing-child warning).
