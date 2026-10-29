"""Read a temporary provider token from stdin; run the fixed integration test without echoing it."""
import os,subprocess,sys
secret=sys.stdin.readline().rstrip('\r\n')
if not secret:
    raise SystemExit('Missing temporary provider token')
environment=os.environ.copy()
environment['OPENCODE_API_KEY']=secret
process=subprocess.Popen(['node','tests/little-deep-api2-host.mjs'],env=environment,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
for line in process.stdout:
    sys.stdout.write(line.replace(secret,'[REDACTED]'))
    sys.stdout.flush()
raise SystemExit(process.wait())
