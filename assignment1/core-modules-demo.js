const os = require('os');
const path = require('path');
const fs = require('fs');

const sampleFilesDir = path.join(__dirname, 'sample-files');
if (!fs.existsSync(sampleFilesDir)) {
  fs.mkdirSync(sampleFilesDir, { recursive: true });
}

// OS module
console.log('Platform:', os.platform());
console.log('CPU:', os.cpus()[0].model);
console.log('Total Memory:', os.totalmem());


// Path module
const joinedPath = path.join(sampleFilesDir, 'folder', 'file.txt');
console.log('Joined path:', joinedPath);

// fs.promises API
async function useFsPromises() {
  const demoPath = path.join(sampleFilesDir, 'demo.txt');

  await fs.promises.writeFile(demoPath, 'Hello from fs.promises!');
  const data = await fs.promises.readFile(demoPath, 'utf8');

  console.log('fs.promises read:', data);
}

useFsPromises();


// Streams for large files- log first 40 chars of each chunk
