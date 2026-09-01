import type { MyDbTable } from "./types";

/** A small starter dataset users can load into an empty My Database with one click. */
export const sampleTables: MyDbTable[] = [
  {
    name: "departments",
    columns: [
      { name: "dept_id", type: "INTEGER", nullable: false, pk: true },
      { name: "dept_name", type: "VARCHAR", nullable: false },
    ],
    rows: [
      { dept_id: 10, dept_name: "Engineering" },
      { dept_id: 20, dept_name: "Sales" },
      { dept_id: 30, dept_name: "Marketing" },
      { dept_id: 40, dept_name: "Support" },
    ],
  },
  {
    name: "employees",
    columns: [
      { name: "employee_id", type: "INTEGER", nullable: false, pk: true },
      { name: "first_name", type: "VARCHAR", nullable: true },
      { name: "last_name", type: "VARCHAR", nullable: true },
      { name: "dept_id", type: "INTEGER", nullable: true },
      { name: "manager_id", type: "INTEGER", nullable: true },
      { name: "salary", type: "DECIMAL", nullable: true },
      { name: "hire_date", type: "DATE", nullable: true },
    ],
    rows: [
      { employee_id: 1, first_name: "John", last_name: "Smith", dept_id: 10, manager_id: null, salary: 95000, hire_date: "2019-03-01" },
      { employee_id: 2, first_name: "Alice", last_name: "Brown", dept_id: 10, manager_id: 1, salary: 88000, hire_date: "2020-06-15" },
      { employee_id: 3, first_name: "Mike", last_name: "Wilson", dept_id: 10, manager_id: 1, salary: 76000, hire_date: "2021-01-10" },
      { employee_id: 4, first_name: "Priya", last_name: "Nair", dept_id: 20, manager_id: null, salary: 91000, hire_date: "2018-11-20" },
      { employee_id: 5, first_name: "Carlos", last_name: "Diaz", dept_id: 20, manager_id: 4, salary: 68000, hire_date: "2022-02-05" },
      { employee_id: 6, first_name: "Emma", last_name: "Clark", dept_id: 30, manager_id: null, salary: 82000, hire_date: "2020-09-12" },
      { employee_id: 7, first_name: "Liam", last_name: "Walker", dept_id: 30, manager_id: 6, salary: 59000, hire_date: "2023-04-18" },
      { employee_id: 8, first_name: "Sara", last_name: "Lee", dept_id: 40, manager_id: null, salary: 71000, hire_date: "2021-07-22" },
      { employee_id: 9, first_name: "Noah", last_name: "Young", dept_id: 40, manager_id: 8, salary: 54000, hire_date: "2024-01-08" },
      { employee_id: 10, first_name: "Grace", last_name: "Hall", dept_id: null, manager_id: null, salary: 60000, hire_date: "2023-10-30" },
    ],
  },
  {
    name: "projects",
    columns: [
      { name: "project_id", type: "INTEGER", nullable: false, pk: true },
      { name: "project_name", type: "VARCHAR", nullable: false },
      { name: "dept_id", type: "INTEGER", nullable: true },
      { name: "budget", type: "DECIMAL", nullable: true },
      { name: "start_date", type: "DATE", nullable: true },
    ],
    rows: [
      { project_id: 1, project_name: "Platform Rewrite", dept_id: 10, budget: 250000, start_date: "2024-01-15" },
      { project_id: 2, project_name: "Mobile App", dept_id: 10, budget: 180000, start_date: "2024-03-01" },
      { project_id: 3, project_name: "Q3 Campaign", dept_id: 30, budget: 60000, start_date: "2024-06-01" },
      { project_id: 4, project_name: "Support Portal", dept_id: 40, budget: 45000, start_date: "2024-02-20" },
      { project_id: 5, project_name: "Sales Expansion", dept_id: 20, budget: 120000, start_date: "2024-04-10" },
    ],
  },
];
