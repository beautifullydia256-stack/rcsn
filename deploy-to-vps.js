/**
 * Automated Remote Execution Tool for PwezaCore Linode VPS
 * Usage:
 *   node deploy-to-vps.js <ROOT_PASSWORD>
 *   or
 *   node deploy-to-vps.js --key <PATH_TO_PRIVATE_KEY>
 */

const fs = require('fs');
const path = require('path');
let Client;
try {
  Client = require('ssh2').Client;
} catch (e) {
  Client = require('C:/Users/KIMULI TECH/.gemini/antigravity-ide/brain/c02b4796-5dfd-4e55-ab9f-547b04b1c619/scratch/node_modules/ssh2').Client;
}

const VPS_IP = process.env.VPS_IP || '104.105.15.14';
const SCRIPT_PATH = path.join(__dirname, 'setup-linode-vps.sh');

const args = process.argv.slice(2);
let password = process.env.VPS_PASSWORD || null;
let privateKey = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--key' && args[i + 1]) {
    privateKey = fs.readFileSync(args[i + 1]);
    i++;
  } else if (!args[i].startsWith('--')) {
    password = args[i];
  }
}

if (!password && !privateKey) {
  console.log('---------------------------------------------------------');
  console.log(' PwezaCore Linode VPS Remote Deployer');
  console.log('---------------------------------------------------------');
  console.log('Usage:');
  console.log('  node deploy-to-vps.js <ROOT_PASSWORD>');
  console.log('  node deploy-to-vps.js --key "C:\\path\\to\\id_rsa"');
  console.log('---------------------------------------------------------');
  process.exit(1);
}

const scriptContent = fs.readFileSync(SCRIPT_PATH, 'utf8');

console.log(`[1/3] Connecting to root@${VPS_IP}:22...`);
const conn = new Client();

const connectConfig = {
  host: VPS_IP,
  port: 22,
  username: 'root',
  readyTimeout: 20000,
};

if (password) connectConfig.password = password;
if (privateKey) connectConfig.privateKey = privateKey;

conn.on('ready', () => {
  console.log(`[2/3] Connected successfully to ${VPS_IP}!`);
  console.log('[3/3] Uploading setup-linode-vps.sh via SFTP...');

  conn.sftp((err, sftp) => {
    if (err) {
      console.error('SFTP error:', err);
      conn.end();
      process.exit(1);
    }

    const writeStream = sftp.createWriteStream('/root/setup-linode-vps.sh', { mode: 0o755 });
    writeStream.on('close', () => {
      console.log('Upload complete. Executing /root/setup-linode-vps.sh...\n');

      conn.exec('bash /root/setup-linode-vps.sh', (err, stream) => {
        if (err) {
          console.error('Execution error:', err);
          conn.end();
          process.exit(1);
        }

        stream.on('close', (code, signal) => {
          console.log(`\nExecution finished with exit code: ${code}`);
          conn.end();
          process.exit(code || 0);
        });

        stream.on('data', (data) => {
          process.stdout.write(data.toString());
        });

        stream.stderr.on('data', (data) => {
          process.stderr.write(data.toString());
        });
      });
    });

    writeStream.on('error', (err) => {
      console.error('SFTP write error:', err);
      conn.end();
      process.exit(1);
    });

    writeStream.end(scriptContent);
  });
}).on('error', (err) => {
  console.error(`SSH Connection Failed: ${err.message}`);
  process.exit(1);
}).connect(connectConfig);
