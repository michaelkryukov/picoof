# picoof

> Efficient (but not so much secure) microservice for rendering
> `HTML` pages to `PNG` and `PDF`.

## API

> All endpoints support both `GET` and `POST` requests,
> and parameters can be specified in the query as well
> in the body of the request. Values from the body take
> precedence. Query parameters with names ending
> with `[]` treated as arrays. Query parameters staring
> with `$` are ignored.

### /png

Generate image in `PNG` format with content described by parameters:

- `url` - url for HTML content that will be used to generate image.
- `content` – HTML content for the page that will be used to generate
    image (only works if url was not provided).
- `fullPage` – resulting image should be a screenshot of the full
    scrollable page.

### /pdf

Generate `PDF` file with content described by parameters:

- `url` - url for HTML content that will be used to generate image.
- `content` – HTML content for the page that will be used to generate
    image (only works if url was not provided).
- `format` - resulting pages format (see puppeteer for details).
- `landscape` - resulting pages should be landscape.

### Shared parameters

- `resources[]` - array with json objects with fields `path` and
    `content`; every request to `http(s?)://local/{path}` will
    avoid network entirely and just return `content`. Resources are
    also loaded from `RESOURCES_DIR`.
- `disableNetwork` – disable any network requests.
- `waitUntil` - when to consider page loaded and ready to printing
    (see puppeteer for details).
- `...` - all other parameters

## Environment variables

- `DISABLE_NETWORK` - disable any network requests
- `RESOURCES_DIR` - path to folder with files, that will be included
    by default in `resources`, that available from inside of browser
    by urls in form of `http(s?):local/{relative-path}`.

## Development

Root `docker-compose.yml` contains basic configuration for running
`pecoof`. It runs on port `8080` and maps application sources and
`./_resources` folder to the container. Application restarts on code
and resources changes.

```bash
# Start picoof container in background
docker-compose up --build -d

# Show container logs
docker-compose logs -f

# Stop and remove picoof container
docker-compose down
```
