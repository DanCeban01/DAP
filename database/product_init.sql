CREATE DATABASE productsdb;

-- Switch to the database
\c productsdb;

-- Create a tweets table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price INTEGER NOT NULL
);


-- Insert some data into the tables
INSERT INTO 
    orders (name, price)
VALUES 
    ('registered', 123),
    ('delivered', 123),
    ('blabla', 123),
    ('blabla', 123),
    ('blabla', 123);