import type { DatasetDef } from "../types";

export const healthcareDataset: DatasetDef = {
  id: "healthcare",
  name: "Healthcare",
  description:
    "A hospital-network dataset with patients, doctors, hospitals and admissions. Contains NULL allergies, repeat admissions, and patients who have never been admitted.",
  tables: [
    {
      name: "province_names",
      description: "Lookup table of province/state names.",
      columns: [
        { name: "province_id", type: "INTEGER", pk: true },
        { name: "province_name", type: "VARCHAR" },
      ],
    },
    {
      name: "hospitals",
      description: "Hospitals in the network.",
      columns: [
        { name: "hospital_id", type: "INTEGER", pk: true },
        { name: "hospital_name", type: "VARCHAR" },
        { name: "city", type: "VARCHAR" },
      ],
    },
    {
      name: "doctors",
      description: "Doctors working at hospitals.",
      columns: [
        { name: "doctor_id", type: "INTEGER", pk: true },
        { name: "first_name", type: "VARCHAR" },
        { name: "last_name", type: "VARCHAR" },
        { name: "specialty", type: "VARCHAR" },
        { name: "hospital_id", type: "INTEGER", fk: { table: "hospitals", column: "hospital_id" } },
      ],
    },
    {
      name: "patients",
      description: "Registered patients. allergies may be NULL.",
      columns: [
        { name: "patient_id", type: "INTEGER", pk: true },
        { name: "first_name", type: "VARCHAR" },
        { name: "last_name", type: "VARCHAR" },
        { name: "birth_date", type: "DATE" },
        { name: "gender", type: "VARCHAR" },
        { name: "city", type: "VARCHAR" },
        { name: "province_id", type: "INTEGER", fk: { table: "province_names", column: "province_id" } },
        { name: "allergies", type: "VARCHAR", nullable: true },
      ],
    },
    {
      name: "admissions",
      description: "Hospital admissions linking patients to doctors.",
      columns: [
        { name: "admission_id", type: "INTEGER", pk: true },
        { name: "patient_id", type: "INTEGER", fk: { table: "patients", column: "patient_id" } },
        { name: "doctor_id", type: "INTEGER", fk: { table: "doctors", column: "doctor_id" } },
        { name: "admission_date", type: "DATE" },
        { name: "discharge_date", type: "DATE", nullable: true },
        { name: "diagnosis", type: "VARCHAR" },
      ],
    },
  ],
  relationships: [
    { from: "patients", fromCol: "province_id", to: "province_names", toCol: "province_id" },
    { from: "doctors", fromCol: "hospital_id", to: "hospitals", toCol: "hospital_id" },
    { from: "admissions", fromCol: "patient_id", to: "patients", toCol: "patient_id" },
    { from: "admissions", fromCol: "doctor_id", to: "doctors", toCol: "doctor_id" },
  ],
  ddl: `
    CREATE TABLE province_names (
      province_id INTEGER PRIMARY KEY,
      province_name VARCHAR NOT NULL
    );

    CREATE TABLE hospitals (
      hospital_id INTEGER PRIMARY KEY,
      hospital_name VARCHAR NOT NULL,
      city VARCHAR NOT NULL
    );

    CREATE TABLE doctors (
      doctor_id INTEGER PRIMARY KEY,
      first_name VARCHAR NOT NULL,
      last_name VARCHAR NOT NULL,
      specialty VARCHAR NOT NULL,
      hospital_id INTEGER NOT NULL
    );

    CREATE TABLE patients (
      patient_id INTEGER PRIMARY KEY,
      first_name VARCHAR NOT NULL,
      last_name VARCHAR NOT NULL,
      birth_date DATE NOT NULL,
      gender VARCHAR NOT NULL,
      city VARCHAR NOT NULL,
      province_id INTEGER,
      allergies VARCHAR
    );

    CREATE TABLE admissions (
      admission_id INTEGER PRIMARY KEY,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      admission_date DATE NOT NULL,
      discharge_date DATE,
      diagnosis VARCHAR NOT NULL
    );
  `,
  seed: `
    INSERT INTO province_names (province_id, province_name) VALUES
      (1, 'Ontario'), (2, 'Quebec'), (3, 'British Columbia'), (4, 'Alberta');

    INSERT INTO hospitals (hospital_id, hospital_name, city) VALUES
      (1, 'St. Mary General', 'Toronto'),
      (2, 'Lakeside Medical Center', 'Montreal'),
      (3, 'Pacific Health Institute', 'Vancouver'),
      (4, 'Foothills Regional', 'Calgary');

    INSERT INTO doctors (doctor_id, first_name, last_name, specialty, hospital_id) VALUES
      (1, 'Sarah',  'Bennett',  'Cardiology',    1),
      (2, 'Marcus', 'Cole',     'Pediatrics',    1),
      (3, 'Elena',  'Duarte',   'Neurology',     2),
      (4, 'Owen',   'Fitzgerald','Cardiology',   3),
      (5, 'Priya',  'Gupta',    'Oncology',      3),
      (6, 'Daniel', 'Huang',    'Pediatrics',    4);

    INSERT INTO patients (patient_id, first_name, last_name, birth_date, gender, city, province_id, allergies) VALUES
      (1,  'John',    'Smith',    DATE '1985-04-12', 'M', 'Toronto',    1, 'Penicillin'),
      (2,  'Emily',   'Johnson',  DATE '2010-08-23', 'F', 'Toronto',    1, NULL),
      (3,  'Michael',  'Brown',   DATE '1992-01-30', 'M', 'Ottawa',     1, 'Peanuts'),
      (4,  'Sophie',  'Wilson',   DATE '2010-02-14', 'F', 'Toronto',    1, NULL),
      (5,  'David',   'Miller',   DATE '1978-11-05', 'M', 'Montreal',   2, NULL),
      (6,  'Chloe',   'Tremblay', DATE '1999-06-19', 'F', 'Montreal',   2, 'Latex'),
      (7,  'Marc',    'Roy',      DATE '2010-12-01', 'M', 'Montreal',   2, NULL),
      (8,  'Julia',   'Lam',      DATE '1988-03-27', 'F', 'Vancouver',  3, NULL),
      (9,  'Kevin',   'Chow',     DATE '1995-09-09', 'M', 'Vancouver',  3, 'Shellfish'),
      (10, 'Grace',   'Park',     DATE '2003-07-16', 'F', 'Vancouver',  3, NULL),
      (11, 'Ryan',    'Bell',     DATE '1970-05-22', 'M', 'Calgary',    4, NULL),
      (12, 'Natalie', 'Ford',     DATE '2010-10-10', 'F', 'Calgary',    4, 'Penicillin'),
      (13, 'Liam',    'Grant',    DATE '1991-02-08', 'M', 'Calgary',    4, NULL),
      (14, 'Zoe',     'Adams',    DATE '1983-09-17', 'F', 'Toronto',    1, NULL),
      (15, 'Ben',     'Reid',     DATE '2000-01-01', 'M', 'Ottawa',     1, NULL);

    INSERT INTO admissions (admission_id, patient_id, doctor_id, admission_date, discharge_date, diagnosis) VALUES
      (1,  1,  1, DATE '2023-01-05', DATE '2023-01-09', 'Arrhythmia'),
      (2,  1,  1, DATE '2023-08-14', DATE '2023-08-16', 'Arrhythmia'),
      (3,  2,  2, DATE '2023-03-02', DATE '2023-03-03', 'Flu'),
      (4,  3,  1, DATE '2022-11-20', DATE '2022-11-25', 'Hypertension'),
      (5,  4,  2, DATE '2023-06-11', DATE '2023-06-12', 'Asthma'),
      (6,  5,  3, DATE '2023-02-18', DATE '2023-02-22', 'Migraine'),
      (7,  6,  3, DATE '2023-09-01', NULL,               'Seizure'),
      (8,  7,  3, DATE '2023-04-09', DATE '2023-04-10', 'Concussion'),
      (9,  8,  4, DATE '2022-12-15', DATE '2022-12-20', 'Arrhythmia'),
      (10, 8,  5, DATE '2023-07-07', DATE '2023-07-14', 'Tumor Screening'),
      (11, 9,  4, DATE '2023-05-25', DATE '2023-05-27', 'Hypertension'),
      (12, 10, 5, DATE '2023-10-02', DATE '2023-10-09', 'Tumor Screening'),
      (13, 11, 4, DATE '2023-01-30', DATE '2023-02-02', 'Arrhythmia'),
      (14, 12, 6, DATE '2023-03-19', DATE '2023-03-20', 'Flu'),
      (15, 13, 6, DATE '2023-11-11', NULL,               'Fracture'),
      (16, 1,  1, DATE '2024-01-02', DATE '2024-01-03', 'Arrhythmia');
  `,
};
