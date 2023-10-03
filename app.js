const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Sample data (you can replace this with a database)
const cars = [
  {
    id: '1',
    make: 'Toyota',
    model: 'Camry',
    year: 2023,
    price: 25000,
    available: true,
    imageUrl: 'https://example.com/car1.jpg',
  },
  {
    id: '2',
    make: 'Honda',
    model: 'Civic',
    year: 2023,
    price: 22000,
    available: false,
    imageUrl: 'https://example.com/car2.jpg',
  },
  // Add more car objects as needed
];

// Routes
app.get('/cars', (req, res) => {
  res.json({ cars });
});

app.get('/cars/:carId', (req, res) => {
  const carId = req.params.carId;
  const car = cars.find((c) => c.id === carId);

  if (!car) {
    return res.status(404).json({ message: 'Car not found' });
  }

  res.json({ car });
});

app.get('/cars/search', (req, res) => {
  const { make, model, year } = req.query;

  const filteredCars = cars.filter(
    (car) =>
      (!make || car.make === make) &&
      (!model || car.model === model) &&
      (!year || car.year == year)
  );

  res.json({ cars: filteredCars });
});

app.listen(port, () => {
  console.log(`Product Catalog Service is running on port ${port}`);
});
