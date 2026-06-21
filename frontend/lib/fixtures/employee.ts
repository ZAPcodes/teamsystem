// Employee fixture — no money math, just read these values directly.

export interface EmployeeBudget {
  /** Total quarterly allowance in ALL */
  quarterlyBudgetALL: number;
  /** Amount already settled (paid to providers) */
  spentALL: number;
  /** Amount held in pending/approved packages not yet settled */
  heldALL: number;
  /** Human-readable quarter label */
  quarterLabel: string;
}

export const EMPLOYEE_BUDGET: EmployeeBudget = {
  quarterlyBudgetALL: 20000,
  spentALL: 7600,
  heldALL: 4800,
  quarterLabel: "Q2 2026",
};

export interface EmployeeProfile {
  id: string;
  name: string;
  role: string;
  company: string;
}

export const EMPLOYEE_PROFILE: EmployeeProfile = {
  id: "emp-001",
  name: "Arben Krasniqi",
  role: "Software Engineer",
  company: "Perx Demo Co.",
};
