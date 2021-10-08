import lambdaVerbs from "./lambda.json";
import { MooToJavascriptConverter } from "../src/moo-to-js";

describe("MooToJavascriptConverter", () => {
  test.concurrent.each(lambdaVerbs)("%p", (verb) => {
    const transpiler = new MooToJavascriptConverter(verb.code);
    expect(transpiler.toJavascript()).toBeTruthy();
  });
});
