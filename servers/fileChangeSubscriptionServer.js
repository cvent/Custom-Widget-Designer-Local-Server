import WebSocket, { WebSocketServer } from "ws";
import md5 from "md5";
import { readdirSync, readFileSync, watch, existsSync, statSync } from "fs";
import { resolve, parse } from "path";

const PORT = 6270;

/**
 * Creates a websocket server that publishes a change event to all connected clients when a material change occurs to one of the files in the provided directory.
 * The directory is monitored by watch() and the events detected are filtered for relevance by comparing current and past md5 checksums of the files.
 * A change event occurs when a file is edited (& saved), renamed, added, moved or deleted in the directory or any of the sub directories.
 * A change event also occurs when a directory is moved, renamed or deleted.
 */

export const watchDirectory = async (directoryPath) => {
  // establish websocket server
  const wss = new WebSocketServer({ port: PORT });

  // send messages to connected clients, debounced
  let timeout;
  const messageClients = (message) => {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      const clients = [...wss.clients.values()];
      clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
      console.log('"update" message sent');
    }, 200);
  };

  // iterate through all files in the provided directory and all it's subdirectories, returning the absolute file path
  function* getFiles(dir) {
    const dirEnts = readdirSync(dir, { withFileTypes: true });
    for (const dirent of dirEnts) {
      const res = resolve(dir, dirent.name);
      if (dirent.isDirectory()) {
        yield* getFiles(res);
      } else {
        yield res;
      }
    }
  }

  // map of a file's unique Inode number to the most recently computed checksum of the file contents
  const filesToChecksums = new Map();

  // initialize the map
  for await (const fullPath of getFiles(directoryPath)) {
    const fileIno = statSync(fullPath).ino;
    filesToChecksums.set(fileIno, md5(readFileSync(fullPath)));
  }

  // Monitors a directory for changes to any files or directories
  const watchDir = (directoryPath, options = null) => {
    watch(directoryPath, options, (_eventType, filePath) => {
      if (!filePath) {
        console.log(
          "ERROR: The platform did specify which file changed. Please Refresh the Custom Widget Designer manually. "
        );
        return;
      }

      // MacOS specific, ignore .DS_Store changes
      if (parse(filePath).name === ".DS_Store") {
        return;
      }

      // Linux specific, ignore temporary files during save
      if (parse(filePath).name.includes("goutputstream")) {
        return;
      }

      const fullPath = resolve(directoryPath, filePath);

      // does something exist at this path?
      if (existsSync(fullPath)) {
        const stats = statSync(fullPath);

        const fileIno = stats.ino;

        const existingChecksum = filesToChecksums.get(fileIno);

        if (existingChecksum) {
          // compare the current and previous checksum for this file and only send a message if the file materially changed
          const newChecksum = md5(readFileSync(fullPath));
          if (newChecksum !== existingChecksum) {
            filesToChecksums.set(fileIno, newChecksum);
            messageClients("rerender");
          }
        } else if (stats.isFile()) {
          // this is a new file
          filesToChecksums.set(fileIno, md5(readFileSync(fullPath)));
          messageClients("rerender");
        } else if (stats.isDirectory()) {
          // if anything happens to a directory
          messageClients("rerender");
        }
      } else {
        // file path doesn't exist. This can happen if the file is deleted or the file is moved and its old path doesn't exist anymore
        messageClients("rerender");
      }
    });
  };

  // watch for changes in the root directory that the user provided, along with all subdirectories via the 'recursive' option
  watchDir(directoryPath, { recursive: true });

  // The "recursive" option for fs.watch() is only supported on Windows and MacOS
  // on other platforms, in addition to watching the root directory, we will also watch all subdirectories found under the root
  if (process.platform !== "win32" && process.platform !== "darwin") {

    // TODO: this can be implemented
    console.log('On this operating system, new directories created under the root directory will not be monitored for changes automatically. If you create a new directory, simply restart this server.')

    const watchSubDirs = (dir) => {
      const directoryEntries = readdirSync(dir, { withFileTypes: true });
      directoryEntries.forEach((entry) => {
        if (entry.isDirectory()) {
          const directory = resolve(dir, entry.name);
          // watch this directory
          watchDir(directory);
          // recurse on this directory to watch it's subdirectories
          watchSubDirs(directory);
        }
      });
    };

    // watch all the root's subdirectories
    watchSubDirs(directoryPath);
  }
};
