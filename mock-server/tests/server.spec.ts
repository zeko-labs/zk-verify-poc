import { describe, expect, it } from "vitest";

import { EMPLOYEE_RECORD, TLS_VERSION_OPTIONS } from "../server.js";

describe("mock server configuration", () => {
  it("Given mock server constants When inspected Then TLS is forced to 1.2", () => {
    expect(TLS_VERSION_OPTIONS.minVersion).toBe("TLSv1.2");
    expect(TLS_VERSION_OPTIONS.maxVersion).toBe("TLSv1.2");
  });

  it("Given employee endpoint fixture When inspected Then required fields are present", () => {
    expect(EMPLOYEE_RECORD.employee_id).toBe("EMP-001");
    expect(EMPLOYEE_RECORD.annual_salary).toBe(85000);
    expect(EMPLOYEE_RECORD.employment_status).toBe("active");
  });
});
