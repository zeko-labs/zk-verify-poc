import { readFileSync } from "node:fs";
import { createServer, type ServerOptions } from "node:https";
import { dirname, resolve } from "node:path";
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
const FILE_DIR = dirname(fileURLToPath(import.meta.url));

export interface TlsFilePaths {
  certPath: string;
  keyPath: string;
}

interface StartMockServerOptions {
  port?: number;
  certPath?: string;
  keyPath?: string;
}

function readTlsFile(path: string, label: "cert" | "key"): Buffer {
  try {
    return readFileSync(path);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`failed to read TLS ${label} file at ${path}: ${message}`);
  }
}

function resolveTlsFilePaths(input?: Partial<TlsFilePaths>): TlsFilePaths {
  return {
    certPath: input?.certPath ?? resolve(FILE_DIR, "cert.pem"),
    keyPath: input?.keyPath ?? resolve(FILE_DIR, "key.pem"),
  };
}

export function createTlsServerOptions(input?: Partial<TlsFilePaths>): ServerOptions {
  const { certPath, keyPath } = resolveTlsFilePaths(input);

  return {
    cert: readTlsFile(certPath, "cert"),
    key: readTlsFile(keyPath, "key"),
    ...TLS_VERSION_OPTIONS,
  };
}

export function startMockServer(options?: number | StartMockServerOptions): void {
  const port = typeof options === "number" ? options : (options?.port ?? DEFAULT_PORT);
  const tlsOptions = typeof options === "number" ? undefined : options;
  const serverOptions = createTlsServerOptions(tlsOptions);

  const server = createServer(serverOptions, (req, res) => {
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
