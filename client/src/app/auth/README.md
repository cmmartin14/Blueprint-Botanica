## Getting Started

Ensure that you have all the required dependencies installed by navigating to the client folder and running:

```bash
npm install 
```
Ensure that your database is both running and that your .env file has the proper database url key.
It should be formated as `DATABASE_URL="postgresql://USERNAME:PASSWORD@localhost:PORT_YOUR_DATABASE_IS_RUNNING_ON/DATABASE_NAME?schema=public"`

Then, navigate to the prisma folder, and run:

```bash
npx prisma db pull
npx prisma generate
npx prisma studio
```

The local database should be automatically opened in a new window named 'Prisma Studio'.
If not, click here to open localhost on port:5555-> [Prisma Studio](http://localhost:5555).

