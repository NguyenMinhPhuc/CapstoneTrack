/* eslint-disable no-console */

/**
 * One-off Firestore maintenance script.
 *
 * Sets `reportStatus` to "approved" for all documents in `defenseRegistrations`
 * that belong to a selected session (by `sessionId`).
 *
 * Safety:
 * - Defaults to dry-run (no writes).
 * - Writes only when `--commit` is provided.
 * - If multiple ongoing sessions exist, requires explicit `--sessionId`.
 *
 * Auth:
 * - Use Application Default Credentials, typically via:
 *   set GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\service-account.json
 */

const admin = require('firebase-admin');

function parseArgs(argv) {
  const args = {
    commit: false,
    dryRun: true,
    sessionId: undefined,
    sessionNameIncludes: undefined,
    status: 'ongoing',
    limit: undefined,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];

    if (token === '--commit') {
      args.commit = true;
      args.dryRun = false;
      continue;
    }

    if (token === '--dry-run') {
      args.commit = false;
      args.dryRun = true;
      continue;
    }

    if (token === '--sessionId') {
      args.sessionId = argv[i + 1];
      i += 1;
      continue;
    }

    if (token === '--sessionNameIncludes') {
      args.sessionNameIncludes = argv[i + 1];
      i += 1;
      continue;
    }

    if (token === '--status') {
      args.status = argv[i + 1];
      i += 1;
      continue;
    }

    if (token === '--limit') {
      const value = Number(argv[i + 1]);
      args.limit = Number.isFinite(value) ? value : undefined;
      i += 1;
      continue;
    }

    if (token === '--help' || token === '-h') {
      args.help = true;
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  return args;
}

function printHelp() {
  console.log(`\nUsage:\n  node scripts/approve-report-status.cjs [options]\n\nOptions:\n  --dry-run                     Default. No writes; only prints what would change.\n  --commit                      Actually write changes to Firestore.\n  --sessionId <id>              Target a specific session id (graduationDefenseSessions/{id}).\n  --sessionNameIncludes <text>  Optional: pick among ongoing sessions by name contains <text>.\n  --status <ongoing|upcoming|completed>  Session status filter when auto-selecting (default: ongoing).\n  --limit <n>                   For testing: only process first n registrations.\n  -h, --help                    Show help.\n\nAuth (required):\n  Set GOOGLE_APPLICATION_CREDENTIALS to a Firebase service account JSON file\n  that has access to Firestore Admin.\n\nExamples:\n  node scripts/approve-report-status.cjs --dry-run\n  node scripts/approve-report-status.cjs --commit --sessionId abc123\n  node scripts/approve-report-status.cjs --commit --sessionNameIncludes "TMĐTĐợt 1"\n`);
}

async function initAdmin() {
  if (admin.apps.length > 0) return;
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

async function resolveSessionId(db, { sessionId, sessionNameIncludes, status }) {
  if (sessionId) return sessionId;

  let query = db.collection('graduationDefenseSessions').where('status', '==', status);
  const snapshot = await query.get();

  let sessions = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

  if (sessionNameIncludes) {
    const needle = sessionNameIncludes.toLowerCase();
    sessions = sessions.filter((s) => String(s.name || '').toLowerCase().includes(needle));
  }

  if (sessions.length === 0) {
    throw new Error(
      `No sessions found for status="${status}"` +
      (sessionNameIncludes ? ` and name includes "${sessionNameIncludes}".` : '.'),
    );
  }

  if (sessions.length === 1) {
    return sessions[0].id;
  }

  console.log('Multiple sessions match. Please rerun with --sessionId to avoid updating the wrong session:');
  sessions.forEach((s) => {
    console.log(`- ${s.id} | ${s.name || '(no name)'} | status=${s.status || '(unknown)'}`);
  });

  return null;
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  await initAdmin();
  const db = admin.firestore();

  const pickedSessionId = await resolveSessionId(db, args);
  if (!pickedSessionId) {
    process.exitCode = 2;
    return;
  }

  console.log(`\nTarget sessionId: ${pickedSessionId}`);
  console.log(`Mode: ${args.dryRun ? 'DRY-RUN (no writes)' : 'COMMIT (writes enabled)'}`);

  let registrationsQuery = db.collection('defenseRegistrations').where('sessionId', '==', pickedSessionId);
  if (args.limit) registrationsQuery = registrationsQuery.limit(args.limit);

  const snapshot = await registrationsQuery.get();
  console.log(`Found ${snapshot.size} defenseRegistrations in session.`);

  let alreadyApproved = 0;
  let willUpdate = 0;

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (data.reportStatus === 'approved') {
      alreadyApproved += 1;
    } else {
      willUpdate += 1;
    }
  });

  console.log(`already approved: ${alreadyApproved}`);
  console.log(`to update:        ${willUpdate}`);

  if (args.dryRun) {
    console.log('\nDry-run complete. Re-run with --commit to apply changes.');
    return;
  }

  if (willUpdate === 0) {
    console.log('\nNothing to update.');
    return;
  }

  const bulkWriter = db.bulkWriter();
  let updated = 0;
  let skipped = 0;

  bulkWriter.onWriteError((error) => {
    console.error('Write failed:', error);
    // Stop the entire batch on the first error to avoid partial silent updates.
    return false;
  });

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (data.reportStatus === 'approved') {
      skipped += 1;
      return;
    }
    bulkWriter.update(doc.ref, { reportStatus: 'approved' });
    updated += 1;
  });

  await bulkWriter.close();

  console.log(`\nDone. Updated ${updated} docs. Skipped ${skipped} docs (already approved).`);
}

main().catch((err) => {
  console.error('\nERROR:', err?.message || err);
  process.exitCode = 1;
});
