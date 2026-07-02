const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const srcDir = __dirname;
const tempDir = path.join(srcDir, 'build-temp');

function copyFolderSync(from, to) {
  if (!fs.existsSync(to)) {
    fs.mkdirSync(to, { recursive: true });
  }
  fs.readdirSync(from).forEach(element => {
    // Exclude build outputs, node_modules, temp folder and git
    if (['node_modules', '.next', 'out', '.git', 'build-temp'].includes(element)) {
      return;
    }
    const fromPath = path.join(from, element);
    const toPath = path.join(to, element);
    if (fs.lstatSync(fromPath).isDirectory()) {
      copyFolderSync(fromPath, toPath);
    } else {
      fs.copyFileSync(fromPath, toPath);
    }
  });
}

try {
  console.log('Creating isolated build environment...');
  if (fs.existsSync(tempDir)) {
    try {
      if (process.platform === 'win32') {
        const targetNodeModules = path.join(tempDir, 'node_modules');
        if (fs.existsSync(targetNodeModules)) {
          execSync(`rmdir "${targetNodeModules}"`);
        }
      }
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {}
  }
  fs.mkdirSync(tempDir);

  console.log('Copying project files to isolated folder...');
  copyFolderSync(srcDir, tempDir);

  // Link node_modules so we don't have to reinstall dependencies
  console.log('Linking node_modules...');
  const targetNodeModules = path.join(tempDir, 'node_modules');
  const sourceNodeModules = path.join(srcDir, 'node_modules');
  
  if (process.platform === 'win32') {
    // On Windows, use directory junction
    execSync(`mklink /J "${targetNodeModules}" "${sourceNodeModules}"`);
  } else {
    // On Unix, use symbolic link
    fs.symlinkSync(sourceNodeModules, targetNodeModules, 'dir');
  }

  // Exclude API routes in the temporary folder
  const tempApi = path.join(tempDir, 'src', 'app', 'api');
  if (fs.existsSync(tempApi)) {
    console.log('Removing API routes from isolated build...');
    fs.rmSync(tempApi, { recursive: true, force: true });
  }

  console.log('Running Next.js static build in isolated environment...');
  execSync('npx next build', {
    cwd: tempDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      NEXT_EXPORT: 'true'
    }
  });

  console.log('Copying static export back to project root...');
  const localOut = path.join(srcDir, 'out');
  const tempOut = path.join(tempDir, 'out');
  
  if (fs.existsSync(localOut)) {
    fs.rmSync(localOut, { recursive: true, force: true });
  }
  if (fs.existsSync(tempOut)) {
    fs.renameSync(tempOut, localOut);
  }

  console.log('Static export completed successfully!');
} catch (error) {
  console.error('Isolated build failed:', error);
  process.exit(1);
} finally {
  // Clean up temporary build folder
  if (fs.existsSync(tempDir)) {
    console.log('Cleaning up isolated build directory...');
    try {
      if (process.platform === 'win32') {
        const targetNodeModules = path.join(tempDir, 'node_modules');
        if (fs.existsSync(targetNodeModules)) {
          execSync(`rmdir "${targetNodeModules}"`);
        }
      }
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.warn('Warning: Could not remove build-temp directory fully:', cleanupError.message);
    }
  }
}
