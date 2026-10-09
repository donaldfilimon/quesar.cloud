# MLAI v7 artifact production

Updated 2026-10-09T11:12:18.355816+00:00.

Only MLAI artifact production; no source, historical v6, PCM cache, commits or publication changes. Technical120 ran first and verified before other cuts. Each success is the CLI full-decode receipt plus an independently recomputed actual MP4 SHA256. Subjective listening/motion acceptance remains pending.

| Cut | Exit | Status | SHA256 | LUFS | dBTP |
| --- | --- | --- | --- | --- | --- |
| mlai-quesar-technical-120 | 0 | encoded_and_full_decode_verified | 21e2ce9afcf704f1c9f1faa156806aec9b669821907493949e546cbef8cf788b | -16.12 | -1.48 |
| mlai-quesar-kinetic-60 | 0 | encoded_and_full_decode_verified | 6ec25dc6e0d08dc3281039e08c527680bc1757bc8a2b4f2df59ba282dd6911a4 | -16.11 | -1.49 |
| mlai-quesar-editorial-60 | 0 | encoded_and_full_decode_verified | 805104de9bc259ac3c69c83fb0039a41db0adbd7ae4c0352cc055c8b963b420b | -16.08 | -1.49 |
| mlai-quesar-design-120 | 0 | encoded_and_full_decode_verified | 7fd8a4cf5fe30ec12e89a8237d74c297a097b6801bc5305e757bcd9edc882fac | -16.07 | -1.48 |
| mlai-quesar-technical-180 | 0 | encoded_and_full_decode_verified | d085f2fb139f9d71cb090747e56efae67a946d3fb208576c304d26b125fc2721 | -16.12 | -1.48 |
| mlai-quesar-design-180 | 0 | encoded_and_full_decode_verified | 3958bdcb2415fab3a820f985594a8a7b6ac5abf31722ab4857bcb9d0a391dd2f | -16.12 | -1.48 |
| mlai-quesar-technical-600 | 0 | encoded_and_full_decode_verified | e1bf0506db9133dc565596b1dc4124293667ebb6ca560dd996061d636c2e1859 | -16.10 | -1.48 |
| mlai-quesar-design-600 | 0 | encoded_and_full_decode_verified | 27de0c56d3f776380174132599c3ae96e67b7b058216c139c048e977be8bc89e | -16.12 | -1.46 |

## Exact commands and logs

`node notes/launch/quesar-editorial-2026-10-09/render-upgrade.mjs --cut mlai-quesar-technical-120 --version abbey-neural-v7`

Log: `/Users/donaldfilimon/dev/active/quesar.cloud/notes/launch/quesar-editorial-2026-10-09/artifacts/abbey-neural-v7/mlai-production-logs/mlai-quesar-technical-120.log`

`node notes/launch/quesar-editorial-2026-10-09/render-upgrade.mjs --cut mlai-quesar-kinetic-60 --version abbey-neural-v7`

Log: `/Users/donaldfilimon/dev/active/quesar.cloud/notes/launch/quesar-editorial-2026-10-09/artifacts/abbey-neural-v7/mlai-production-logs/mlai-quesar-kinetic-60.log`

`node notes/launch/quesar-editorial-2026-10-09/render-upgrade.mjs --cut mlai-quesar-editorial-60 --version abbey-neural-v7`

Log: `/Users/donaldfilimon/dev/active/quesar.cloud/notes/launch/quesar-editorial-2026-10-09/artifacts/abbey-neural-v7/mlai-production-logs/mlai-quesar-editorial-60.log`

`node notes/launch/quesar-editorial-2026-10-09/render-upgrade.mjs --cut mlai-quesar-design-120 --version abbey-neural-v7`

Log: `/Users/donaldfilimon/dev/active/quesar.cloud/notes/launch/quesar-editorial-2026-10-09/artifacts/abbey-neural-v7/mlai-production-logs/mlai-quesar-design-120.log`

`node notes/launch/quesar-editorial-2026-10-09/render-upgrade.mjs --cut mlai-quesar-technical-180 --version abbey-neural-v7`

Log: `/Users/donaldfilimon/dev/active/quesar.cloud/notes/launch/quesar-editorial-2026-10-09/artifacts/abbey-neural-v7/mlai-production-logs/mlai-quesar-technical-180.log`

`node notes/launch/quesar-editorial-2026-10-09/render-upgrade.mjs --cut mlai-quesar-design-180 --version abbey-neural-v7`

Log: `/Users/donaldfilimon/dev/active/quesar.cloud/notes/launch/quesar-editorial-2026-10-09/artifacts/abbey-neural-v7/mlai-production-logs/mlai-quesar-design-180.log`

`node notes/launch/quesar-editorial-2026-10-09/render-upgrade.mjs --cut mlai-quesar-technical-600 --version abbey-neural-v7`

Log: `/Users/donaldfilimon/dev/active/quesar.cloud/notes/launch/quesar-editorial-2026-10-09/artifacts/abbey-neural-v7/mlai-production-logs/mlai-quesar-technical-600.log`

`node notes/launch/quesar-editorial-2026-10-09/render-upgrade.mjs --cut mlai-quesar-design-600 --version abbey-neural-v7`

Log: `/Users/donaldfilimon/dev/active/quesar.cloud/notes/launch/quesar-editorial-2026-10-09/artifacts/abbey-neural-v7/mlai-production-logs/mlai-quesar-design-600.log`

Remaining: none.

Output ownership: delegated MLAI-only sequential renderer. Root owns Quesar and subsequent all16 resume verification.

Final: all eight CLI invocations exited 0; sequential wrapper exited 0. All eight receipts have encoded_and_full_decode_verified status and independently matching actual MP4 SHA256. All eight have 1920×1080, 30/1 fps, and exact duration×30 decoded frames. All 316 original cues are retained. MLAI output ownership is released to root; no additional rendering or artifact writes are planned. Root owns fresh all16 resume validation and delivery.
