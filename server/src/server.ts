import telnetlib from "telnetlib";

const server = telnetlib.createServer({}, (c) => {
  c.on("negotiated", () => {
    c.write("Hello World!");
  });

  c.on("data", (data) => {
    c.write(data);
  });
});

server.listen(9001);
