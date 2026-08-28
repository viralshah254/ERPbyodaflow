import net from "node:net";

const port = Number(process.argv[2] || 3000);

const server = net.createServer();
server.once("error", () => {
  console.error(`Port ${port} is taken. ERP must stay on ${port}.`);
  process.exit(1);
});
server.listen(port, () => {
  server.close(() => process.exit(0));
});
