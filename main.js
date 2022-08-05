import ReadLine from "readline";
import { stat } from "fs";
import { watchDirectory } from "./servers/fileChangeSubscriptionServer.js";
import { serveDirectory } from "./servers/fileServer.js";

const start = (directoryPath) => {
  // start websocket server that messages clients on changes to any files under the provided directory
  watchDirectory(directoryPath);
  // start server that serves the files in the provided directory
  serveDirectory(directoryPath);
};

// make sure this is a valid directory
const validateDirectoryPath = (directoryPath) => {
  stat(directoryPath, (error, stats) => {
    if (error) {
      console.log(error);
      pickDirectory();
    } else if (stats.isDirectory()) {
      start(directoryPath);
    } else {
      console.log("The provided path was not a directory.");
      pickDirectory();
    }
  });
};

const rl = ReadLine.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const pickDirectory = () => {
  rl.question(
    "Provide the absolute filepath of the directory containing your widget assets: ",
    validateDirectoryPath
  );
};

// prompt for directory or use command line arg
process.argv[2] ? validateDirectoryPath(process.argv[2]) : pickDirectory();
