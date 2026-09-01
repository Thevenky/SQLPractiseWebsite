import type { DatasetDef } from "../types";

export const ecommerceDataset: DatasetDef = {
  id: "ecommerce",
  name: "E-commerce",
  description:
    "An online store dataset with customers, orders, products and categories. Contains customers with zero orders, orders with no items, and multiple order statuses.",
  tables: [
    {
      name: "categories",
      description: "Product categories.",
      columns: [
        { name: "id", type: "INTEGER", pk: true },
        { name: "name", type: "VARCHAR" },
      ],
    },
    {
      name: "products",
      description: "Products for sale.",
      columns: [
        { name: "id", type: "INTEGER", pk: true },
        { name: "name", type: "VARCHAR" },
        { name: "category_id", type: "INTEGER", fk: { table: "categories", column: "id" } },
        { name: "price", type: "DOUBLE" },
      ],
    },
    {
      name: "customers",
      description: "Registered customers.",
      columns: [
        { name: "id", type: "INTEGER", pk: true },
        { name: "name", type: "VARCHAR" },
        { name: "email", type: "VARCHAR" },
        { name: "city", type: "VARCHAR" },
        { name: "country", type: "VARCHAR" },
        { name: "joined_date", type: "DATE" },
      ],
    },
    {
      name: "orders",
      description: "Customer orders. Some customers have none.",
      columns: [
        { name: "id", type: "INTEGER", pk: true },
        { name: "customer_id", type: "INTEGER", fk: { table: "customers", column: "id" } },
        { name: "total", type: "DOUBLE" },
        { name: "status", type: "VARCHAR" },
        { name: "order_date", type: "DATE" },
      ],
    },
    {
      name: "order_items",
      description: "Line items within an order.",
      columns: [
        { name: "id", type: "INTEGER", pk: true },
        { name: "order_id", type: "INTEGER", fk: { table: "orders", column: "id" } },
        { name: "product_id", type: "INTEGER", fk: { table: "products", column: "id" } },
        { name: "quantity", type: "INTEGER" },
        { name: "price", type: "DOUBLE" },
      ],
    },
  ],
  relationships: [
    { from: "products", fromCol: "category_id", to: "categories", toCol: "id" },
    { from: "orders", fromCol: "customer_id", to: "customers", toCol: "id" },
    { from: "order_items", fromCol: "order_id", to: "orders", toCol: "id" },
    { from: "order_items", fromCol: "product_id", to: "products", toCol: "id" },
  ],
  ddl: `
    CREATE TABLE categories (
      id INTEGER PRIMARY KEY,
      name VARCHAR NOT NULL
    );

    CREATE TABLE products (
      id INTEGER PRIMARY KEY,
      name VARCHAR NOT NULL,
      category_id INTEGER,
      price DOUBLE NOT NULL
    );

    CREATE TABLE customers (
      id INTEGER PRIMARY KEY,
      name VARCHAR NOT NULL,
      email VARCHAR NOT NULL,
      city VARCHAR,
      country VARCHAR,
      joined_date DATE NOT NULL
    );

    CREATE TABLE orders (
      id INTEGER PRIMARY KEY,
      customer_id INTEGER NOT NULL,
      total DOUBLE NOT NULL,
      status VARCHAR NOT NULL,
      order_date DATE NOT NULL
    );

    CREATE TABLE order_items (
      id INTEGER PRIMARY KEY,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price DOUBLE NOT NULL
    );
  `,
  seed: `
    INSERT INTO categories (id, name) VALUES
      (1, 'Electronics'), (2, 'Home & Kitchen'), (3, 'Books'), (4, 'Sports'), (5, 'Toys');

    INSERT INTO products (id, name, category_id, price) VALUES
      (1,  'Wireless Mouse', 1, 25.99),
      (2,  'Mechanical Keyboard', 1, 79.99),
      (3,  '27" Monitor', 1, 229.00),
      (4,  'USB-C Hub', 1, 34.50),
      (5,  'Blender', 2, 59.99),
      (6,  'Air Fryer', 2, 89.00),
      (7,  'Cutlery Set', 2, 42.25),
      (8,  'SQL for Beginners', 3, 19.99),
      (9,  'Data Engineering Handbook', 3, 34.99),
      (10, 'Novel: The Long Road', 3, 14.50),
      (11, 'Yoga Mat', 4, 22.00),
      (12, 'Basketball', 4, 18.75),
      (13, 'Dumbbell Set', 4, 65.00),
      (14, 'Building Blocks', 5, 29.99),
      (15, 'Puzzle 1000pc', 5, 15.25);

    INSERT INTO customers (id, name, email, city, country, joined_date) VALUES
      (1,  'Maria Gomez',    'maria.gomez@mail.com',    'Madrid',    'Spain',    DATE '2022-01-05'),
      (2,  'James Wilson',   'james.wilson@mail.com',   'London',    'UK',       DATE '2021-11-20'),
      (3,  'Aiko Tanaka',    'aiko.tanaka@mail.com',    'Tokyo',     'Japan',    DATE '2023-02-14'),
      (4,  'Liam OBrien',    'liam.obrien@mail.com',    'Dublin',    'Ireland',  DATE '2022-06-30'),
      (5,  'Fatima Noor',    'fatima.noor@mail.com',    'Cairo',     'Egypt',    DATE '2020-09-09'),
      (6,  'Carlos Diaz',    'carlos.diaz@mail.com',    'Bogota',    'Colombia', DATE '2023-05-19'),
      (7,  'Nina Petrova',   'nina.petrova@mail.com',   'Moscow',    'Russia',   DATE '2021-03-03'),
      (8,  'Tom Becker',     'tom.becker@mail.com',     'Berlin',    'Germany',  DATE '2022-12-01'),
      (9,  'Priya Shah',     'priya.shah@mail.com',     'Mumbai',    'India',    DATE '2023-08-08'),
      (10, 'Ethan Clark',    'ethan.clark@mail.com',    'Toronto',   'Canada',   DATE '2020-01-27'),
      (11, 'Sofia Rossi',    'sofia.rossi@mail.com',    'Rome',      'Italy',    DATE '2023-01-01'),
      (12, 'Noah Anderson',  'noah.anderson@mail.com',  'Sydney',    'Australia',DATE '2022-04-16'),
      (13, 'Grace Kim',      'grace.kim@mail.com',      'Seoul',     'South Korea', DATE '2021-07-22'),
      (14, 'Lucas Martin',   'lucas.martin@mail.com',   'Paris',     'France',   DATE '2023-09-30'),
      (15, 'Hannah Lee',     'hannah.lee@mail.com',     'Chicago',   'USA',      DATE '2024-01-11'),
      (16, 'Oscar Diallo',   'oscar.diallo@mail.com',   'Dakar',     'Senegal',  DATE '2024-04-20');

    INSERT INTO orders (id, customer_id, total, status, order_date) VALUES
      (1,  1,  105.98, 'delivered', DATE '2023-03-01'),
      (2,  1,  19.99,  'delivered', DATE '2023-06-15'),
      (3,  2,  229.00, 'delivered', DATE '2023-01-20'),
      (4,  3,  57.99,  'cancelled', DATE '2023-04-11'),
      (5,  4,  89.00,  'delivered', DATE '2023-07-02'),
      (6,  5,  34.50,  'delivered', DATE '2022-11-05'),
      (7,  5,  114.99, 'delivered', DATE '2023-02-18'),
      (8,  6,  42.25,  'returned',  DATE '2023-05-09'),
      (9,  7,  65.00,  'delivered', DATE '2023-08-14'),
      (10, 8,  22.00,  'delivered', DATE '2023-09-01'),
      (11, 8,  18.75,  'pending',   DATE '2024-01-15'),
      (12, 9,  34.99,  'delivered', DATE '2023-03-27'),
      (13, 10, 229.00, 'delivered', DATE '2021-12-05'),
      (14, 10, 79.99,  'delivered', DATE '2022-03-30'),
      (15, 10, 25.99,  'delivered', DATE '2022-08-19'),
      (16, 11, 15.25,  'delivered', DATE '2023-02-02'),
      (17, 12, 29.99,  'delivered', DATE '2023-06-06'),
      (18, 13, 59.99,  'cancelled', DATE '2023-07-25'),
      (19, 14, 79.99,  'delivered', DATE '2023-10-10'),
      (20, 15, 34.50,  'delivered', DATE '2024-02-02'),
      (21, 2,  42.25,  'delivered', DATE '2023-11-11'),
      (22, 2,  15.25,  'delivered', DATE '2024-01-05'),
      (23, 9,  89.00,  'delivered', DATE '2023-12-25'),
      (24, 1,  22.00,  'delivered', DATE '2024-03-01');

    INSERT INTO order_items (id, order_id, product_id, quantity, price) VALUES
      (1,  1,  1,  1, 25.99),
      (2,  1,  5,  1, 59.99),
      (3,  1,  15, 1, 15.25),
      (4,  2,  8,  1, 19.99),
      (5,  3,  3,  1, 229.00),
      (6,  4,  5,  1, 57.99),
      (7,  5,  6,  1, 89.00),
      (8,  6,  4,  1, 34.50),
      (9,  7,  2,  1, 79.99),
      (10, 7,  10, 1, 14.50),
      (11, 7,  10, 1, 14.50),
      (12, 8,  7,  1, 42.25),
      (13, 9,  13, 1, 65.00),
      (14, 10, 11, 1, 22.00),
      (15, 11, 12, 1, 18.75),
      (16, 12, 9,  1, 34.99),
      (17, 13, 3,  1, 229.00),
      (18, 14, 2,  1, 79.99),
      (19, 15, 1,  1, 25.99),
      (20, 16, 15, 1, 15.25),
      (21, 17, 14, 1, 29.99),
      (22, 18, 5,  1, 59.99),
      (23, 19, 2,  1, 79.99),
      (24, 20, 4,  1, 34.50),
      (25, 21, 7,  1, 42.25),
      (26, 22, 10, 1, 14.50),
      (27, 22, 15, 0, 15.25),
      (28, 23, 6,  1, 89.00),
      (29, 24, 11, 1, 22.00);
  `,
};
