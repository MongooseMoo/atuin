import { CompatibilityTable, Telnet, TelnetOption } from "libtelnet-ts";
import net from "net";

type Port = number;

class TelnetConnection {
  telnetConnection: Telnet;
  decoder: TextDecoder;
  buffer: string = "";

  constructor(public socket: net.Socket, private server: TelnetServer) {
    this.decoder = new TextDecoder();
    this.telnetConnection = new Telnet(this.server.compatibilityTable, 0);
    this.socket.on("data", (data) => {
      this.telnetConnection.receive(data);
    });
    this.telnetConnection.on("send", (event) => {
      this.socket.write(event.buffer);
    });
    this.telnetConnection.on("data", (event) => {
      this.processData(event.buffer);
      this.telnetConnection.send(event.buffer);
    });

    // always call telnet.dispose() when a socket closes
    socket.on("close", () => {
      this.telnetConnection.dispose();
      this.server.onDispose(this);
    });
  }
  processData(buffer: Uint8Array) {
    this.buffer = this.buffer + this.decoder.decode(buffer);
    const sep = this.buffer.indexOf("\r\n");
    if (sep !== -1) {
      const line = this.buffer.substring(0, sep);
      this.buffer = this.buffer.substring(sep + 2);
      this.server.handleIncoming(this, line);
    }
  }
}

export class TelnetServer {
  server: net.Server;
  connections: TelnetConnection[] = [];

  constructor(
    public port: Port,
    public compatibilityTable: CompatibilityTable
  ) {
    this.server = net.createServer();

    this.server.on("connection", (socket) => {
      this.createConnection(socket);
    });
  }
  createConnection(socket: net.Socket) {
    console.log("new connection from  " + socket.remoteAddress);
    this.connections.push(new TelnetConnection(socket, this));
  }

  handleIncoming(connection: TelnetConnection, data: string) {
    const text = data.toString();
    console.log(
      `received ${text}      from ${connection.socket.remoteAddress}`
    );
  }

  async listen() {
    console.log("listening on port " + this.port);
    await this.server.listen(this.port);
  }

  onDispose(connection: TelnetConnection) {
    this.connections = this.connections.filter((c) => c !== connection);
  }

  static async create(port: number) {
    await Telnet.ready;
    let table = CompatibilityTable.create();
    table.support(TelnetOption.ECHO, true, false); // local and remote echo
    table.support(TelnetOption.SGA, true, false); // local and remote suppress go ahead
    table.support(TelnetOption.STATUS, true, false); // local and remote status
    table.support(TelnetOption.TM, true, false); // local and remote timing mark
    table.support(TelnetOption.TTYPE, true, false); // local and remote terminal type
    table.finish();
    return new TelnetServer(port, table);
  }
}

TelnetServer.create(4242).then((server) => {
  server.listen();
});
