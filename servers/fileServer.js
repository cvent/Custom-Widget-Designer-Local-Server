import http from "http";
import { join, extname, parse } from "path";
import { readFileSync, existsSync } from "fs";

const PORT = 6271;

/**
 * Serves the files in the provided directory
 * @param {*} directoryPath absolute path to the directory that contains the files to be served
 */

export const serveDirectory = (directoryPath) => {
  const server = http.createServer((request, response) => {
    const dirName = parse(directoryPath).name;

    // absolute path to the widget resource
    const fullPath = join(directoryPath, request.url);
 
    // does a file exist at this path?
    const exists = existsSync(fullPath);

    // is it a Javascript file?
    const isJavascriptFile = extname(fullPath) === ".js";

    // does our path contain a relative path?
    const containsRelativePath = fullPath.match(/\.\/|\..\//) !== null;

    if (exists && isJavascriptFile && !containsRelativePath) {
      console.log(`serving: ${dirName + request.url}`);
      response.setHeader("content-type", "text/javascript");
      response.setHeader("Access-Control-Allow-Origin", "*");
      response.write(readFileSync(fullPath));
      response.end();
    } else {
      console.log(
        `The path "${request.url}" was not found in the directory "${dirName}"`
      );
      response.statusCode = 404;
      response.end();
    }
  });

  console.log(
    `local files at "${directoryPath}" are now being served on port ${PORT}\n`
  );
  server.listen(PORT);
};
