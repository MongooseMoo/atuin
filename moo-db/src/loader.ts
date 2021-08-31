import { readFile } from "fs/promises";
import { MooDatabaseReader } from "./reader";

readFile("lambda.db", { encoding: "ascii" }).then((data) => {
  const reader = new MooDatabaseReader(data);
  const db = reader.readDatabase();
  console.dir(db, { depth: null, maxArrayLength: null });
});
