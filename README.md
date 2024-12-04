# LogisticsProject

LogisticsProject is a comprehensive logistics management system designed to streamline and optimize the transportation and storage of goods. Developed as a full-stack application, it encompasses both frontend and backend components to provide a seamless user experience.

## Table of Contents

- [About](#about)
- [Features](#features)
- [Architecture](#architecture)
- [Installation](#installation)
  - [Prerequisites](#prerequisites)
  - [Setup](#setup)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## About

This project was developed to address common challenges in logistics management, offering functionalities such as tracking shipments, managing inventory, and optimizing delivery routes. It serves as a robust solution for businesses seeking to enhance their logistics operations.

## Features

- **Shipment Tracking**: Monitor the real-time status and location of shipments.
- **Inventory Management**: Keep track of stock levels and manage warehouse operations efficiently.
- **Route Optimization**: Determine the most efficient delivery routes to save time and reduce costs.
- **User Management**: Handle different user roles and permissions within the system.

## Architecture

The application follows a microservices architecture, with separate services for different functionalities. It utilizes Docker for containerization and orchestration, ensuring scalability and ease of deployment.

## Installation

### Prerequisites

- **Docker**: Ensure Docker is installed on your system.
- **Docker Compose**: Required for orchestrating multi-container Docker applications.

### Setup

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/haavard-hoijord/LogisticsProject.git
   cd LogisticsProject
   ```

2. **Configure Environment Variables**:

   Create a `.env` file in the root directory and specify the necessary environment variables as required by the application.

3. **Build and Start the Application**:

   Use Docker Compose to build and run the application:

   ```bash
   docker-compose up --build
   ```

   This command will build the Docker images and start the containers for the application.

## Usage

Once the application is running, access the frontend through the specified port (default is `http://localhost:3000`). From there, you can utilize the various features such as managing shipments, inventory, and viewing analytics.

## Contributing

As this repository is archived and read-only, contributions are no longer accepted. However, feel free to fork the repository for personal exploration and learning.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.
