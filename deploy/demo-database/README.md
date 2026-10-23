# Demo database snapshot

Published in Git at the project owner's request for automatic demo deployment.
The export contains application accounts with their existing password hashes,
all learning collections, 150 attachments, and three question-bank assets.
It contains no database connection configuration or application API keys.

`transfer.json` records the source revision and summary. `snapshot/manifest.json`
contains SHA-256 hashes of the account snapshot and every attachment. Import
verifies all bytes and full database readback before committing. Git attributes
preserve exact export bytes on Windows and Linux.

Only an empty VPS database is seeded. Existing progress survives redeployment.
See `deploy/node1/MIGRATE-DATABASE.md` for operations and backup instructions.
