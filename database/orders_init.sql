CREATE DATABASE ordersdb;

-- Switch to the database
\c ordersdb;

-- Create a tweets table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    status VARCHAR(255) NOT NULL,
    cars VARCHAR(255) NOT NULL
);


-- Insert some data into the tables
INSERT INTO 
    orders (user_id, status, cars)
VALUES 
    (1, 'registered', 'blabla'),
    (2, 'delivered', 'blabla'),
    (3, 'blabla', 'blabla'),
    (3, 'blabla', 'blabla'),
    (4, 'blabla', 'blabla');