import { runMigrations } from "./migrate";

runMigrations()
  .then(() => {
    console.log("Migrations applied");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
