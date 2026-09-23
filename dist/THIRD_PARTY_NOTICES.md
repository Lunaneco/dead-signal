# Third-party notices

- Three.js 0.170.0 — MIT License. Copyright © 2010–2024 three.js authors. https://github.com/mrdoob/three.js
- MediaPipe Tasks Vision 0.10.21 — Apache License 2.0. Copyright Google LLC. https://github.com/google-ai-edge/mediapipe
- MediaPipe Hand Landmarker model (hand_landmarker/float16/1) — distributed by Google under Apache License 2.0: https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task
- Barlow Condensed and Noto Sans JP — SIL Open Font License 1.1, bundled from the official Google Fonts repository. https://github.com/google/fonts

Full license texts are included in `licenses/`.

The vendored `three.module.js` is the official `three.module.min.js` from the 0.170.0 npm package, renamed for local imports. The MediaPipe JavaScript and both WASM variants match the official 0.10.21 npm package byte-for-byte.

The official [Hand Tracking Model Card](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Hand%20Tracking%20%28Lite_Full%29%20with%20Fairness%20Oct%202021.pdf) lists Apache License 2.0 on page 2.

Fonts are served from `fonts/` with their corresponding OFL license texts in `licenses/`; the game does not request Google Fonts at runtime.

## Original game soundtrack

The nine instrumental cues in `audio/` were generated specifically for DEAD SIGNAL using the user's local LUNA MUSIC application and ACE-Step 1.5 Turbo. No reference recording, lyrics or named-artist imitation prompt was supplied. Only exported music is distributed; the generation application, weights, local library and private job logs are not included.

The official [ACE-Step 1.5 model card](https://huggingface.co/ACE-Step/Ace-Step1.5) identifies the model as MIT licensed and explicitly allows commercial use of generated music (checked 2026-09-23). This model statement is not a guarantee of exclusive copyright in generated output. Generation settings, file hashes and technical audio checks are recorded in `audio/manifest.json`.
