# 🌼 Blueprint Botanica 🌼 [![Main](https://github.com/cmmartin14/Blueprint-Botanica/actions/workflows/main.yml/badge.svg)](https://github.com/cmmartin14/Blueprint-Botanica/actions/workflows/main.yml)

Blueprint Botanica is a digital garden planning tool designed to help gardeners experiment with and plan their gardens.

### Hosting Locally

Currently, Blueprint Botanica is not hosted online and can only be ran locally. To test the current build, navigate to the client folder:

```sh
$ cd client
```

 Run the commands:
```sh
$ npm install
$ npm run dev
```
This hosts the current build on your [localhost](http://localhost:3000/)

## Locally hosting the Database using Prisma + PSQL

Ensure that your database is both running and that your .env file has the proper database url key.
It should be formated as `DATABASE_URL="postgresql://USERNAME:PASSWORD@localhost:PORT/DATABASE?schema=public"` with your data replacing USERNAME, PASSWORD, PORT, and DATABASE.

Then, navigate to the prisma folder, and run:

```bash
npx prisma db pull
npx prisma generate
npx prisma studio
```

The local database should be automatically opened in a new window named 'Prisma Studio'.
If not, click here to open localhost on port:5555-> [Prisma Studio](http://localhost:5555).

Currently, user data is hosted using Neon. To access this, login to Neon and locate the relevant keys to place in your environment file.
