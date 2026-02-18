import { readFileSync } from "node:fs";
import { createServer, type ServerOptions } from "node:https";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const TLS_VERSION_OPTIONS = {
  minVersion: "TLSv1.2",
  maxVersion: "TLSv1.2",
} as const;

export const EMPLOYEE_RECORD = {
  employee_id: "EMP-001",
  first_name: "Jane",
  last_name: "Doe",
  ssn_last4: "1234",
  employment_status: "active",
  hire_date: "2023-06-15",
  annual_salary: 85000,
  employer_name: "Acme Corp",
};

const DEFAULT_PORT = 4443;

function createTlsServerOptions(baseDir: string): ServerOptions {
  const certPath = resolve(baseDir, "cert.pem");
  const keyPath = resolve(baseDir, "key.pem");

  return {
    cert: readFileSync(certPath),
    key: readFileSync(keyPath),
    ...TLS_VERSION_OPTIONS,
  };
}

export function startMockServer(port = DEFAULT_PORT): void {
  const fileDir = resolve(fileURLToPath(import.meta.url), "..");
  const options = createTlsServerOptions(fileDir);

  const server = createServer(options, (req, res) => {
    if (req.method === "GET" && req.url === "/api/v1/employee/EMP-001") {
      res.writeHead(200, {
        "content-type": "application/json",
        connection: "close",
      });
      res.end(JSON.stringify(EMPLOYEE_RECORD));
      return;
    }

    res.writeHead(404, {
      "content-type": "application/json",
      connection: "close",
    });
    res.end(JSON.stringify({ error: "not_found" }));
  });

  server.listen(port, () => {
    console.log(`[mock-server] Listening on https://localhost:${port}`);
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startMockServer();
}
