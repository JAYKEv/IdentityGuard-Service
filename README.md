# IdentityGuard Service – Authentication Node.js API

![Status](https://img.shields.io/badge/status-experimental-orange)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

**If you like this project then give it a Github star!** 🤩⭐

## About

IdentityGuard Service is a backend-only authentication and session management API built with Node.js, Express, and TypeScript. It focuses on short‑lived access tokens, hardened refresh token rotation, and visibility into active user sessions.

## Table of Contents

=================

- [About](#about)
- [Table of Contents](#table-of-contents)
- [Project Description](#-project-description)
- [Prerequisites](#%EF%B8%8F-prerequisites)
- [Installation](#-installation)
  - [Local installation](#-local-installation)
  - [Docker installation](#-docker-installation)
- [How to use](#-how-to-use)
- [Technologies](#-technologies)
- [Security highlights](#-security-highlights)
- [TODO list](#-todo-list)
- [License](#-license)
- [Author](#-author)

---

## 💻 Project Description

IdentityGuard Service is designed as a small, production-style auth backend that you can drop behind a SPA, mobile app, or API gateway. It offers:

1. **User lifecycle**: registration, login, logout, and profile read/update.
2. **Admin tools**: CRUD for users (create accounts, list users, update, delete).
3. **Short‑lived access tokens**: JWT access tokens for protected resources.
4. **Hardened refresh flow**: rotating refresh tokens with reuse detection.
5. **Session visibility**: list and revoke active sessions on a per-user basis.
6. **Rate limiting for auth**: endpoint-aware limits and soft lockout for `/login` and `/refresh`.
7. **Sample protected & data routes**: simple endpoints you can secure and test against.

MongoDB stores users and issued refresh tokens (sessions). Redis is used as a fast, centralized store for token blocklists and rate‑limiting metadata so that multiple instances of the service stay in sync.

## ⚙️ Prerequisites

- [Node.js](https://nodejs.org/en/) 16.15+
- [Yarn](https://yarnpkg.com/) (or another package manager, if you adapt the commands)
- [MongoDB](https://www.mongodb.com/docs/manual/installation/) instance
- [Redis](https://redis.io/download/) instance
- Optionally [Docker](https://docs.docker.com/get-docker/) if you prefer running everything in containers

## 🚀 Installation

After installing the tools and pulling the source code, configure the project using a `.env` file. An example file `.env.example` is provided and can be copied and customized. The key variables are:

```
DATABASE_URL="<MONGODB DATABASE URL>"
DATABASE_USER="<MONGODB ACCESS USERNAME>"
DATABASE_PASSWORD="<MONGODB ACCESS PASSWORD>"

PORT=<PORT NUMBER (3000 IS THE DEFAULT)>
SALT=<PASSWORD HASH GENERATION SALT NUMBER (10 IS THE DEFAULT)>

REFRESH_TOKEN_PRIVATE_KEY="<SECRET KEY USED TO ENCRYPT THE JWT REFRESH TOKEN>"
ACCESS_TOKEN_PRIVATE_KEY="<SECRET KEY USED TO ENCRYPT THE JWT ACCESS TOKEN>"

REFRESH_TOKEN_EXPIRATION="<EXPIRATION TIME FOR THE REFRESH TOKEN>"
ACCESS_TOKEN_EXPIRATION="<EXPIRATION TIME FOR THE ACCESS TOKEN>"

COOKIE_DOMAIN="<DOMAIN TO BE USED WHEN CREATING THE REFRESH TOKEN COOKIE>"

REDIS_URL="<REDIS DATABASE URL>"
AUTH_MODE="cookie|header" # how refresh tokens are transported (cookie or Authorization header)
```

The `REFRESH_TOKEN_EXPIRATION` and `ACCESS_TOKEN_EXPIRATION` can be expressed as a time formatted string with a value and a time unit, such as: "5h", "40m", "320". They accept "h" for hours, "m" for minutes and any other value is considered as seconds (**important:** the "s" for seconds is **NOT** supported - any other numerical value is considered as seconds by default).

After configuring the `.env` file, you can start installing the dependencies, building and running the project.

### 🏡 Local installation

1. Make sure MongoDB and Redis are running and that `DATABASE_URL` and `REDIS_URL` in your `.env` point to them (local or managed services like MongoDB Atlas / Redis Cloud).
2. Seed the MongoDB database with initial data:

If you don’t have the MongoDB database tools yet, install them from the official MongoDB docs so that the `mongorestore` command is available on your path.

```bash
# Seed the database with initial data
$ yarn db:seed
```

3. Install dependencies and run the API:

```bash
# Install dependencies
$ yarn install

# Build project
$ yarn build

# Run the project
$ yarn start
```

For development with auto‑reload:

```bash
$ yarn dev
```

By default (`PORT=3000`), the API will be available at `http://localhost:3000`.

Useful scripts:

- `yarn clean` – clean build artifacts
- `yarn dev` – run the service in watch mode (with `nodemon`)
- `yarn build` – compile TypeScript for deployment
- `yarn start-ts` – run directly from TypeScript sources (with `ts-node`
- `yarn lint` / `yarn lint-fix` – run ESLint (optionally with autofix)
- `yarn prettier` – format code
- `yarn test` / `yarn test-coverage` – run tests and coverage

### 🐟 Docker installation

If you prefer containers, use the provided `docker-compose.yml` to spin up the API, MongoDB, Redis and Mongo Express:

```bash
$ docker-compose up -d
```

The services will be exposed on:

- API – `http://localhost:3000`
- MongoDB – `mongodb://localhost:27017/authusers`
- Redis – `redis://localhost:6379`
- Mongo Express – `http://localhost:8081/db/authusers/`

---

## 🎉 How to use

Once the service is running, you can interact with it using any REST client (HTTPie, curl, Postman, Insomnia, etc.).

- `POST /login` – authenticate with `email` and `password`, receive a short‑lived access token and a refresh token (cookie or header, depending on `AUTH_MODE`).
- `POST /refresh` – rotate the refresh token and obtain a fresh access token.
- `POST /logout` – revoke the current session.
- `GET /sessions` – list active sessions for the logged‑in user.
- `DELETE /sessions/:sessionId` – revoke a specific session by ID.
- `DELETE /sessions` – revoke all sessions except the most recently used one.

---

## 🛠 Technologies

- [Node.js](https://nodejs.org/)
- [Express.js](https://expressjs.com/)
- [Express Validator](https://express-validator.github.io/)
- [TypeScript](https://www.typescriptlang.org)
- [Yarn](https://yarnpkg.com)
- [MongoDB](https://www.mongodb.com/)
- [Redis](https://redis.io/)
- [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken)
- [Mongoose](https://mongoosejs.com)
- [Passport](http://www.passportjs.org)
- [Morgan](https://github.com/expressjs/morgan)
- [Winston](https://github.com/winstonjs/winston)
- [Swagger](https://swagger.io/)
- [Jest](https://jestjs.io/)
- [Supertest](https://github.com/ladjs/supertest)
- [Mockingoose](https://github.com/alonronin/mockingoose)
- [Husky](https://typicode.github.io/husky/#/)
- [eslint](https://eslint.org/)
- [lint-staged](https://github.com/okonet/lint-staged)
- [prettier](https://prettier.io/)
- [commitlint](https://commitlint.js.org/#/)

---

## 🔐 Security highlights

- **Token reuse detection**: refresh-token rotation with persistence and automatic global session revocation when a suspicious or reused token is detected.
- **Session management**: `/sessions` endpoints expose active sessions (IP, user-agent, timestamps) and allow revoking individual or all other sessions.
- **Endpoint-aware rate limiting**: stricter limits and soft lockouts on `/login` and `/refresh` to mitigate brute-force and token hammering.
- **Flexible auth transport**: `AUTH_MODE=cookie|header` lets you choose between secure HttpOnly cookies or `Authorization: Bearer` headers for refresh token transport without changing business logic.

## 🛠 TODO list

- [ ] Forgot password
- [ ] Change password

## 📝 License

IdentityGuard Service is currently distributed without an open‑source license.

All rights are reserved by the author (Jaykumar Kevadiya). You may not use, copy, modify,
or distribute this project in whole or in part without explicit written permission.

---

## 👨‍💻 Author

<a href="#">
 <br />
 <sub><b>Jaykumar Kevadiya</b></sub></a>

Developed with 💜 by Jaykumar Kevadiya (jay.kevadiya.dev@gmail.com)

