import type { DatasetDef } from "../types";

export const companyDataset: DatasetDef = {
  id: "company",
  name: "Company / Employees",
  description:
    "An HR-style dataset with departments, employees, managers and salaries. Designed for self-joins, ranking, and Nth-highest-salary style problems.",
  tables: [
    {
      name: "departments",
      description: "Company departments.",
      columns: [
        { name: "dept_id", type: "INTEGER", pk: true },
        { name: "dept_name", type: "VARCHAR" },
      ],
    },
    {
      name: "employees",
      description: "Employees, some with managers, some without. Contains duplicate salaries and one duplicate email.",
      columns: [
        { name: "employee_id", type: "INTEGER", pk: true },
        { name: "first_name", type: "VARCHAR" },
        { name: "last_name", type: "VARCHAR" },
        { name: "email", type: "VARCHAR" },
        { name: "dept_id", type: "INTEGER", fk: { table: "departments", column: "dept_id" }, nullable: true },
        { name: "manager_id", type: "INTEGER", fk: { table: "employees", column: "employee_id" }, nullable: true },
        { name: "salary", type: "DOUBLE" },
        { name: "hire_date", type: "DATE" },
      ],
    },
  ],
  relationships: [
    { from: "employees", fromCol: "dept_id", to: "departments", toCol: "dept_id" },
    { from: "employees", fromCol: "manager_id", to: "employees", toCol: "employee_id" },
  ],
  ddl: `
    CREATE TABLE departments (
      dept_id INTEGER PRIMARY KEY,
      dept_name VARCHAR NOT NULL
    );

    CREATE TABLE employees (
      employee_id INTEGER PRIMARY KEY,
      first_name VARCHAR NOT NULL,
      last_name VARCHAR NOT NULL,
      email VARCHAR NOT NULL,
      dept_id INTEGER,
      manager_id INTEGER,
      salary DOUBLE NOT NULL,
      hire_date DATE NOT NULL
    );
  `,
  seed: `
    INSERT INTO departments (dept_id, dept_name) VALUES
      (1, 'Engineering'),
      (2, 'Sales'),
      (3, 'Marketing'),
      (4, 'HR'),
      (5, 'Finance'),
      (6, 'Research');

    INSERT INTO employees (employee_id, first_name, last_name, email, dept_id, manager_id, salary, hire_date) VALUES
      (1,  'Alice',   'Nguyen',   'alice.nguyen@company.com',   1, NULL, 165000, DATE '2018-01-15'),
      (2,  'Ben',     'Carter',   'ben.carter@company.com',     1, 1,    132000, DATE '2019-03-01'),
      (3,  'Chloe',   'Diaz',     'chloe.diaz@company.com',     1, 1,    132000, DATE '2019-05-11'),
      (4,  'Derek',   'Evans',    'derek.evans@company.com',    1, 2,    98000,  DATE '2021-07-19'),
      (5,  'Ella',    'Foster',   'ella.foster@company.com',    1, 2,    101000, DATE '2020-09-01'),
      (6,  'Frank',   'Grant',    'frank.grant@company.com',    1, 2,    98000,  DATE '2022-01-10'),
      (7,  'Grace',   'Howard',   'grace.howard@company.com',   2, NULL, 145000, DATE '2017-11-01'),
      (8,  'Henry',   'Irwin',    'henry.irwin@company.com',    2, 7,    92000,  DATE '2020-02-14'),
      (9,  'Ivy',     'Jacobs',   'ivy.jacobs@company.com',     2, 7,    97000,  DATE '2019-06-23'),
      (10, 'Jack',    'Kim',      'jack.kim@company.com',       2, 7,    97000,  DATE '2021-08-30'),
      (11, 'Karen',   'Lopez',    'karen.lopez@company.com',    2, 7,    88000,  DATE '2022-03-15'),
      (12, 'Liam',    'Moore',    'liam.moore@company.com',     3, NULL, 118000, DATE '2018-06-01'),
      (13, 'Mia',     'Nash',     'mia.nash@company.com',       3, 12,   76000,  DATE '2021-01-11'),
      (14, 'Noah',    'Owens',    'mia.nash@company.com',       3, 12,   76000,  DATE '2022-09-05'),
      (15, 'Olivia',  'Perez',    'olivia.perez@company.com',   3, 12,   82000,  DATE '2020-04-18'),
      (16, 'Paul',    'Quinn',    'paul.quinn@company.com',     4, NULL, 105000, DATE '2016-02-20'),
      (17, 'Queenie', 'Reyes',    'queenie.reyes@company.com',  4, 16,   67000,  DATE '2021-10-04'),
      (18, 'Ryan',    'Scott',    'ryan.scott@company.com',     4, 16,   67000,  DATE '2022-11-21'),
      (19, 'Sara',    'Turner',   'sara.turner@company.com',    5, NULL, 138000, DATE '2015-09-09'),
      (20, 'Tom',     'Underwood','tom.underwood@company.com',  5, 19,   99500,  DATE '2019-12-01'),
      (21, 'Uma',     'Vance',    'uma.vance@company.com',      5, 19,   99500,  DATE '2020-06-17'),
      (22, 'Victor',  'Wells',    'victor.wells@company.com',   5, 19,   112000, DATE '2018-08-08'),
      (23, 'Wendy',   'Xu',       'wendy.xu@company.com',       1, 2,    98000,  DATE '2023-02-27'),
      (24, 'Xavier',  'Young',    'xavier.young@company.com',   NULL, NULL, 71000, DATE '2023-05-30'),
      (25, 'Yara',    'Zimmer',   'yara.zimmer@company.com',    2, 7,    97000,  DATE '2023-07-14');
  `,
};
