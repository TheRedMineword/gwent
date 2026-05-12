const fs = require("fs-extra");
const path = require("path");
const crypto = require("crypto");
const { exec } = require("child_process");
const DIST_DIR = path.join(__dirname, "dist");
const UNPACKED_DIR = path.join(DIST_DIR, "win-unpacked");
const DOWNLOAD_DIR = path.join(__dirname, "dowland");

function sha1() {
    return crypto.randomBytes(6).toString("hex");
}


function zipFolder(source, outPath) {
    return new Promise((resolve, reject) => {
        const cmd = `powershell -NoProfile -Command "Compress-Archive -Path '${source}\\\\*' -DestinationPath '${outPath}' -Force"`;

        exec(cmd, (err, stdout, stderr) => {
            if (err) {
                console.error(stderr);
                return reject(err);
            }
            resolve();
        });
    });
}

async function waitForBuild() {

    console.log("Waiting for win-unpacked...");

    while (!fs.existsSync(UNPACKED_DIR)) {
        await new Promise(r => setTimeout(r, 2000));
    }

    console.log("Found build!");
}

(async () => {

    await waitForBuild();

    const versionSha = sha1();
    const time = new Date().toISOString().replace(/[:.]/g, "-");

    await fs.ensureDir(DOWNLOAD_DIR);

    const latestZip = path.join(DOWNLOAD_DIR, "GWENT@latest.zip");
    const versionZip = path.join(DOWNLOAD_DIR, `GWENT@${versionSha}.${time}.zip`);

    console.log("Zipping...");

    await zipFolder(UNPACKED_DIR, latestZip);

    // copy versioned file
    await fs.copy(latestZip, versionZip);

    console.log("Cleaning dist...");

    await fs.remove(DIST_DIR);

    console.log("DONE:");
    console.log("Latest:", latestZip);
    console.log("Versioned:", versionZip);

})();