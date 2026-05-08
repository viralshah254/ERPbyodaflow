/**
 * Preset lists for Payroll → Add employee: department and job title.
 * Stored as plain strings on the employee record (backend unchanged).
 */

export const PAYROLL_FORM_EMPTY_VALUE = "__none__" as const;

/** Typical functional departments for mid-size organizations. */
export const PAYROLL_DEPARTMENTS: readonly string[] = [
  "Administration",
  "Customer Service",
  "Executive Office",
  "Finance",
  "Human Resources",
  "Information Technology",
  "Legal & Compliance",
  "Marketing",
  "Operations",
  "Procurement",
  "Research & Development",
  "Sales",
  "Warehouse & Logistics",
];

export type PayrollJobTitleGroup = {
  label: string;
  titles: readonly string[];
};

/**
 * Job titles grouped for the UI (Executive first, then common business functions).
 */
export const PAYROLL_JOB_TITLE_GROUPS: readonly PayrollJobTitleGroup[] = [
  {
    label: "Executive / Management",
    titles: ["CEO", "COO", "CFO", "CMO", "CTO", "President", "Managing Director", "General Manager", "Vice President"],
  },
  {
    label: "Finance",
    titles: [
      "Chief Accountant",
      "Finance Manager",
      "Financial Controller",
      "Accountant",
      "Accounts Payable",
      "Accounts Receivable",
      "Bookkeeper",
      "Financial Analyst",
      "Treasury Analyst",
      "Payroll Administrator",
      "Tax Specialist",
      "Internal Auditor",
    ],
  },
  {
    label: "Sales",
    titles: [
      "Chief Sales Officer",
      "Sales Director",
      "Sales Manager",
      "Regional Sales Manager",
      "Account Executive",
      "Sales Representative",
      "Business Development Manager",
      "Inside Sales Representative",
    ],
  },
  {
    label: "Marketing",
    titles: [
      "Chief Marketing Officer",
      "Marketing Director",
      "Marketing Manager",
      "Brand Manager",
      "Digital Marketing Manager",
      "Content Marketing Manager",
      "Marketing Coordinator",
      "Communications Manager",
    ],
  },
  {
    label: "Operations",
    titles: [
      "Chief Operating Officer",
      "Operations Director",
      "Operations Manager",
      "Operations Supervisor",
      "Project Manager",
      "Process Analyst",
      "Office Manager",
    ],
  },
  {
    label: "Human Resources",
    titles: ["HR Director", "HR Manager", "HR Business Partner", "HR Generalist", "Recruiter", "Training Coordinator", "People Operations"],
  },
  {
    label: "Information Technology",
    titles: ["IT Director", "IT Manager", "Software Engineer", "Systems Administrator", "IT Support Specialist", "Solutions Architect", "Data Analyst"],
  },
  {
    label: "Procurement",
    titles: ["Procurement Manager", "Procurement Officer", "Buyer", "Supplier Relationship Manager"],
  },
  {
    label: "Legal & Compliance",
    titles: ["General Counsel", "Legal Counsel", "Compliance Officer", "Company Secretary"],
  },
  {
    label: "Customer Service",
    titles: ["Customer Success Manager", "Support Team Lead", "Customer Service Representative"],
  },
  {
    label: "Warehouse & Logistics",
    titles: ["Logistics Manager", "Warehouse Manager", "Inventory Controller", "Logistics Coordinator", "Dispatcher"],
  },
] as const;
