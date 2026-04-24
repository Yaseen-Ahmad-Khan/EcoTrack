# EcoTrack | Smart Inventory & Waste Management

EcoTrack is a modern, high-fidelity platform designed to handle surplus inventory management for **Businesses**, **Customers**, and **NGOs**. The project focuses on sustainability by reducing food waste and optimizing the redistribution of surplus goods.

## 🌿 Nature-Tech Aesthetic
The platform features a premium "Nature-Tech" theme:
- **Palette**: Deep Forest Green, Emerald accents, and Soft Amber alerts.
- **Visuals**: Glassmorphism, floating nature & food icons, and cinematic background imagery.
- **Interactions**: Smooth CSS transitions, micro-animations, and real-time data synchronization.

## 🚀 Key Features

### Vendor Dashboard (Command Center)
- **Inventory Matrix**: Add, update, and monitor stock levels with automated expiry surveillance.
- **Dynamic Pricing**: Adjust valuations based on expiration cycles; features auto-discount and auto-donate logic.
- **Impact Analytics**: Track revenue recovered, CO2 offset (tonnes), and total items saved from waste.
- **NGO Logistics**: Manage and authorize donation pickup claims from verified NGOs.
- **Notifications**: Real-time signals for expiring stock and new claims.

### Sustainability Engine
- **Auto-Discount**: Items nearing expiry (within 2 days) are automatically discounted by 30%.
- **Auto-Donate**: Items within 12 hours of expiry are shifted to the NGO donation pool.
- **Environmental Tracking**: Calculates the CO2 footprint saved by preventing waste.

## 🛠️ Technical Setup

### Prerequisites
- **Node.js** (v16+)
- **SQL Server** (Express or full version) with `mssql` driver support.

### Backend Setup
1. Navigate to the `BackEnd` folder.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Update the database configuration in `server.js` (Line 21):
   ```javascript
   const config = {
       server: 'YOUR_SERVER_NAME', 
       database: 'ecotrack',
       // ...
   };
   ```
4. Start the server:
   ```bash
   node server.js
   ```

### Frontend Setup
- Open `index.html` (root) or `FrontEnd/index.html` in any modern web browser.
- Ensure the backend is running to enable authentication and data persistence.

## 📂 Project Structure
- `/BackEnd`: Node.js/Express server logic and SQL integrations.
- `/FrontEnd`: HTML5, CSS3 (Tailwind), and Vanilla JS frontend.
- `/Assets`: 3D models and video background assets.
- `/Database`: SQL scripts for table initialization (if provided).

---
*Built with ❤️ for a greener planet.*