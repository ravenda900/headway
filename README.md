# headway

## Development

TLDR; `make db`, `make dev`, `make server` and open [http://localhost:8080](http://localhost:8080)

Install dependencies with `make install`

Build frontend with `make build`

Reset database with `make db`

Start node server with `make server` (nodemon)

Start client dev server with `make dev` (webpack-dev-server)

Create a new component with `make component name=FluxCapacitor`

Lint both client and server with `make lint`

Deploy to heroku with `make deploy`


## Server environment variables

During development, create a `.env` file to store your environment variables. The server uses the following:

- `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` for S3 access
- `MOCK_AUTH=1` will hard code the user authentication to Admin ID 1 and Student ID 1
- `SAMPLE_DATA=1` when running `make db` will populate the database with fixtures from `data/`
- `CLEARDB_DATABASE_URL` can be used to change database connection. Use with caution during development
- `JWT_SECRET`

e.g.

```
AWS_ACCESS_KEY_ID=x
AWS_SECRET_ACCESS_KEY=x
MOCK_AUTH=1
JWT_SECRET=secret
SESSION_SECRET=x
```

For production, these environment variables should be managed via heroku.


## Technology

Client is based on `vue-webpack-typescript` boilerplate

Server is TypeScript, run with `ts-node`

Data stored in MySQL, accessed via `sequelize`


## Routes

Public, Static:

```
GET /
GET /app
GET /dashboard
```

For APIs, see POSTMAN collection in [tests/Headway.postman_collection.json](tests/Headway.postman_collection.json)

## Dev on Windows

Might need to run some commands slightly differently. You'll figure it out.

```
npm install
make dev
node_modules\.bin\ts-node.cmd server\reset-database.ts
node_modules\.bin\ts-node.cmd server\server.ts
```
