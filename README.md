# Custom Widget Designer Local Server

This server allows a developer to serve local custom widget files to the Custom Widget Designer. The Designer site requires this local server in order to:

- Fetch the local files that constitute the custom widget.
- Establish a websocket connection that will receive "change" messages from this server when a file or directory under the user's chosen directory has been created, removed, modified or deleted.
This server is intended to be run locally and requires the usage of ports 6270 and 6271.

## Usage

1. Make sure that you have node installed (v12.22.0 or greater) as well as a package manager such as npm.

2. Navigate to where you have cloned this repository and install the dependencies:

    ex. ```npm i```

3. Determine the absolute path to the folder that contains the files for your custom widget. The entrypoint files (js modules with the default export being the custom element class that is your custom widget/editor element) for your widget and editor element should exist in the root of this directory and should be named `widget.js` and `editor.js`. Other than this, there are no other requirements on the structure of this directory.

    ```
    . . .
    └── featured-session-widget/
        ├── widget.js
        ├── editor.js
        ├── components/
        │   ├── FeaturedSessionComponent.js
        │   └── ScrollCarousel/
        │       ├── Carousel.js
        │       └── CarouselTile.js
        └── utils/
            └── doSomething.js
    ```

4. Run the start command.

    ```npm start```

    When prompted, provide the absolute path to the directory and hit return.

    Alternatively you may provide the path as a command line argument:

    ```npm start /Users/me/my-cvent-custom-widgets/featured/session```

    When your server has started you will see:

    ```local files at "/Users/me/my-cvent-custom-widgets/featured/session" are now being served on port 6271```

5. Your custom widget can now be previewed in the Custom Widget Designer.

## Notes on the File Change Subscription

Actions where a file is modified, created, renamed, deleted or moved will trigger a change event, as well as moving, creating, renaming or deleting a directory. Saving a file that has not had a detectable change made (based on an md5 hash comparison) will not trigger a change event on most platforms.

Operating systems that are not Windows or MacOs do not support recursively watching directory contents via the nodejs watch() function. On these operating systems if a new directory is created under the user chosen root, the server should be restarted in order to receive updates to changes made to that directory and its contents. All other features are the same.
