import { readFile } from "fs/promises";
import { allVerbs } from "./db";
import { MooDatabaseReader } from "./reader";

readFile("LambdaCore-12Apr99.db", { encoding: "ascii" }).then((data) => {
  const reader = new MooDatabaseReader(data);
  const db = reader.readDatabase();
  const verbs = allVerbs(db);
  console.log(JSON.stringify(Array.from(verbs)));
});
